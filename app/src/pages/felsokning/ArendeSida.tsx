import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Arende, Betalarspar, Handelse, TidKategori, Tillforlitlighet } from "@/felsokning/domain";
import { BETALARSPAR_LABEL, KUNDBESLUT_LABEL, KVALITETSKONTROLL_LABEL, TIDKATEGORI_LABEL, TILLFORLITLIGHET_LABEL, handelseRubrik } from "@/felsokning/domain";
import type { Metodik, NastaSteg } from "@/felsokning/metodik";
import { METODIKER, nastaSteg } from "@/felsokning/metodik";
import { fasFor, klaraFaser } from "../../../../services/gemensam/faser.mjs";
import { FARG, Fasrad } from "@/alva/komponenter";
import { inomTak, sakerhetstak } from "../../../../services/gemensam/sakerhet.mjs";
import { Slutsatspanel } from "@/felsokning/Slutsats";
import { sammanfatta } from "../../../../services/gemensam/sammanfattning.mjs";
import { grinda } from "../../../../services/gemensam/grind.mjs";
import { PLATTFORMSVERSION, arendebeteckning, fasDefinition } from "@/alva/system";
import { versionVidAvslut } from "../../../../services/gemensam/version.mjs";
import {
  arAvslutat,
  arendeidentitet,
  brief,
  felbeskrivning,
  formateraTid,
  foton,
  videor,
  lokalFordonshistorik,
  objekt,
  overlamningstext,
  sistaAktivitet,
  tidsfordelning,
  tidsfordelningsRader,
  type HistorikArende,
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
  INGEN_ATGARD_ORSAKER,
  KUNDKANALER,
  MARKOR_TIDIGA_OBSERVATIONER_KLARA,
  aktivtRegelpaket,
  atgarder,
  atgardsforslag,
  arendetyp,
  felorsaker,
  granskaAvvikelse,
  grindGodkand,
  kvalitetsgrind,
  hamtaRegelpaket,
  kundbeslut,
  kvalitetskontroll,
  preDiagnostik,
  reproducering,
  reproduceringsText,
  sparbarhetspaket,
  underlagFinns,
  UNDANTAGSORSAKER,
} from "@/felsokning/ecm";
import { Dialog, FelsokningSkal, NivaBadge, Panel, StorKnapp, TextFalt } from "@/felsokning/ui";
import { lasVideo, skalaNerFoto, tidDatum, tidKlockslag } from "@/felsokning/format";
import { IkonCheck, IkonKamera, IkonKryss, IkonLank, IkonPunkt, IkonSok, IkonVarning } from "@/felsokning/ikoner";
import { Ljudpanel } from "@/felsokning/Ljudpanel";
import { Bild, Bildkommentar, Klipp } from "@/felsokning/Bilagevisning";
import { bilageFalt } from "@/felsokning/bilagor";

const FLIKAR = [
  { id: "guide", label: "Guide" },
  { id: "logg", label: "Log" },
  { id: "brief", label: "Brief" },
  { id: "rapport", label: "Report" },
] as const;

type Flik = (typeof FLIKAR)[number]["id"];

