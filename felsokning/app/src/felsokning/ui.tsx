// Delade UI-komponenter för Guidad Felsökning.
// Designfilosofi: industriellt verkstadsverktyg i ETKA-tradition —
// plana ytor, skarpa kanter, tät informationslayout, dämpad palett
// (ljusgrå ytor, djup marinblå som primärfärg), inga dekorationer.
// Verktygsrad ~44 px, rektangulära knappar (max 4 px radie), kompakta
// formulär med vänsterställda etiketter.

import { Link } from "react-router-dom";
import { useRef, type ReactNode } from "react";
import type { Tillforlitlighet } from "./domain";
import { TILLFORLITLIGHET_LABEL } from "./domain";
import { MikrofonKnapp } from "./Mikrofon";
import { IkonPunkt } from "./ikoner";

// Industriell palett (inspirerad av tyska verkstadssystem):
//   bakgrund #ECECEC · paneler #F7F7F7 · kanter #C6C6C6
//   primär (djup blå) #00437A · markerad rad #D6E4F2
//   varning #9A6700 · fel #8B1A1A · ok #1E6B34

const TYPSNITT = "'Inter', 'IBM Plex Sans', 'Segoe UI', Roboto, system-ui, sans-serif";

export function FelsokningSkal({
  rubrik,
  tillbaka,
  hoger,
  bred,
  children,
}: {
  rubrik: string;
  tillbaka?: { till: string; text: string };
  hoger?: ReactNode;
  bred?: boolean;
  children: ReactNode;
}) {
  const maxBredd = bred ? "max-w-[1240px]" : "max-w-3xl";
  return (
    <div
      className="felsokning-print min-h-screen bg-[#ECECEC] text-[13px] text-[#1A1A1A]"
      style={{ fontFamily: TYPSNITT }}
    >
      {/* Verktygsrad: låg, mörk marinblå — breadcrumb till vänster,
          status till höger. Inget stort sidhuvud. */}
      <header className="sticky top-0 z-20 border-b border-[#0A2A4A] bg-[#123A63] px-3 text-white print:static">
        <div className={`mx-auto flex min-h-11 ${maxBredd} items-center justify-between gap-3 py-1`}>
          <div className="flex min-w-0 items-center gap-2">
            {tillbaka && (
              <>
                <Link
                  to={tillbaka.till}
                  className="whitespace-nowrap text-[12px] font-medium text-[#A9C3DE] hover:text-white hover:underline"
                >
                  ← {tillbaka.text}
                </Link>
                <span className="text-[#5B7CA0]">/</span>
              </>
            )}
            <h1 className="truncate text-[14px] font-semibold tracking-tight">{rubrik}</h1>
          </div>
          {hoger}
        </div>
      </header>
      <main className={`mx-auto ${maxBredd} px-3 py-4 pb-20`}>{children}</main>
    </div>
  );
}

export function StorKnapp({
  children,
  onClick,
  variant = "primar",
  disabled,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primar" | "sekundar" | "fara";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const farg =
    variant === "primar"
      ? "border border-[#003561] bg-[#00437A] text-white hover:bg-[#005A9E] active:bg-[#003561]"
      : variant === "fara"
        ? "border border-[#6E1414] bg-[#8B1A1A] text-white hover:bg-[#A32020] active:bg-[#6E1414]"
        : "border border-[#ADADAD] bg-white text-[#1A1A1A] hover:bg-[#EDF2F7] hover:border-[#00437A] active:bg-[#D6E4F2]";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-10 w-full px-3 py-1.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 print:hidden ${farg} ${className}`}
    >
      {children}
    </button>
  );
}

export function Panel({ rubrik, children }: { rubrik?: string; children: ReactNode }) {
  return (
    <section className="mb-3 border border-[#C6C6C6] bg-[#F7F7F7] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
      {rubrik && (
        <h2 className="mb-2 border-b border-[#DDDDDD] pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#4A5560]">
          {rubrik}
        </h2>
      )}
      {children}
    </section>
  );
}

const NIVA_FARG: Record<Tillforlitlighet, string> = {
  hog: "#1E6B34",
  medel: "#C08A00",
  lag: "#8B1A1A",
};

export function NivaBadge({ niva }: { niva: Tillforlitlighet }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] font-semibold">
      <IkonPunkt farg={NIVA_FARG[niva]} />
      {TILLFORLITLIGHET_LABEL[niva]}
    </span>
  );
}

export function TextFalt({
  label,
  varde,
  satt,
  platshallare,
  flerRad,
  rost,
  losenord,
}: {
  label: string;
  varde: string;
  satt: (v: string) => void;
  platshallare?: string;
  flerRad?: boolean;
  rost?: boolean;
  losenord?: boolean;
}) {
  // Tal-till-text skriver in i samma redigerbara fält — användaren
  // granskar och bekräftar alltid innan något sparas i loggen.
  const vardeRef = useRef(varde);
  vardeRef.current = varde;
  const klass =
    "w-full border border-[#ADADAD] bg-white px-2.5 py-1.5 text-[13px] text-[#1A1A1A] placeholder-[#9AA0A6] focus:border-[#00437A] focus:outline-none focus:ring-1 focus:ring-[#00437A]";
  return (
    <label className="mb-2.5 block">
      <span className="mb-1 flex min-h-6 items-center justify-between gap-2">
        <span className="text-left text-[11px] font-semibold uppercase tracking-wide text-[#4A5560]">{label}</span>
        {rost && (
          <MikrofonKnapp
            paText={(text) => satt(vardeRef.current ? `${vardeRef.current.trimEnd()} ${text}` : text)}
          />
        )}
      </span>
      {flerRad ? (
        <textarea value={varde} onChange={(e) => satt(e.target.value)} placeholder={platshallare} rows={3} className={klass} />
      ) : (
        <input
          type={losenord ? "password" : "text"}
          value={varde}
          onChange={(e) => satt(e.target.value)}
          placeholder={platshallare}
          className={klass}
        />
      )}
    </label>
  );
}
