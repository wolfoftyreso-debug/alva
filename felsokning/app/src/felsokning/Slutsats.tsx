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
  /** Katalognyckeln. Saknas för brister som bara har en färdig text. */
  nyckel?: string;
  text: string;
}

const FALT = [
  {
    id: "motivering" as const,
    etikett: "Rationale",
    fraga: "Why does the conclusion follow from the evidence?",
    hjalp: "Tie measurements, photographs and checks to the conclusion. What in the evidence makes this follow?",
    rader: 4,
  },
  {
    id: "uteslutet" as const,
    etikett: "Dismissed alternatives",
    fraga: "What was considered, and why was it dismissed?",
    hjalp: "A diagnosis without dismissed alternatives is a guess that happened to be right.",
    rader: 3,
  },
  {
    id: "atgardsval" as const,
    etikett: "Choice of action",
    fraga: "Why this action and not another?",
    hjalp: "Replacement or adjustment? The whole unit or a part? The reason is read by whoever reviews the cost.",
    rader: 2,
  },
  {
    id: "kvarstaende" as const,
    etikett: "Remaining uncertainty",
    fraga: "What remains uncertain?",
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

  // Hypotesbristerna hör till fältet "uteslutet" men är inte en brist i
  // fältet — de listas för sig nedan. De sållas därför bort här, på
  // NYCKELN och inte på texten: texten är översatt och byter språk med
  // organisationen, och en jämförelse mot en svensk fras slutade tyst
  // att matcha när standardspråket blev engelska.
  const brist = (falt: string) =>
    brister.find((b) => b.falt === falt && b.nyckel !== "slutsats.hypotes_obemott");
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
            { värde: true, text: "Cause established" },
            { värde: false, text: "Cause could not be established" },
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
            <Etikett ton="graphite">Hypotheses in the log that need addressing</Etikett>
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
          const etikett = f.id === "motivering" && !fastställd ? "Reason the cause could not be established" : f.etikett;
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
            {befintlig ? "Update closing statement" : "Record closing statement"}
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