const SYNKSTATUS_LABEL: Record<SynkStatus, string> = {
  lokal: "Local mode",
  synkar: "Synchronizing …",
  synkad: "Synchronized",
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
    // ECM Knowledge Library: färskt regelpaket från plattformen (cache/
    // standardpaket gäller offline).
    hamtaRegelpaket();
    return () => clearInterval(timer);
  }, []);

  const metodik = metodikForArende(arende);

  if (!arende || !id) {
    return (
      <FelsokningSkal rubrik="Case not found" tillbaka={{ till: "/felsokning", text: "Cases" }}>
        <p className="text-[14px] text-[#1B1E22]">The case does not exist on this device.</p>
      </FelsokningSkal>
    );
  }

  const o = objekt(arende);
  const avslutat = arAvslutat(arende);
  const total = formateraTid(tidsfordelning(arende, nu).totalMs);
  // Ett ställe flyttar bilagornas innehåll ut ur händelsen. Alla
  // panelerna nedan skickar som förut med en inbäddad data-URL; här
  // laddas den upp och händelsen får i stället en referens med
  // innehållets hash. Misslyckas uppladdningen — eller finns ingen
  // server, som i lokalt läge — sparas den inbäddat precis som förut.
  // Dokumentationen får aldrig gå förlorad för att nätet ligger nere.
  const skicka = (h: Handelse) => {
    if (!("dataUrl" in h) || !h.dataUrl) {
      laggTill(id, h);
      return;
    }
    const { dataUrl, ...utan } = h;
    void bilageFalt(id, dataUrl).then((bilaga) => laggTill(id, { ...utan, ...bilaga } as Handelse));
  };

  return (
    <FelsokningSkal
      bred
      rubrik={`#${arende.nummer} ${o?.beskrivning ?? ""}`}
      tillbaka={{ till: "/felsokning", text: "Cases" }}
      hoger={
        <div className="text-right">
          {/* Vit text var rätt när verktygsraden var mörkt marinblå. När
              raden blev vit försvann tiden helt och statusraden blev en
              grå skugga — det syntes först i en skärmdump från en
              telefon, vilket är den enda kontroll som ser vad
              teknikern ser. */}
          <p className="font-mono text-[13px] font-semibold" style={{ color: FARG.graphite }}>
            {total}
          </p>
          {/* Synkläget bryts bort på telefon i stället för att bryta
              raden. Ärendets tillstånd är det som måste synas; var
              loggen ligger är en driftdetalj och står kvar under
              Technical information. */}
          <p
            className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: FARG.steel }}
          >
            {avslutat ? "Closed" : "In progress"}
            <span className="hidden sm:inline"> · {SYNKSTATUS_LABEL[synkStatus]}</span>
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
      <nav className="mb-4 grid grid-cols-4 gap-2 border border-[#D7DCE2] bg-[#F6F7F8] p-2 lg:hidden">
        {FLIKAR.map((f) => (
          <button
            key={f.id}
            onClick={() => setFlik(f.id)}
            className={`min-h-9 text-[13px] font-semibold ${
              flik === f.id ? "bg-[#005CA9] text-white" : "text-[#1B1E22] hover:bg-[#D7DCE2]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </nav>

      <div className="lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:items-start lg:gap-4 xl:grid-cols-[210px_minmax(0,1fr)_300px]">
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
      <div key={etikett} className="flex justify-between gap-2 border-b border-[#D7DCE2] py-2 text-[13px] last:border-0">
        <span className="text-[#4D5662]">{etikett}</span>
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
        {etikett && <span className="text-[#4D5662]">{etikett} </span>}
        <span className="font-semibold text-[#1B1E22]">{varde}</span>
      </span>
    ) : null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 border border-[#D7DCE2] bg-[#F6F7F8] px-4 py-2 text-[12px] print:hidden">
      {del("WO", idn.arbetsorder)}
      {del("Claim", idn.claim)}
      {del("Claim no.", idn.skadenummer)}
      {del("", idn.beskrivning)}
      {del("Reg. no.", idn.identifierare)}
      {del("VIN", idn.vin)}
      {del("Mileage", idn.miltal)}
      {del("Assigned to", idn.ansvarig)}
      <label className="ml-auto flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#4D5662]">Case type</span>
        <select
          value={typ}
          disabled={idn.avslutat}
          onChange={(e) => skicka({ typ: "arendetyp_satt", arendetyp: e.target.value })}
          className="border border-[#4D5662] bg-white px-2 py-2 text-[12px] focus:outline-none"
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
          <IkonKamera /> Photograph the instrument cluster
        </StorKnapp>
      )}
      {laser && <p className="py-2 text-center text-[12px] font-semibold text-[#005CA9]">Reading the odometer …</p>}
      {foto && !laser && (
        <div className="mt-2">
          {demo && (
            <p className="mb-2 border border-[#8A5A00] bg-[#FFFFFF] p-2 text-[11px] font-semibold text-[#8A5A00]">
              Demo reading — image interpretation requires sign-in. Check the value.
            </p>
          )}
          <img src={foto} alt="Instrument panel" className="mb-2 max-h-40 border border-[#D7DCE2]" />
          <TextFalt label={`Odometer reading (${lage === "ingaende" ? "incoming" : "outgoing"})`} varde={varde} satt={setVarde} platshallare="e.g. 84,320 km" />
          <StorKnapp
            disabled={!varde.trim()}
            onClick={() => {
              skicka({ typ: "matarstallning", lage, varde: varde.trim(), dataUrl: foto });
              setFoto(null);
              setVarde("");
            }}
          >
            Save odometer reading
          </StorKnapp>
        </div>
      )}
      <Undantag vidUndantag={(orsak) => skicka({ typ: "matarstallning", lage, varde: "", undantag: orsak })} />
    </div>
  );
}

// Fordonshistorik i pre-diagnostiken: tidigare ärenden på samma objekt
// hämtas automatiskt (plattformen i inloggat läge, lokala storen annars)
// med deras dokumenterade felorsaker. Teknikern kan koppla orsakskedjan
// till det aktuella ärendet med ett tryck.
function TidigareArenden({ arende, skicka }: { arende: Arende; skicka: (h: Handelse) => void }) {
  const arenden = useFelsokning((s) => s.arenden);
  const o = objekt(arende);
  const [rader, setRader] = useState<HistorikArende[]>(() =>
    o ? lokalFordonshistorik(arenden, o.identifierare, arende.id) : [],
  );
  const identifierare = o?.identifierare;

  useEffect(() => {
    if (!identifierare) return;
    let aktiv = true;
    (async () => {
      const { plattformAktiv: aktivPlattform, plattformToken, hamtaFordonshistorik } = await import("@/felsokning/plattform");
      if (!aktivPlattform() || !plattformToken()) return;
      try {
        const svar = await hamtaFordonshistorik(identifierare);
        if (aktiv) {
          setRader(
            svar
              .filter((r) => r.id !== arende.id)
              .map((r) => ({ ...r, felbeskrivning: r.felbeskrivning ?? undefined, felorsaker: r.felorsaker ?? [] })),
          );
        }
      } catch {
        // Lokal historik gäller.
      }
    })();
    return () => {
      aktiv = false;
    };
  }, [identifierare, arende.id]);

  if (rader.length === 0) return null;
  return (
    <div className="mb-2 border border-[#D7DCE2] bg-white p-2">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#4D5662]">
        Previous cases for {identifierare} — review before signing off the history
      </p>
      {rader.map((rad) => (
        <div key={rad.id} className="border-b border-[#D7DCE2] py-2 text-[12px] last:border-0">
          <p>
            <span className="font-semibold">Case #{rad.nummer}</span> · {tidDatum(rad.skapad)} ·{" "}
            {rad.avslutat ? "closed" : "in progress"}
            {rad.felbeskrivning && <span className="text-[#4D5662]"> — ”{rad.felbeskrivning}”</span>}
          </p>
          {rad.felorsaker.map((f, i) => (
            <p key={i} className="pl-4 text-[#4D5662]">
              Felorsak: {f.avvikelse} ({f.orsaker.join(", ")})
            </p>
          ))}
          <button
            className="mt-2 text-[11px] font-semibold text-[#005CA9] underline-offset-2 hover:underline"
            onClick={() =>
              skicka({
                typ: "kommentar",
                text: `Causal chain: linked to previous case #${rad.nummer}${
                  rad.felorsaker[0] ? ` — ${rad.felorsaker[0].avvikelse}` : rad.felbeskrivning ? ` — ${rad.felbeskrivning}` : ""
                }`,
              })
            }
          >
            + Link to the causal chain
          </button>
        </div>
      ))}
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
    <Panel rubrik="Pre-diagnostics — before the work begins">
      {rader.map((r) => (
        <p key={r.id} className="py-0 text-[13px]">
          <span className={r.klar ? "text-[#005CA9]" : "text-[#8B1A1A]"}>{r.klar ? <IkonCheck /> : "☐"}</span> {r.rubrik}
          {r.varning && <span className="ml-2 text-[11px] font-semibold text-[#8A5A00]"><IkonVarning /> {r.varning}</span>}
        </p>
      ))}

      {!rad("historik").klar && (
        <div className="mt-4 border-t border-[#D7DCE2] pt-2">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#4D5662]">
            Has the vehicle's history been checked? (previous work, recurring faults, TSBs, campaigns)
          </p>
          <TidigareArenden arende={arende} skicka={skicka} />
          <div className="mb-2 grid grid-cols-2 gap-2">
            <StorKnapp variant={historikVal === "ja" ? "primar" : "sekundar"} onClick={() => setHistorikVal("ja")}>
              Yes — checked
            </StorKnapp>
            <StorKnapp variant={historikVal === "nej" ? "fara" : "sekundar"} onClick={() => setHistorikVal("nej")}>
              No
            </StorKnapp>
          </div>
          {historikVal && (
            <>
              <TextFalt
                label={historikVal === "ja" ? "Relevant previous work (optional — causal chain)" : "Reason the history was not checked (required)"}
                varde={historikText}
                satt={setHistorikText}
                platshallare={historikVal === "ja" ? "e.g. Water pump replaced 8 months ago — suspected leak in the same area" : ""}
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
                Document
              </StorKnapp>
            </>
          )}
        </div>
      )}

      {!rad("matarstallning_in").klar && (
        <div className="mt-4 border-t border-[#D7DCE2] pt-2">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#4D5662]">
            Incoming odometer reading — photograph the instrument cluster
          </p>
          <MatarstallningSteg lage="ingaende" skicka={skicka} />
        </div>
      )}

      {!rad("felbeskrivning").klar && (
        <div className="mt-4 border-t border-[#D7DCE2] pt-2">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#4D5662]">
            Is the customer's fault description correctly recorded?
          </p>
          {fb && <p className="mb-2 text-[13px]">”{fb}”</p>}
          <StorKnapp variant="sekundar" onClick={() => skicka({ typ: "kommentar", text: `${MARKOR_FELBESKRIVNING_VERIFIERAD}.` })}>
            Correct — verified
          </StorKnapp>
          <p className="mt-2 text-[11px] text-[#4D5662]">
            Additional symptoms are documented as separate observations — do not mix them
            with the customer's description.
          </p>
        </div>
      )}

      {!rad("tidiga_observationer").klar && (
        <div className="mt-4 border-t border-[#D7DCE2] pt-2">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#4D5662]">
            Anything else noted at vehicle reception? (traces of repair, modifications, damage, leaks, corrosion …)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <StorKnapp variant="sekundar" onClick={() => skicka({ typ: "kommentar", text: `${MARKOR_INGA_TIDIGA_OBSERVATIONER}.` })}>
              No further observations
            </StorKnapp>
            <StorKnapp
              variant="sekundar"
              disabled={!harTidiga}
              onClick={() => skicka({ typ: "kommentar", text: `${MARKOR_TIDIGA_OBSERVATIONER_KLARA}.` })}
            >
              The observations are documented
            </StorKnapp>
          </div>
          <p className="mt-2 text-[11px] text-[#4D5662]">
            Document with a photograph or an observation in the panel below — the button unlocks once something is logged.
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
      ? "How was the fault reproduced? (conditions, speed, temperature, load …)"
      : status === "delvis"
        ? "What could and could not be reproduced?"
        : "Rationale (required) — why could the fault not be reproduced?";
  return (
    <Panel rubrik="Symptom verification — reproduction">
      <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#4D5662]">
        Has the customer's fault been reproduced?
      </p>
      <div className="mb-2 grid grid-cols-3 gap-2">
        {(["ja", "delvis", "nej"] as const).map((val) => (
          <StorKnapp key={val} variant={status === val ? "primar" : "sekundar"} onClick={() => setStatus(val)}>
            {val === "ja" ? "Yes" : val === "delvis" ? "Partly" : "No"}
          </StorKnapp>
        ))}
      </div>
      {status && (
        <>
          <TextFalt label={etikett} varde={text} satt={setText} flerRad rost
            platshallare={status === "ja" ? "e.g. Reproduced three times at 92–108 km/h on level road, engine warm" : ""} />
          <StorKnapp
            disabled={!text.trim()}
            onClick={() => {
              skicka({ typ: "reproducering", status, beskrivning: text.trim() });
              setStatus("");
              setText("");
            }}
          >
            Document reproduction
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
  // Taket härleds ur underlaget (ALVA-SPEC-071). Knappar över taket är
  // avstängda i stället för att låta valet nekas av grinden vid avslut —
  // spärren är serverns, men att visa den först då vore att spara
  // beskedet till det ögonblick det är som dyrast att åtgärda.
  const tak = sakerhetstak(arende.handelser.map((h) => h.handelse)) as Tillforlitlighet;
  const inom = (n: Tillforlitlighet) => inomTak(n, tak);
  const [oppen, setOppen] = useState(false);
  const [avvikelse, setAvvikelse] = useState("");
  const [orsaker, setOrsaker] = useState<string[]>([]);
  const [underlag, setUnderlag] = useState<string[]>([]);
  const [sakerhet, setSakerhet] = useState<Tillforlitlighet>(tak);
  const [atgard, setAtgard] = useState("");
  const [motivering, setMotivering] = useState("");
  const [ytterligare, setYtterligare] = useState("");
  const [fel, setFel] = useState("");

  const vaxla = (lista: string[], satt: (v: string[]) => void, val: string) =>
    satt(lista.includes(val) ? lista.filter((v) => v !== val) : [...lista, val]);

  const spara = () => {
    const avvikelseFel = granskaAvvikelse(avvikelse);
    if (avvikelseFel) return setFel(avvikelseFel);
    if (orsaker.length === 0) return setFel("Select at least one cause category.");
    if (underlag.length === 0) return setFel("Link at least one evidence source to the assessment.");
    const saknat = underlag.find((k) => !underlagFinns(arende, k));
    if (saknat) return setFel(`The evidence source “${saknat}” is not in the case log — document it first, or choose another source.`);
    if (orsaker.includes("Unknown cause") && !motivering.trim())
      return setFel("An unknown cause requires a reason why the cause could not be established.");
    if (sakerhet !== "hog" && !ytterligare.trim())
      return setFel("At medium or low confidence: state which further checks would strengthen the assessment.");
    if (!atgard.trim()) return setFel("State the recommended action.");
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
    setSakerhet(tak);
    setAtgard("");
    setMotivering("");
    setYtterligare("");
    setFel("");
  };

  return (
    <Panel rubrik="Root cause analysis — required before closing">
      {dokumenterade.map((p) => {
        const h = p.handelse;
        if (h.typ !== "felorsak") return null;
        return (
          <div key={p.id} className="mb-2 border-b border-[#D7DCE2] pb-2 text-[13px] last:border-0">
            <p className="font-semibold">{h.avvikelse}</p>
            <p className="text-[#4D5662]">
              Cause: {h.orsaker.join(", ")} · Evidence: {h.underlag.join(", ")} · Confidence: {TILLFORLITLIGHET_LABEL[h.sakerhet]}
            </p>
            <p>Action: {h.atgard}</p>
          </div>
        );
      })}
      {!oppen ? (
        <StorKnapp variant="sekundar" onClick={() => setOppen(true)}>
          + Document root cause
        </StorKnapp>
      ) : (
        <div>
          <TextFalt
            label="1. Established deviation (not just the component)"
            varde={avvikelse}
            satt={setAvvikelse}
            flerRad
            rost
            platshallare="e.g. The starter motor does not engage despite correct supply voltage and a good earth connection."
          />
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#4D5662]">2. Most probable cause (one or more)</p>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {aktivtRegelpaket().orsakskategorier.map((o) => (
              <button
                key={o}
                onClick={() => vaxla(orsaker, setOrsaker, o)}
                className={`min-h-8 border px-2 text-[12px] font-medium ${
                  orsaker.includes(o) ? "border-[#005CA9] bg-[#FFFFFF] text-[#005CA9]" : "border-[#D7DCE2] bg-white text-[#1B1E22]"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#4D5662]">3. Evidence supporting the assessment</p>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {aktivtRegelpaket().underlagskallor.map((k) => (
              <button
                key={k}
                onClick={() => vaxla(underlag, setUnderlag, k)}
                className={`min-h-8 border px-2 text-[12px] font-medium ${
                  underlag.includes(k) ? "border-[#005CA9] bg-[#FFFFFF] text-[#005CA9]" : "border-[#D7DCE2] bg-white text-[#1B1E22]"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#4D5662]">4. Confidence in the assessment</p>
          <div className="mb-4 grid grid-cols-3 gap-2">
            {(["hog", "medel", "lag"] as const).map((n) => (
              <button
                key={n}
                disabled={!inom(n)}
                title={inom(n) ? undefined : "The evidence does not support this level yet — add evidence, or choose a lower level."}
                onClick={() => inom(n) && setSakerhet(n)}
                className={`min-h-9 border text-[12px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                  sakerhet === n ? "border-[#005CA9] bg-[#005CA9] text-white" : "border-[#D7DCE2] bg-white text-[#1B1E22]"
                }`}
              >
                {TILLFORLITLIGHET_LABEL[n]}
              </button>
            ))}
          </div>
          {sakerhet !== "hog" && (
            <TextFalt
              label="Which further checks would strengthen the assessment?"
              varde={ytterligare}
              satt={setYtterligare}
              rost
            />
          )}
          {orsaker.includes("Unknown cause") && (
            <TextFalt
              label="Rationale — why could the cause not be established?"
              varde={motivering}
              satt={setMotivering}
              flerRad
              rost
            />
          )}
          <TextFalt label="Recommended action" varde={atgard} satt={setAtgard} rost platshallare="e.g. Balance the front wheels and perform a new road test." />
          {fel && <p className="mb-2 text-[12px] font-semibold text-[#8B1A1A]">{fel}</p>}
          <div className="grid grid-cols-2 gap-2">
            <StorKnapp variant="sekundar" onClick={() => setOppen(false)}>
              Cancel
            </StorKnapp>
            <StorKnapp onClick={spara}>Save root cause</StorKnapp>
          </div>
        </div>
      )}
    </Panel>
  );
}


// Åtgärdsfasen: reparationen dokumenteras (eller motiveras varför den
// uteblev) och kvalitetskontrollen sluter loopen som symptom-
// verifieringen öppnade — är symptomet faktiskt borta?
function AtgardsPanel({ arende, skicka }: { arende: Arende; skicka: (h: Handelse) => void }) {
  const poster = atgarder(arende);
  const utford = poster.some((p) => p.handelse.typ === "atgard_utford" && p.handelse.utford);
  const kk = kvalitetskontroll(arende);
  const repro = reproducering(arende);

  const forslag = atgardsforslag(arende);
  const beslut = kundbeslut(arende);
  const senasteFelorsak = felorsaker(arende).at(-1);
  const foreslagenAtgard =
    senasteFelorsak?.handelse.typ === "felorsak" ? senasteFelorsak.handelse.atgard : "";

  const [forslagsLage, setForslagsLage] = useState(false);
  const [forslagText, setForslagText] = useState("");
  const [kostnad, setKostnad] = useState("");
  const [beslutsVal, setBeslutsVal] = useState<"" | "godkant" | "avbojt" | "delvis">("");
  // Kunden ändrar sig: avböjer, ringer tillbaka, godkänner. Formuläret
  // visades bara när INGET besked fanns, så det andra beskedet kunde
  // aldrig registreras — och grinden låste ärendet för alltid.
  const [nyttBesked, setNyttBesked] = useState(false);
  const [kanal, setKanal] = useState("");
  const [beslutsKommentar, setBeslutsKommentar] = useState("");

  const [lage, setLage] = useState<"" | "utford" | "ingen">("");
  const [beskrivning, setBeskrivning] = useState("");
  const [delar, setDelar] = useState("");
  const [orsak, setOrsak] = useState("");
  const [kkResultat, setKkResultat] = useState<"" | "symptomet_borta" | "kvarstar" | "delvis" | "ej_verifierbar">("");
  const [kkText, setKkText] = useState("");

  return (
    <Panel rubrik="Action and quality check">
      {poster.map((p) => {
        const h = p.handelse;
        if (h.typ !== "atgard_utford") return null;
        return (
          <p key={p.id} className="border-b border-[#D7DCE2] py-2 text-[13px] last:border-0">
            {h.utford ? (
              <>
                <span className="font-semibold">Action performed:</span> {h.beskrivning}
                {h.delar && <span className="text-[#4D5662]"> · Parts: {h.delar}</span>}
              </>
            ) : (
              <span className="text-[#8A5A00]">No action performed — {h.motivering}</span>
            )}
          </p>
        );
      })}
      {kk && (
        <p className={`py-2 text-[13px] font-semibold ${kk.resultat === "symptomet_borta" ? "text-[#005CA9]" : "text-[#8A5A00]"}`}>
          Quality check: {KVALITETSKONTROLL_LABEL[kk.resultat]} — <span className="font-normal">{kk.beskrivning}</span>
        </p>
      )}

      {/* Kundkommunikation: förslaget lämnas för godkännande innan
          arbetet påbörjas, och beskedet registreras med kanal. */}
      {forslag.map((p) => {
        const h = p.handelse;
        if (h.typ !== "atgardsforslag") return null;
        return (
          <p key={p.id} className="border-b border-[#D7DCE2] py-2 text-[13px] last:border-0">
            <span className="font-semibold">Proposed action for the customer:</span> {h.beskrivning}
            {h.uppskattadKostnad && <span className="text-[#4D5662]"> · Estimated cost: {h.uppskattadKostnad}</span>}
          </p>
        );
      })}
      {beslut && (
        <>
          <p className={`py-2 text-[13px] font-semibold ${beslut.beslut === "godkant" ? "text-[#005CA9]" : beslut.beslut === "avbojt" ? "text-[#8B1A1A]" : "text-[#8A5A00]"}`}>
            Customer's decision ({beslut.kanal}): {KUNDBESLUT_LABEL[beslut.beslut]}
            {beslut.kommentar && <span className="font-normal"> — {beslut.kommentar}</span>}
          </p>
          {/* Kunden ändrar sig. Utan den här vägen kunde ett avböjande
              aldrig följas av ett godkännande, och grinden låste ärendet
              permanent med ett hinder som inte gick att åtgärda. */}
          {!nyttBesked && (
            <StorKnapp variant="sekundar" onClick={() => setNyttBesked(true)}>
              Register a new decision from the customer
            </StorKnapp>
          )}
        </>
      )}

      {/* Förslaget hör före arbetet, och knappen står därför först. Men
          den får inte försvinna när arbetet väl dokumenterats: grinden
          kräver kundens besked för utfört arbete, och utan den här vägen
          blir ett ärende där teknikern skrev åtgärden först omöjligt att
          stänga — utan att någonstans säga varför. Loggen är append-only
          med tidsstämplar, så ett besked som registreras i efterhand
          syns som just det. */}
      {forslag.length === 0 && !forslagsLage && (
        <StorKnapp
          variant="sekundar"
          className="mb-2"
          onClick={() => {
            setForslagsLage(true);
            setForslagText(foreslagenAtgard);
          }}
        >
          Give the customer a proposed action
        </StorKnapp>
      )}

      {forslagsLage && (
        <div className="mb-4 border border-[#D7DCE2] bg-white p-2">
          <TextFalt
            label="Proposed action (shown to the customer in the shared view)"
            varde={forslagText}
            satt={setForslagText}
            flerRad
            rost
            platshallare="e.g. Rebalance the right front wheel and perform a new road test."
          />
          <TextFalt label="Estimated cost (optional)" varde={kostnad} satt={setKostnad} platshallare="e.g. 1,200 incl. VAT" />
          <div className="grid grid-cols-2 gap-2">
            <StorKnapp variant="sekundar" onClick={() => setForslagsLage(false)}>
              Cancel
            </StorKnapp>
            <StorKnapp
              disabled={forslagText.trim().length < 10}
              onClick={() => {
                skicka({
                  typ: "atgardsforslag",
                  beskrivning: forslagText.trim(),
                  uppskattadKostnad: kostnad.trim() || undefined,
                });
                setForslagsLage(false);
                setForslagText("");
                setKostnad("");
              }}
            >
              Give the proposal
            </StorKnapp>
          </div>
        </div>
      )}

      {forslag.length > 0 && (!beslut || nyttBesked) && (
        <div className="mb-4 border border-[#8A5A00] bg-[#FFFFFF] p-2">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#8A5A00]">
            Record the customer's decision before the work begins
          </p>
          <div className="mb-2 grid grid-cols-3 gap-2">
            {(["godkant", "avbojt", "delvis"] as const).map((val) => (
              <button
                key={val}
                onClick={() => setBeslutsVal(val)}
                className={`min-h-9 border text-[12px] font-semibold ${
                  beslutsVal === val ? "border-[#005CA9] bg-[#005CA9] text-white" : "border-[#D7DCE2] bg-white text-[#1B1E22]"
                }`}
              >
                {KUNDBESLUT_LABEL[val]}
              </button>
            ))}
          </div>
          {beslutsVal && (
            <>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#4D5662]">How was the decision given?</p>
              <div className="mb-2 grid grid-cols-3 gap-2">
                {KUNDKANALER.map((k) => (
                  <button
                    key={k}
                    onClick={() => setKanal(k)}
                    className={`min-h-8 border px-2 text-[12px] font-medium ${
                      kanal === k ? "border-[#005CA9] bg-[#FFFFFF] text-[#005CA9]" : "border-[#D7DCE2] bg-white text-[#1B1E22]"
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <TextFalt
                label={beslutsVal === "godkant" ? "Comment (optional)" : "Customer's reason (required)"}
                varde={beslutsKommentar}
                satt={setBeslutsKommentar}
                rost
              />
              <StorKnapp
                disabled={!kanal || (beslutsVal !== "godkant" && !beslutsKommentar.trim())}
                onClick={() => {
                  skicka({
                    typ: "kundbeslut",
                    beslut: beslutsVal,
                    kanal,
                    kommentar: beslutsKommentar.trim() || undefined,
                  });
                  setBeslutsVal("");
                  setKanal("");
                  setNyttBesked(false);
                  setBeslutsKommentar("");
                }}
              >
                Record the decision
              </StorKnapp>
            </>
          )}
        </div>
      )}

      {poster.length === 0 && !lage && (
        <div className="grid grid-cols-2 gap-2">
          <StorKnapp
            variant="sekundar"
            disabled={forslag.length > 0 && (!beslut || beslut.beslut === "avbojt")}
            onClick={() => setLage("utford")}
          >
            Document the action performed
          </StorKnapp>
          <StorKnapp variant="sekundar" onClick={() => setLage("ingen")}>
            No action performed
          </StorKnapp>
        </div>
      )}

      {lage === "utford" && (
        <div className="mt-2">
          <TextFalt
            label="What was done? (tied to the documented root cause)"
            varde={beskrivning}
            satt={setBeskrivning}
            flerRad
            rost
            platshallare="e.g. Rebalanced the right front wheel, new 40 g weight on the inner rim."
          />
          <TextFalt label="Parts (optional)" varde={delar} satt={setDelar} platshallare="e.g. Balance weights, part no. 30-1234" rost />
          <div className="grid grid-cols-2 gap-2">
            <StorKnapp variant="sekundar" onClick={() => setLage("")}>
              Cancel
            </StorKnapp>
            <StorKnapp
              disabled={beskrivning.trim().length < 10}
              onClick={() => {
                skicka({ typ: "atgard_utford", beskrivning: beskrivning.trim(), delar: delar.trim() || undefined, utford: true });
                setLage("");
                setBeskrivning("");
                setDelar("");
              }}
            >
              Save action
            </StorKnapp>
          </div>
        </div>
      )}

      {lage === "ingen" && (
        <div className="mt-2">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#4D5662]">
            Reason no action was performed (required)
          </p>
          <div className="mb-2 grid gap-2">
            {INGEN_ATGARD_ORSAKER.map((val) => (
              <button
                key={val}
                onClick={() => setOrsak(val)}
                className={`min-h-8 border px-2 text-left text-[12px] font-medium ${
                  orsak === val ? "border-[#005CA9] bg-[#FFFFFF]" : "border-[#D7DCE2] bg-white"
                }`}
              >
                {val}
              </button>
            ))}
          </div>
          <TextFalt label="Or a cause of your own" varde={orsak && !INGEN_ATGARD_ORSAKER.includes(orsak) ? orsak : ""} satt={setOrsak} rost />
          {beslut?.beslut === "avbojt" && (
            <p className="mb-2 text-[11px] text-[#4D5662]">
              The customer has declined the action via {beslut.kanal} — the decision is recorded in the log.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <StorKnapp variant="sekundar" onClick={() => setLage("")}>
              Cancel
            </StorKnapp>
            <StorKnapp
              disabled={!orsak.trim()}
              onClick={() => {
                skicka({ typ: "atgard_utford", beskrivning: "No action performed", utford: false, motivering: orsak.trim() });
                setLage("");
                setOrsak("");
              }}
            >
              Document
            </StorKnapp>
          </div>
        </div>
      )}

      {utford && !kk && (
        <div className="mt-4 border-t border-[#D7DCE2] pt-2">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#4D5662]">
            Quality check — is the symptom gone after the action?
          </p>
          {repro?.status === "ja" && (
            <p className="mb-2 text-[12px] text-[#4D5662]">
              The symptom was reproduced during the examination — recreate the same conditions to verify.
            </p>
          )}
          <div className="mb-2 grid grid-cols-2 gap-2">
            {(["symptomet_borta", "kvarstar", "delvis", "ej_verifierbar"] as const).map((val) => (
              <button
                key={val}
                onClick={() => setKkResultat(val)}
                className={`min-h-9 border px-2 text-[12px] font-semibold ${
                  kkResultat === val ? "border-[#005CA9] bg-[#005CA9] text-white" : "border-[#D7DCE2] bg-white text-[#1B1E22]"
                }`}
              >
                {KVALITETSKONTROLL_LABEL[val]}
              </button>
            ))}
          </div>
          {kkResultat && (
            <>
              <TextFalt
                label={
                  kkResultat === "symptomet_borta"
                    ? "How was it verified? (conditions, speed, road test …)"
                    : kkResultat === "ej_verifierbar"
                      ? "Why could it not be verified? (required)"
                      : "What remains? (required)"
                }
                varde={kkText}
                satt={setKkText}
                flerRad
                rost
                platshallare="e.g. New road test at 80–110 km/h on the same stretch — no vibration."
              />
              <StorKnapp
                disabled={!kkText.trim()}
                onClick={() => {
                  skicka({ typ: "kvalitetskontroll", resultat: kkResultat, beskrivning: kkText.trim() });
                  setKkResultat("");
                  setKkText("");
                }}
              >
                Save quality check
              </StorKnapp>
            </>
          )}
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
    <nav className="overflow-hidden border border-[#D7DCE2] bg-[#F6F7F8]">
      <p className="border-b border-[#D7DCE2] bg-[#D7DCE2] px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#4D5662]">
        Case views
      </p>
      {FLIKAR.map((f) => (
        <button
          key={f.id}
          onClick={() => sattFlik(f.id)}
          className={`block w-full border-l-2 px-4 py-2 text-left text-[13px] ${
            flik === f.id
              ? "border-[#005CA9] bg-[#FFFFFF] font-semibold text-[#005CA9]"
              : "border-transparent text-[#1B1E22] hover:bg-[#D7DCE2]"
          }`}
        >
          {f.label}
        </button>
      ))}
      <p className="border-y border-[#D7DCE2] bg-[#D7DCE2] px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#4D5662]">
        {metodik.namn}
      </p>
      {metodik.steg.map((s, i) => {
        const klar = steg.klart || i < aktuellIndex;
        const aktuell = !steg.klart && i === aktuellIndex;
        return (
          <p
            key={s.id}
            className={`px-4 py-2 text-[12px] ${
              aktuell ? "bg-[#FFFFFF] font-semibold text-[#8A5A00]" : klar ? "text-[#005CA9]" : "text-[#4D5662]"
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
      <div className="flex justify-between gap-2 border-b border-[#D7DCE2] py-2 text-[12px] last:border-0">
        <span className="shrink-0 text-[#4D5662]">{etikett}</span>
        <span className="text-right font-medium text-[#1B1E22]">{varde}</span>
      </div>
    ) : null;
  return (
    <div>
      <Panel rubrik="Technical information">
        {rad("Object", b.objekt?.beskrivning)}
        {rad("Ident", b.objekt?.identifierare)}
        {rad("Customer", b.objekt?.kund)}
        {rad("Assigned to", b.ansvarig)}
        {rad("Status", b.avslutat ? "Closed" : "In progress")}
        {rad("Sync", SYNKSTATUS_LABEL[synkStatus])}
        {rad("Labour time", b.totalArbetstid)}
      </Panel>
      <Panel rubrik="Reliability">
        {b.tillforlitlighet.map((r, i) => (
          <p key={i} className="py-0 text-[12px]">
            <NivaBadge niva={r.niva} /> {r.text}
          </p>
        ))}
      </Panel>
      {!b.avslutat && b.rekommenderatNastaSteg.length > 0 && (
        <Panel rubrik="Recommended next step">
          {b.rekommenderatNastaSteg.map((s, i) => (
            <p key={i} className="py-0 text-[12px] text-[#1B1E22]">
              {i + 1}. {s}
            </p>
          ))}
        </Panel>
      )}
      {senasteAi && senasteAi.handelse.typ === "ai_svar" && (
        <Panel rubrik="Technical recommendation">
          {senasteAi.handelse.rader.map((r, i) => (
            <p key={i} className="py-0 text-[12px]">
              <span className="font-semibold text-[#4D5662]">{AI_RADTYP_LABEL[r.typ]}:</span> {r.text}
            </p>
          ))}
          <p className="mt-2 text-[12px]">
            <span className="font-semibold text-[#005CA9]">Next step:</span> {senasteAi.handelse.nastaSteg}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-wide text-[#4D5662]">
            Decision support · never presented as an established fault
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
    <div className="mb-4 border border-[#005CA9] bg-[#F6F7F8] p-4">
      <p className="mb-2 text-[14px] font-semibold text-[#005CA9]">
        No activity has been recorded for the last {minuter} minutes.
      </p>
      <p className="mb-4 text-[#1B1E22]">Briefly describe what was done during this period.</p>
      <TextFalt label="What has been done?" varde={text} satt={setText} platshallare="e.g. Removed the instrument panel to reach the wiring harness." rost />
      <StorKnapp
        disabled={!text.trim()}
        onClick={() => {
          skicka({ typ: "inaktivitet_forklarad", text: text.trim(), minuter });
          setText("");
        }}
      >
        Add to the work log
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
  const anvandare = useFelsokning((s) => s.anvandare);
  const [visaOverlamning, setVisaOverlamning] = useState(false);
  const [visaAvslut, setVisaAvslut] = useState(false);
  const avsluta = () =>
    skicka({ typ: "arende_avslutat", signatur: anvandare, plattformsversion: PLATTFORMSVERSION });
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

  // QUALITY-AUDIT-2 · M-7. Klienten upprepar inte längre grindens regel.
  //
  // Den gjorde det tidigare, för att kunna gråa ut avslutsknappen, och
  // villkoret gled isär från grinden två gånger: först saknades kravet på
  // en slutsats, sedan kravet på kundens besked. Ingen av gångerna
  // fångades av testerna — bägge hittades av att köra tio ärenden hela
  // vägen. Två självständiga uttryck för en regel glider alltid; frågan
  // är bara när det upptäcks.
  //
  // Nu ställs frågan till grinden själv, med den lokala loggen. Samma
  // funktion som servern kör, så svaret kan inte skilja sig. Att den
  // därmed blir strängare är avsikten: det servern skulle neka ska synas
  // på skärmen där arbetet utförs, inte vid synk när bilen har åkt.
  const hinder = grinda(
    arende.handelser.map((p) => p.handelse),
    metodik,
  ) as { id: string; rubrik: string; detalj?: string }[];

  const kanAvslutas = hinder.length === 0;

  // Slutsatspanelen visas när underlaget är helt — alltså när det enda
  // som återstår är varför-frågan. Att fråga tidigare vore att be om en
  // gissning; att fråga först vid knappen vore att neka någon som redan
  // är klar.
  const underlagKlart = hinder.every((h) => h.id.startsWith("slutsats_"));

  if (avslutat) {
    return (
      <Panel rubrik="The diagnosis is closed">
        <p className="text-[14px] text-[#1B1E22]">
          The case is locked for new guided steps. The log, the brief and the report remain available for traceability and export.
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

  const b = brief(arende, metodik, nu);

  return (
    <>
      <KategoriRad arende={arende} skicka={skicka} />

      {/* Nästa steg på telefonen. Stegträdet och kontextpanelen är dolda
          under lg/xl, så på den enhet produkten uttryckligen är byggd för
          — en telefon i en verkstad — fanns varken överblick eller
          rekommendation i guiden. Raden är kompakt och försvinner när
          panelen till höger tar över. */}
      {!avslutat && b.rekommenderatNastaSteg[0] && (
        <p className="mb-4 border-l-2 border-[#005CA9] bg-white py-2 pl-4 text-[13px] text-[#1B1E22] xl:hidden">
          <span className="mr-2 text-[11px] font-semibold uppercase tracking-wide text-[#4D5662]">Next</span>
          {b.rekommenderatNastaSteg[0]}
        </p>
      )}

      {/* ALVA-modellen som tillstånd, inte som illustration. Den svarar
          på den enda fråga en tekniker som återupptar ett ärende har:
          var i metoden är vi? Fasen härleds ur steget, så indikatorn kan
          aldrig visa något annat än vad metodiken faktiskt gör. */}
      <div className="mb-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4D5662]">
            {fasDefinition(fasFor(steg.steg.id)).namn} — {fasDefinition(fasFor(steg.steg.id)).syfte}
          </span>
          <span className="font-mono text-[11px] text-[#4D5662]">{arendebeteckning(arende.nummer)}</span>
        </div>
        <Fasrad
          aktiv={fasFor(steg.steg.id)}
          klara={klaraFaser(metodik, arende.handelser.map((p) => p.handelse))}
        />
        <p className="mt-2 text-[11px] leading-[16px] text-[#4D5662]">
          {fasDefinition(fasFor(steg.steg.id)).avgransning}
        </p>
      </div>

      {/* ALVA-RULE-200. Panelen visas när det finns ett underlag att
          vila på — antingen för att metodiken är genomförd eller för att
          kedjan reproducering → felorsak → åtgärd → kvalitetskontroll är
          hel. Att fråga tidigare vore att be om en gissning; att fråga
          först vid avslutsknappen vore att neka någon som redan är klar. */}
      {(steg.klart || underlagKlart) && <Slutsatspanel arende={arende} skicka={skicka} />}

      <Panel rubrik={`Methodology: ${metodik.namn} · Step: ${steg.steg.rubrik}`}>
        {steg.klart ? (
          <>
            <p className="mb-4 text-[15px] font-semibold">Every step in the methodology is documented.</p>
            <p className="mb-4 text-[#1B1E22]">
              If the root cause is not verified: document a hypothesis and extend the diagnosis, or close the case
              with recommended next steps.
            </p>
            <StorKnapp variant="fara" disabled={!kanAvslutas} onClick={() => setVisaAvslut(true)}>
              Close diagnosis
            </StorKnapp>
          </>
        ) : steg.sparr ? (
          // Säkerhetsspärr. Metodiken går inte vidare — svaret är ett
          // hinder, inte en varning. Enda vägen framåt är att ändra
          // förutsättningen, inte att klicka förbi.
          <div className="border-2 border-[#8B1A1A] bg-[#FFFFFF] p-4">
            <p className="mb-2 text-[15px] font-semibold text-[#8B1A1A]">Work must not continue</p>
            <p className="mb-2 text-[#1B1E22]">{steg.sparr.orsak}</p>
            <p className="mb-4 font-semibold text-[#1B1E22]">{steg.sparr.atgard}</p>
            <p className="mb-4 text-[12px] text-[#4D5662]">
              The answer is documented in the log. The methodology opens when the precondition is met and the question is answered
              in the affirmative.
            </p>
            {/* Vägen ut. Panelen sade att metodiken öppnas när
                förutsättningen uppfyllts — men frågan gick inte att
                besvara igen, eftersom spärrgrenen kom före frågegrenen.
                Ärendet var därmed permanent låst av ett sanningsenligt
                svar. Loggen är append-only: det nya svaret läggs till,
                det gamla står kvar, och grinden läser det senaste. */}
            <div className="border-t border-[#D7DCE2] pt-4">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#4D5662]">
                When the precondition is met
              </p>
              <FrageKort key={`${steg.steg.id}/${steg.fraga?.id}-om`} steg={steg} skicka={skicka} />
            </div>
          </div>
        ) : steg.fraga ? (
          <FrageKort key={`${steg.steg.id}/${steg.fraga.id}`} steg={steg} skicka={skicka} />
        ) : steg.kontroll ? (
          <KontrollKort key={`${steg.steg.id}/${steg.kontroll.id}`} steg={steg} skicka={skicka} />
        ) : null}

        {/* Sist i panelen, med avsikt: metodikbytet är en utväg när
            proceduren är fel, inte ett val teknikern ska möta före
            arbetet. Ligger den först blir den det första ögat och handen
            träffar — och en metodik som byts av misstag ändrar vilka krav
            grinden ställer. */}
        {!avslutat && (
          <div className="mt-4 border-t border-[#D7DCE2] pt-2">
            <MetodikByte metodik={metodik} skicka={skicka} />
          </div>
        )}
      </Panel>

      {(aiStatus !== "vilar" || senasteAiSvar) && (
        <Panel
          rubrik={
            senasteAiSvar?.handelse.typ === "ai_svar"
              ? `Guidance (${senasteAiSvar.handelse.modell})`
              : "Guidance"
          }
        >
          {aiStatus === "arbetar" && <p className="mb-2 font-semibold text-[#005CA9]">Analyzing …</p>}
          {aiStatus === "fel" && (
            <p className="mb-2 font-semibold text-[#8B1A1A]">The analysis could not be retrieved — try again. The methodology continues unaffected.</p>
          )}
          {senasteAiSvar && senasteAiSvar.handelse.typ === "ai_svar" && (
            <>
              {senasteAiSvar.handelse.rader.map((rad, i) => (
                <p key={i} className="py-0 text-[14px]">
                  <span className="font-semibold text-[#4D5662]">{AI_RADTYP_LABEL[rad.typ]}:</span> {rad.text}
                </p>
              ))}
              <p className="mt-2 text-[14px]">
                <span className="font-semibold text-[#005CA9]">Next step:</span>{" "}
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

      {/* Åtgärdsfasen: vad som gjordes — och kvalitetskontrollen som
          verifierar att symptomet faktiskt är borta. */}
      {felorsaker(arende).length > 0 && <AtgardsPanel arende={arende} skicka={skicka} />}

      {/* Utgående mätarställning: obligatorisk för kvalitetsgrinden när
          ärendet avslutas — erbjuds så fort metodiken är genomarbetad. */}
      {!arende.handelser.some((p) => p.handelse.typ === "matarstallning" && p.handelse.lage === "utgaende") && (
        <Panel rubrik="Outgoing odometer reading — before closing">
          <MatarstallningSteg lage="utgaende" skicka={skicka} />
        </Panel>
      )}

      {/* FGS-1.0: betalaren avgör beviskraven — grinden kräver spår, namn
          och referens för de ärendetyper där någon annan än kunden
          betalar. Panelen visas när ärendetypen kräver den eller när en
          betalare redan registrerats. */}
      {(BETALARTYPER.includes(arendetyp(arende)) ||
        arende.handelser.some((p) => p.handelse.typ === "betalare")) && (
        <BetalarePanel arende={arende} skicka={skicka} />
      )}

      {/* Teknisk eskalering (DISS-mönstret): en öppnad förfrågan utan
          dokumenterat svar spärrar avslutet. */}
      <EskaleringPanel arende={arende} skicka={skicka} />

      {/* Akustisk diagnos (ALVA-DOC-0012, lyft 3): inspelning och
          spektralanalys i webbläsaren, dokumenterad som schemats egna
          händelser. Hopfälld tills den behövs. */}
      <Ljudpanel skicka={skicka} fordon={objekt(arende)?.beskrivning} />

      {!kanAvslutas && <Avslutshinder hinder={hinder} />}
      <div className="grid grid-cols-2 gap-2">
        <StorKnapp variant="sekundar" onClick={() => setVisaOverlamning(true)}>
          Hand over the work
        </StorKnapp>
        <StorKnapp variant="sekundar" disabled={!kanAvslutas} onClick={() => setVisaAvslut(true)}>
          Close diagnosis
        </StorKnapp>
      </div>

      {visaOverlamning && (
        <OverlamningDialog arende={arende} metodik={metodik} nu={nu} skicka={skicka} stang={() => setVisaOverlamning(false)} />
      )}
      {visaAvslut && (
        <AvslutsBekraftelse signatur={anvandare} stang={() => setVisaAvslut(false)} avsluta={avsluta} />
      )}
    </>
  );
}

/**
 * Bekräftelse innan diagnosen låses.
 *
 * Avslutet är oåterkalleligt: ärendet blir skrivskyddat, förseglas och
 * kan därefter bara kompletteras med en ny post som pekar tillbaka. Det
 * var samtidigt ETT klick, i ett gränssnitt som används med handskar på
 * en telefon i en verkstad. En feltryckning kostade alltså ett ärende.
 *
 * Rutan säger vad som händer, inte "är du säker?" — den som läser ska
 * kunna avgöra saken utan att veta hur systemet fungerar inuti.
 */
function AvslutsBekraftelse({ signatur, stang, avsluta }: { signatur: string; stang: () => void; avsluta: () => void }) {
  return (
    <Dialog rubrik="Close the diagnosis?" stang={stang}>
      <p className="mb-4 text-[14px] leading-[22px] text-[#1B1E22]">
        The case is closed and signed by <span className="font-semibold">{signatur || "you"}</span>. It becomes
        read-only and is sealed: after this, nothing can be edited or removed — a correction is a new entry that
        refers back.
      </p>
      <p className="mb-4 text-[13px] text-[#4D5662]">
        The record stays readable and exportable, and the customer&rsquo;s share link keeps working.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <StorKnapp variant="sekundar" onClick={stang}>
          Keep working
        </StorKnapp>
        <StorKnapp
          variant="fara"
          onClick={() => {
            avsluta();
            stang();
          }}
        >
          Close and sign
        </StorKnapp>
      </div>
    </Dialog>
  );
}

// Ärendetyper där någon annan än kunden ersätter arbetet — betalaren ska
// vara fastställd innan grinden släpper avslutet (FGS-1.0 §1/§18).
const BETALARTYPER: readonly string[] = [
  "Warranty",
  "Goodwill",
  "Insurance",
  "Used-vehicle warranty",
  "Body damage warranty",
  "Extended warranty",
  "Leasing or fleet",
];

function BetalarePanel({ arende, skicka }: { arende: Arende; skicka: (h: Handelse) => void }) {
  const [spar, setSpar] = useState<Betalarspar>("fabriksgaranti");
  const [namn, setNamn] = useState("");
  const [referens, setReferens] = useState("");
  const [godkannande, setGodkannande] = useState("");
  const senaste = [...arende.handelser].reverse().find((p) => p.handelse.typ === "betalare")?.handelse;
  return (
    <Panel rubrik="Payer and claim — who reimburses the work">
      {senaste?.typ === "betalare" && (
        <p className="mb-2 text-[13px]">
          <span className="font-semibold text-[#4D5662]">Recorded:</span> {BETALARSPAR_LABEL[senaste.spar]} — {senaste.namn}
          {senaste.referens ? ` (ref ${senaste.referens})` : ""}
          {senaste.godkannande ? ` — approval ${senaste.godkannande}` : ""}
        </p>
      )}
      <div className="mb-2 grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#4D5662]">Track</span>
          <select
            value={spar}
            onChange={(e) => setSpar(e.target.value as Betalarspar)}
            className="w-full border border-[#4D5662] bg-white px-2 py-2 text-[13px] focus:outline-none"
          >
            {(Object.keys(BETALARSPAR_LABEL) as Betalarspar[]).map((k) => (
              <option key={k} value={k}>
                {BETALARSPAR_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <TextFalt label="Payer name" varde={namn} satt={setNamn} platshallare="e.g. the manufacturer, insurer or warranty provider" />
        <TextFalt label="Claim / policy / damage number" varde={referens} satt={setReferens} platshallare="Claim, policy or damage reference" />
        <TextFalt label="Approval reference" varde={godkannande} satt={setGodkannande} platshallare="Authorization — goodwill and external warranties" />
      </div>
      <StorKnapp
        variant="sekundar"
        disabled={!namn.trim()}
        onClick={() => {
          skicka({
            typ: "betalare",
            spar,
            namn: namn.trim(),
            ...(referens.trim() ? { referens: referens.trim() } : {}),
            ...(godkannande.trim() ? { godkannande: godkannande.trim() } : {}),
          });
          setNamn("");
          setReferens("");
          setGodkannande("");
        }}
      >
        Record payer
      </StorKnapp>
    </Panel>
  );
}

function EskaleringPanel({ arende, skicka }: { arende: Arende; skicka: (h: Handelse) => void }) {
  const [text, setText] = useState("");
  const [kanal, setKanal] = useState("");
  const [referens, setReferens] = useState("");
  // Samma matchning som grinden: öppnade per referens, besvarade tar bort.
  const oppna = new Map<string, string>();
  for (const post of arende.handelser) {
    const h = post.handelse;
    if (h.typ !== "eskalering") continue;
    const nyckel = (h.referens ?? "").trim();
    if (h.status === "oppnad") oppna.set(nyckel, h.beskrivning);
    else if (oppna.has(nyckel)) oppna.delete(nyckel);
    else if (nyckel === "" && oppna.size === 1) oppna.clear();
  }
  const skickaMed = (status: "oppnad" | "besvarad") => {
    skicka({
      typ: "eskalering",
      status,
      beskrivning: text.trim(),
      ...(referens.trim() ? { referens: referens.trim() } : {}),
      ...(kanal.trim() ? { kanal: kanal.trim() } : {}),
    });
    setText("");
    setKanal("");
    setReferens("");
  };
  return (
    <Panel rubrik="Technical escalation — manufacturer or warranty provider">
      {oppna.size > 0 && (
        <div className="mb-2 border-l-2 border-[#8A5A00] pl-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8A5A00]">Open, awaiting answer</p>
          {/* Klickbara: referensen matchas TECKEN FÖR TECKEN mot grinden,
              och fältet var fritext utan förifyllning. "DISS-2231" vid
              öppning och "DISS 2231" vid svar stängde ingenting — och
              eftersom loggen är append-only gick det inte att rätta. */}
          {[...oppna.entries()].map(([r, b]) => (
            <button
              key={r || b}
              type="button"
              onClick={() => {
                setReferens(r);
                setText(b);
              }}
              className="mt-2 block w-full border border-[#D7DCE2] bg-white p-2 text-left text-[13px]"
            >
              {r ? <span className="font-mono font-semibold">{r}</span> : null} {b}
              <span className="block text-[11px] text-[#4D5662]">Use this reference for the answer</span>
            </button>
          ))}
        </div>
      )}
      <div className="mb-2 grid gap-2 sm:grid-cols-3">
        <TextFalt label="Description" varde={text} satt={setText} platshallare="What was asked, or what the answer says" />
        <TextFalt label="Channel" varde={kanal} satt={setKanal} platshallare="e.g. DISS, technical support" />
        <TextFalt label="Reference" varde={referens} satt={setReferens} platshallare="Ticket or query number" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StorKnapp variant="sekundar" disabled={!text.trim()} onClick={() => skickaMed("oppnad")}>
          Open escalation
        </StorKnapp>
        <StorKnapp variant="sekundar" disabled={!text.trim() || oppna.size === 0} onClick={() => skickaMed("besvarad")}>
          Document the answer
        </StorKnapp>
      </div>
    </Panel>
  );
}

/**
 * Varför avslut är spärrat — i klartext, på skärmen, medan arbetet pågår.
 *
 * Listan är grindens egen. Det är hela poängen: teknikern läser exakt de
 * hinder som servern skulle svara med, vid den tidpunkt då de fortfarande
 * går att åtgärda. Ett hinder som bara säger "kraven är inte uppfyllda"
 * tvingar teknikern att leta.
 */
function Avslutshinder({ hinder }: { hinder: { id: string; rubrik: string; detalj?: string }[] }) {
  return (
    <div className="mb-2 border-l-2 border-[#8A5A00] bg-[#FFFFFF] px-4 py-4">
      <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8A5A00]">
        The case cannot be closed yet
      </p>
      <ul className="ml-4 list-disc text-[13px] leading-[20px] text-[#1B1E22]">
        {hinder.map((h) => (
          <li key={h.id}>
            {h.rubrik}
            {h.detalj && <span className="text-[#4D5662]"> — {h.detalj}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function KategoriRad({ arende, skicka }: { arende: Arende; skicka: (h: Handelse) => void }) {
  let aktiv: TidKategori = "aktiv_felsokning";
  for (const post of arende.handelser) {
    if (post.handelse.typ === "kategori_byte") aktiv = post.handelse.kategori;
  }
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
      {(Object.keys(TIDKATEGORI_LABEL) as TidKategori[]).map((k) => (
        <button
          key={k}
          onClick={() => k !== aktiv && skicka({ typ: "kategori_byte", kategori: k })}
          className={`whitespace-nowrap border px-4 py-2 text-[12px] font-semibold ${
            k === aktiv
              ? "border-[#005CA9] bg-[#005CA9] text-white"
              : "border-[#D7DCE2] bg-[#F6F7F8] text-[#1B1E22] hover:border-[#4D5662]"
          }`}
        >
          {TIDKATEGORI_LABEL[k]}
        </button>
      ))}
    </div>
  );
}

// En fråga i taget, stora svarsknappar.
/**
 * Byte av metodik.
 *
 * Metodiken valdes vid ärendestart ur felbeskrivningens ordval och kunde
 * sedan aldrig ändras. "Vibrerar när jag bromsar" träffar
 * vibrationsmetodiken före bromsmetodiken — och vibrationsmetodikens
 * EGEN beskrivning säger att bromsvibration ska köras som bromsärende.
 * Teknikern fick alltså rådet men inte vägen, och satt fast i fel
 * procedur genom hela ärendet.
 *
 * Bytet kräver ett varför: metodiken avgör vilka krav grinden ställer,
 * och den som läser loggen ska se när kraven ändrades och på vems
 * bedömning. Kontrollerna från den gamla metodiken står kvar — loggen
 * skrivs aldrig om.
 */
function MetodikByte({ metodik, skicka }: { metodik: Metodik; skicka: (h: Handelse) => void }) {
  const [oppen, setOppen] = useState(false);
  const [vald, setVald] = useState("");
  const [motivering, setMotivering] = useState("");

  if (!oppen) {
    return (
      <button
        type="button"
        onClick={() => setOppen(true)}
        className="text-[12px] underline"
        style={{ color: "#4D5662" }}
      >
        Wrong methodology? Change it
      </button>
    );
  }

  return (
    <div className="mt-2 border border-[#D7DCE2] bg-white p-2">
      <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#4D5662]">
        Change methodology
      </p>
      <p className="mb-2 text-[12px] text-[#4D5662]">
        The checks already documented remain in the log. The gate evaluates the case against the new methodology
        from now on.
      </p>
      <label className="mb-2 block">
        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-[#4D5662]">
          Methodology
        </span>
        <select
          value={vald}
          onChange={(h) => setVald(h.target.value)}
          className="w-full border border-[#D7DCE2] bg-white px-2 py-2 text-[13px]"
        >
          <option value="">Select …</option>
          {METODIKER.filter((m) => m.id !== metodik.id).map((m) => (
            <option key={m.id} value={m.id}>
              {m.namn}
            </option>
          ))}
        </select>
      </label>
      <TextFalt
        label="Why is this the right methodology?"
        varde={motivering}
        satt={setMotivering}
        platshallare="e.g. The vibration only occurs under braking — this is brake judder"
      />
      <div className="grid grid-cols-2 gap-2">
        <StorKnapp variant="sekundar" onClick={() => setOppen(false)}>
          Cancel
        </StorKnapp>
        <StorKnapp
          disabled={!vald || motivering.trim().length < 10}
          onClick={() => {
            skicka({ typ: "metodik_byte", metodikId: vald, motivering: motivering.trim() });
            setOppen(false);
            setVald("");
            setMotivering("");
          }}
        >
          Change methodology
        </StorKnapp>
      </div>
    </div>
  );
}

function FrageKort({ steg, skicka }: { steg: NastaSteg; skicka: (h: Handelse) => void }) {
  const fraga = steg.fraga!;
  const [text, setText] = useState("");
  const svara = (svar: string) =>
    skicka({ typ: "fraga_besvarad", stegId: steg.steg.id, frageId: fraga.id, fraga: fraga.text, svar });

  return (
    <>
      {/* Stegets förklaring visades bara i KontrollKort — alltså aldrig
          medan säkerhetsfrågorna besvarades, där den behövs mest.
          Högvoltsstegets "systemen kan vara dödliga … avläsningen är
          icke-ingripande" var osynlig i exakt det ögonblick teknikern
          skulle svara på om arbetet får börja. */}
      {steg.steg.beskrivning && (
        <p className="mb-4 text-[13px] leading-[20px] text-[#4D5662]">{steg.steg.beskrivning}</p>
      )}
      <p className="mb-4 text-[17px] font-semibold leading-snug">{fraga.text}</p>
      {fraga.svarstyp === "janej" && (
        <div className="grid grid-cols-2 gap-2">
          <StorKnapp onClick={() => svara("Yes")}>Yes</StorKnapp>
          <StorKnapp onClick={() => svara("No")}>No</StorKnapp>
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
          <TextFalt label="Answer" varde={text} satt={setText} rost />
          <StorKnapp disabled={!text.trim()} onClick={() => svara(text.trim())}>
            Save answer
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
  // ALVA-RULE-210. Den kontroll som FANN något bär åtgärden och fakturan,
  // och måste därför bära en bild bunden till just den kontrollen. Bilden
  // går inte att ta i efterhand när delen väl är demonterad.
  const [anmarkning, setAnmarkning] = useState(false);
  const [bevis, setBevis] = useState<string | null>(null);
  const bevisRef = useRef<HTMLInputElement>(null);

  const utford = () => {
    // En kontroll vars krav är ett mätvärde ger ett mätvärde. Tidigare
    // loggades bara kontroll_utford, med följden att 56 av metodikernas
    // 153 kontroller — drygt en tredjedel — mätte utan att det syntes:
    // felorsaksanalysen nekade ”Mätresultat” som underlag, och
    // evidensprofilen i analysvyn underskattade systematiskt hur mycket
    // som faktiskt mättes. Mätningen loggas därför som det den är.
    //
    // Utan känt mätdon graderas den E1, inte E4 (QUALITY-AUDIT M-1) —
    // ett avläst tal utan spårbart instrument är inte en spårbar mätning.
    if (krav === "matvarde" && resultat.trim()) {
      skicka({ typ: "matvarde", beskrivning: kontroll.text, varde: resultat.trim() });
    }
    // Bevisbilden binds till kontrollen (stegId/kontrollId) — en obunden
    // bild i loggen kan annars se ut som bevis för vilket fynd som helst.
    if (anmarkning && bevis) {
      skicka({
        typ: "foto",
        beskrivning: `Finding — ${kontroll.text}`,
        dataUrl: bevis,
        stegId: steg.steg.id,
        kontrollId: kontroll.id,
      });
    }
    skicka({
      typ: "kontroll_utford",
      stegId: steg.steg.id,
      kontrollId: kontroll.id,
      text: kontroll.text,
      resultat: resultat.trim() || undefined,
      ...(anmarkning ? { anmarkning: true } : {}),
    });
  };

  // En anmärkning på en kontroll som inte redan verifieras med foto kräver
  // sin egen bild innan den kan markeras utförd.
  const bevisKravUppfyllt = !anmarkning || krav === "foto" || bevis !== null;
  const kravUppfyllt =
    (krav === "foto" || !krav || resultat.trim().length > 0) && bevisKravUppfyllt;

  return (
    <>
      {steg.steg.beskrivning && <p className="mb-2 text-[#4D5662]">{steg.steg.beskrivning}</p>}
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
              skicka({
                typ: "foto",
                beskrivning: kontroll.text,
                dataUrl,
                stegId: steg.steg.id,
                kontrollId: kontroll.id,
              });
              utford();
            }}
          />
          <TextFalt label="Observation (optional)" varde={resultat} satt={setResultat} rost />
          <StorKnapp onClick={() => filRef.current?.click()}><IkonKamera /> Take a photograph — verifies the check</StorKnapp>
          <p className="mt-2 text-[12px] text-[#4D5662]">This check is verified with a photograph.</p>
        </>
      ) : (
        <>
          <TextFalt
            label={
              krav === "matvarde"
                ? "Measured value (required for verification)"
                : krav === "kommentar"
                  ? "What was observed? (required for verification)"
                  : "Result / value read (optional)"
            }
            varde={resultat}
            satt={setResultat}
            platshallare={krav === "matvarde" ? "e.g. 2.4 bar on all wheels" : "e.g. The fuse is intact, voltage on both sides"}
            rost
          />
          {!kravUppfyllt && (
            <p className="mb-4 text-[12px] font-semibold text-[#005CA9]">
              No {krav === "matvarde" ? "measurement" : "observation"} has been recorded — add a short{" "}
              {krav === "matvarde" ? "measurement entry" : "comment"} before the check can be verified.
            </p>
          )}
          <StorKnapp disabled={!kravUppfyllt} onClick={utford}>
            Mark as verified
          </StorKnapp>
        </>
      )}
      {/* ALVA-RULE-210 · anmärkningen och dess bevis. */}
      <div className="mt-4 border-t border-[#D7DCE2] pt-4">
        <label className="flex items-start gap-2 text-[14px] text-[#1B1E22]">
          <input
            type="checkbox"
            checked={anmarkning}
            onChange={(h) => setAnmarkning(h.target.checked)}
            className="mt-[3px]"
          />
          <span>
            This check found a fault
            <span className="block text-[12px] text-[#4D5662]">
              A finding carries the repair and the invoice, so it must be photographed where it is found.
            </span>
          </span>
        </label>
        {anmarkning && krav !== "foto" && (
          <div className="mt-4">
            <input
              ref={bevisRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={async (e) => {
                const fil = e.target.files?.[0];
                if (!fil) return;
                setBevis(await skalaNerFoto(fil));
              }}
            />
            {bevis ? (
              <div className="flex items-center gap-3">
                <img
                  src={bevis}
                  alt={`Evidence for the finding: ${kontroll.text}`}
                  className="h-16 w-16 border border-[#D7DCE2] object-cover"
                />
                <button
                  type="button"
                  onClick={() => bevisRef.current?.click()}
                  className="min-h-8 border border-[#D7DCE2] bg-white px-3 text-[13px] font-semibold text-[#1B1E22] hover:border-[#005CA9]"
                >
                  Replace photograph
                </button>
              </div>
            ) : (
              <>
                <StorKnapp variant="sekundar" onClick={() => bevisRef.current?.click()}>
                  <IkonKamera /> Photograph the finding — required
                </StorKnapp>
                <p className="mt-2 text-[12px] font-semibold text-[#005CA9]">
                  The check cannot be verified until the finding is photographed.
                </p>
              </>
            )}
          </div>
        )}
      </div>
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
        className="mt-2 w-full py-2 text-[12px] font-medium text-[#4D5662] underline-offset-2 hover:text-[#8B1A1A] hover:underline print:hidden"
      >
        Evidence cannot be produced …
      </button>
    );
  }
  return (
    <div className="mt-4 border border-[#8A5A00] bg-[#FFFFFF] p-2">
      <p className="mb-2 text-[12px] font-semibold text-[#8A5A00]">
        The check is documented without evidence — state the reason (required). This is flagged in the brief and the report.
      </p>
      <div className="mb-2 grid grid-cols-1 gap-2">
        {aktivtRegelpaket().undantagsorsaker.map((val) => (
          <button
            key={val}
            onClick={() => setOrsak(val)}
            className={`min-h-8 border px-2 text-left text-[12px] font-medium ${
              orsak === val ? "border-[#005CA9] bg-[#FFFFFF]" : "border-[#D7DCE2] bg-white"
            }`}
          >
            {val}
          </button>
        ))}
      </div>
      <TextFalt label="Or a cause of your own" varde={orsak && !UNDANTAGSORSAKER.includes(orsak) ? orsak : ""} satt={setOrsak} rost />
      <div className="grid grid-cols-2 gap-2">
        <StorKnapp variant="sekundar" onClick={() => setOppen(false)}>
          Cancel
        </StorKnapp>
        <StorKnapp variant="fara" disabled={!orsak.trim()} onClick={() => vidUndantag(orsak.trim())}>
          Document an exemption
        </StorKnapp>
      </div>
    </div>
  );
}

const DOKTYPER = [
  { id: "observation", label: "Observation" },
  { id: "matvarde", label: "Measurement" },
  { id: "foto", label: "Photo" },
  { id: "video", label: "Video" },
  { id: "instrument", label: "Instrument" },
  { id: "hypotes", label: "Hypothesis" },
  { id: "comment", label: "Comment" },
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
  const videoRef = useRef<HTMLInputElement>(null);
  const [video, setVideo] = useState<{ dataUrl: string; beskrivning: string } | null>(null);
  const [videoFel, setVideoFel] = useState("");
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
        skicka({ typ: "foto", beskrivning: "Instrument photograph — no values could be read", dataUrl: foto });
      }
    } catch {
      skicka({ typ: "foto", beskrivning: "Instrument photograph — the reader could not be reached", dataUrl: foto });
    }
    setLaserAv(false);
  };

  const sparaAvlasning = () => {
    if (!avlasning) return;
    // Originalet först, sedan varje bekräftat värde som eget mätvärde —
    // strukturerad data ersätter aldrig originalevidensen.
    skicka({ typ: "foto", beskrivning: `Instrument reading (${avlasning.tolkning.instrumenttyp})`, dataUrl: avlasning.foto });
    for (const v of avlasning.tolkning.varden) {
      // `kalla` sätts därför att värdet AVLÄSTES av en modell ur fotot
      // (TÜV T-5). Teknikern bekräftar innan något skrivs, vilket täcker
      // riktigheten — men bekräftelsen ger inte spårbarheten: utan
      // härkomst går ett maskinläst värde inte att skilja från ett
      // teknikern läste av instrumentet, och "hur kom siffran hit" är
      // just vad en granskare frågar om en avskriven avläsning.
      skicka({
        typ: "matvarde",
        beskrivning: v.beskrivning,
        varde: v.varde,
        enhet: v.enhet,
        kalla: "Instrument reading (model-interpreted, confirmed by the technician)",
      });
    }
    paSparad?.(
      `Instrument reading (${avlasning.tolkning.instrumenttyp}): ${avlasning.tolkning.varden
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
    if (typ === "comment" && t) {
      skicka({ typ: "kommentar", text: t });
      paSparad?.(t);
    }
    if (typ === "hypotes" && t) {
      skicka({ typ: "hypotes", text: t, niva: "lag" });
      paSparad?.(`Teknikerns hypotes (ej verifierad): ${t}`);
    }
    if (typ === "matvarde" && t && varde.trim()) {
      skicka({ typ: "matvarde", beskrivning: t, varde: varde.trim() });
      paSparad?.(`Measurement: ${t} = ${varde.trim()}`);
    }
    aterstall();
  };

  return (
    <Panel rubrik="Document">
      <div className="grid grid-cols-3 gap-2">
        {DOKTYPER.map((d) => (
          <button
            key={d.id}
            onClick={() =>
              d.id === "foto"
                ? filRef.current?.click()
                : d.id === "video"
                  ? videoRef.current?.click()
                  : d.id === "instrument"
                    ? instRef.current?.click()
                    : setTyp(typ === d.id ? null : d.id)
            }
            className={`min-h-9 border text-[12px] font-semibold ${
              typ === d.id
                ? "border-[#005CA9] bg-[#005CA9] text-white"
                : "border-[#D7DCE2] bg-[#F6F7F8] text-[#1B1E22] hover:border-[#4D5662]"
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
          skicka({ typ: "foto", beskrivning: "Photo", dataUrl });
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
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={async (e) => {
          const fil = e.target.files?.[0];
          e.target.value = "";
          if (!fil) return;
          setVideoFel("");
          try {
            setVideo({ dataUrl: await lasVideo(fil), beskrivning: "" });
          } catch (misslyckande) {
            setVideoFel(misslyckande instanceof Error ? misslyckande.message : "The video could not be read.");
          }
        }}
      />
      {videoFel && <p className="mt-2 text-[12px] font-semibold text-[#8B1A1A]">{videoFel}</p>}
      {video && (
        <div className="mt-4 border border-[#D7DCE2] bg-white p-2">
          <video src={video.dataUrl} controls className="mb-2 max-h-48 w-full border border-[#D7DCE2]" />
          <TextFalt
            label="What does the video show? (required — what makes the noise or moves)"
            varde={video.beskrivning}
            satt={(beskrivning) => setVideo((v) => (v ? { ...v, beskrivning } : v))}
            platshallare="e.g. Engine noise at idle — ticking from the cylinder head"
            rost
          />
          <div className="grid grid-cols-2 gap-2">
            <StorKnapp variant="sekundar" onClick={() => setVideo(null)}>
              Discard
            </StorKnapp>
            <StorKnapp
              disabled={!video.beskrivning.trim()}
              onClick={() => {
                skicka({ typ: "video", beskrivning: video.beskrivning.trim(), dataUrl: video.dataUrl });
                paSparad?.(`Video dokumenterad: ${video.beskrivning.trim()}`);
                setVideo(null);
              }}
            >
              Save video
            </StorKnapp>
          </div>
        </div>
      )}
      {laserAv && <p className="mt-2 text-center text-[12px] font-semibold text-[#005CA9]">Reading the instrument …</p>}
      {avlasning && (
        <div className="mt-4 border border-[#D7DCE2] bg-white p-2">
          {avlasning.demo && (
            <p className="mb-2 border border-[#8A5A00] bg-[#FFFFFF] p-2 text-[11px] font-semibold text-[#8A5A00]">
              Demo reading — image interpretation requires sign-in. The values are sample data.
            </p>
          )}
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#4D5662]">
            Read: {avlasning.tolkning.instrumenttyp} — confirm before anything is logged
          </p>
          {avlasning.tolkning.varden.map((v, i) => (
            <div key={i} className="flex items-center justify-between gap-2 border-b border-[#D7DCE2] py-2 text-[13px] last:border-0">
              <span>
                {v.beskrivning}: <span className="font-semibold">{v.varde}{v.enhet ? ` ${v.enhet}` : ""}</span>
              </span>
              <span className={`text-[11px] font-semibold ${v.konfidens >= 0.95 ? "text-[#005CA9]" : v.konfidens >= 0.8 ? "text-[#8A5A00]" : "text-[#8B1A1A]"}`}>
                {v.konfidens >= 0.95 ? "✓" : `${Math.round(v.konfidens * 100)} %`}
              </span>
            </div>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <StorKnapp variant="sekundar" onClick={() => setAvlasning(null)}>
              Discard
            </StorKnapp>
            <StorKnapp onClick={sparaAvlasning}>Save photograph + values</StorKnapp>
          </div>
        </div>
      )}
      {typ && typ !== "foto" && typ !== "instrument" && (
        <div className="mt-4">
          {typ === "hypotes" && (
            <p className="mb-2 text-[12px] font-semibold text-[#8B1A1A]">
              <IkonPunkt farg="#8B1A1A" /> A hypothesis is a possible root cause that requires verification — it is never logged as an established fault.
            </p>
          )}
          <TextFalt
            label={typ === "matvarde" ? "What was measured?" : DOKTYPER.find((d) => d.id === typ)!.label}
            varde={text}
            satt={setText}
            platshallare={typ === "matvarde" ? "e.g. Supply voltage at pin 30" : ""}
            rost
          />
          {typ === "matvarde" && <TextFalt label="Value (with unit)" varde={varde} satt={setVarde} platshallare="e.g. 13.9 V" />}
          <StorKnapp disabled={!text.trim() || (typ === "matvarde" && !varde.trim())} onClick={spara}>
            Save
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
    <Dialog rubrik="Handover report" stang={stang}>
        <pre className="mb-4 overflow-x-auto whitespace-pre-wrap bg-white p-4 text-[12px] text-[#1B1E22]">
          {text}
        </pre>
        {aiLage === "vilar" && (
          <StorKnapp variant="sekundar" className="mb-4" onClick={komplettera}>
            Extend the analysis: risks &amp; uncertainties
          </StorKnapp>
        )}
        {aiLage === "arbetar" && <p className="mb-4 font-semibold text-[#005CA9]">Summarizing …</p>}
        {aiLage === "fel" && (
          <p className="mb-4 font-semibold text-[#8B1A1A]">Could not be retrieved — requires sign-in. The handover works regardless.</p>
        )}
        {aiLage === "klar" && aiRader.length > 0 && (
          <div className="mb-4 bg-white p-4">
            {aiRader.map((rad, i) => (
              <p key={i} className="py-0 text-[12px] text-[#1B1E22]">
                <span className="font-semibold text-[#4D5662]">{AI_RADTYP_LABEL[rad.typ]}:</span> {rad.text}
              </p>
            ))}
          </div>
        )}
        <TextFalt label="Handed to (optional)" varde={till} satt={setTill} platshallare="e.g. Jonas" />
        <div className="grid grid-cols-2 gap-2">
          <StorKnapp variant="sekundar" onClick={stang}>
            Cancel
          </StorKnapp>
          <StorKnapp
            onClick={() => {
              skicka({ typ: "overlamning", fran: anvandare, till: till.trim() || undefined });
              stang();
            }}
          >
            Confirm handover
          </StorKnapp>
        </div>
    </Dialog>
  );
}

const NIVA_LABEL: Record<DelningsNiva, string> = {
  kund: "Customer",
  partner: "External partner",
  intern: "Internal",
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
      setFel("Could not retrieve shares — requires sign-in and a synchronized case.");
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
        <IkonLank /> Share links (customer / partner / internal)
      </StorKnapp>
    );
  }

  return (
    <div className="mt-4 border border-[#D7DCE2] bg-white p-4">
      {fel && <p className="mb-2 font-semibold text-[#8B1A1A]">{fel}</p>}
      {delningar.map((delning) => (
        <div key={delning.kod} className="flex items-center justify-between gap-2 border-b border-[#D7DCE2] py-2 last:border-0">
          <span className="text-[14px]">
            {NIVA_LABEL[delning.niva]}{" "}
            {delning.aterkallad && <span className="text-[12px] font-semibold text-[#8B1A1A]">(revoked)</span>}
          </span>
          {!delning.aterkallad && (
            <span className="flex gap-2">
              <button
                className="border border-[#D7DCE2] px-4 py-2 font-semibold text-[#1B1E22] hover:border-[#005CA9]"
                onClick={() =>
                  navigator.clipboard.writeText(`${window.location.origin}/felsokning/delad/${delning.kod}`)
                }
              >
                Copy
              </button>
              <button
                className="border border-[#D7DCE2] px-4 py-2 font-semibold text-[#8B1A1A] hover:border-[#8B1A1A]"
                onClick={async () => {
                  await aterkallaDelning(delning.kod);
                  skicka({ typ: "kommentar", text: `Share link (${NIVA_LABEL[delning.niva]}) revoked.` });
                  uppdatera();
                }}
              >
                Revoke
              </button>
            </span>
          )}
        </div>
      ))}
      <div className="mt-2 grid grid-cols-3 gap-2">
        {(Object.keys(NIVA_LABEL) as DelningsNiva[]).map((niva) => (
          <button
            key={niva}
            className="min-h-9 border border-[#D7DCE2] text-[12px] font-semibold text-[#1B1E22] hover:border-[#005CA9]"
            onClick={async () => {
              try {
                await skapaDelning(arende.id, niva);
                skicka({ typ: "kommentar", text: `Share link created (${NIVA_LABEL[niva]}).` });
                uppdatera();
              } catch {
                setFel("Could not create a share — requires sign-in and a synchronized case.");
              }
            }}
          >
            + {NIVA_LABEL[niva]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-[#4D5662]">
        Customer: what can be shared with the customer · External partner: also hypotheses (marked unverified) ·
            Internal: full visibility. Filtering happens on the server.
      </p>
    </div>
  );
}

function LoggFlik({ arende }: { arende: Arende }) {
  return (
    <Panel rubrik="Work log — append-only, nothing is overwritten">
      <ol>
        {arende.handelser.map((post) => (
          <li key={post.id} className="flex gap-4 border-b border-[#D7DCE2] py-2 last:border-0">
            <span className="w-14 shrink-0 font-mono text-[12px] font-semibold text-[#005CA9]">{tidKlockslag(post.tidpunkt)}</span>
            <div className="min-w-0">
              <p className="text-[13px] text-[#1B1E22]">{handelseRubrik(post)}</p>
              <p className="text-[11px] text-[#4D5662]">{post.anvandare}</p>
              {post.handelse.typ === "foto" && (
                <>
                  <Bild bilaga={post.handelse} alt={post.handelse.beskrivning} className="mt-2 max-h-40 border border-[#D7DCE2]" />
                  {/* ALVA-SPEC-072 · under utvärdering: ett andra par ögon
                      på bilden. Uteblir kommentaren syns ingenting. */}
                  <Bildkommentar bilaga={post.handelse} kontroll={post.handelse.beskrivning} />
                </>
              )}
              {post.handelse.typ === "video" && (
                <Klipp bilaga={post.handelse} className="mt-2 max-h-40 border border-[#D7DCE2]" />
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
        <Panel rubrik="Review of the evidence">
          <p className="mb-2 text-[#1B1E22]">
            Have the system review the whole record before you hand it on: contradictions between
            observations, gaps in the documentation, and conclusions that lack support.
          </p>
          {granskning === "arbetar" && <p className="mb-2 font-semibold text-[#005CA9]">Reviewing the evidence …</p>}
          {granskning === "fel" && (
            <p className="mb-2 font-semibold text-[#8B1A1A]">The review could not be retrieved — requires sign-in. Try again.</p>
          )}
          {senasteAi && senasteAi.handelse.typ === "ai_svar" && granskning === "vilar" && (
            <div className="mb-2">
              {senasteAi.handelse.rader.map((rad, i) => (
                <p key={i} className="py-0 text-[14px]">
                  <span className="font-semibold text-[#4D5662]">{AI_RADTYP_LABEL[rad.typ]}:</span> {rad.text}
                </p>
              ))}
              <p className="mt-2 text-[14px]">
                <span className="font-semibold text-[#005CA9]">Next step:</span> {senasteAi.handelse.nastaSteg}
              </p>
              <p className="mt-2 text-[11px] text-[#4D5662]">Latest analysis ({senasteAi.handelse.modell})</p>
            </div>
          )}
          <StorKnapp variant="sekundar" disabled={granskning === "arbetar"} onClick={granska}>
            <IkonSok /> Review the evidence
          </StorKnapp>
        </Panel>
      )}
      <Panel rubrik="Object">
        {b.objekt ? (
          <>
            <p className="text-[15px] font-semibold">{b.objekt.beskrivning}</p>
            <p className="font-semibold text-[#005CA9]">{b.objekt.identifierare}</p>
            {b.objekt.kund && <p className="text-[#1B1E22]">Customer: {b.objekt.kund}</p>}
            {b.ansvarig && <p className="text-[#1B1E22]">Responsible technician: {b.ansvarig}</p>}
          </>
        ) : (
          <p className="text-[#4D5662]">Not identified</p>
        )}
      </Panel>
      <Panel rubrik="Customer's description">
        <p className="text-[14px]">{b.felbeskrivning ? `”${b.felbeskrivning}”` : "—"}</p>
      </Panel>
      <Panel rubrik="Checks performed">
        {b.utfordaKontroller.length === 0 && <p className="text-[#4D5662]">None yet.</p>}
        {b.utfordaKontroller.map((k, i) =>
          k.undantag ? (
            <p key={i} className="py-0 text-[14px] text-[#8A5A00]">
              <IkonVarning /> {k.text} — evidence missing: {k.undantag}
            </p>
          ) : (
            <p key={i} className="py-0 text-[14px]">
              ✓ {k.text}
              {k.resultat && <span className="text-[#4D5662]"> — {k.resultat}</span>}
            </p>
          ),
        )}
      </Panel>
      <Panel rubrik="Observations">
        {b.observationer.length === 0 && <p className="text-[#4D5662]">None yet.</p>}
        {b.observationer.map((o, i) => (
          <p key={i} className="py-0 text-[14px]">• {o}</p>
        ))}
      </Panel>
      {b.hypoteser.length > 0 && (
        <Panel rubrik="Hypotheses — require verification">
          {b.hypoteser.map((h, i) => (
            <p key={i} className="py-0 text-[14px]">
              <NivaBadge niva={h.niva} /> {h.text}
            </p>
          ))}
        </Panel>
      )}
      <Panel rubrik="Not checked">
        {b.ejKontrollerat.length === 0 && <p className="text-[#4D5662]">Every step in the methodology is complete.</p>}
        {b.ejKontrollerat.map((e, i) => (
          <p key={i} className="py-0 text-[14px] text-[#1B1E22]">– {e}</p>
        ))}
      </Panel>
      {!b.avslutat && (
        <Panel rubrik="Recommended next step">
          {b.rekommenderatNastaSteg.map((s, i) => (
            <p key={i} className="py-0 text-[14px]">{i + 1}. {s}</p>
          ))}
        </Panel>
      )}
      <Panel rubrik="Reliability">
        {b.tillforlitlighet.map((r, i) => (
          <p key={i} className="py-0 text-[14px]">
            <NivaBadge niva={r.niva} /> {r.text}
          </p>
        ))}
      </Panel>
      <Panel rubrik="Total labour time">
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
  const klipp = videor(arende);
  const fordelning = tidsfordelningsRader(arende, nu);
  const idn = arendeidentitet(arende);
  const typ = arendetyp(arende);
  const repro = reproducering(arende);
  const orsakerLista = felorsaker(arende);
  const atgardsRader = atgarder(arende);
  const kkRad = kvalitetskontroll(arende);
  const forslagRader = atgardsforslag(arende);
  const beslutRad = kundbeslut(arende);
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
      <Panel rubrik={`Quality gate — ECM v${ECM_VERSION}`}>
        {grind.map((rad) => (
          <div key={rad.id} className="border-b border-[#D7DCE2] py-2 last:border-0">
            <p className="text-[13px]">
              <span className={rad.ok ? "text-[#005CA9]" : rad.kravs ? "text-[#8B1A1A]" : "text-[#8A5A00]"}>
                {rad.ok ? <IkonCheck /> : rad.kravs ? <IkonKryss /> : <IkonVarning />}
              </span>{" "}
              {rad.rubrik}
              {!rad.kravs && <span className="text-[11px] text-[#4D5662]"> (recommended)</span>}
            </p>
            {rad.detalj && <p className="pl-6 text-[12px] text-[#4D5662]">{rad.detalj}</p>}
          </div>
        ))}
        {!godkand && (
          <p className="mt-2 text-[12px] font-semibold text-[#8B1A1A]">
            The report cannot be generated until every failing row has evidence or a documented exemption
            (“Evidence cannot be produced …” in the guide).
          </p>
        )}
      </Panel>
      <Panel rubrik="Customer report">
        <p className="mb-2 text-[#1B1E22]">
          A shareable summary of the work performed. Review the content before the report is shared — images may
            contain details about other customers.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <StorKnapp variant="sekundar" disabled={!godkand} onClick={() => window.print()}>
            Print / PDF
          </StorKnapp>
          <StorKnapp variant="sekundar" onClick={exporteraJson}>
            Export JSON
          </StorKnapp>
        </div>
        <Link to={`/felsokning/dela/${arende.id}`} className="mt-2 block">
          <StorKnapp variant="sekundar"><IkonPunkt farg="#005CA9" /> Open Live Share view</StorKnapp>
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
                skicka({ typ: "kommentar", text: "Share link copied for an external recipient." });
              }}
            >
              <IkonLank /> Copy share link
            </StorKnapp>
          )
        )}
        <p className="mt-2 text-[12px] text-[#4D5662]">
          The share link requires the case to be synchronized (signed-in user).
        </p>
      </Panel>
      {/* ALVA-PROC-0030 · Sammanfattningen först. Den som öppnar
          rapporten — kund, handläggare, nästa tekniker — ska få bilden
          på fem sekunder och sedan kunna gå djupare. Texten är härledd
          ur loggen, så den kan inte säga något som inte står där. */}
      <Panel rubrik="Summary">
        <p className="text-[15px] leading-[24px] text-[#1B1E22]">{sammanfatta(arende).text}</p>
        <p className="mt-2 font-mono text-[11px] text-[#4D5662]">ALVA-PROC-0030 · derived from the case log</p>
      </Panel>

      {/* ALVA-RULE-200 · Teknikerns varför. Placerad före underlaget:
          en handläggare läser skälet först och kontrollerar det sedan. */}
      {(() => {
        const s = [...arende.handelser].reverse().find((p) => p.handelse.typ === "slutsats");
        if (!s || s.handelse.typ !== "slutsats") return null;
        const h = s.handelse;
        return (
          <Panel rubrik="Closing statement and rationale">
            {identitetsRader([
              [h.orsakFastställd === false ? "Reason the cause could not be established" : "Rationale", h.motivering],
              ["Dismissed alternatives", h.uteslutet],
              ["Choice of action", h.atgardsval ?? "—"],
              ["Remaining uncertainty", h.kvarstaende],
            ])}
          </Panel>
        );
      })()}

      {/* Rapportens första sida: ärendeidentiteten — registrerad en gång,
          återanvänd här automatiskt. */}
      <Panel rubrik="Case information">
        {identitetsRader([
          ["Case", `#${arende.nummer}`],
          ["Work order", idn.arbetsorder],
          ["Claim / warranty no.", idn.claim],
          ["Claim number", idn.skadenummer],
          ["Case type", typ],
          ["Responsible technician", idn.ansvarig],
        ])}
      </Panel>
      <Panel rubrik="Vehicle information">
        {identitetsRader([
          ["Passenger car", idn.beskrivning],
          ["Reg. no.", idn.identifierare],
          ["VIN", idn.vin],
          ["Odometer in", matIn],
          ["Odometer out", matUt],
          ["Customer", idn.kund],
        ])}
      </Panel>
      {/* Beviskedjan: kundens upplevelse, teknikerns verifiering och den
          tekniska slutsatsen hålls strikt åtskilda och spårbara. */}
      <Panel rubrik="Customer's description">
        <p className="text-[14px]">{b.felbeskrivning ? `”${b.felbeskrivning}”` : "—"}</p>
      </Panel>
      <Panel rubrik="Verified observation">
        {repro ? (
          <>
            <p className="text-[14px] font-semibold">{reproduceringsText(repro.status)}</p>
            <p className="text-[13px] text-[#4D5662]">{repro.beskrivning}</p>
          </>
        ) : (
          <p className="text-[14px] text-[#4D5662]">Reproduction not documented yet.</p>
        )}
      </Panel>
      <Panel rubrik="Root cause analysis">
        {orsakerLista.length === 0 && <p className="text-[14px] text-[#4D5662]">Root cause analysis not documented yet.</p>}
        {orsakerLista.map((p) => {
          const h = p.handelse;
          if (h.typ !== "felorsak") return null;
          return (
            <div key={p.id} className="mb-4 border-b border-[#D7DCE2] pb-2 last:mb-0 last:border-0">
              <p className="text-[14px] font-semibold">{h.avvikelse}</p>
              {identitetsRader([
                ["Assessed root cause", h.orsaker.join(", ")],
                ["Evidence for the assessment", h.underlag.join(", ")],
                ["Confidence level", TILLFORLITLIGHET_LABEL[h.sakerhet]],
                ["Recommended action", h.atgard],
                ["Rationale", h.motivering],
                ["Strengthening checks", h.ytterligareKontroller],
              ])}
            </div>
          );
        })}
      </Panel>
      {(forslagRader.length > 0 || beslutRad) && (
        <Panel rubrik="Proposed action and customer decision">
          {forslagRader.map((p) => {
            const h = p.handelse;
            if (h.typ !== "atgardsforslag") return null;
            return (
              <div key={p.id}>
                {identitetsRader([
                  ["Proposed action", h.beskrivning],
                  ["Estimated cost", h.uppskattadKostnad],
                  ["Estimated time", h.uppskattadTid],
                ])}
              </div>
            );
          })}
          {beslutRad &&
            identitetsRader([
              ["Customer decision", KUNDBESLUT_LABEL[beslutRad.beslut]],
              ["Given via", beslutRad.kanal],
              ["Comment", beslutRad.kommentar],
            ])}
        </Panel>
      )}
      <Panel rubrik="Action performed and verification">
        {atgardsRader.length === 0 && <p className="text-[14px] text-[#4D5662]">No action documented yet.</p>}
        {atgardsRader.map((p) => {
          const h = p.handelse;
          if (h.typ !== "atgard_utford") return null;
          return (
            <div key={p.id} className="mb-2">
              {h.utford ? (
                identitetsRader([
                  ["Action performed", h.beskrivning],
                  ["Parts", h.delar],
                ])
              ) : (
                <p className="text-[14px] text-[#8A5A00]">No action performed — {h.motivering}</p>
              )}
            </div>
          );
        })}
        {kkRad &&
          identitetsRader([
            ["Quality check", KVALITETSKONTROLL_LABEL[kkRad.resultat]],
            ["Verification", kkRad.beskrivning],
          ])}
      </Panel>
      <Panel rubrik="Summary">
        <p className="text-[14px]">Total labour time: <span className="font-semibold">{b.totalArbetstid}</span></p>
        {fordelning.length > 0 && (
          <div className="mt-2">
            {fordelning.map((r) => (
              <p key={r.label} className="text-[#1B1E22]">{r.label}: {r.tid}</p>
            ))}
          </div>
        )}
      </Panel>
      <Panel rubrik="Timeline">
        {kundposter.map((post) => (
          <p key={post.id} className="py-0 text-[13px]">
            <span className="font-mono font-semibold text-[#005CA9]">{tidKlockslag(post.tidpunkt)}</span>{" "}
            {handelseRubrik(post)}
          </p>
        ))}
      </Panel>
      {klipp.length > 0 && (
        <Panel rubrik="Documented video">
          {klipp.map((v, i) => (
            <figure key={i} className="mb-2">
              <Klipp bilaga={v.bilaga} className="w-full border border-[#D7DCE2]" />
              <figcaption className="mt-2 text-[11px] text-[#4D5662]">{v.beskrivning}</figcaption>
            </figure>
          ))}
        </Panel>
      )}
      {bilder.length > 0 && (
        <Panel rubrik="Documented images">
          <div className="grid grid-cols-2 gap-2">
            {bilder.map((bild, i) => (
              <figure key={i}>
                <Bild bilaga={bild.bilaga} alt={bild.beskrivning} className="border border-[#D7DCE2]" />
                <figcaption className="mt-2 text-[11px] text-[#4D5662]">{bild.beskrivning}</figcaption>
              </figure>
            ))}
          </div>
        </Panel>
      )}
      {!b.avslutat || b.ejKontrollerat.length > 0 ? (
        <Panel rubrik="Recommended next steps">
          {(b.avslutat ? b.ejKontrollerat : b.rekommenderatNastaSteg).map((s, i) => (
            <p key={i} className="py-0 text-[14px]">{i + 1}. {s}</p>
          ))}
        </Panel>
      ) : null}
      <p className="text-center text-[11px] text-[#4D5662]">
        Generated from the case log · Observations and measurements are reported without conclusions that lack support.
      </p>
      <Ritningsstampel arende={arende} />
      <Felanmalan arende={arende} metodik={metodik ?? null} />
    </>
  );
}

/**
 * Felanmälan — i ärendet, inte någon annanstans.
 *
 * En anmälningsknapp som bara finns i en portalvy nås aldrig av den som
 * står med händerna i en bil. Den ligger därför i varje ärende, och tar
 * med sitt sammanhang självt: ärende, metodik, öppet steg och
 * plattformsversion. Teknikern minns inte plattformsversionen, och att
 * fråga efter den är att lägga över vårt problem på verkstaden.
 *
 * Anmälan lagras aldrig i ärendets händelselogg. Loggen är protokollet
 * över vad som gjordes med FORDONET; att ett fel i vårt system anmäldes
 * hör inte dit, och skulle följa med in i en rapport som ska hålla i en
 * tvist.
 */
function Felanmalan({ arende, metodik }: { arende: Arende; metodik: Metodik | null }) {
  const [oppen, setOppen] = useState(false);
  const [typ, setTyp] = useState("felanmalan");
  const [rubrik, setRubrik] = useState("");
  const [text, setText] = useState("");
  const [utfall, setUtfall] = useState<{ ok?: string; fel?: string }>({});
  const [skickar, setSkickar] = useState(false);

  const skicka = async () => {
    setSkickar(true);
    setUtfall({});
    try {
      const { anmalSupport, plattformAktiv } = await import("@/felsokning/plattform");
      if (!plattformAktiv()) {
        setUtfall({ fel: "No platform is configured — the report cannot be sent from here." });
        return;
      }
      const { beteckning } = await anmalSupport({
        typ,
        rubrik,
        beskrivning: text,
        arendeId: arende.id,
        sammanhang: {
          metodikId: metodik?.id ?? "",
          plattformsversion: PLATTFORMSVERSION,
          klient: typeof navigator === "undefined" ? "" : navigator.userAgent,
        },
      });
      setUtfall({ ok: beteckning });
      setRubrik("");
      setText("");
    } catch (orsak) {
      setUtfall({ fel: orsak instanceof Error ? orsak.message : String(orsak) });
    } finally {
      setSkickar(false);
    }
  };

  if (!oppen) {
    return (
      <p className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setOppen(true)}
          className="text-[12px] uppercase tracking-wide text-[#4D5662] underline"
        >
          Report a problem with the system
        </button>
      </p>
    );
  }

  return (
    <Panel rubrik="Report a problem with the system">
      <p className="mb-2 text-[12px] text-[#4D5662]">
        Case, methodology and platform version are included automatically. Nothing about the vehicle or the customer is sent.
      </p>
      <div className="mb-2 grid grid-cols-3 gap-2">
        {[
          ["felanmalan", "Fault"],
          ["fraga", "Question"],
          ["forbattring", "Improvement"],
        ].map(([id, etikett]) => (
          <StorKnapp key={id} variant={typ === id ? "primar" : "sekundar"} onClick={() => setTyp(id)}>
            {etikett}
          </StorKnapp>
        ))}
      </div>
      <TextFalt label="What is it about?" varde={rubrik} satt={setRubrik} platshallare="Short title" />
      <TextFalt
        label="What happened, and what did you expect?"
        varde={text}
        satt={setText}
        platshallare="Whoever answers cannot see your screen."
        flerRad
      />
      {utfall.ok && <p className="mt-2 text-[13px] text-[#005CA9]">Reported as {utfall.ok}.</p>}
      {utfall.fel && <p className="mt-2 text-[13px] text-[#8B1A1A]">{utfall.fel}</p>}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <StorKnapp onClick={skicka} disabled={skickar || rubrik.trim().length < 5 || text.trim().length < 20}>
          {skickar ? "Sending" : "Send report"}
        </StorKnapp>
        <StorKnapp variant="sekundar" onClick={() => setOppen(false)}>
          Close
        </StorKnapp>
      </div>
    </Panel>
  );
}

/**
 * Ritningsstämpel.
 *
 * En teknisk ritning bär alltid ett hörn med beteckning, revision och
 * status, så att ett papper på en verkstadsbänk går att härleda till
 * exakt vilken utgåva det kom ur. En rapport som ska hålla i en tvist
 * behöver samma sak: läsaren måste kunna se vilket regelpaket och vilken
 * evidensmodell som gällde när ärendet stängdes — inte vilka som gäller
 * den dag rapporten läses.
 *
 * Varje fält är något en granskare efterfrågar innan den litar på resten
 * av dokumentet. Inget av dem är dekoration.
 */
function Ritningsstampel({ arende }: { arende: Arende }) {
  const paket = aktivtRegelpaket();
  const avslutad = [...arende.handelser].reverse().find((p) => p.handelse.typ === "arende_avslutat");
  const falt: [string, string][] = [
    ["Designation", arendebeteckning(arende.nummer)],
    ["Rule package", paket.version],
    ["Evidence model", `ECM ${ECM_VERSION}`],
    // Versionen VID AVSLUTET, inte dagens. Stämpeln läste tidigare den
    // aktuella konstanten, så ett ärende stängt under 1.0 visade 3.1 —
    // vilket är exakt det stämpelns beskrivning ovan säger att den inte
    // ska göra. Ett öppet ärende visar dagens, eftersom det är sant då.
    ["Platform", avslutad ? versionVidAvslut(avslutad.handelse) : PLATTFORMSVERSION],
    ["Status", avslutad ? "Closed" : "In progress"],
    ["Release", avslutad ? new Date(avslutad.tidpunkt).toISOString().slice(0, 10) : "—"],
  ];

  return (
    <div className="alva-yta mt-4 border border-[#D7DCE2] bg-white">
      <div className="grid grid-cols-2 sm:grid-cols-3">
        {falt.map(([etikett, varde]) => (
          <div key={etikett} className="border-b border-r border-[#D7DCE2] px-2 py-2 last:border-r-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#4D5662]">{etikett}</div>
            <div className="mt-2 font-mono text-[11px] text-[#1B1E22]">{varde}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
