import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Objekt } from "@/felsokning/domain";
import { useFelsokning } from "@/felsokning/store";
import { valjMetodik } from "@/felsokning/metodik";
import { tolkaArbetsorder, valjMetodikMedAi, type TolkatFalt, type ArbetsorderGrupp } from "@/felsokning/ai";
import { byggDemoTolkning } from "@/felsokning/demo";
import { hamtaInstallningar, lastaInstallningar } from "@/felsokning/installningar";
import { FelsokningSkal, Panel, StorKnapp, TextFalt } from "@/felsokning/ui";
import { skalaNerFoto } from "@/felsokning/format";

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
          setSkanningsFel("Inga fält kunde läsas ur bilden — ta ett tydligare foto eller fyll i manuellt.");
        } else {
          setTolkning({ foto, falt: resultat.falt, modell: resultat.modell });
          setSteg("granska");
        }
      } else {
        setTolkning({ foto, falt: byggDemoTolkning(), demo: true });
        setSteg("granska");
      }
    } catch {
      setSkanningsFel("Dokumenttolkningen kunde inte nås — försök igen eller fyll i manuellt.");
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
      typ: inst.objekttyper.includes("Personbil") ? "Personbil" : inst.objekttyper[0],
      identifierare: (regnr ?? vin ?? "OKÄND").toUpperCase(),
      identifieringsmetod: regnr ? "Regnr" : vin ? "VIN" : "Manuell inmatning",
      beskrivning: beskr || "Se arbetsorder",
      kund: v("kund_namn"),
    };
    const felText = v("felbeskrivning") ?? "Se skannad arbetsorder";
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
      <FelsokningSkal rubrik="Starta ärende" tillbaka={{ till: "/felsokning", text: "Ärenden" }}>
        <Panel rubrik="Skanna arbetsorder">
          <p className="mb-3 text-[#333333]">
            Fota arbetsorderns framsida. Systemet läser kund-, fordons- och ärendeuppgifter automatiskt —
            du granskar bara osäkra fält och trycker Starta diagnos.
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
            <p className="animate-pulse py-2 text-center font-semibold text-[#00437A]">Tolkar dokumentet …</p>
          ) : (
            <StorKnapp onClick={() => skanRef.current?.click()}>📷 Skanna arbetsorder</StorKnapp>
          )}
          {skanningsFel && <p className="mt-2 font-semibold text-[#8B1A1A]">{skanningsFel}</p>}
        </Panel>
        <Panel>
          <StorKnapp variant="sekundar" onClick={() => setSteg("identifiera")}>
            Fyll i manuellt
          </StorKnapp>
        </Panel>
      </FelsokningSkal>
    );
  }

  if (steg === "granska" && tolkning) {
    return (
      <FelsokningSkal
        bred
        rubrik="Granska tolkad arbetsorder"
        tillbaka={{ till: "/felsokning", text: "Ärenden" }}
      >
        {tolkning.demo && (
          <p className="mb-3 rounded border border-[#E0C36A] bg-[#FFF8E1] p-2 text-[12px] font-semibold text-[#9A6700]">
            Demo-tolkning — plattformens dokumenttolkning kräver inloggning. Värdena nedan är exempeldata.
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
      <FelsokningSkal rubrik="Identifiera objekt" tillbaka={{ till: "/felsokning", text: "Ärenden" }}>
        <Panel rubrik="Objekttyp">
          <div className="grid grid-cols-2 gap-2">
            {inst.objekttyper.map((t) => (
              <StorKnapp key={t} variant={t === typ ? "primar" : "sekundar"} onClick={() => setTyp(t)}>
                {t}
              </StorKnapp>
            ))}
          </div>
        </Panel>
        <Panel rubrik="Identifieringsmetod">
          <div className="grid grid-cols-2 gap-2">
            {inst.identifieringsmetoder.map((m) => (
              <StorKnapp key={m} variant={m === metod ? "primar" : "sekundar"} onClick={() => setMetod(m)}>
                {m}
              </StorKnapp>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-[#707070]">
            QR-kod, streckkod och OCR från typskylt tillkommer i senare version — ange identiteten manuellt.
          </p>
        </Panel>
        <Panel rubrik="Objektets identitet">
          <TextFalt label={metod} varde={identifierare} satt={setIdentifierare} platshallare="T.ex. ABC123" />
          <TextFalt label="Beskrivning (märke, modell, år)" varde={beskrivning} satt={setBeskrivning} platshallare="T.ex. Volvo XC60 D4 2019" />
          <TextFalt label="Kund (valfritt)" varde={kund} satt={setKund} platshallare="T.ex. Anders Svensson" />
          <StorKnapp disabled={!identifierare.trim()} onClick={() => setSteg("bekrafta")}>
            Fortsätt
          </StorKnapp>
        </Panel>
      </FelsokningSkal>
    );
  }

  if (steg === "bekrafta") {
    return (
      <FelsokningSkal rubrik="Bekräfta objekt" tillbaka={{ till: "/felsokning", text: "Ärenden" }}>
        <Panel>
          <p className="text-[12px] font-semibold uppercase tracking-widest text-[#4A5560]">{objektet.typ}</p>
          <p className="mt-1 text-[20px] font-semibold">{objektet.beskrivning}</p>
          <p className="mt-1 text-[15px] font-semibold text-[#00437A]">{objektet.identifierare}</p>
          <p className="mt-1 text-[12px] text-[#4A5560]">Identifierad via: {objektet.identifieringsmetod}</p>
          {objektet.kund && <p className="mt-1 text-[14px] text-[#333333]">Kund: {objektet.kund}</p>}
        </Panel>
        <div className="grid grid-cols-2 gap-2">
          <StorKnapp variant="sekundar" onClick={() => setSteg("identifiera")}>
            Ändra
          </StorKnapp>
          <StorKnapp onClick={() => setSteg("felbeskrivning")}>Rätt objekt — fortsätt</StorKnapp>
        </div>
      </FelsokningSkal>
    );
  }

  const metodik = fel.trim() ? valjMetodik(fel) : undefined;

  return (
    <FelsokningSkal rubrik="Beskriv felet" tillbaka={{ till: "/felsokning", text: "Ärenden" }}>
      <Panel rubrik={`${objektet.beskrivning} · ${objektet.identifierare}`}>
        <TextFalt
          label="Kundens/användarens felbeskrivning"
          varde={fel}
          satt={setFel}
          platshallare="T.ex. Bilen vibrerar runt 88 km/h"
          flerRad
          rost
        />
        {metodik && (
          <p className="mb-3 text-[12px] font-semibold text-[#4A5560]">
            Vald metodik: <span className="text-[#00437A]">{metodik.namn}</span>
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
          {startar ? "Startar …" : "Starta arbetslogg"}
        </StorKnapp>
      </Panel>
    </FelsokningSkal>
  );
}

// Visuell granskning: den skannade arbetsordern till vänster, tolkade
// fält till höger. Konfidensen styr vad teknikern behöver göra:
//   🟢 ≥ 95 %  godkänns automatiskt
//   🟡 80–95 % markerad för genomläsning
//   🔴 < 80 %  kräver aktiv bekräftelse (eller redigering)
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
  const grupper: ArbetsorderGrupp[] = ["Kund", "Fordon", "Verkstad", "Ärende"];

  const uppdatera = (id: string, andring: Partial<(typeof rader)[number]>) =>
    setRader((r) => r.map((rad) => (rad.id === id ? { ...rad, ...andring } : rad)));

  return (
    <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-3">
      <Panel rubrik="Skannad arbetsorder">
        <div className="relative">
          <img src={foto} alt="Skannad arbetsorder" className="w-full rounded border border-[#C6C6C6]" />
          {vald?.omrade && (
            <div
              className="pointer-events-none absolute rounded-sm border-2 border-[#00437A] bg-[#00437A]/15"
              style={{
                left: `${vald.omrade.x * 100}%`,
                top: `${vald.omrade.y * 100}%`,
                width: `${vald.omrade.bredd * 100}%`,
                height: `${vald.omrade.hojd * 100}%`,
              }}
            />
          )}
        </div>
        <p className="mt-1 text-[11px] text-[#707070]">
          {vald?.omrade
            ? `Markerat: ${vald.etikett} (ungefärlig position)`
            : "Klicka på ett fält för att se var i dokumentet värdet hittades."}
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
                    className={`mb-1.5 cursor-pointer rounded border p-2 ${
                      markerad === rad.id ? "border-[#00437A]" : "border-transparent"
                    } ${niva === "gul" ? "bg-[#FFF8E1]" : niva === "rod" ? "bg-[#FBE9E9]" : "bg-white"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-[#4A5560]">
                        {rad.etikett}
                      </span>
                      <span
                        className={`text-[11px] font-semibold ${
                          niva === "gron" ? "text-[#1E6B34]" : niva === "gul" ? "text-[#9A6700]" : "text-[#8B1A1A]"
                        }`}
                      >
                        {niva === "gron" ? "✓" : `${Math.round(rad.konfidens * 100)} %`}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        value={rad.varde}
                        onChange={(e) => uppdatera(rad.id, { varde: e.target.value, bekraftad: true })}
                        className="w-full rounded border border-[#ADADAD] bg-white px-2 py-1 text-[13px] focus:border-[#00437A] focus:outline-none"
                      />
                      {niva === "rod" && !rad.bekraftad && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            uppdatera(rad.id, { bekraftad: true });
                          }}
                          className="whitespace-nowrap rounded border border-[#6E1414] bg-[#8B1A1A] px-3 py-1 text-[12px] font-semibold text-white"
                        >
                          Bekräfta
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
            {obekraftade.length} osäkra fält kräver bekräftelse eller korrigering innan diagnosen startar.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <StorKnapp variant="sekundar" onClick={avbryt}>
            Skanna om
          </StorKnapp>
          <StorKnapp disabled={obekraftade.length > 0 || startar} onClick={() => vidStart(rader)}>
            {startar ? "Startar …" : "Starta diagnos"}
          </StorKnapp>
        </div>
      </div>
    </div>
  );
}
