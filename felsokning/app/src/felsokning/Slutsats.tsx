// ALVA-RULE-200 · Slutsatspanelen.
//
// Här möter teknikern kravet, och här avgörs om regeln blir älskad eller
// hatad. Tre val styr det:
//
//   Fyra fält, inte ett.   En stor ruta ger "klart". Fyra namngivna
//                          frågor med olika adressat ger fyra svar,
//                          eftersom var och en är konkret nog att
//                          besvara utan att först fundera på vad som
//                          efterfrågas.
//
//   Granskning medan man   Bristerna visas under fältet direkt, inte som
//   skriver.               ett felmeddelande efter Spara. Att bli nekad
//                          efter att ha skrivit klart är det som gör
//                          obligatoriska fält förhatliga.
//
//   Hypoteserna listas.    Systemet visar vilka misstankar som ligger i
//                          loggen och behöver bemötas. Teknikern ska
//                          aldrig behöva gissa vad som fattas.

import { useMemo, useState } from "react";
import type { Arende, Handelse } from "./domain";
import { granskaSlutsats, obemottaHypoteser } from "../../../services/gemensam/motivering.mjs";
import { FARG, Etikett, Knapp, Statusmärke } from "@/alva/komponenter";

interface Brist {
  falt: string;
  text: string;
}

const FALT = [
  {
    id: "motivering" as const,
    etikett: "Motivering",
    fraga: "Varför följer slutsatsen av underlaget?",
    hjalp: "Knyt mätvärden, foton och kontroller till slutsatsen. Vad i evidensen gör att just detta följer?",
    rader: 4,
  },
  {
    id: "uteslutet" as const,
    etikett: "Uteslutna alternativ",
    fraga: "Vad övervägdes, och varför föll det bort?",
    hjalp: "En felsökning utan uteslutna alternativ är en gissning som råkade stämma.",
    rader: 3,
  },
  {
    id: "atgardsval" as const,
    etikett: "Val av åtgärd",
    fraga: "Varför denna åtgärd och inte en annan?",
    hjalp: "Byte eller justering? Hela enheten eller en del? Skälet läses av den som granskar kostnaden.",
    rader: 2,
  },
  {
    id: "kvarstaende" as const,
    etikett: "Kvarstående osäkerhet",
    fraga: "Vad är fortfarande osäkert?",
    hjalp: 'Får vara "inget" — men det måste sägas aktivt.',
    rader: 2,
  },
];

