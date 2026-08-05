// ALVA:s komponentbibliotek.
//
// Ett bibliotek, två användningar: den publika webbplatsen och det
// inloggade gränssnittet. Besökaren ska aldrig märka att den lämnat
// marknadswebben när den loggar in, eftersom den inte har gjort det —
// det är samma system, samma typografi, samma rutnät, samma ord.
//
// Regler som gäller varje komponent här:
//
//   Rutnät      8 px, undantagslöst. Ett rutnät med undantag är inget.
//   Färg        Nästan monokromt. ALVA Blue bara för aktivt steg,
//               verifierad status och markerad komponent — aldrig som
//               dekoration.
//   Rörelse     Ingen. En animation som inte bär information är brus i
//               ett utrymme där teknikern redan har för mycket brus.
//   Ikoner      ✓ ○ □ → och inget annat. Inga emojier, inga
//               illustrationer.
//   Rubriker    VERSALER. Sektionsrubriker är etiketter, inte meningar.

import type { ReactNode } from "react";
import { type Fas, FASER, fasDefinition } from "./system";
import { STATUS, type Status } from "./sprak";

// ---- Färg -------------------------------------------------------------

export const FARG = {
  graphite: "#1B1E22",
  steel: "#4D5662",
  lightSteel: "#D7DCE2",
  background: "#F6F7F8",
  blue: "#005CA9",
  white: "#FFFFFF",
} as const;

// ---- Typografi --------------------------------------------------------

/**
 * Sektionsetikett. Versaler, spärrad, liten. Detta är hur ett tekniskt
 * dokument märker upp ett fält — inte hur en rubrik i en artikel ser ut.
 */
export function Etikett({ children, ton = "steel" }: { children: ReactNode; ton?: "steel" | "blue" | "graphite" }) {
  const färg = ton === "blue" ? FARG.blue : ton === "graphite" ? FARG.graphite : FARG.steel;
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: färg }}>
      {children}
    </div>
  );
}

export function Rubrik({ children, niva = 2 }: { children: ReactNode; niva?: 1 | 2 | 3 }) {
  const storlek = niva === 1 ? "text-[32px] leading-[40px]" : niva === 2 ? "text-[22px] leading-[32px]" : "text-[16px] leading-[24px]";
  const Tagg = (niva === 1 ? "h1" : niva === 2 ? "h2" : "h3") as "h1";
  return (
    <Tagg className={`${storlek} font-semibold uppercase tracking-[0.06em]`} style={{ color: FARG.graphite }}>
      {children}
    </Tagg>
  );
}

// ---- Ikoner -----------------------------------------------------------
//
// Fyra tecken. En status som inte går att uttrycka med dem är en status
// som inte är genomtänkt.

export type Ikon = "klar" | "pagaende" | "vantar" | "nasta";

const IKONTECKEN: Record<Ikon, string> = {
  klar: "✓",
  pagaende: "○",
  vantar: "□",
  nasta: "→",
};

export function Symbol({ ikon, ton }: { ikon: Ikon; ton?: string }) {
  return (
    <span aria-hidden="true" className="inline-block w-4 text-center font-normal" style={{ color: ton ?? FARG.steel }}>
      {IKONTECKEN[ikon]}
    </span>
  );
}

// ---- Status -----------------------------------------------------------

const STATUSFARG: Record<Status, string> = {
  pending: FARG.steel,
  in_progress: FARG.blue,
  complete: FARG.graphite,
  passed: FARG.blue,
  failed: FARG.graphite,
  blocked: FARG.graphite,
  incomplete: FARG.steel,
  not_applicable: FARG.steel,
};

/**
 * Status anges alltid med ord, aldrig enbart med färg. En tekniker med
 * nedsatt färgseende ska kunna skilja PASSED från FAILED — och den som
 * läser en utskrift i svartvitt likaså.
 */
export function Statusmärke({ status }: { status: Status }) {
  const ram = status === "failed" || status === "blocked";
  return (
    <span
      className="inline-block border px-2 py-[2px] text-[11px] font-semibold uppercase tracking-[0.1em]"
      style={{
        color: STATUSFARG[status],
        borderColor: ram ? FARG.graphite : FARG.lightSteel,
        background: FARG.white,
      }}
    >
      {STATUS[status]}
    </span>
  );
}

// ---- Datablock --------------------------------------------------------

/**
 * Ett fält med etikett och värde. Grunden i varje ALVA-skärm: systemet
 * redovisar tillstånd i namngivna fält i stället för i löpande text.
 */
export function Falt({ etikett, children }: { etikett: string; children: ReactNode }) {
  return (
    <div className="border-t py-2" style={{ borderColor: FARG.lightSteel }}>
      <Etikett>{etikett}</Etikett>
      <div className="mt-1 text-[14px] leading-[20px]" style={{ color: FARG.graphite }}>
        {children}
      </div>
    </div>
  );
}

