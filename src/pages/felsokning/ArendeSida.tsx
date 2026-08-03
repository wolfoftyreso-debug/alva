import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Arende, Handelse, TidKategori, Tillforlitlighet } from "@/felsokning/domain";
import { TIDKATEGORI_LABEL, TILLFORLITLIGHET_LABEL, handelseRubrik } from "@/felsokning/domain";
import type { Metodik, NastaSteg } from "@/felsokning/metodik";
import { nastaSteg } from "@/felsokning/metodik";
import {
  arAvslutat,
  arendeidentitet,
  brief,
  felbeskrivning,
  formateraTid,
  foton,
  objekt,
  overlamningstext,
  sistaAktivitet,
  tidsfordelning,
  tidsfordelningsRader,
} from "@/felsokning/projektioner";
import { metodikForArende, useFelsokning } from "@/felsokning/store";
import { synkroniseraArende, type SynkStatus } from "@/felsokning/synk";
import {
  aterkallaDelning,
  hamtaDelningar,
  plattformAktiv,
  skapaDelning,
  type Delning,
  type DelningsNiva,
} from "@/felsokning/plattform";
import {
  AI_RADTYP_LABEL,
  fragaAi,
  granskaUnderlag,
  lasAvInstrument,
  sammanfattaOverlamning,
  type InstrumentTolkning,
} from "@/felsokning/ai";
import { byggDemoInstrument } from "@/felsokning/demo";
import {
  ARENDETYPER,
  ECM_VERSION,
  MARKOR_FELBESKRIVNING_VERIFIERAD,
  MARKOR_INGA_TIDIGA_OBSERVATIONER,
  MARKOR_TIDIGA_OBSERVATIONER_KLARA,
  ORSAKSKATEGORIER,
  UNDANTAGSORSAKER,
  UNDERLAGSKALLOR,
  arendetyp,
  felorsaker,
  granskaAvvikelse,
  grindGodkand,
  kvalitetsgrind,
  preDiagnostik,
  reproducering,
  reproduceringsText,
  sparbarhetspaket,
  underlagFinns,
} from "@/felsokning/ecm";
import { FelsokningSkal, NivaBadge, Panel, StorKnapp, TextFalt } from "@/felsokning/ui";
import { skalaNerFoto, tidKlockslag } from "@/felsokning/format";

const FLIKAR = [
  { id: "guide", label: "Guide" },
  { id: "logg", label: "Logg" },
  { id: "brief", label: "Brief" },
  { id: "rapport", label: "Rapport" },
] as const;

type Flik = (typeof FLIKAR)[number]["id"];

const SYNKSTATUS_LABEL: Record<SynkStatus, string> = {
  lokal: "Lokalt läge",
  synkar: "Synkar …",
  synkad: "Synkad",
  offline: "Offline",
};