export function Slutsatspanel({ arende, skicka }: { arende: Arende; skicka: (h: Handelse) => void }) {
  const handelser = useMemo(() => arende.handelser.map((p) => p.handelse), [arende]);
  const befintlig = useMemo(
    () => [...handelser].reverse().find((h) => h.typ === "slutsats"),
    [handelser],
  ) as Extract<Handelse, { typ: "slutsats" }> | undefined;

  const [fastställd, setFastställd] = useState(befintlig?.orsakFastställd !== false);
  const [utkast, setUtkast] = useState({
    motivering: befintlig?.motivering ?? "",
    uteslutet: befintlig?.uteslutet ?? "",
    atgardsval: befintlig?.atgardsval ?? "",
    kvarstaende: befintlig?.kvarstaende ?? "",
  });

  const förslag = { typ: "slutsats" as const, ...utkast, orsakFastställd: fastställd };
  const brister: Brist[] = useMemo(
    () => granskaSlutsats(förslag, handelser),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [utkast, fastställd, handelser],
  );
  const obemötta: string[] = useMemo(() => obemottaHypoteser(handelser, förslag), [handelser, förslag]);

  const brist = (falt: string) => brister.find((b) => b.falt === falt && !b.text.includes("bemöts inte"));
  const klar = brister.length === 0;

  const arbeteUtfört = handelser.some((h) => h.typ === "atgard_utford" && h.utford);

  return (
    <section className="mb-4 border bg-white" style={{ borderColor: FARG.lightSteel }}>
      <header
        className="flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-2"
        style={{ borderColor: FARG.lightSteel, background: FARG.background }}
      >
        <h3 className="text-[16px] font-semibold uppercase tracking-[0.06em]" style={{ color: FARG.graphite }}>
          Closing statement
        </h3>
        <div className="flex items-center gap-4">
          <Statusmärke status={klar ? "complete" : "incomplete"} />
          <span className="font-mono text-[11px]" style={{ color: FARG.steel }}>
            ALVA-RULE-200
          </span>
        </div>
      </header>

      <div className="px-4 py-2">
        <p className="mb-4 max-w-[62ch] text-[13px] leading-[20px]" style={{ color: FARG.steel }}>
          Underlaget visar vad som mättes. Slutsatsen visar vad som är fel. Det här är raden som säger varför det
          ena följer av det andra — och den enda en garantihandläggare eller försäkringsbedömare behöver granska.
        </p>

        {/* Den ärliga vägen. Att orsaken inte kunnat fastställas är ett
            giltigt utfall, och ofta mer användbart än en påhittad orsak.
            Men varför den inte kunde det är fortfarande ett varför. */}
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { värde: true, text: "Orsak fastställd" },
            { värde: false, text: "Orsak kunde inte fastställas" },
          ].map((val) => (
            <button
              key={String(val.värde)}
              type="button"
              onClick={() => setFastställd(val.värde)}
              aria-pressed={fastställd === val.värde}
              className="border px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em]"
              style={{
                background: fastställd === val.värde ? FARG.graphite : FARG.white,
                color: fastställd === val.värde ? FARG.white : FARG.graphite,
                borderColor: fastställd === val.värde ? FARG.graphite : FARG.steel,
              }}
            >
              {val.text}
            </button>
          ))}
        </div>

        {obemötta.length > 0 && (
          <div className="mb-4 border-2 px-4 py-2" style={{ borderColor: FARG.graphite }}>
            <Etikett ton="graphite">Hypoteser i loggen som behöver bemötas</Etikett>
            <ul className="mt-2 text-[13px] leading-[20px]" style={{ color: FARG.graphite }}>
              {obemötta.map((text) => (
                <li key={text} className="flex gap-2">
                  <span aria-hidden="true">□</span>
                  {text}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[12px] leading-[16px]" style={{ color: FARG.steel }}>
              Ange under Uteslutna alternativ varför de föll bort — eller varför de kvarstår.
            </p>
          </div>
        )}

        {FALT.filter((f) => f.id !== "atgardsval" || arbeteUtfört).map((f) => {
          const fel = brist(f.id);
          const etikett = f.id === "motivering" && !fastställd ? "Skäl till att orsaken inte fastställts" : f.etikett;
          return (
            <div key={f.id} className="border-t py-2" style={{ borderColor: FARG.lightSteel }}>
              <label
                htmlFor={`slutsats-${f.id}`}
                className="block text-[11px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: FARG.steel }}
              >
                {etikett}
              </label>
              <p className="mt-1 text-[13px]" style={{ color: FARG.graphite }}>
                {f.fraga}
              </p>
              <textarea
                id={`slutsats-${f.id}`}
                rows={f.rader}
                value={utkast[f.id]}
                onChange={(e) => setUtkast({ ...utkast, [f.id]: e.target.value })}
                aria-describedby={`slutsats-${f.id}-hjalp`}
                aria-invalid={Boolean(fel)}
                className="mt-2 w-full border px-4 py-2 text-[14px] leading-[20px]"
                style={{
                  borderColor: fel ? FARG.graphite : FARG.lightSteel,
                  borderWidth: fel ? 2 : 1,
                  background: FARG.white,
                  color: FARG.graphite,
                }}
              />
              <p id={`slutsats-${f.id}-hjalp`} className="mt-1 text-[12px] leading-[16px]" style={{ color: FARG.steel }}>
                {fel ? fel.text : f.hjalp}
              </p>
            </div>
          );
        })}

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Knapp disabled={!klar} onClick={() => skicka(förslag)}>
            {befintlig ? "Uppdatera slutsats" : "Registrera slutsats"}
          </Knapp>
          {!klar && (
            <span className="text-[12px]" style={{ color: FARG.steel }}>
              {brister.length} {brister.length === 1 ? "brist" : "brister"} kvar.
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