export function Block({ children, rubrik, beteckning }: { children: ReactNode; rubrik?: string; beteckning?: string }) {
  return (
    <section className="mb-6 border bg-white" style={{ borderColor: FARG.lightSteel }}>
      {(rubrik || beteckning) && (
        <header
          className="flex items-baseline justify-between border-b px-4 py-3"
          style={{ borderColor: FARG.lightSteel, background: FARG.background }}
        >
          {rubrik && <Rubrik niva={3}>{rubrik}</Rubrik>}
          {beteckning && <span className="font-mono text-[11px]" style={{ color: FARG.steel }}>{beteckning}</span>}
        </header>
      )}
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

// ---- Fasindikator -----------------------------------------------------

/**
 * ALVA-modellen som ett tillstånd, inte som en illustration. Den visar
 * var i metoden arbetet befinner sig — vilket är den enda frågan en
 * tekniker som återupptar ett ärende faktiskt har.
 */
export function Fasrad({ aktiv, klara = [] }: { aktiv: Fas; klara?: Fas[] }) {
  return (
    <ol className="flex border" style={{ borderColor: FARG.lightSteel }}>
      {FASER.map((f) => {
        const ärAktiv = f.id === aktiv;
        const ärKlar = klara.includes(f.id);
        return (
          <li
            key={f.id}
            aria-current={ärAktiv ? "step" : undefined}
            className="flex-1 border-r px-4 py-3 last:border-r-0"
            style={{
              borderColor: FARG.lightSteel,
              background: ärAktiv ? FARG.blue : FARG.white,
              color: ärAktiv ? FARG.white : ärKlar ? FARG.graphite : FARG.steel,
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-[18px] font-semibold leading-none">{f.bokstav}</span>
              <Symbol ikon={ärKlar ? "klar" : ärAktiv ? "pagaende" : "vantar"} ton={ärAktiv ? FARG.white : undefined} />
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em]">{f.namn}</div>
            <div className="mt-1 text-[11px] leading-[16px]" style={{ opacity: ärAktiv ? 0.9 : 0.75 }}>
              {f.syfte}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ---- Skärmstruktur ----------------------------------------------------

/**
 * Varje ALVA-skärm har samma struktur, och det är avsiktligt monotont:
 *
 *   SYSTEM → CURRENT STEP → OBJECTIVE → REQUIRED INPUT → RESULT → NEXT ACTION
 *
 * En tekniker som lärt sig läsa en skärm har lärt sig läsa alla. Det är
 * samma princip som gör att en instrumentpanel i ett flygplan går att
 * flytta mellan flygplanstyper.
 */
export interface Procedursteg {
  fas: Fas;
  steg: string;
  syfte: string;
  underlag?: string;
  forvantat?: string;
  resultat?: ReactNode;
  status: Status;
  nasta?: string;
}

export function Procedurvy({
  beteckning: bet,
  steg,
  klaraFaser = [],
  children,
}: {
  beteckning: string;
  steg: Procedursteg;
  klaraFaser?: Fas[];
  children?: ReactNode;
}) {
  const fas = fasDefinition(steg.fas);
  return (
    <div style={{ background: FARG.background }}>
      <div className="mx-auto max-w-[880px] px-6 py-8">
        <div className="mb-6 flex items-baseline justify-between">
          <Etikett ton="graphite">System</Etikett>
          <span className="font-mono text-[11px]" style={{ color: FARG.steel }}>{bet}</span>
        </div>

        <div className="mb-6">
          <Fasrad aktiv={steg.fas} klara={klaraFaser} />
        </div>

        <Block rubrik="Current step">
          <Falt etikett="Phase">
            {fas.namn} — {fas.syfte}
          </Falt>
          <Falt etikett="Step">{steg.steg}</Falt>
          <Falt etikett="Objective">{steg.syfte}</Falt>
          {steg.underlag && <Falt etikett="Input required">{steg.underlag}</Falt>}
          {steg.forvantat && <Falt etikett="Expected value">{steg.forvantat}</Falt>}
          <Falt etikett="Status">
            <Statusmärke status={steg.status} />
          </Falt>
          {steg.resultat && <Falt etikett="Result">{steg.resultat}</Falt>}
          {steg.nasta && (
            <Falt etikett="Next action">
              <span className="inline-flex items-center gap-2">
                <Symbol ikon="nasta" />
                {steg.nasta}
              </span>
            </Falt>
          )}
        </Block>

        {children}
      </div>
    </div>
  );
}

// ---- Interaktion ------------------------------------------------------

export function Knapp({
  children,
  onClick,
  variant = "primar",
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primar" | "sekundar";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const primär = variant === "primar";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="border px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.08em] disabled:opacity-40"
      style={{
        background: primär ? FARG.graphite : FARG.white,
        color: primär ? FARG.white : FARG.graphite,
        borderColor: primär ? FARG.graphite : FARG.steel,
      }}
    >
      {children}
    </button>
  );
}

export function Tabell({ kolumner, rader }: { kolumner: string[]; rader: ReactNode[][] }) {
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr>
          {kolumner.map((k) => (
            <th
              key={k}
              scope="col"
              className="border-b px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.1em]"
              style={{ borderColor: FARG.lightSteel, color: FARG.steel }}
            >
              {k}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rader.map((rad, i) => (
          <tr key={i}>
            {rad.map((cell, j) => (
              <td key={j} className="border-b px-3 py-2 align-top" style={{ borderColor: FARG.lightSteel, color: FARG.graphite }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
