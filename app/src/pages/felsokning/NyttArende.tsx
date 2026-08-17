import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Objekt } from "@/felsokning/domain";
import { useFelsokning } from "@/felsokning/store";
import { valjMetodik } from "@/felsokning/metodik";
import { lasAvInstrument, tolkaArbetsorder, valjMetodikMedAi, type TolkatFalt, type ArbetsorderGrupp } from "@/felsokning/ai";
import { byggDemoTolkning } from "@/felsokning/demo";
import { hamtaInstallningar, lastaInstallningar } from "@/felsokning/installningar";
import { FelsokningSkal, Panel, StorKnapp, TextFalt } from "@/felsokning/ui";
import { skalaNerFoto } from "@/felsokning/format";
import { IkonKamera } from "@/felsokning/ikoner";
import { startaSkanning, stodStreckkod, tolkaKod, type AvlastKod, type Skanning } from "@/felsokning/streckkod";

// Ärendestart: teknikern är redan känd (inloggning/namn) och ska kunna
// starta ett ärende på under 15 sekunder. Primärvägen är att fotografera
// arbetsordern — systemet läser dokumentet och fyller i fälten; teknikern
// granskar bara osäkra värden. Manuell inmatning finns som andrahandsväg,
// styrd av organisationens inställningar.
export default function NyttArende() {
  const navigate = useNavigate();
  const skapaArende = useFelsokning((s) => s.skapaArende);
  const laggTill = useFelsokning((s) => s.laggTill);

  const [inst, setInst] = useState(lastaInstallningar());
  const [steg, setSteg] = useState<"start" | "granska" | "identifiera" | "bekrafta" | "felbeskrivning">("start");
  const [metod, setMetod] = useState(inst.identifieringsmetoder[0]);
  const [typ, setTyp] = useState(inst.objekttyper[0]);

  useEffect(() => {
    hamtaInstallningar().then((farsk) => {
      setInst(farsk);
      setTyp((t) => (farsk.objekttyper.includes(t) ? t : farsk.objekttyper[0]));
      setMetod((m) => (farsk.identifieringsmetoder.includes(m) ? m : farsk.identifieringsmetoder[0]));
    });
  }, []);
  const [identifierare, setIdentifierare] = useState("");
  const [beskrivning, setBeskrivning] = useState("");
  const [kund, setKund] = useState("");
  const [fel, setFel] = useState("");
  const [startar, setStartar] = useState(false);

  // QR/streckkod: läses direkt ur kameraströmmen när webbläsaren stöder
  // det, annars fotograferas typskylten och bildtolkningen läser av den.
  const [skannarKod, setSkannarKod] = useState(false);
  const [kodFel, setKodFel] = useState("");
  const [avlastKod, setAvlastKod] = useState<AvlastKod | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const skanningRef = useRef<Skanning | null>(null);
  const typskyltRef = useRef<HTMLInputElement>(null);
  const [laserTypskylt, setLaserTypskylt] = useState(false);

  useEffect(() => () => skanningRef.current?.stoppa(), []);

  const anvandKod = (kod: AvlastKod) => {
    setAvlastKod(kod);
    setIdentifierare(kod.varde);
    if (inst.identifieringsmetoder.includes(kod.typ)) setMetod(kod.typ);
    setSkannarKod(false);
  };

  const oppnaSkanning = async () => {
    setKodFel("");
    setSkannarKod(true);
    // Videoelementet monteras i samma render — vänta in det.
    setTimeout(async () => {
      if (!videoRef.current) return;
      skanningRef.current = await startaSkanning(videoRef.current, anvandKod, (m) => {
        setKodFel(m);
        setSkannarKod(false);
      });
    }, 50);
  };

  const stangSkanning = () => {
    skanningRef.current?.stoppa();
    skanningRef.current = null;
    setSkannarKod(false);
  };

  // Fallback: fota typskylten — bildtolkningen läser VIN/regnr ur bilden.
  const lasTypskylt = async (fil: File) => {
    setLaserTypskylt(true);
    setKodFel("");
    const foto = await skalaNerFoto(fil);
    try {
      const resultat = await lasAvInstrument(foto);
      const kandidater = resultat?.tolkning.varden.map((v) => v.varde) ?? [];
      const traff = kandidater.map((v) => tolkaKod(v)).find((k): k is AvlastKod => !!k);
      if (traff) anvandKod(traff);
      else if (!resultat) setKodFel("Reading the type plate requires sign-in — enter the identity manually.");
      else setKodFel("No identifier could be read from the image — try again or enter it manually.");
    } catch {
      setKodFel("The reader could not be reached — enter the identity manually.");
    }
    setLaserTypskylt(false);
  };

  const [tolkning, setTolkning] = useState<{ foto: string; falt: TolkatFalt[]; modell?: string; demo?: boolean } | null>(null);
  const [skannar, setSkannar] = useState(false);
  const [skanningsFel, setSkanningsFel] = useState("");
  const skanRef = useRef<HTMLInputElement>(null);

  // Foto → dokumenttolkning i plattformens orkester. I lokalt läge (ingen
  // inloggning) visas en tydligt märkt demo-tolkning så flödet kan provas.
  const skanna = async (fil: File) => {
    setSkannar(true);
    setSkanningsFel("");
    const foto = await skalaNerFoto(fil);
    try {
      const resultat = await tolkaArbetsorder(foto);
      if (resultat) {
        if (resultat.falt.length === 0) {
          setSkanningsFel("No fields could be read from the image — take a clearer photograph or fill in manually.");
        } else {
          setTolkning({ foto, falt: resultat.falt, modell: resultat.modell });
          setSteg("granska");
        }
      } else {
        setTolkning({ foto, falt: byggDemoTolkning(), demo: true });
        setSteg("granska");
      }
    } catch {
      setSkanningsFel("Document interpretation could not be reached — try again or fill in manually.");
    }
    setSkannar(false);
  };

  // Granskade fält → ärende: objektet byggs ur fordonsfälten, kundens
  // felbeskrivning startar metodiken och hela tolkningen loggas som en
  // organisationsintern händelse (delas aldrig i kund-/partnervyer).
  const startaDiagnos = async (falt: TolkatFalt[]) => {
    if (!tolkning) return;
    setStartar(true);
    const v = (id: string) => falt.find((f) => f.id === id && f.varde.trim())?.varde.trim();
    const regnr = v("fordon_regnr");
    const vin = v("fordon_vin");
    const beskr = [v("fordon_marke"), v("fordon_modell"), v("fordon_arsmodell")].filter(Boolean).join(" ");
    const objektet: Objekt = {
      typ: inst.objekttyper.includes("Passenger car") ? "Passenger car" : inst.objekttyper[0],
      identifierare: (regnr ?? vin ?? "UNKNOWN").toUpperCase(),
      identifieringsmetod: regnr ? "Reg. no." : vin ? "VIN" : "Manual entry",
      beskrivning: beskr || "View work order",
      kund: v("kund_namn"),
      // Ärendeidentiteten: registreras en gång här, återanvänds i alla vyer.
      vin: vin?.toUpperCase(),
      miltal: v("fordon_matarstallning"),
      arbetsorder: v("ao_nummer"),
      claim: v("ao_claim"),
      skadenummer: v("ao_skadenummer"),
    };
    const felText = v("felbeskrivning") ?? "View the scanned work order";
    let metodikId: string | undefined;
    if (valjMetodik(felText).id === "generisk") {
      metodikId = (await valjMetodikMedAi(felText)) ?? undefined;
    }
    const id = skapaArende(objektet, felText, metodikId);
    laggTill(id, {
      typ: "arbetsorder_skannad",
      falt: falt
        .filter((f) => f.varde.trim())
        .map(({ id: faltId, etikett, varde, konfidens }) => ({ id: faltId, etikett, varde, konfidens })),
      dataUrl: tolkning.foto,
    });
    navigate(`/felsokning/arende/${id}`);
  };

  const objektet: Objekt = {
    typ,
    identifierare: identifierare.trim().toUpperCase(),
    identifieringsmetod: metod,
    beskrivning: beskrivning.trim() || identifierare.trim().toUpperCase(),
    kund: kund.trim() || undefined,
  };

  if (steg === "start") {
    return (
      <FelsokningSkal rubrik="Start case" tillbaka={{ till: "/felsokning", text: "Cases" }}>
        <Panel rubrik="Scan work order">
          <p className="mb-4 text-[#1B1E22]">
            Photograph the front of the work order. The system reads customer, vehicle and case details automatically — you review only the uncertain fields and press Start diagnosis.
          </p>
          <input
            ref={skanRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const fil = e.target.files?.[0];
              if (fil) skanna(fil);
              e.target.value = "";
            }}
          />
          {skannar ? (
            <p className="py-2 text-center font-semibold text-[#005CA9]">Interpreting the document …</p>
          ) : (
            <StorKnapp onClick={() => skanRef.current?.click()}><IkonKamera /> Scan the work order</StorKnapp>
          )}
          {skanningsFel && <p className="mt-2 font-semibold text-[#8B1A1A]">{skanningsFel}</p>}
        </Panel>
        <Panel>
          <StorKnapp variant="sekundar" onClick={() => setSteg("identifiera")}>
            Fill in manually
          </StorKnapp>
        </Panel>
      </FelsokningSkal>
    );
  }

  if (steg === "granska" && tolkning) {
    return (
      <FelsokningSkal
        bred
        rubrik="Review the interpreted work order"
        tillbaka={{ till: "/felsokning", text: "Cases" }}
      >
        {tolkning.demo && (
          <p className="mb-4 border border-[#8A5A00] bg-[#FFFFFF] p-2 text-[12px] font-semibold text-[#8A5A00]">
            Demo interpretation — the platform's document interpretation requires sign-in. The values below are sample data.
          </p>
        )}
        <GranskaTolkning
          foto={tolkning.foto}
          falt={tolkning.falt}
          startar={startar}
          vidStart={startaDiagnos}
          avbryt={() => {
            setTolkning(null);
            setSteg("start");
          }}
        />
      </FelsokningSkal>
    );
  }

  if (steg === "identifiera") {
    return (
      <FelsokningSkal rubrik="Identify object" tillbaka={{ till: "/felsokning", text: "Cases" }}>
        <Panel rubrik="Object type">
          <div className="grid grid-cols-2 gap-2">
            {inst.objekttyper.map((t) => (
              <StorKnapp key={t} variant={t === typ ? "primar" : "sekundar"} onClick={() => setTyp(t)}>
                {t}
              </StorKnapp>
            ))}
          </div>
        </Panel>
        <Panel rubrik="Identification method">
          <div className="grid grid-cols-2 gap-2">
            {inst.identifieringsmetoder.map((m) => (
              <StorKnapp key={m} variant={m === metod ? "primar" : "sekundar"} onClick={() => setMetod(m)}>
                {m}
              </StorKnapp>
            ))}
          </div>
          <p className="mt-4 text-[12px] text-[#4D5662]">
            QR code, barcode and type plate can be read in the next step — or enter the identity manually.
          </p>
        </Panel>
        <Panel rubrik="Read the identity">
          <input
            ref={typskyltRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const fil = e.target.files?.[0];
              e.target.value = "";
              if (fil) lasTypskylt(fil);
            }}
          />
          {skannarKod ? (
            <div>
              <video ref={videoRef} playsInline muted className="mb-2 w-full border border-[#D7DCE2]" />
              <p className="mb-2 text-[12px] text-[#4D5662]">
                Point the camera at the QR code, barcode or VIN label.
              </p>
              <StorKnapp variant="sekundar" onClick={stangSkanning}>
                Cancel scanning
              </StorKnapp>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {stodStreckkod() && (
                <StorKnapp variant="sekundar" onClick={oppnaSkanning}>
                  Scan QR or barcode
                </StorKnapp>
              )}
              <StorKnapp variant="sekundar" disabled={laserTypskylt} onClick={() => typskyltRef.current?.click()}>
                <IkonKamera /> {laserTypskylt ? "Reading …" : "Photograph the type plate"}
              </StorKnapp>
            </div>
          )}
          {avlastKod && (
            <p className="mt-2 text-[12px] font-semibold text-[#005CA9]">
              Read {avlastKod.typ}: {avlastKod.varde}
              {avlastKod.format ? ` (${avlastKod.format})` : ""} — check the value below.
            </p>
          )}
          {kodFel && <p className="mt-2 text-[12px] font-semibold text-[#8B1A1A]">{kodFel}</p>}
        </Panel>
        <Panel rubrik="Object identity">
          <TextFalt label={metod} varde={identifierare} satt={setIdentifierare} platshallare="e.g. ABC123" />
          <TextFalt label="Description (make, model, year)" varde={beskrivning} satt={setBeskrivning} platshallare="T.ex. Volvo XC60 D4 2019" />
          <TextFalt label="Customer (optional)" varde={kund} satt={setKund} platshallare="e.g. Alex Meyer" />
          <StorKnapp disabled={!identifierare.trim()} onClick={() => setSteg("bekrafta")}>
            Continue
          </StorKnapp>
        </Panel>
      </FelsokningSkal>
    );
  }

  if (steg === "bekrafta") {
    return (
      <FelsokningSkal rubrik="Confirm object" tillbaka={{ till: "/felsokning", text: "Cases" }}>
        <Panel>
          <p className="text-[12px] font-semibold uppercase tracking-widest text-[#4D5662]">{objektet.typ}</p>
          <p className="mt-2 text-[20px] font-semibold">{objektet.beskrivning}</p>
          <p className="mt-2 text-[15px] font-semibold text-[#005CA9]">{objektet.identifierare}</p>
          <p className="mt-2 text-[12px] text-[#4D5662]">Identifierad via: {objektet.identifieringsmetod}</p>
          {objektet.kund && <p className="mt-2 text-[14px] text-[#1B1E22]">Kund: {objektet.kund}</p>}
        </Panel>
        <div className="grid grid-cols-2 gap-2">
          <StorKnapp variant="sekundar" onClick={() => setSteg("identifiera")}>
            Edit
          </StorKnapp>
          <StorKnapp onClick={() => setSteg("felbeskrivning")}>Correct object — continue</StorKnapp>
        </div>
      </FelsokningSkal>
    );
  }

  const metodik = fel.trim() ? valjMetodik(fel) : undefined;

  return (
    <FelsokningSkal rubrik="Describe the fault" tillbaka={{ till: "/felsokning", text: "Cases" }}>
      <Panel rubrik={`${objektet.beskrivning} · ${objektet.identifierare}`}>
        <TextFalt
          label="Customer's or user's fault description"
          varde={fel}
          satt={setFel}
          platshallare="e.g. The car vibrates at around 88 km/h"
          flerRad
          rost
        />
        {metodik && (
          <p className="mb-4 text-[12px] font-semibold text-[#4D5662]">
            Vald metodik: <span className="text-[#005CA9]">{metodik.namn}</span>
          </p>
        )}
        <StorKnapp
          disabled={!fel.trim() || startar}
          onClick={async () => {
            setStartar(true);
            // Träffar nyckelordsvalet ingen specifik metodik får orkesterns
            // klassificerare (Haiku 4.5) välja; i lokalt läge blir det generisk.
            let metodikId: string | undefined;
            if (valjMetodik(fel).id === "generisk") {
              metodikId = (await valjMetodikMedAi(fel.trim())) ?? undefined;
            }
            const id = skapaArende(objektet, fel.trim(), metodikId);
            navigate(`/felsokning/arende/${id}`);
          }}
        >
          {startar ? "Starting …" : "Start work log"}
        </StorKnapp>
      </Panel>
    </FelsokningSkal>
  );
}

