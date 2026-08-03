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
import { AI_MODELL, AI_RADTYP_LABEL, fragaAi } from "@/felsokning/ai";
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
        <p className="text-lg text-zinc-300">Ärendet finns inte på den här enheten.</p>
      </FelsokningSkal>
    );
  }

  const o = objekt(arende);
  const avslutat = arAvslutat(arende);
  const total = formateraTid(tidsfordelning(arende, nu).totalMs);
  const skicka = (h: Handelse) => laggTill(id, h);

  return (
    <FelsokningSkal
      rubrik={`#${arende.nummer} ${o?.beskrivning ?? ""}`}
      tillbaka={{ till: "/felsokning", text: "Ärenden" }}
      hoger={
        <div className="text-right">
          <p className="text-lg font-extrabold text-amber-400">{total}</p>
          <p className="text-xs font-bold uppercase text-zinc-500">
            {avslutat ? "Avslutat" : "Pågår"} · {SYNKSTATUS_LABEL[synkStatus]}
          </p>
        </div>
      }
    >
      <nav className="mb-4 grid grid-cols-4 gap-1 rounded-lg border-2 border-zinc-700 bg-zinc-900 p-1">
        {FLIKAR.map((f) => (
          <button
            key={f.id}
            onClick={() => setFlik(f.id)}
            className={`min-h-12 rounded-md text-base font-extrabold transition-colors ${
              flik === f.id ? "bg-amber-400 text-zinc-950" : "text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            {f.label}
          </button>
        ))}
      </nav>

      {!avslutat && <InaktivitetsBanner arende={arende} nu={nu} skicka={skicka} />}

      {flik === "guide" && (
        <GuideFlik arende={arende} metodik={metodik} avslutat={avslutat} skicka={skicka} nu={nu} />
      )}
      {flik === "logg" && <LoggFlik arende={arende} />}
      {flik === "brief" && <BriefFlik arende={arende} metodik={metodik} nu={nu} />}
      {flik === "rapport" && <RapportFlik arende={arende} metodik={metodik} nu={nu} skicka={skicka} />}
    </FelsokningSkal>
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
    <div className="mb-4 rounded-lg border-2 border-amber-400 bg-zinc-900 p-4">
      <p className="mb-2 text-lg font-bold text-amber-400">
        Ingen aktivitet har registrerats de senaste {minuter} minuterna.
      </p>
      <p className="mb-3 text-zinc-300">Beskriv kort vad som gjorts under denna period.</p>
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
  const aiNyckel = useFelsokning((s) => s.aiNyckel);
  const [aiStatus, setAiStatus] = useState<"vilar" | "arbetar" | "fel">("vilar");

  // AI:n svarar skriftligt på varje bekräftad dokumentation: klassificerat
  // (observation/verifierat/hypotes/rekommendation) och loggat som händelse.
  // Utan nyckel guidar den deterministiska metodiken ensam.
  const fragaAiOmDokumentation = async (inmatning: string) => {
    if (!aiNyckel) return;
    setAiStatus("arbetar");
    try {
      const svar = await fragaAi(aiNyckel, brief(arende, metodik, nu), metodik.namn, inmatning);
      skicka({ typ: "ai_svar", rader: svar.rader, nastaSteg: svar.nastaSteg, modell: AI_MODELL });
      setAiStatus("vilar");
    } catch {
      setAiStatus("fel");
    }
  };

  const senasteAiSvar = [...arende.handelser].reverse().find((p) => p.handelse.typ === "ai_svar");

  if (avslutat) {
    return (
      <Panel rubrik="Felsökningen är avslutad">
        <p className="text-lg text-zinc-300">
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
            <p className="mb-3 text-xl font-bold">Samtliga steg i metodiken är dokumenterade.</p>
            <p className="mb-4 text-zinc-300">
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
          rubrik={`AI-handledning (${
            senasteAiSvar?.handelse.typ === "ai_svar" ? senasteAiSvar.handelse.modell : AI_MODELL
          })`}
        >
          {aiStatus === "arbetar" && <p className="mb-2 animate-pulse font-bold text-amber-400">AI analyserar …</p>}
          {aiStatus === "fel" && (
            <p className="mb-2 font-bold text-red-400">AI-svaret kunde inte hämtas — kontrollera nyckel och nät. Metodiken fortsätter som vanligt.</p>
          )}
          {senasteAiSvar && senasteAiSvar.handelse.typ === "ai_svar" && (
            <>
              {senasteAiSvar.handelse.rader.map((rad, i) => (
                <p key={i} className="py-0.5 text-lg">
                  <span className="font-extrabold text-zinc-400">{AI_RADTYP_LABEL[rad.typ]}:</span> {rad.text}
                </p>
              ))}
              <p className="mt-2 text-lg">
                <span className="font-extrabold text-amber-400">Nästa steg:</span>{" "}
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
          className={`whitespace-nowrap rounded-full border-2 px-4 py-2 text-sm font-extrabold transition-colors ${
            k === aktiv
              ? "border-amber-400 bg-amber-400 text-zinc-950"
              : "border-zinc-600 bg-zinc-900 text-zinc-300 hover:border-zinc-400"
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
      <p className="mb-4 text-2xl font-extrabold leading-snug">{fraga.text}</p>
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
      {steg.steg.beskrivning && <p className="mb-2 text-zinc-400">{steg.steg.beskrivning}</p>}
      <p className="mb-4 text-2xl font-extrabold leading-snug">{kontroll.text}</p>
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
          <p className="mt-2 text-sm text-zinc-500">Denna kontroll verifieras med foto.</p>
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
            <p className="mb-3 text-sm font-bold text-amber-400">
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
            className={`min-h-12 rounded-lg border-2 text-sm font-extrabold transition-colors ${
              typ === d.id
                ? "border-amber-400 bg-amber-400 text-zinc-950"
                : "border-zinc-600 bg-zinc-900 text-zinc-200 hover:border-zinc-400"
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
            <p className="mb-2 text-sm font-bold text-red-400">
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
  const text = overlamningstext(arende, metodik, nu);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-lg border-2 border-zinc-600 bg-zinc-900 p-4">
        <h2 className="mb-3 text-xl font-extrabold">Överlämningsrapport</h2>
        <pre className="mb-3 overflow-x-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-4 text-sm text-zinc-200">
          {text}
        </pre>
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

function LoggFlik({ arende }: { arende: Arende }) {
  return (
    <Panel rubrik="Arbetslogg — append-only, ingenting skrivs över">
      <ol>
        {arende.handelser.map((post) => (
          <li key={post.id} className="flex gap-3 border-b border-zinc-800 py-2 last:border-0">
            <span className="w-14 shrink-0 font-mono text-sm font-bold text-amber-400">{tidKlockslag(post.tidpunkt)}</span>
            <div className="min-w-0">
              <p className="text-base text-zinc-100">{handelseRubrik(post)}</p>
              <p className="text-xs text-zinc-500">{post.anvandare}</p>
              {post.handelse.typ === "foto" && (
                <img src={post.handelse.dataUrl} alt={post.handelse.beskrivning} className="mt-1 max-h-40 rounded border border-zinc-700" />
              )}
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function BriefFlik({ arende, metodik, nu }: { arende: Arende; metodik: Metodik; nu: string }) {
  const b = brief(arende, metodik, nu);
  return (
    <>
      <Panel rubrik="Objekt">
        {b.objekt ? (
          <>
            <p className="text-xl font-extrabold">{b.objekt.beskrivning}</p>
            <p className="font-bold text-amber-400">{b.objekt.identifierare}</p>
            {b.objekt.kund && <p className="text-zinc-300">Kund: {b.objekt.kund}</p>}
          </>
        ) : (
          <p className="text-zinc-400">Ej identifierat</p>
        )}
      </Panel>
      <Panel rubrik="Kundens beskrivning">
        <p className="text-lg">{b.felbeskrivning ? `”${b.felbeskrivning}”` : "—"}</p>
      </Panel>
      <Panel rubrik="Utförda kontroller">
        {b.utfordaKontroller.length === 0 && <p className="text-zinc-400">Inga ännu.</p>}
        {b.utfordaKontroller.map((k, i) => (
          <p key={i} className="py-0.5 text-lg">
            ✓ {k.text}
            {k.resultat && <span className="text-zinc-400"> — {k.resultat}</span>}
          </p>
        ))}
      </Panel>
      <Panel rubrik="Observationer">
        {b.observationer.length === 0 && <p className="text-zinc-400">Inga ännu.</p>}
        {b.observationer.map((o, i) => (
          <p key={i} className="py-0.5 text-lg">• {o}</p>
        ))}
      </Panel>
      {b.hypoteser.length > 0 && (
        <Panel rubrik="Hypoteser — kräver verifiering">
          {b.hypoteser.map((h, i) => (
            <p key={i} className="py-0.5 text-lg">
              <NivaBadge niva={h.niva} /> {h.text}
            </p>
          ))}
        </Panel>
      )}
      <Panel rubrik="Ej kontrollerat">
        {b.ejKontrollerat.length === 0 && <p className="text-zinc-400">Allt i metodiken är utfört.</p>}
        {b.ejKontrollerat.map((e, i) => (
          <p key={i} className="py-0.5 text-lg text-zinc-300">– {e}</p>
        ))}
      </Panel>
      {!b.avslutat && (
        <Panel rubrik="Rekommenderat nästa steg">
          {b.rekommenderatNastaSteg.map((s, i) => (
            <p key={i} className="py-0.5 text-lg">{i + 1}. {s}</p>
          ))}
        </Panel>
      )}
      <Panel rubrik="Tillförlitlighet">
        {b.tillforlitlighet.map((r, i) => (
          <p key={i} className="py-0.5 text-lg">
            <NivaBadge niva={r.niva} /> {r.text}
          </p>
        ))}
      </Panel>
      <Panel rubrik="Total arbetstid">
        <p className="text-2xl font-extrabold">{b.totalArbetstid}</p>
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
    (p) => !["kategori_byte", "hypotes", "ai_svar"].includes(p.handelse.typ),
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
        <p className="mb-2 text-zinc-300">
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
        {arende.delningskod && (
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
        )}
        <p className="mt-2 text-sm text-zinc-500">
          Delningslänken kräver att ärendet är synkat mot molnet (inloggad användare).
        </p>
      </Panel>
      <Panel rubrik={`Ärende #${arende.nummer}`}>
        {b.objekt && (
          <p className="text-lg font-bold">
            {b.objekt.beskrivning} · {b.objekt.identifierare}
          </p>
        )}
        {b.felbeskrivning && <p className="mt-1 text-lg">Felbeskrivning: ”{b.felbeskrivning}”</p>}
        <p className="mt-1 text-lg">Total arbetstid: <span className="font-extrabold">{b.totalArbetstid}</span></p>
        {fordelning.length > 0 && (
          <div className="mt-2">
            {fordelning.map((r) => (
              <p key={r.label} className="text-zinc-300">{r.label}: {r.tid}</p>
            ))}
          </div>
        )}
      </Panel>
      <Panel rubrik="Tidslinje">
        {kundposter.map((post) => (
          <p key={post.id} className="py-0.5 text-base">
            <span className="font-mono font-bold text-amber-400">{tidKlockslag(post.tidpunkt)}</span>{" "}
            {handelseRubrik(post)}
          </p>
        ))}
      </Panel>
      {bilder.length > 0 && (
        <Panel rubrik="Dokumenterade bilder">
          <div className="grid grid-cols-2 gap-2">
            {bilder.map((bild, i) => (
              <figure key={i}>
                <img src={bild.dataUrl} alt={bild.beskrivning} className="rounded border border-zinc-700" />
                <figcaption className="mt-1 text-xs text-zinc-400">{bild.beskrivning}</figcaption>
              </figure>
            ))}
          </div>
        </Panel>
      )}
      {!b.avslutat || b.ejKontrollerat.length > 0 ? (
        <Panel rubrik="Rekommenderade nästa steg">
          {(b.avslutat ? b.ejKontrollerat : b.rekommenderatNastaSteg).map((s, i) => (
            <p key={i} className="py-0.5 text-lg">{i + 1}. {s}</p>
          ))}
        </Panel>
      ) : null}
      <p className="text-center text-xs text-zinc-600">
        Genererad ur ärendets händelselogg · Observationer och mätvärden redovisas utan slutsatser som saknar stöd.
      </p>
    </>
  );
}
