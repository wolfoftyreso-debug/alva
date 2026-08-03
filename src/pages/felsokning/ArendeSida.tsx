import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Arende, Handelse, TidKategori } from "@/felsokning/domain";
import { TIDKATEGORI_LABEL, handelseRubrik } from "@/felsokning/domain";
import type { Metodik, NastaSteg } from "@/felsokning/metodik";
import { nastaSteg } from "@/felsokning/metodik";
import {
  arAvslutat,
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
import { AI_RADTYP_LABEL, fragaAi, granskaUnderlag, sammanfattaOverlamning } from "@/felsokning/ai";
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
            AI-underlag · presenteras aldrig som konstaterat fel
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

  if (avslutat) {
    return (
      <Panel rubrik="Felsökningen är avslutad">
        <p className="text-[14px] text-[#333333]">
          Ärendet är låst för nya guidesteg. Loggen, briefen och rapporten finns kvar för spårbarhet och export.
        </p>
      </Panel>
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
            <StorKnapp variant="fara" onClick={() => skicka({ typ: "arende_avslutat" })}>
              Avsluta felsökning
            </StorKnapp>
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
              ? `AI-handledning (${senasteAiSvar.handelse.modell})`
              : "AI-handledning"
          }
        >
          {aiStatus === "arbetar" && <p className="mb-2 animate-pulse font-semibold text-[#00437A]">AI analyserar …</p>}
          {aiStatus === "fel" && (
            <p className="mb-2 font-semibold text-[#8B1A1A]">AI-svaret kunde inte hämtas — försök igen. Metodiken fortsätter som vanligt.</p>
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

      <div className="grid grid-cols-2 gap-2">
        <StorKnapp variant="sekundar" onClick={() => setVisaOverlamning(true)}>
          Lämna över arbete
        </StorKnapp>
        <StorKnapp variant="sekundar" onClick={() => skicka({ typ: "arende_avslutat" })}>
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
    </>
  );
}

const DOKTYPER = [
  { id: "observation", label: "Observation" },
  { id: "matvarde", label: "Mätvärde" },
  { id: "foto", label: "Foto" },
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

  const aterstall = () => {
    setTyp(null);
    setText("");
    setVarde("");
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
            onClick={() => (d.id === "foto" ? filRef.current?.click() : setTyp(typ === d.id ? null : d.id))}
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
      {typ && typ !== "foto" && (
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
            ✨ AI-komplettera: risker &amp; osäkerheter
          </StorKnapp>
        )}
        {aiLage === "arbetar" && <p className="mb-3 animate-pulse font-semibold text-[#00437A]">AI sammanfattar …</p>}
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
        <Panel rubrik="AI-granskning">
          <p className="mb-2 text-[#333333]">
            Låt AI:n gå igenom hela underlaget innan du lämnar det vidare: motsägelser mellan
            observationer, luckor i dokumentationen och slutsatser som saknar stöd.
          </p>
          {granskning === "arbetar" && <p className="mb-2 animate-pulse font-semibold text-[#00437A]">AI granskar underlaget …</p>}
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
              <p className="mt-1 text-[11px] text-[#707070]">Senaste AI-svar ({senasteAi.handelse.modell})</p>
            </div>
          )}
          <StorKnapp variant="sekundar" disabled={granskning === "arbetar"} onClick={granska}>
            🔍 AI-granska underlaget
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
        {b.utfordaKontroller.map((k, i) => (
          <p key={i} className="py-0.5 text-[14px]">
            ✓ {k.text}
            {k.resultat && <span className="text-[#4A5560]"> — {k.resultat}</span>}
          </p>
        ))}
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
  // Kategoribyten är interna; hypoteser och AI-dialogen är arbetsmaterial
  // och ingår inte i det som delas med kund.
  const kundposter = arende.handelser.filter(
    (p) => !["kategori_byte", "hypotes", "ai_svar", "ansvarig_satt"].includes(p.handelse.typ),
  );

  // Alla exporter bygger på samma händelselogg och versionsmärks:
  // version = antal händelser vid exporttillfället.
  const exporteraJson = () => {
    const version = arende.handelser.length;
    const data = {
      export: { format: "JSON", version, exporteradAv: anvandare, tidpunkt: new Date().toISOString() },
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

  return (
    <>
      <Panel rubrik="Kundrapport">
        <p className="mb-2 text-[#333333]">
          Delningsbar sammanställning av utfört arbete. Granska innehållet innan rapporten delas — bilder kan
          innehålla uppgifter om andra kunder.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <StorKnapp variant="sekundar" onClick={() => window.print()}>
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
      <Panel rubrik={`Ärende #${arende.nummer}`}>
        {b.objekt && (
          <p className="text-[14px] font-semibold">
            {b.objekt.beskrivning} · {b.objekt.identifierare}
          </p>
        )}
        {b.felbeskrivning && <p className="mt-1 text-[14px]">Felbeskrivning: ”{b.felbeskrivning}”</p>}
        <p className="mt-1 text-[14px]">Total arbetstid: <span className="font-semibold">{b.totalArbetstid}</span></p>
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