// Visuell granskning: den skannade arbetsordern till vänster, tolkade
// fält till höger. Konfidensen styr vad teknikern behöver göra:
//   Grön  ≥ 95 %  godkänns automatiskt
//   Gul   80–95 % markerad för genomläsning
//   Röd   < 80 %  kräver aktiv bekräftelse (eller redigering)
// Klick på ett fält markerar var i dokumentet värdet hittades.
function GranskaTolkning({
  foto,
  falt,
  startar,
  vidStart,
  avbryt,
}: {
  foto: string;
  falt: TolkatFalt[];
  startar: boolean;
  vidStart: (falt: TolkatFalt[]) => void;
  avbryt: () => void;
}) {
  const [rader, setRader] = useState(falt.map((f) => ({ ...f, bekraftad: f.konfidens >= 0.8 })));
  const [markerad, setMarkerad] = useState<string | null>(null);

  const obekraftade = rader.filter((r) => !r.bekraftad);
  const vald = rader.find((r) => r.id === markerad);
  const grupper: ArbetsorderGrupp[] = ["Customer", "Vehicle", "Workshop", "Case"];

  const uppdatera = (id: string, andring: Partial<(typeof rader)[number]>) =>
    setRader((r) => r.map((rad) => (rad.id === id ? { ...rad, ...andring } : rad)));

  return (
    <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
      <Panel rubrik="Scanned work order">
        <div className="relative">
          <img src={foto} alt="Scanned work order" className="w-full border border-[#D7DCE2]" />
          {vald?.omrade && (
            <div
              className="pointer-events-none absolute border-2 border-[#005CA9] bg-[#005CA9]/15"
              style={{
                left: `${vald.omrade.x * 100}%`,
                top: `${vald.omrade.y * 100}%`,
                width: `${vald.omrade.bredd * 100}%`,
                height: `${vald.omrade.hojd * 100}%`,
              }}
            />
          )}
        </div>
        <p className="mt-2 text-[11px] text-[#4D5662]">
          {vald?.omrade
            ? `Markerat: ${vald.etikett} (approximate position)`
            : "Select a field to see where in the document the value was found."}
        </p>
      </Panel>

      <div>
        {grupper.map((grupp) => {
          const iGrupp = rader.filter((r) => r.grupp === grupp);
          if (iGrupp.length === 0) return null;
          return (
            <Panel key={grupp} rubrik={grupp}>
              {iGrupp.map((rad) => {
                const niva = rad.konfidens >= 0.95 ? "gron" : rad.konfidens >= 0.8 ? "gul" : "rod";
                return (
                  <div
                    key={rad.id}
                    onClick={() => setMarkerad(rad.id)}
                    className={`mb-2 cursor-pointer border p-2 ${
                      markerad === rad.id ? "border-[#005CA9]" : "border-transparent"
                    } ${niva === "gul" ? "bg-[#FFFFFF]" : niva === "rod" ? "bg-[#FFFFFF]" : "bg-white"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-[#4D5662]">
                        {rad.etikett}
                      </span>
                      <span
                        className={`text-[11px] font-semibold ${
                          niva === "gron" ? "text-[#005CA9]" : niva === "gul" ? "text-[#8A5A00]" : "text-[#8B1A1A]"
                        }`}
                      >
                        {niva === "gron" ? "✓" : `${Math.round(rad.konfidens * 100)} %`}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        value={rad.varde}
                        onChange={(e) => uppdatera(rad.id, { varde: e.target.value, bekraftad: true })}
                        className="w-full border border-[#D7DCE2] bg-white px-2 py-2 text-[13px] focus:border-[#005CA9] focus:outline-none"
                      />
                      {niva === "rod" && !rad.bekraftad && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            uppdatera(rad.id, { bekraftad: true });
                          }}
                          className="whitespace-nowrap border border-[#8B1A1A] bg-[#8B1A1A] px-4 py-2 text-[12px] font-semibold text-white"
                        >
                          Confirm
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </Panel>
          );
        })}

        {obekraftade.length > 0 && (
          <p className="mb-2 text-[12px] font-semibold text-[#8B1A1A]">
            {obekraftade.length} uncertain fields require confirmation or correction before the diagnosis starts.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <StorKnapp variant="sekundar" onClick={avbryt}>
            Scan again
          </StorKnapp>
          <StorKnapp disabled={obekraftade.length > 0 || startar} onClick={() => vidStart(rader)}>
            {startar ? "Starting …" : "Start diagnosis"}
          </StorKnapp>
        </div>
      </div>
    </div>
  );
}