// Synkar ärendet mot backend: direkt vid nya händelser och därefter var
// 15:e sekund (hämtar kollegors händelser). Utan inloggning: lokalt läge.
function useSynk(arende: Arende | undefined): SynkStatus {
  const [status, setStatus] = useState<SynkStatus>("lokal");
  const sammanfoga = useFelsokning((s) => s.sammanfoga);
  const arendeId = arende?.id;
  const antal = arende?.handelser.length ?? 0;

  useEffect(() => {
    if (!arende || !arendeId) return;
    let aktiv = true;
    const kor = async () => {
      setStatus((s) => (s === "synkad" ? "synkar" : s));
      const resultat = await synkroniseraArende(arende);
      if (!aktiv) return;
      setStatus(resultat.status);
      if (resultat.handelser) sammanfoga(arendeId, resultat.handelser);
    };
    kor();
    const timer = setInterval(kor, 15000);
    return () => {
      aktiv = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- antal driver omsynk vid nya händelser
  }, [arendeId, antal, sammanfoga]);

  return status;
}

export default function ArendeSida() {
  const { id } = useParams<{ id: string }>();
  const arende = useFelsokning((s) => (id ? s.arenden[id] : undefined));
  const laggTill = useFelsokning((s) => s.laggTill);
  const [flik, setFlik] = useState<Flik>("guide");
  const [nu, setNu] = useState(() => new Date().toISOString());
  const synkStatus = useSynk(arende);

  useEffect(() => {
    const timer = setInterval(() => setNu(new Date().toISOString()), 30000);
    return () => clearInterval(timer);
  }, []);

  const metodik = metodikForArende(arende);

  if (!arende || !id) {
    return (
      <FelsokningSkal rubrik="Ärendet hittades inte" tillbaka={{ till: "/felsokning", text: "Ärenden" }}>
        <p className="text-[14px] text-[#333333]">Ärendet finns inte på den här enheten.</p>
      </FelsokningSkal>
    );
  }

  const o = objekt(arende);
  const avslutat = arAvslutat(arende);
  const total = formateraTid(tidsfordelning(arende, nu).totalMs);
  const skicka = (h: Handelse) => laggTill(id, h);

  return (
    <FelsokningSkal
      bred
      rubrik={`#${arende.nummer} ${o?.beskrivning ?? ""}`}
      tillbaka={{ till: "/felsokning", text: "Ärenden" }}
      hoger={
        <div className="text-right">
          <p className="text-[13px] font-semibold text-white">{total}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#A9C3DE]">
            {avslutat ? "Avslutat" : "Pågår"} · {SYNKSTATUS_LABEL[synkStatus]}
          </p>
        </div>
      }
    >
      {/* Ärendeidentiteten: registreras en gång, alltid synlig — det ska
          aldrig råda tvekan om vilket fordon och ärende som avses. */}
      <IdentitetsRad arende={arende} skicka={skicka} />

      {/* Klassisk trekolumnslayout på skrivbord: navigationsträd till
          vänster, arbetsyta i mitten, kontextpanel till höger. På smala
          skärmar: flikrad + en kolumn. */}
      <nav className="mb-3 grid grid-cols-4 gap-1 rounded border border-[#C6C6C6] bg-[#F7F7F7] p-1 lg:hidden">
        {FLIKAR.map((f) => (
          <button
            key={f.id}
            onClick={() => setFlik(f.id)}
            className={`min-h-9 rounded text-[13px] font-semibold transition-colors ${
              flik === f.id ? "bg-[#00437A] text-white" : "text-[#333333] hover:bg-[#E4E9EE]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </nav>

      <div className="lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:items-start lg:gap-3 xl:grid-cols-[210px_minmax(0,1fr)_300px]">
        <aside className="sticky top-14 hidden lg:block print:hidden">
          <VyTrad flik={flik} sattFlik={setFlik} arende={arende} metodik={metodik} />
        </aside>

        <div className="min-w-0">
          {!avslutat && <InaktivitetsBanner arende={arende} nu={nu} skicka={skicka} />}

          {flik === "guide" && (
            <GuideFlik arende={arende} metodik={metodik} avslutat={avslutat} skicka={skicka} nu={nu} />
          )}
          {flik === "logg" && <LoggFlik arende={arende} />}
          {flik === "brief" && <BriefFlik arende={arende} metodik={metodik} nu={nu} skicka={skicka} />}
          {flik === "rapport" && <RapportFlik arende={arende} metodik={metodik} nu={nu} skicka={skicka} />}
        </div>

        <aside className="sticky top-14 hidden xl:block print:hidden">
          <KontextPanel arende={arende} metodik={metodik} nu={nu} synkStatus={synkStatus} />
        </aside>
      </div>
    </FelsokningSkal>
  );
}

// Nyckel/värde-rader för identitetspanelerna (rapport + delade vyer).
function identitetsRader(rader: [string, string | undefined][]) {
  return rader
    .filter(([, varde]) => varde)
    .map(([etikett, varde]) => (
      <div key={etikett} className="flex justify-between gap-2 border-b border-[#EBEBEB] py-1 text-[13px] last:border-0">
        <span className="text-[#4A5560]">{etikett}</span>
        <span className="text-right font-medium">{varde}</span>
      </div>
    ));
}

// Ärendeidentiteten (Case Identity): kompakt rad med fordonsobjektet och
// ärendereferenserna — alltid synlig i arbetsytan. Ärendetypen väljs här
// och styr vilka dokumentationskrav ECM ställer.
function IdentitetsRad({ arende, skicka }: { arende: Arende; skicka: (h: Handelse) => void }) {
  const idn = arendeidentitet(arende);
  const typ = arendetyp(arende);
  const del = (etikett: string, varde?: string) =>
    varde ? (
      <span className="whitespace-nowrap">
        {etikett && <span className="text-[#707070]">{etikett} </span>}
        <span className="font-semibold text-[#1A1A1A]">{varde}</span>
      </span>
    ) : null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded border border-[#C6C6C6] bg-[#F7F7F7] px-3 py-1.5 text-[12px] print:hidden">
      {del("AO", idn.arbetsorder)}
      {del("Claim", idn.claim)}
      {del("Skadenr", idn.skadenummer)}
      {del("", idn.beskrivning)}
      {del("Regnr", idn.identifierare)}
      {del("VIN", idn.vin)}
      {del("Miltal", idn.miltal)}
      {del("Ansvarig", idn.ansvarig)}
      <label className="ml-auto flex items-center gap-1">
        <span className="text-[#707070]">Ärendetyp</span>
        <select
          value={typ}
          disabled={idn.avslutat}
          onChange={(e) => skicka({ typ: "arendetyp_satt", arendetyp: e.target.value })}
          className="rounded border border-[#ADADAD] bg-white px-1.5 py-0.5 text-[12px] focus:border-[#00437A] focus:outline-none"
        >
          {ARENDETYPER.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

// Mätarställning in/ut: instrumentpanelen fotograferas, bildtolkningen
// föreslår värdet och teknikern bekräftar. Fotot blir den officiella
// mätarställningen (E2-evidens). Undantag kräver dokumenterad orsak.
function MatarstallningSteg({ lage, skicka }: { lage: "ingaende" | "utgaende"; skicka: (h: Handelse) => void }) {
  const filRef = useRef<HTMLInputElement>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [varde, setVarde] = useState("");
  const [laser, setLaser] = useState(false);
  const [demo, setDemo] = useState(false);

  const fota = async (fil: File) => {
    setLaser(true);
    const dataUrl = await skalaNerFoto(fil);
    setFoto(dataUrl);
    try {
      const res = await lasAvInstrument(dataUrl);
      const km = res?.tolkning.varden.find((v) => /mätar|odo|km|mil/i.test(`${v.beskrivning} ${v.enhet ?? ""}`)) ?? res?.tolkning.varden[0];
      if (km) setVarde(`${km.varde}${km.enhet ? ` ${km.enhet}` : ""}`);
      if (!res) {
        setDemo(true);
        setVarde(lage === "ingaende" ? "84 320 km" : "84 512 km");
      }
    } catch {
      // Avläsningen kunde inte nås — värdet anges manuellt.
    }
    setLaser(false);
  };

  return (
    <div>
      <input
        ref={filRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const fil = e.target.files?.[0];
          if (fil) fota(fil);
          e.target.value = "";
        }}
      />
      {!foto && !laser && (
        <StorKnapp variant="sekundar" onClick={() => filRef.current?.click()}>
          📷 Fotografera instrumentpanelen
        </StorKnapp>
      )}
      {laser && <p className="animate-pulse py-1 text-center text-[12px] font-semibold text-[#00437A]">Systemet läser av mätarställningen …</p>}
      {foto && !laser && (
        <div className="mt-2">
          {demo && (
            <p className="mb-2 rounded border border-[#E0C36A] bg-[#FFF8E1] p-1.5 text-[11px] font-semibold text-[#9A6700]">
              Demo-avläsning — bildtolkningen kräver inloggning. Kontrollera värdet.
            </p>
          )}
          <img src={foto} alt="Instrumentpanel" className="mb-2 max-h-40 rounded border border-[#C6C6C6]" />
          <TextFalt label={`Mätarställning (${lage === "ingaende" ? "ingående" : "utgående"})`} varde={varde} satt={setVarde} platshallare="T.ex. 84 320 km" />
          <StorKnapp
            disabled={!varde.trim()}
            onClick={() => {
              skicka({ typ: "matarstallning", lage, varde: varde.trim(), dataUrl: foto });
              setFoto(null);
              setVarde("");
            }}
          >
            Spara mätarställning
          </StorKnapp>
        </div>
      )}
      <Undantag vidUndantag={(orsak) => skicka({ typ: "matarstallning", lage, varde: "", undantag: orsak })} />
    </div>
  );
}

// Pre-Diagnostic Validation: ingen felsökning påbörjas förrän
// grundkontrollerna är genomförda — eller dokumenterat motiverade.
function PreDiagnostikPanel({ arende, skicka }: { arende: Arende; skicka: (h: Handelse) => void }) {
  const rader = preDiagnostik(arende);
  const rad = (id: string) => rader.find((r) => r.id === id)!;
  const [historikVal, setHistorikVal] = useState<"" | "ja" | "nej">("");
  const [historikText, setHistorikText] = useState("");
  const fb = felbeskrivning(arende);
  const harTidiga = arende.handelser.some((p) => p.handelse.typ === "observation" || p.handelse.typ === "foto");

  return (
    <Panel rubrik="Pre-diagnostik — innan felsökningen börjar">
      {rader.map((r) => (
        <p key={r.id} className="py-0.5 text-[13px]">
          <span className={r.klar ? "text-[#1E6B34]" : "text-[#8B1A1A]"}>{r.klar ? "✅" : "☐"}</span> {r.rubrik}
          {r.varning && <span className="ml-1 text-[11px] font-semibold text-[#9A6700]">⚠ {r.varning}</span>}
        </p>
      ))}

      {!rad("historik").klar && (
        <div className="mt-3 border-t border-[#DDDDDD] pt-2">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#4A5560]">
            Har fordonets historik kontrollerats? (tidigare arbeten, återkommande fel, TSB, kampanjer)
          </p>
          <div className="mb-2 grid grid-cols-2 gap-2">
            <StorKnapp variant={historikVal === "ja" ? "primar" : "sekundar"} onClick={() => setHistorikVal("ja")}>
              Ja — kontrollerad
            </StorKnapp>
            <StorKnapp variant={historikVal === "nej" ? "fara" : "sekundar"} onClick={() => setHistorikVal("nej")}>
              Nej
            </StorKnapp>
          </div>
          {historikVal && (
            <>
              <TextFalt
                label={historikVal === "ja" ? "Relevanta tidigare arbeten (valfritt — orsakskedja)" : "Orsak till att historiken inte kontrollerats (obligatoriskt)"}
                varde={historikText}
                satt={setHistorikText}
                platshallare={historikVal === "ja" ? "T.ex. Vattenpump bytt för 8 mån sedan — misstänkt läckage samma område" : ""}
                rost
              />
              <StorKnapp
                disabled={historikVal === "nej" && !historikText.trim()}
                onClick={() => {
                  skicka({ typ: "historik_kontrollerad", kontrollerad: historikVal === "ja", kommentar: historikText.trim() || undefined });
                  setHistorikVal("");
                  setHistorikText("");
                }}
              >
                Dokumentera
              </StorKnapp>
            </>
          )}
        </div>
      )}

      {!rad("matarstallning_in").klar && (
        <div className="mt-3 border-t border-[#DDDDDD] pt-2">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#4A5560]">
            Ingående mätarställning — fotografera instrumentpanelen
          </p>
          <MatarstallningSteg lage="ingaende" skicka={skicka} />
        </div>
      )}

      {!rad("felbeskrivning").klar && (
        <div className="mt-3 border-t border-[#DDDDDD] pt-2">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#4A5560]">
            Är kundens felbeskrivning korrekt återgiven?
          </p>
          {fb && <p className="mb-2 text-[13px]">”{fb}”</p>}
          <StorKnapp variant="sekundar" onClick={() => skicka({ typ: "kommentar", text: `${MARKOR_FELBESKRIVNING_VERIFIERAD}.` })}>
            Stämmer — verifierad
          </StorKnapp>
          <p className="mt-1 text-[11px] text-[#707070]">
            Ytterligare symptom dokumenteras som separata observationer — blanda dem inte med kundens beskrivning.
          </p>
        </div>
      )}

      {!rad("tidiga_observationer").klar && (
        <div className="mt-3 border-t border-[#DDDDDD] pt-2">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#4A5560]">
            Något ytterligare vid mottagandet? (reparationsspår, modifieringar, skador, läckage, korrosion …)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <StorKnapp variant="sekundar" onClick={() => skicka({ typ: "kommentar", text: `${MARKOR_INGA_TIDIGA_OBSERVATIONER}.` })}>
              Inga ytterligare observationer
            </StorKnapp>
            <StorKnapp
              variant="sekundar"
              disabled={!harTidiga}
              onClick={() => skicka({ typ: "kommentar", text: `${MARKOR_TIDIGA_OBSERVATIONER_KLARA}.` })}
            >
              Observationerna är dokumenterade
            </StorKnapp>
          </div>
          <p className="mt-1 text-[11px] text-[#707070]">
            Dokumentera med foto eller observation i panelen nedan — knappen låses upp när något loggats.
          </p>
        </div>
      )}
    </Panel>
  );
}

// Symptom Verification Protocol: kundens beskrivning blir aldrig ett
// konstaterat fel förrän den reproducerats — eller dokumenterats som ej
// reproducerbar med obligatorisk motivering.
function ReproduceringPanel({ skicka }: { skicka: (h: Handelse) => void }) {
  const [status, setStatus] = useState<"" | "ja" | "delvis" | "nej">("");
  const [text, setText] = useState("");
  const etikett =
    status === "ja"
      ? "Hur reproducerades felet? (förhållanden, hastighet, temperatur, belastning …)"
      : status === "delvis"
        ? "Vad kunde respektive kunde inte reproduceras?"
        : "Motivering (obligatorisk) — varför kunde felet inte reproduceras?";
  return (
    <Panel rubrik="Symptomverifiering — reproducering">
      <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#4A5560]">
        Har kundens fel kunnat reproduceras?
      </p>
      <div className="mb-2 grid grid-cols-3 gap-2">
        {(["ja", "delvis", "nej"] as const).map((val) => (
          <StorKnapp key={val} variant={status === val ? "primar" : "sekundar"} onClick={() => setStatus(val)}>
            {val === "ja" ? "Ja" : val === "delvis" ? "Delvis" : "Nej"}
          </StorKnapp>
        ))}
      </div>
      {status && (
        <>
          <TextFalt label={etikett} varde={text} satt={setText} flerRad rost
            platshallare={status === "ja" ? "T.ex. Reproducerad tre gånger vid 92–108 km/h på plan väg, varm motor" : ""} />
          <StorKnapp
            disabled={!text.trim()}
            onClick={() => {
              skicka({ typ: "reproducering", status, beskrivning: text.trim() });
              setStatus("");
              setText("");
            }}
          >
            Dokumentera reproducering
          </StorKnapp>
        </>
      )}
    </Panel>
  );
}

// Felorsaksanalys (Root Cause Analysis): vad är avvikelsen, varför har
// den uppstått, vilket underlag stöder bedömningen och hur säker är den.
// Kvalitetsregeln avvisar generella formuleringar ("trasig", "defekt")
// och evidenskällor som inte finns i loggen.
function FelorsaksPanel({ arende, skicka }: { arende: Arende; skicka: (h: Handelse) => void }) {
  const dokumenterade = felorsaker(arende);
  const [oppen, setOppen] = useState(false);
  const [avvikelse, setAvvikelse] = useState("");
  const [orsaker, setOrsaker] = useState<string[]>([]);
  const [underlag, setUnderlag] = useState<string[]>([]);
  const [sakerhet, setSakerhet] = useState<Tillforlitlighet>("hog");
  const [atgard, setAtgard] = useState("");
  const [motivering, setMotivering] = useState("");
  const [ytterligare, setYtterligare] = useState("");
  const [fel, setFel] = useState("");

  const vaxla = (lista: string[], satt: (v: string[]) => void, val: string) =>
    satt(lista.includes(val) ? lista.filter((v) => v !== val) : [...lista, val]);

  const spara = () => {
    const avvikelseFel = granskaAvvikelse(avvikelse);
    if (avvikelseFel) return setFel(avvikelseFel);
    if (orsaker.length === 0) return setFel("Välj minst en orsakskategori.");
    if (underlag.length === 0) return setFel("Koppla minst en evidenskälla till bedömningen.");
    const saknat = underlag.find((k) => !underlagFinns(arende, k));
    if (saknat) return setFel(`Underlaget ”${saknat}” finns inte i ärendets logg — dokumentera det först eller välj en annan källa.`);
    if (orsaker.includes("Okänd orsak") && !motivering.trim())
      return setFel("Okänd orsak kräver en motivering till varför orsaken inte kunnat fastställas.");
    if (sakerhet !== "hog" && !ytterligare.trim())
      return setFel("Vid medel/låg säkerhet: ange vilka ytterligare kontroller som skulle stärka bedömningen.");
    if (!atgard.trim()) return setFel("Ange rekommenderad åtgärd.");
    skicka({
      typ: "felorsak",
      avvikelse: avvikelse.trim(),
      orsaker,
      underlag,
      sakerhet,
      atgard: atgard.trim(),
      motivering: motivering.trim() || undefined,
      ytterligareKontroller: ytterligare.trim() || undefined,
    });
    setOppen(false);
    setAvvikelse("");
    setOrsaker([]);
    setUnderlag([]);
    setSakerhet("hog");
    setAtgard("");
    setMotivering("");
    setYtterligare("");
    setFel("");
  };

  return (
    <Panel rubrik="Felorsaksanalys — obligatorisk före avslut">
      {dokumenterade.map((p) => {
        const h = p.handelse;
        if (h.typ !== "felorsak") return null;
        return (
          <div key={p.id} className="mb-2 border-b border-[#EBEBEB] pb-2 text-[13px] last:border-0">
            <p className="font-semibold">{h.avvikelse}</p>
            <p className="text-[#4A5560]">
              Orsak: {h.orsaker.join(", ")} · Underlag: {h.underlag.join(", ")} · Säkerhet: {TILLFORLITLIGHET_LABEL[h.sakerhet]}
            </p>
            <p>Åtgärd: {h.atgard}</p>
          </div>
        );
      })}
      {!oppen ? (
        <StorKnapp variant="sekundar" onClick={() => setOppen(true)}>
          + Dokumentera felorsak
        </StorKnapp>
      ) : (
        <div>
          <TextFalt
            label="1. Konstaterad avvikelse (inte bara komponenten)"
            varde={avvikelse}
            satt={setAvvikelse}
            flerRad
            rost
            platshallare="T.ex. Startmotorn aktiverar inte trots korrekt matningsspänning och god jordförbindelse."
          />
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#4A5560]">2. Mest sannolik orsak (en eller flera)</p>
          <div className="mb-3 grid grid-cols-2 gap-1 sm:grid-cols-3">
            {ORSAKSKATEGORIER.map((o) => (
              <button
                key={o}
                onClick={() => vaxla(orsaker, setOrsaker, o)}
                className={`min-h-8 rounded border px-1.5 text-[12px] font-medium ${
                  orsaker.includes(o) ? "border-[#00437A] bg-[#D6E4F2] text-[#00437A]" : "border-[#C6C6C6] bg-white text-[#333333]"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#4A5560]">3. Underlag som stöder bedömningen</p>
          <div className="mb-3 grid grid-cols-2 gap-1 sm:grid-cols-4">
            {UNDERLAGSKALLOR.map((k) => (
              <button
                key={k}
                onClick={() => vaxla(underlag, setUnderlag, k)}
                className={`min-h-8 rounded border px-1.5 text-[12px] font-medium ${
                  underlag.includes(k) ? "border-[#00437A] bg-[#D6E4F2] text-[#00437A]" : "border-[#C6C6C6] bg-white text-[#333333]"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#4A5560]">4. Säkerhet i bedömningen</p>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {(["hog", "medel", "lag"] as const).map((n) => (
              <button
                key={n}
                onClick={() => setSakerhet(n)}
                className={`min-h-9 rounded border text-[12px] font-semibold ${
                  sakerhet === n ? "border-[#00437A] bg-[#00437A] text-white" : "border-[#ADADAD] bg-white text-[#333333]"
                }`}
              >
                {TILLFORLITLIGHET_LABEL[n]}
              </button>
            ))}
          </div>
          {sakerhet !== "hog" && (
            <TextFalt
              label="Vilka ytterligare kontroller skulle stärka bedömningen?"
              varde={ytterligare}
              satt={setYtterligare}
              rost
            />
          )}
          {orsaker.includes("Okänd orsak") && (
            <TextFalt
              label="Motivering — varför kunde orsaken inte fastställas?"
              varde={motivering}
              satt={setMotivering}
              flerRad
              rost
            />
          )}
          <TextFalt label="Rekommenderad åtgärd" varde={atgard} satt={setAtgard} rost platshallare="T.ex. Balansera framhjulen och genomför ny provkörning." />
          {fel && <p className="mb-2 text-[12px] font-semibold text-[#8B1A1A]">{fel}</p>}
          <div className="grid grid-cols-2 gap-2">
            <StorKnapp variant="sekundar" onClick={() => setOppen(false)}>
              Avbryt
            </StorKnapp>
            <StorKnapp onClick={spara}>Spara felorsak</StorKnapp>
          </div>
        </div>
      )}
    </Panel>
  );
}

// Navigationsträd (vänsterkolumnen): ärendets vyer plus metodikens steg
// med status — som en mappstruktur i ett klassiskt verkstadssystem.
function VyTrad({
  flik,
  sattFlik,
  arende,
  metodik,
}: {
  flik: Flik;
  sattFlik: (f: Flik) => void;
  arende: Arende;
  metodik: Metodik;
}) {
  const steg = nastaSteg(arende, metodik);
  const aktuellIndex = metodik.steg.findIndex((s) => s.id === steg.steg.id);
  return (
    <nav className="overflow-hidden rounded border border-[#C6C6C6] bg-[#F7F7F7] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
      <p className="border-b border-[#DDDDDD] bg-[#EFEFEF] px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#4A5560]">
        Ärendevyer
      </p>
      {FLIKAR.map((f) => (
        <button
          key={f.id}
          onClick={() => sattFlik(f.id)}
          className={`block w-full border-l-2 px-3 py-1.5 text-left text-[13px] transition-colors ${
            flik === f.id
              ? "border-[#00437A] bg-[#D6E4F2] font-semibold text-[#00437A]"
              : "border-transparent text-[#333333] hover:bg-[#E4E9EE]"
          }`}
        >
          {f.label}
        </button>
      ))}
      <p className="border-y border-[#DDDDDD] bg-[#EFEFEF] px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#4A5560]">
        {metodik.namn}
      </p>
      {metodik.steg.map((s, i) => {
        const klar = steg.klart || i < aktuellIndex;
        const aktuell = !steg.klart && i === aktuellIndex;
        return (
          <p
            key={s.id}
            className={`px-3 py-1 text-[12px] ${
              aktuell ? "bg-[#FFF8E1] font-semibold text-[#9A6700]" : klar ? "text-[#1E6B34]" : "text-[#707070]"
            }`}
          >
            {klar ? "✓" : aktuell ? "▸" : "·"} {s.rubrik}
          </p>
        );
      })}
    </nav>
  );
}

// Kontextpanel (högerkolumnen): teknisk information, tillförlitlighet och
// senaste tekniska rekommendation — alltid synlig på breda skärmar.
function KontextPanel({
  arende,
  metodik,
  nu,
  synkStatus,
}: {
  arende: Arende;
  metodik: Metodik;
  nu: string;
  synkStatus: SynkStatus;
}) {
  const b = brief(arende, metodik, nu);
  const senasteAi = [...arende.handelser].reverse().find((p) => p.handelse.typ === "ai_svar");
  const rad = (etikett: string, varde: string | undefined) =>
    varde ? (
      <div className="flex justify-between gap-2 border-b border-[#EBEBEB] py-1 text-[12px] last:border-0">
        <span className="shrink-0 text-[#4A5560]">{etikett}</span>
        <span className="text-right font-medium text-[#1A1A1A]">{varde}</span>
      </div>
    ) : null;
  return (
    <div>
      <Panel rubrik="Teknisk information">
        {rad("Objekt", b.objekt?.beskrivning)}
        {rad("Ident", b.objekt?.identifierare)}
        {rad("Kund", b.objekt?.kund)}
        {rad("Ansvarig", b.ansvarig)}
        {rad("Status", b.avslutat ? "Avslutat" : "Pågår")}
        {rad("Synk", SYNKSTATUS_LABEL[synkStatus])}
        {rad("Arbetstid", b.totalArbetstid)}
      </Panel>
      <Panel rubrik="Tillförlitlighet">
        {b.tillforlitlighet.map((r, i) => (
          <p key={i} className="py-0.5 text-[12px]">
            <NivaBadge niva={r.niva} /> {r.text}
          </p>
        ))}
      </Panel>
      {!b.avslutat && b.rekommenderatNastaSteg.length > 0 && (
        <Panel rubrik="Rekommenderat nästa steg">
          {b.rekommenderatNastaSteg.map((s, i) => (
            <p key={i} className="py-0.5 text-[12px] text-[#333333]">
              {i + 1}. {s}
            </p>
          ))}
        </Panel>
      )}
      {senasteAi && senasteAi.handelse.typ === "ai_svar" && (
        <Panel rubrik="Teknisk rekommendation">
          {senasteAi.handelse.rader.map((r, i) => (
            <p key={i} className="py-0.5 text-[12px]">
              <span className="font-semibold text-[#4A5560]">{AI_RADTYP_LABEL[r.typ]}:</span> {r.text}
            </p>
          ))}
          <p className="mt-1 text-[12px]">
            <span className="font-semibold text-[#00437A]">Nästa steg:</span> {senasteAi.handelse.nastaSteg}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-[#707070]">
            Beslutsstöd · presenteras aldrig som konstaterat fel
          </p>
        </Panel>
      )}
    </div>
  );
}

// Vid längre inaktivitet ber systemet om sammanhang — svaret blir en loggpost.
function InaktivitetsBanner({
  arende,
  nu,
  skicka,
}: {
  arende: Arende;
  nu: string;
  skicka: (h: Handelse) => void;
}) {
  const [text, setText] = useState("");
  const sista = sistaAktivitet(arende);
  if (!sista) return null;
  const minuter = Math.floor((new Date(nu).getTime() - new Date(sista.tidpunkt).getTime()) / 60000);
  if (minuter < 20) return null;
  return (
    <div className="mb-4 rounded border border-[#00437A] bg-[#F7F7F7] p-4">
      <p className="mb-2 text-[14px] font-semibold text-[#00437A]">
        Ingen aktivitet har registrerats de senaste {minuter} minuterna.
      </p>
      <p className="mb-3 text-[#333333]">Beskriv kort vad som gjorts under denna period.</p>
      <TextFalt label="Vad har gjorts?" varde={text} satt={setText} platshallare="T.ex. Demonterade instrumentpanelen för att komma åt kabelstammen." rost />
      <StorKnapp
        disabled={!text.trim()}
        onClick={() => {
          skicka({ typ: "inaktivitet_forklarad", text: text.trim(), minuter });
          setText("");
        }}
      >
        Lägg till i arbetsloggen
      </StorKnapp>
    </div>
  );
}

function GuideFlik({
  arende,
  metodik,
  avslutat,
  skicka,
  nu,
}: {
  arende: Arende;
  metodik: Metodik;
  avslutat: boolean;
  skicka: (h: Handelse) => void;
  nu: string;
}) {
  const steg = useMemo(() => nastaSteg(arende, metodik), [arende, metodik]);
  const [visaOverlamning, setVisaOverlamning] = useState(false);
  const [aiStatus, setAiStatus] = useState<"vilar" | "arbetar" | "fel">("vilar");

  // AI-orkestern drivs av plattformen: handledningen (Sonnet 5) svarar på
  // varje bekräftad dokumentation, klassificerat och loggat som händelse.
  // I lokalt läge (ej inloggad) guidar den deterministiska metodiken ensam.
  const fragaAiOmDokumentation = async (inmatning: string) => {
    setAiStatus("arbetar");
    try {
      const svar = await fragaAi(brief(arende, metodik, nu), metodik.namn, inmatning);
      if (svar) {
        skicka({ typ: "ai_svar", rader: svar.rader, nastaSteg: svar.nastaSteg, modell: svar.modell });
      }
      setAiStatus("vilar");
    } catch {
      setAiStatus("fel");
    }
  };

  const senasteAiSvar = [...arende.handelser].reverse().find((p) => p.handelse.typ === "ai_svar");

  // Avslut kräver SVP (reproducering dokumenterad) + felorsaksanalys.
  const kanAvslutas = !!reproducering(arende) && felorsaker(arende).length > 0;

  if (avslutat) {
    return (
      <Panel rubrik="Felsökningen är avslutad">
        <p className="text-[14px] text-[#333333]">
          Ärendet är låst för nya guidesteg. Loggen, briefen och rapporten finns kvar för spårbarhet och export.
        </p>
      </Panel>
    );
  }

  // Pre-Diagnostic Validation: metodiken öppnas först när grund-
  // kontrollerna är genomförda eller dokumenterat motiverade.
  if (!preDiagnostik(arende).every((r) => r.klar)) {
    return (
      <>
        <KategoriRad arende={arende} skicka={skicka} />
        <PreDiagnostikPanel arende={arende} skicka={skicka} />
        <SnabbDokumentation skicka={skicka} paSparad={fragaAiOmDokumentation} />
      </>
    );
  }

  return (
    <>
      <KategoriRad arende={arende} skicka={skicka} />
      <Panel rubrik={`Metodik: ${metodik.namn} · Steg: ${steg.steg.rubrik}`}>
        {steg.klart ? (
          <>
            <p className="mb-3 text-[15px] font-semibold">Samtliga steg i metodiken är dokumenterade.</p>
            <p className="mb-4 text-[#333333]">
              Om felorsaken inte är verifierad: dokumentera en hypotes och utöka felsökningen, eller avsluta ärendet
              med rekommenderade nästa steg.
            </p>
            <StorKnapp variant="fara" disabled={!kanAvslutas} onClick={() => skicka({ typ: "arende_avslutat" })}>
              Avsluta felsökning
            </StorKnapp>
            {!kanAvslutas && (
              <p className="mt-2 text-[12px] font-semibold text-[#9A6700]">
                Avslut kräver dokumenterad symptomverifiering och felorsaksanalys — se panelerna nedan.
              </p>
            )}
          </>
        ) : steg.fraga ? (
          <FrageKort key={`${steg.steg.id}/${steg.fraga.id}`} steg={steg} skicka={skicka} />
        ) : steg.kontroll ? (
          <KontrollKort key={`${steg.steg.id}/${steg.kontroll.id}`} steg={steg} skicka={skicka} />
        ) : null}
      </Panel>

      {(aiStatus !== "vilar" || senasteAiSvar) && (
        <Panel
          rubrik={
            senasteAiSvar?.handelse.typ === "ai_svar"
              ? `Handledning (${senasteAiSvar.handelse.modell})`
              : "Handledning"
          }
        >
          {aiStatus === "arbetar" && <p className="mb-2 animate-pulse font-semibold text-[#00437A]">Systemet analyserar …</p>}
          {aiStatus === "fel" && (
            <p className="mb-2 font-semibold text-[#8B1A1A]">Analysen kunde inte hämtas — försök igen. Metodiken fortsätter som vanligt.</p>
          )}
          {senasteAiSvar && senasteAiSvar.handelse.typ === "ai_svar" && (
            <>
              {senasteAiSvar.handelse.rader.map((rad, i) => (
                <p key={i} className="py-0.5 text-[14px]">
                  <span className="font-semibold text-[#4A5560]">{AI_RADTYP_LABEL[rad.typ]}:</span> {rad.text}
                </p>
              ))}
              <p className="mt-2 text-[14px]">
                <span className="font-semibold text-[#00437A]">Nästa steg:</span>{" "}
                {senasteAiSvar.handelse.nastaSteg}
              </p>
            </>
          )}
        </Panel>
      )}

      <SnabbDokumentation skicka={skicka} paSparad={fragaAiOmDokumentation} />

      {/* SVP: symptomet ska reproduceras — eller dokumenteras som ej
          reproducerbart med motivering — innan ärendet kan avslutas. */}
      {!reproducering(arende) && <ReproduceringPanel skicka={skicka} />}

      {/* Felorsaksanalys: aldrig bara "komponent trasig, byt komponent" —
          varje konstaterat fel kräver avvikelse, orsak, underlag och
          säkerhetsnivå. Obligatorisk för avslut. */}
      <FelorsaksPanel arende={arende} skicka={skicka} />

      {/* Utgående mätarställning: obligatorisk för kvalitetsgrinden när
          ärendet avslutas — erbjuds så fort metodiken är genomarbetad. */}
      {!arende.handelser.some((p) => p.handelse.typ === "matarstallning" && p.handelse.lage === "utgaende") && (
        <Panel rubrik="Utgående mätarställning — inför avslut">
          <MatarstallningSteg lage="utgaende" skicka={skicka} />
        </Panel>
      )}

      {!kanAvslutas && (
        <p className="mb-2 text-[12px] font-semibold text-[#9A6700]">
          Avslut kräver dokumenterad symptomverifiering och felorsaksanalys — annars är slutsatsen inte spårbar.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <StorKnapp variant="sekundar" onClick={() => setVisaOverlamning(true)}>
          Lämna över arbete
        </StorKnapp>
        <StorKnapp variant="sekundar" disabled={!kanAvslutas} onClick={() => skicka({ typ: "arende_avslutat" })}>
          Avsluta felsökning
        </StorKnapp>
      </div>

      {visaOverlamning && (
        <OverlamningDialog arende={arende} metodik={metodik} nu={nu} skicka={skicka} stang={() => setVisaOverlamning(false)} />
      )}
    </>
  );
}

function KategoriRad({ arende, skicka }: { arende: Arende; skicka: (h: Handelse) => void }) {
  let aktiv: TidKategori = "aktiv_felsokning";
  for (const post of arende.handelser) {
    if (post.handelse.typ === "kategori_byte") aktiv = post.handelse.kategori;
  }
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
      {(Object.keys(TIDKATEGORI_LABEL) as TidKategori[]).map((k) => (
        <button
          key={k}
          onClick={() => k !== aktiv && skicka({ typ: "kategori_byte", kategori: k })}
          className={`whitespace-nowrap rounded border px-4 py-2 text-[12px] font-semibold transition-colors ${
            k === aktiv
              ? "border-[#00437A] bg-[#00437A] text-white"
              : "border-[#ADADAD] bg-[#F7F7F7] text-[#333333] hover:border-[#8FA8C0]"
          }`}
        >
          {TIDKATEGORI_LABEL[k]}
        </button>
      ))}
    </div>
  );
}

// En fråga i taget, stora svarsknappar.
function FrageKort({ steg, skicka }: { steg: NastaSteg; skicka: (h: Handelse) => void }) {
  const fraga = steg.fraga!;
  const [text, setText] = useState("");
  const svara = (svar: string) =>
    skicka({ typ: "fraga_besvarad", stegId: steg.steg.id, frageId: fraga.id, fraga: fraga.text, svar });

  return (
    <>
      <p className="mb-4 text-[17px] font-semibold leading-snug">{fraga.text}</p>
      {fraga.svarstyp === "janej" && (
        <div className="grid grid-cols-2 gap-2">
          <StorKnapp onClick={() => svara("Ja")}>Ja</StorKnapp>
          <StorKnapp onClick={() => svara("Nej")}>Nej</StorKnapp>
        </div>
      )}
      {fraga.svarstyp === "val" && (
        <div className="grid gap-2">
          {fraga.val!.map((v) => (
            <StorKnapp key={v} variant="sekundar" onClick={() => svara(v)}>
              {v}
            </StorKnapp>
          ))}
        </div>
      )}
      {fraga.svarstyp === "text" && (
        <>
          <TextFalt label="Svar" varde={text} satt={setText} rost />
          <StorKnapp disabled={!text.trim()} onClick={() => svara(text.trim())}>
            Spara svar
          </StorKnapp>
        </>
      )}
    </>
  );
}

// Verifierad checklista: en kontrollpunkt är inte slutförd enbart genom en
// kryssruta — minimikravet (foto, mätvärde eller kort observation) styrs av
// kontrolltypen i metodiken.
function KontrollKort({ steg, skicka }: { steg: NastaSteg; skicka: (h: Handelse) => void }) {
  const kontroll = steg.kontroll!;
  const [resultat, setResultat] = useState("");
  const filRef = useRef<HTMLInputElement>(null);
  const krav = kontroll.krav;

  const utford = () =>
    skicka({
      typ: "kontroll_utford",
      stegId: steg.steg.id,
      kontrollId: kontroll.id,
      text: kontroll.text,
      resultat: resultat.trim() || undefined,
    });

  const kravUppfyllt = krav === "foto" || !krav || resultat.trim().length > 0;

  return (
    <>
      {steg.steg.beskrivning && <p className="mb-2 text-[#4A5560]">{steg.steg.beskrivning}</p>}
      <p className="mb-4 text-[17px] font-semibold leading-snug">{kontroll.text}</p>
      {krav === "foto" ? (
        <>
          <input
            ref={filRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={async (e) => {
              const fil = e.target.files?.[0];
              if (!fil) return;
              const dataUrl = await skalaNerFoto(fil);
              skicka({ typ: "foto", beskrivning: kontroll.text, dataUrl });
              utford();
            }}
          />
          <TextFalt label="Observation (valfritt)" varde={resultat} satt={setResultat} rost />
          <StorKnapp onClick={() => filRef.current?.click()}>📷 Ta foto — verifierar kontrollen</StorKnapp>
          <p className="mt-2 text-[12px] text-[#707070]">Denna kontroll verifieras med foto.</p>
        </>
      ) : (
        <>
          <TextFalt
            label={
              krav === "matvarde"
                ? "Uppmätt värde (krävs för verifiering)"
                : krav === "kommentar"
                  ? "Vad observerades? (krävs för verifiering)"
                  : "Resultat / avläst värde (valfritt)"
            }
            varde={resultat}
            satt={setResultat}
            platshallare={krav === "matvarde" ? "T.ex. 2,4 bar samtliga hjul" : "T.ex. Säkringen är hel, spänning på båda sidor"}
            rost
          />
          {!kravUppfyllt && (
            <p className="mb-3 text-[12px] font-semibold text-[#00437A]">
              Ingen {krav === "matvarde" ? "mätning" : "observation"} har registrerats — lägg till en kort{" "}
              {krav === "matvarde" ? "mätuppgift" : "kommentar"} innan kontrollen kan verifieras.
            </p>
          )}
          <StorKnapp disabled={!kravUppfyllt} onClick={utford}>
            Markera verifierad
          </StorKnapp>
        </>
      )}
      <Undantag
        vidUndantag={(orsak) =>
          skicka({
            typ: "kontroll_utford",
            stegId: steg.steg.id,
            kontrollId: kontroll.id,
            text: kontroll.text,
            undantag: orsak,
          })
        }
      />
    </>
  );
}

// ECM-regeln: en kontroll kan bara slutföras med evidens ELLER ett
// uttryckligt undantag — "underlaget kan inte tas fram" — där orsaken
// alltid är obligatorisk och loggas i händelseloggen.
function Undantag({ vidUndantag }: { vidUndantag: (orsak: string) => void }) {
  const [oppen, setOppen] = useState(false);
  const [orsak, setOrsak] = useState("");

  if (!oppen) {
    return (
      <button
        onClick={() => setOppen(true)}
        className="mt-2 w-full py-1 text-[12px] font-medium text-[#707070] underline-offset-2 hover:text-[#8B1A1A] hover:underline print:hidden"
      >
        Underlag kan inte tas fram …
      </button>
    );
  }
  return (
    <div className="mt-3 rounded border border-[#E0C36A] bg-[#FFF8E1] p-2">
      <p className="mb-2 text-[12px] font-semibold text-[#9A6700]">
        Kontrollen dokumenteras utan underlag — ange orsak (obligatoriskt). Detta flaggas i brief och rapport.
      </p>
      <div className="mb-2 grid grid-cols-1 gap-1">
        {UNDANTAGSORSAKER.map((val) => (
          <button
            key={val}
            onClick={() => setOrsak(val)}
            className={`min-h-8 rounded border px-2 text-left text-[12px] font-medium ${
              orsak === val ? "border-[#00437A] bg-[#D6E4F2]" : "border-[#C6C6C6] bg-white"
            }`}
          >
            {val}
          </button>
        ))}
      </div>
      <TextFalt label="Eller egen orsak" varde={orsak && !UNDANTAGSORSAKER.includes(orsak) ? orsak : ""} satt={setOrsak} rost />
      <div className="grid grid-cols-2 gap-2">
        <StorKnapp variant="sekundar" onClick={() => setOppen(false)}>
          Avbryt
        </StorKnapp>
        <StorKnapp variant="fara" disabled={!orsak.trim()} onClick={() => vidUndantag(orsak.trim())}>
          Dokumentera undantag
        </StorKnapp>
      </div>
    </div>
  );
}

const DOKTYPER = [
  { id: "observation", label: "Observation" },
  { id: "matvarde", label: "Mätvärde" },
  { id: "foto", label: "Foto" },
  { id: "instrument", label: "📷 Instrument" },
  { id: "hypotes", label: "Hypotes" },
  { id: "kommentar", label: "Kommentar" },
] as const;

// Fri dokumentation vid sidan av guiden. Hypoteser märks alltid som
// ej verifierade — de kan aldrig loggas som konstaterade fel.
// paSparad anropas med en textsammanfattning EFTER att användaren bekräftat
// med Spara — det är den texten AI:n får (aldrig obekräftad inmatning).
function SnabbDokumentation({
  skicka,
  paSparad,
}: {
  skicka: (h: Handelse) => void;
  paSparad?: (sammanfattning: string) => void;
}) {
  const [typ, setTyp] = useState<(typeof DOKTYPER)[number]["id"] | null>(null);
  const [text, setText] = useState("");
  const [varde, setVarde] = useState("");
  const filRef = useRef<HTMLInputElement>(null);
  const instRef = useRef<HTMLInputElement>(null);
  const [avlasning, setAvlasning] = useState<{ foto: string; tolkning: InstrumentTolkning; demo?: boolean } | null>(null);
  const [laserAv, setLaserAv] = useState(false);

  const aterstall = () => {
    setTyp(null);
    setText("");
    setVarde("");
  };

  // Visual-first: instrumentet/skärmen fotograferas, bildtolkningen
  // extraherar värdena och teknikern bekräftar innan något loggas.
  // Originalbilden bevaras alltid som evidens bredvid de strukturerade
  // värdena. I lokalt läge visas en tydligt märkt demo-avläsning.
  const lasAv = async (fil: File) => {
    setLaserAv(true);
    const foto = await skalaNerFoto(fil);
    try {
      const resultat = await lasAvInstrument(foto);
      if (resultat && resultat.tolkning.varden.length > 0) {
        setAvlasning({ foto, tolkning: resultat.tolkning });
      } else if (!resultat) {
        setAvlasning({ foto, tolkning: byggDemoInstrument(), demo: true });
      } else {
        skicka({ typ: "foto", beskrivning: "Instrumentfoto — inga värden kunde läsas", dataUrl: foto });
      }
    } catch {
      skicka({ typ: "foto", beskrivning: "Instrumentfoto — avläsningen kunde inte nås", dataUrl: foto });
    }
    setLaserAv(false);
  };

  const sparaAvlasning = () => {
    if (!avlasning) return;
    // Originalet först, sedan varje bekräftat värde som eget mätvärde —
    // strukturerad data ersätter aldrig originalevidensen.
    skicka({ typ: "foto", beskrivning: `Instrumentavläsning (${avlasning.tolkning.instrumenttyp})`, dataUrl: avlasning.foto });
    for (const v of avlasning.tolkning.varden) {
      skicka({ typ: "matvarde", beskrivning: v.beskrivning, varde: v.varde, enhet: v.enhet });
    }
    paSparad?.(
      `Instrumentavläsning (${avlasning.tolkning.instrumenttyp}): ${avlasning.tolkning.varden
        .map((v) => `${v.beskrivning} = ${v.varde}${v.enhet ? ` ${v.enhet}` : ""}`)
        .join("; ")}`,
    );
    setAvlasning(null);
  };

  const spara = () => {
    const t = text.trim();
    if (typ === "observation" && t) {
      skicka({ typ: "observation", text: t });
      paSparad?.(`Observation: ${t}`);
    }
    if (typ === "kommentar" && t) {
      skicka({ typ: "kommentar", text: t });
      paSparad?.(t);
    }
    if (typ === "hypotes" && t) {
      skicka({ typ: "hypotes", text: t, niva: "lag" });
      paSparad?.(`Teknikerns hypotes (ej verifierad): ${t}`);
    }
    if (typ === "matvarde" && t && varde.trim()) {
      skicka({ typ: "matvarde", beskrivning: t, varde: varde.trim() });
      paSparad?.(`Mätvärde: ${t} = ${varde.trim()}`);
    }
    aterstall();
  };

  return (
    <Panel rubrik="Dokumentera">
      <div className="grid grid-cols-3 gap-2">
        {DOKTYPER.map((d) => (
          <button
            key={d.id}
            onClick={() =>
              d.id === "foto"
                ? filRef.current?.click()
                : d.id === "instrument"
                  ? instRef.current?.click()
                  : setTyp(typ === d.id ? null : d.id)
            }
            className={`min-h-9 rounded border text-[12px] font-semibold transition-colors ${
              typ === d.id
                ? "border-[#00437A] bg-[#00437A] text-white"
                : "border-[#ADADAD] bg-[#F7F7F7] text-[#333333] hover:border-[#8FA8C0]"
            }`}
          >
            + {d.label}
          </button>
        ))}
      </div>
      <input
        ref={filRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={async (e) => {
          const fil = e.target.files?.[0];
          if (!fil) return;
          const dataUrl = await skalaNerFoto(fil);
          skicka({ typ: "foto", beskrivning: "Foto", dataUrl });
          e.target.value = "";
        }}
      />
      <input
        ref={instRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const fil = e.target.files?.[0];
          if (fil) lasAv(fil);
          e.target.value = "";
        }}
      />
      {laserAv && <p className="mt-2 animate-pulse text-center text-[12px] font-semibold text-[#00437A]">Systemet läser av instrumentet …</p>}
      {avlasning && (
        <div className="mt-3 rounded border border-[#C6C6C6] bg-white p-2">
          {avlasning.demo && (
            <p className="mb-2 rounded border border-[#E0C36A] bg-[#FFF8E1] p-1.5 text-[11px] font-semibold text-[#9A6700]">
              Demo-avläsning — bildtolkningen kräver inloggning. Värdena är exempeldata.
            </p>
          )}
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#4A5560]">
            Avläst: {avlasning.tolkning.instrumenttyp} — bekräfta innan något loggas
          </p>
          {avlasning.tolkning.varden.map((v, i) => (
            <div key={i} className="flex items-center justify-between gap-2 border-b border-[#EBEBEB] py-1 text-[13px] last:border-0">
              <span>
                {v.beskrivning}: <span className="font-semibold">{v.varde}{v.enhet ? ` ${v.enhet}` : ""}</span>
              </span>
              <span className={`text-[11px] font-semibold ${v.konfidens >= 0.95 ? "text-[#1E6B34]" : v.konfidens >= 0.8 ? "text-[#9A6700]" : "text-[#8B1A1A]"}`}>
                {v.konfidens >= 0.95 ? "✓" : `${Math.round(v.konfidens * 100)} %`}
              </span>
            </div>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <StorKnapp variant="sekundar" onClick={() => setAvlasning(null)}>
              Förkasta
            </StorKnapp>
            <StorKnapp onClick={sparaAvlasning}>Spara foto + värden</StorKnapp>
          </div>
        </div>
      )}
      {typ && typ !== "foto" && typ !== "instrument" && (
        <div className="mt-3">
          {typ === "hypotes" && (
            <p className="mb-2 text-[12px] font-semibold text-[#8B1A1A]">
              🔴 En hypotes är en möjlig felorsak som kräver verifiering — den loggas aldrig som ett konstaterat fel.
            </p>
          )}
          <TextFalt
            label={typ === "matvarde" ? "Vad mättes?" : DOKTYPER.find((d) => d.id === typ)!.label}
            varde={text}
            satt={setText}
            platshallare={typ === "matvarde" ? "T.ex. Matningsspänning stift 30" : ""}
            rost
          />
          {typ === "matvarde" && <TextFalt label="Värde (med enhet)" varde={varde} satt={setVarde} platshallare="T.ex. 13,9 V" />}
          <StorKnapp disabled={!text.trim() || (typ === "matvarde" && !varde.trim())} onClick={spara}>
            Spara
          </StorKnapp>
        </div>
      )}
    </Panel>
  );
}

function OverlamningDialog({
  arende,
  metodik,
  nu,
  skicka,
  stang,
}: {
  arende: Arende;
  metodik: Metodik;
  nu: string;
  skicka: (h: Handelse) => void;
  stang: () => void;
}) {
  const anvandare = useFelsokning((s) => s.anvandare);
  const [till, setTill] = useState("");
  const [aiLage, setAiLage] = useState<"vilar" | "arbetar" | "fel" | "klar">("vilar");
  const [aiRader, setAiRader] = useState<{ typ: keyof typeof AI_RADTYP_LABEL; text: string }[]>([]);
  const text = overlamningstext(arende, metodik, nu);

  // Orkesterns sammanfattningsuppgift: risker och osäkerheter som inte
  // syns i checklistorna — loggas som AI-svar och visas i överlämningen.
  const komplettera = async () => {
    setAiLage("arbetar");
    try {
      const svar = await sammanfattaOverlamning(arende, metodik);
      if (svar) {
        skicka({ typ: "ai_svar", rader: svar.rader, nastaSteg: svar.nastaSteg, modell: svar.modell });
        setAiRader(svar.rader);
        setAiLage("klar");
      } else {
        setAiLage("vilar");
      }
    } catch {
      setAiLage("fel");
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded border border-[#ADADAD] bg-[#F7F7F7] p-4">
        <h2 className="mb-3 text-[15px] font-semibold">Överlämningsrapport</h2>
        <pre className="mb-3 overflow-x-auto whitespace-pre-wrap rounded bg-white p-4 text-[12px] text-[#333333]">
          {text}
        </pre>
        {aiLage === "vilar" && (
          <StorKnapp variant="sekundar" className="mb-3" onClick={komplettera}>
            ✨ Komplettera analysen: risker &amp; osäkerheter
          </StorKnapp>
        )}
        {aiLage === "arbetar" && <p className="mb-3 animate-pulse font-semibold text-[#00437A]">Systemet sammanfattar …</p>}
        {aiLage === "fel" && (
          <p className="mb-3 font-semibold text-[#8B1A1A]">Kunde inte hämtas — kräver inloggning. Överlämningen fungerar ändå.</p>
        )}
        {aiLage === "klar" && aiRader.length > 0 && (
          <div className="mb-3 rounded bg-white p-4">
            {aiRader.map((rad, i) => (
              <p key={i} className="py-0.5 text-[12px] text-[#333333]">
                <span className="font-semibold text-[#4A5560]">{AI_RADTYP_LABEL[rad.typ]}:</span> {rad.text}
              </p>
            ))}
          </div>
        )}
        <TextFalt label="Lämnas till (valfritt)" varde={till} satt={setTill} platshallare="T.ex. Johan" />
        <div className="grid grid-cols-2 gap-2">
          <StorKnapp variant="sekundar" onClick={stang}>
            Avbryt
          </StorKnapp>
          <StorKnapp
            onClick={() => {
              skicka({ typ: "overlamning", fran: anvandare, till: till.trim() || undefined });
              stang();
            }}
          >
            Bekräfta överlämning
          </StorKnapp>
        </div>
      </div>
    </div>
  );
}

const NIVA_LABEL: Record<DelningsNiva, string> = {
  kund: "Kund",
  partner: "Extern partner",
  intern: "Intern",
};

// Live Share-behörighetsnivåer: skapa och återkalla delningslänkar.
// Nivåfiltreringen sker alltid på serversidan; verkstaden kontrollerar
// delningen och varje skapad/återkallad länk loggas i ärendet.
function DelningsHanterare({ arende, skicka }: { arende: Arende; skicka: (h: Handelse) => void }) {
  const [oppen, setOppen] = useState(false);
  const [delningar, setDelningar] = useState<Delning[]>([]);
  const [fel, setFel] = useState("");

  const uppdatera = async () => {
    try {
      setDelningar(await hamtaDelningar(arende.id));
      setFel("");
    } catch {
      setFel("Kunde inte hämta delningar — kräver inloggning och att ärendet är synkat.");
    }
  };

  if (!oppen) {
    return (
      <StorKnapp
        variant="sekundar"
        className="mt-2"
        onClick={() => {
          setOppen(true);
          uppdatera();
        }}
      >
        🔗 Delningslänkar (kund/partner/intern)
      </StorKnapp>
    );
  }

  return (
    <div className="mt-3 rounded border border-[#C6C6C6] bg-white p-3">
      {fel && <p className="mb-2 font-semibold text-[#8B1A1A]">{fel}</p>}
      {delningar.map((delning) => (
        <div key={delning.kod} className="flex items-center justify-between gap-2 border-b border-[#DDDDDD] py-2 last:border-0">
          <span className="text-[14px]">
            {NIVA_LABEL[delning.niva]}{" "}
            {delning.aterkallad && <span className="text-[12px] font-semibold text-[#8B1A1A]">(återkallad)</span>}
          </span>
          {!delning.aterkallad && (
            <span className="flex gap-2">
              <button
                className="rounded border border-[#ADADAD] px-3 py-1 font-semibold text-[#333333] hover:border-[#00437A]"
                onClick={() =>
                  navigator.clipboard.writeText(`${window.location.origin}/felsokning/delad/${delning.kod}`)
                }
              >
                Kopiera
              </button>
              <button
                className="rounded border border-[#ADADAD] px-3 py-1 font-semibold text-[#8B1A1A] hover:border-[#8B1A1A]"
                onClick={async () => {
                  await aterkallaDelning(delning.kod);
                  skicka({ typ: "kommentar", text: `Delningslänk (${NIVA_LABEL[delning.niva]}) återkallad.` });
                  uppdatera();
                }}
              >
                Återkalla
              </button>
            </span>
          )}
        </div>
      ))}
      <div className="mt-2 grid grid-cols-3 gap-2">
        {(Object.keys(NIVA_LABEL) as DelningsNiva[]).map((niva) => (
          <button
            key={niva}
            className="min-h-9 rounded border border-[#ADADAD] text-[12px] font-semibold text-[#333333] hover:border-[#00437A]"
            onClick={async () => {
              try {
                await skapaDelning(arende.id, niva);
                skicka({ typ: "kommentar", text: `Delningslänk skapad (${NIVA_LABEL[niva]}).` });
                uppdatera();
              } catch {
                setFel("Kunde inte skapa delning — kräver inloggning och att ärendet är synkat.");
              }
            }}
          >
            + {NIVA_LABEL[niva]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-[#707070]">
        Kund: det kunddelbara · Extern partner: även hypoteser (märkta ej verifierade) · Intern: full insyn.
        Filtreringen sker på servern.
      </p>
    </div>
  );
}

function LoggFlik({ arende }: { arende: Arende }) {
  return (
    <Panel rubrik="Arbetslogg — append-only, ingenting skrivs över">
      <ol>
        {arende.handelser.map((post) => (
          <li key={post.id} className="flex gap-3 border-b border-[#DDDDDD] py-2 last:border-0">
            <span className="w-14 shrink-0 font-mono text-[12px] font-semibold text-[#00437A]">{tidKlockslag(post.tidpunkt)}</span>
            <div className="min-w-0">
              <p className="text-[13px] text-[#1A1A1A]">{handelseRubrik(post)}</p>
              <p className="text-[11px] text-[#707070]">{post.anvandare}</p>
              {post.handelse.typ === "foto" && (
                <img src={post.handelse.dataUrl} alt={post.handelse.beskrivning} className="mt-1 max-h-40 rounded border border-[#C6C6C6]" />
              )}
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function BriefFlik({
  arende,
  metodik,
  nu,
  skicka,
}: {
  arende: Arende;
  metodik: Metodik;
  nu: string;
  skicka: (h: Handelse) => void;
}) {
  const b = brief(arende, metodik, nu);
  const [granskning, setGranskning] = useState<"vilar" | "arbetar" | "fel">("vilar");
  const senasteAi = [...arende.handelser].reverse().find((p) => p.handelse.typ === "ai_svar");

  // Djupgranskningen går till orkesterns tyngsta modell (Opus 5, hög
  // effort): motsägelser, luckor och förhastade slutsatser i hela loggen.
  const granska = async () => {
    setGranskning("arbetar");
    try {
      const svar = await granskaUnderlag(arende, metodik);
      if (svar) skicka({ typ: "ai_svar", rader: svar.rader, nastaSteg: svar.nastaSteg, modell: svar.modell });
      setGranskning("vilar");
    } catch {
      setGranskning("fel");
    }
  };

  return (
    <>
      {!b.avslutat && (
        <Panel rubrik="Granskning av underlaget">
          <p className="mb-2 text-[#333333]">
            Låt systemet gå igenom hela underlaget innan du lämnar det vidare: motsägelser mellan
            observationer, luckor i dokumentationen och slutsatser som saknar stöd.
          </p>
          {granskning === "arbetar" && <p className="mb-2 animate-pulse font-semibold text-[#00437A]">Systemet granskar underlaget …</p>}
          {granskning === "fel" && (
            <p className="mb-2 font-semibold text-[#8B1A1A]">Granskningen kunde inte hämtas — kräver inloggning. Försök igen.</p>
          )}
          {senasteAi && senasteAi.handelse.typ === "ai_svar" && granskning === "vilar" && (
            <div className="mb-2">
              {senasteAi.handelse.rader.map((rad, i) => (
                <p key={i} className="py-0.5 text-[14px]">
                  <span className="font-semibold text-[#4A5560]">{AI_RADTYP_LABEL[rad.typ]}:</span> {rad.text}
                </p>
              ))}
              <p className="mt-1 text-[14px]">
                <span className="font-semibold text-[#00437A]">Nästa steg:</span> {senasteAi.handelse.nastaSteg}
              </p>
              <p className="mt-1 text-[11px] text-[#707070]">Senaste analys ({senasteAi.handelse.modell})</p>
            </div>
          )}
          <StorKnapp variant="sekundar" disabled={granskning === "arbetar"} onClick={granska}>
            🔍 Granska underlaget
          </StorKnapp>
        </Panel>
      )}
      <Panel rubrik="Objekt">
        {b.objekt ? (
          <>
            <p className="text-[15px] font-semibold">{b.objekt.beskrivning}</p>
            <p className="font-semibold text-[#00437A]">{b.objekt.identifierare}</p>
            {b.objekt.kund && <p className="text-[#333333]">Kund: {b.objekt.kund}</p>}
            {b.ansvarig && <p className="text-[#333333]">Ansvarig tekniker: {b.ansvarig}</p>}
          </>
        ) : (
          <p className="text-[#4A5560]">Ej identifierat</p>
        )}
      </Panel>
      <Panel rubrik="Kundens beskrivning">
        <p className="text-[14px]">{b.felbeskrivning ? `”${b.felbeskrivning}”` : "—"}</p>
      </Panel>
      <Panel rubrik="Utförda kontroller">
        {b.utfordaKontroller.length === 0 && <p className="text-[#4A5560]">Inga ännu.</p>}
        {b.utfordaKontroller.map((k, i) =>
          k.undantag ? (
            <p key={i} className="py-0.5 text-[14px] text-[#9A6700]">
              ⚠ {k.text} — underlag saknas: {k.undantag}
            </p>
          ) : (
            <p key={i} className="py-0.5 text-[14px]">
              ✓ {k.text}
              {k.resultat && <span className="text-[#4A5560]"> — {k.resultat}</span>}
            </p>
          ),
        )}
      </Panel>
      <Panel rubrik="Observationer">
        {b.observationer.length === 0 && <p className="text-[#4A5560]">Inga ännu.</p>}
        {b.observationer.map((o, i) => (
          <p key={i} className="py-0.5 text-[14px]">• {o}</p>
        ))}
      </Panel>
      {b.hypoteser.length > 0 && (
        <Panel rubrik="Hypoteser — kräver verifiering">
          {b.hypoteser.map((h, i) => (
            <p key={i} className="py-0.5 text-[14px]">
              <NivaBadge niva={h.niva} /> {h.text}
            </p>
          ))}
        </Panel>
      )}
      <Panel rubrik="Ej kontrollerat">
        {b.ejKontrollerat.length === 0 && <p className="text-[#4A5560]">Allt i metodiken är utfört.</p>}
        {b.ejKontrollerat.map((e, i) => (
          <p key={i} className="py-0.5 text-[14px] text-[#333333]">– {e}</p>
        ))}
      </Panel>
      {!b.avslutat && (
        <Panel rubrik="Rekommenderat nästa steg">
          {b.rekommenderatNastaSteg.map((s, i) => (
            <p key={i} className="py-0.5 text-[14px]">{i + 1}. {s}</p>
          ))}
        </Panel>
      )}
      <Panel rubrik="Tillförlitlighet">
        {b.tillforlitlighet.map((r, i) => (
          <p key={i} className="py-0.5 text-[14px]">
            <NivaBadge niva={r.niva} /> {r.text}
          </p>
        ))}
      </Panel>
      <Panel rubrik="Total arbetstid">
        <p className="text-[17px] font-semibold">{b.totalArbetstid}</p>
      </Panel>
    </>
  );
}

// Kundrapporten: en tydlig tidslinje i stället för "Felsökning – 2,5 timmar".
// Interna poster (kategoribyten) visas inte för kund.
function RapportFlik({
  arende,
  metodik,
  nu,
  skicka,
}: {
  arende: Arende;
  metodik: Metodik;
  nu: string;
  skicka: (h: Handelse) => void;
}) {
  const anvandare = useFelsokning((s) => s.anvandare);
  const b = brief(arende, metodik, nu);
  const bilder = foton(arende);
  const fordelning = tidsfordelningsRader(arende, nu);
  const idn = arendeidentitet(arende);
  const typ = arendetyp(arende);
  const repro = reproducering(arende);
  const orsakerLista = felorsaker(arende);
  let matIn: string | undefined;
  let matUt: string | undefined;
  for (const p of arende.handelser) {
    const h = p.handelse;
    if (h.typ === "matarstallning" && !h.undantag) {
      if (h.lage === "ingaende") matIn = h.varde;
      else matUt = h.varde;
    }
  }
  // Kategoribyten är interna; hypoteser och AI-dialogen är arbetsmaterial
  // och ingår inte i det som delas med kund.
  const kundposter = arende.handelser.filter(
    (p) => !["kategori_byte", "hypotes", "ai_svar", "ansvarig_satt", "arbetsorder_skannad"].includes(p.handelse.typ),
  );

  // Alla exporter bygger på samma händelselogg och versionsmärks:
  // version = antal händelser vid exporttillfället. Spårbarhetspaketet
  // (ECM-version, evidensposter med hash, grindstatus) följer med.
  const exporteraJson = () => {
    const version = arende.handelser.length;
    const data = {
      export: { format: "JSON", version, exporteradAv: anvandare, tidpunkt: new Date().toISOString() },
      ecm: sparbarhetspaket(arende, metodik),
      arende,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const lank = document.createElement("a");
    lank.href = url;
    lank.download = `arende-${arende.nummer}-v${version}.json`;
    lank.click();
    URL.revokeObjectURL(url);
    skicka({ typ: "export_skapad", format: "JSON", version });
  };

  const grind = kvalitetsgrind(arende, metodik);
  const godkand = grindGodkand(arende, metodik);

  return (
    <>
      {/* ECM-kvalitetsgrinden: slutrapporten kan inte genereras förrän
          varje obligatoriskt påstående har evidens eller dokumenterat
          undantag i händelseloggen. */}
      <Panel rubrik={`Kvalitetsgrind — ECM v${ECM_VERSION}`}>
        {grind.map((rad) => (
          <div key={rad.id} className="border-b border-[#EBEBEB] py-1 last:border-0">
            <p className="text-[13px]">
              <span className={rad.ok ? "text-[#1E6B34]" : rad.kravs ? "text-[#8B1A1A]" : "text-[#9A6700]"}>
                {rad.ok ? "✅" : rad.kravs ? "❌" : "⚠️"}
              </span>{" "}
              {rad.rubrik}
              {!rad.kravs && <span className="text-[11px] text-[#707070]"> (rekommenderas)</span>}
            </p>
            {rad.detalj && <p className="pl-6 text-[12px] text-[#707070]">{rad.detalj}</p>}
          </div>
        ))}
        {!godkand && (
          <p className="mt-2 text-[12px] font-semibold text-[#8B1A1A]">
            Rapporten kan inte genereras förrän varje ❌ har evidens eller ett dokumenterat undantag
            (”Underlag kan inte tas fram” i guiden).
          </p>
        )}
      </Panel>
      <Panel rubrik="Kundrapport">
        <p className="mb-2 text-[#333333]">
          Delningsbar sammanställning av utfört arbete. Granska innehållet innan rapporten delas — bilder kan
          innehålla uppgifter om andra kunder.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <StorKnapp variant="sekundar" disabled={!godkand} onClick={() => window.print()}>
            Skriv ut / PDF
          </StorKnapp>
          <StorKnapp variant="sekundar" onClick={exporteraJson}>
            Exportera JSON
          </StorKnapp>
        </div>
        <Link to={`/felsokning/dela/${arende.id}`} className="mt-2 block">
          <StorKnapp variant="sekundar">🟢 Öppna Live Share-vy</StorKnapp>
        </Link>
        {plattformAktiv() ? (
          <DelningsHanterare arende={arende} skicka={skicka} />
        ) : (
          arende.delningskod && (
            <StorKnapp
              variant="sekundar"
              className="mt-2"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/felsokning/delad/${arende.delningskod}`);
                skicka({ typ: "kommentar", text: "Delningslänk kopierad för extern mottagare." });
              }}
            >
              🔗 Kopiera delningslänk
            </StorKnapp>
          )
        )}
        <p className="mt-2 text-[12px] text-[#707070]">
          Delningslänken kräver att ärendet är synkat mot molnet (inloggad användare).
        </p>
      </Panel>
      {/* Rapportens första sida: ärendeidentiteten — registrerad en gång,
          återanvänd här automatiskt. */}
      <Panel rubrik="Ärendeinformation">
        {identitetsRader([
          ["Ärende", `#${arende.nummer}`],
          ["Arbetsorder", idn.arbetsorder],
          ["Claim-/garantinr", idn.claim],
          ["Skadenummer", idn.skadenummer],
          ["Ärendetyp", typ],
          ["Ansvarig tekniker", idn.ansvarig],
        ])}
      </Panel>
      <Panel rubrik="Fordonsinformation">
        {identitetsRader([
          ["Fordon", idn.beskrivning],
          ["Regnr", idn.identifierare],
          ["VIN", idn.vin],
          ["Mätarställning in", matIn],
          ["Mätarställning ut", matUt],
          ["Kund", idn.kund],
        ])}
      </Panel>
      {/* Beviskedjan: kundens upplevelse, teknikerns verifiering och den
          tekniska slutsatsen hålls strikt åtskilda och spårbara. */}
      <Panel rubrik="Kundens beskrivning">
        <p className="text-[14px]">{b.felbeskrivning ? `”${b.felbeskrivning}”` : "—"}</p>
      </Panel>
      <Panel rubrik="Verifierad observation">
        {repro ? (
          <>
            <p className="text-[14px] font-semibold">{reproduceringsText(repro.status)}</p>
            <p className="text-[13px] text-[#4A5560]">{repro.beskrivning}</p>
          </>
        ) : (
          <p className="text-[14px] text-[#4A5560]">Reproducering ej dokumenterad ännu.</p>
        )}
      </Panel>
      <Panel rubrik="Felorsaksanalys">
        {orsakerLista.length === 0 && <p className="text-[14px] text-[#4A5560]">Felorsaksanalys ej dokumenterad ännu.</p>}
        {orsakerLista.map((p) => {
          const h = p.handelse;
          if (h.typ !== "felorsak") return null;
          return (
            <div key={p.id} className="mb-3 border-b border-[#EBEBEB] pb-2 last:mb-0 last:border-0">
              <p className="text-[14px] font-semibold">{h.avvikelse}</p>
              {identitetsRader([
                ["Bedömd grundorsak", h.orsaker.join(", ")],
                ["Underlag för bedömningen", h.underlag.join(", ")],
                ["Säkerhetsnivå", TILLFORLITLIGHET_LABEL[h.sakerhet]],
                ["Rekommenderad åtgärd", h.atgard],
                ["Motivering", h.motivering],
                ["Stärkande kontroller", h.ytterligareKontroller],
              ])}
            </div>
          );
        })}
      </Panel>
      <Panel rubrik="Sammanfattning">
        <p className="text-[14px]">Total arbetstid: <span className="font-semibold">{b.totalArbetstid}</span></p>
        {fordelning.length > 0 && (
          <div className="mt-2">
            {fordelning.map((r) => (
              <p key={r.label} className="text-[#333333]">{r.label}: {r.tid}</p>
            ))}
          </div>
        )}
      </Panel>
      <Panel rubrik="Tidslinje">
        {kundposter.map((post) => (
          <p key={post.id} className="py-0.5 text-[13px]">
            <span className="font-mono font-semibold text-[#00437A]">{tidKlockslag(post.tidpunkt)}</span>{" "}
            {handelseRubrik(post)}
          </p>
        ))}
      </Panel>
      {bilder.length > 0 && (
        <Panel rubrik="Dokumenterade bilder">
          <div className="grid grid-cols-2 gap-2">
            {bilder.map((bild, i) => (
              <figure key={i}>
                <img src={bild.dataUrl} alt={bild.beskrivning} className="rounded border border-[#C6C6C6]" />
                <figcaption className="mt-1 text-[11px] text-[#4A5560]">{bild.beskrivning}</figcaption>
              </figure>
            ))}
          </div>
        </Panel>
      )}
      {!b.avslutat || b.ejKontrollerat.length > 0 ? (
        <Panel rubrik="Rekommenderade nästa steg">
          {(b.avslutat ? b.ejKontrollerat : b.rekommenderatNastaSteg).map((s, i) => (
            <p key={i} className="py-0.5 text-[14px]">{i + 1}. {s}</p>
          ))}
        </Panel>
      ) : null}
      <p className="text-center text-[11px] text-[#8A8A8A]">
        Genererad ur ärendets händelselogg · Observationer och mätvärden redovisas utan slutsatser som saknar stöd.
      </p>
    </>
  );
}
