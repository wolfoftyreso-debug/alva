// Delade UI-komponenter för Guidad Felsökning.
// Designfilosofi: professionellt fabriksverktyg — hög kontrast, stora
// träffytor (handskvänligt), få val per skärm, inga distraktioner.

import { Link } from "react-router-dom";
import { useRef, type ReactNode } from "react";
import type { Tillforlitlighet } from "./domain";
import { TILLFORLITLIGHET_LABEL } from "./domain";
import { MikrofonKnapp } from "./Mikrofon";

export function FelsokningSkal({
  rubrik,
  tillbaka,
  hoger,
  children,
}: {
  rubrik: string;
  tillbaka?: { till: string; text: string };
  hoger?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="felsokning-print min-h-screen bg-zinc-950 text-zinc-50">
      <header className="sticky top-0 z-20 border-b-2 border-zinc-700 bg-zinc-900 px-4 py-3 print:static">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="min-w-0">
            {tillbaka && (
              <Link to={tillbaka.till} className="text-sm font-semibold text-amber-400 hover:underline">
                ← {tillbaka.text}
              </Link>
            )}
            <h1 className="truncate text-xl font-extrabold tracking-tight">{rubrik}</h1>
          </div>
          {hoger}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-5 pb-24">{children}</main>
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
      ? "bg-amber-400 text-zinc-950 hover:bg-amber-300 active:bg-amber-500"
      : variant === "fara"
        ? "bg-red-600 text-white hover:bg-red-500 active:bg-red-700"
        : "bg-zinc-800 text-zinc-50 border-2 border-zinc-600 hover:bg-zinc-700 active:bg-zinc-600";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-14 w-full rounded-lg px-5 py-3 text-lg font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 print:hidden ${farg} ${className}`}
    >
      {children}
    </button>
  );
}

export function Panel({ rubrik, children }: { rubrik?: string; children: ReactNode }) {
  return (
    <section className="mb-4 rounded-lg border-2 border-zinc-700 bg-zinc-900 p-4">
      {rubrik && <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-zinc-400">{rubrik}</h2>}
      {children}
    </section>
  );
}

export function NivaBadge({ niva }: { niva: Tillforlitlighet }) {
  return <span className="whitespace-nowrap text-sm font-bold">{TILLFORLITLIGHET_LABEL[niva]}</span>;
}

export function TextFalt({
  label,
  varde,
  satt,
  platshallare,
  flerRad,
  rost,
}: {
  label: string;
  varde: string;
  satt: (v: string) => void;
  platshallare?: string;
  flerRad?: boolean;
  rost?: boolean;
}) {
  // Tal-till-text skriver in i samma redigerbara fält — användaren
  // granskar och bekräftar alltid innan något sparas i loggen.
  const vardeRef = useRef(varde);
  vardeRef.current = varde;
  const klass =
    "w-full rounded-lg border-2 border-zinc-600 bg-zinc-950 px-4 py-3 text-lg text-zinc-50 placeholder-zinc-500 focus:border-amber-400 focus:outline-none";
  return (
    <label className="mb-3 block">
      <span className="mb-1 flex min-h-11 items-center justify-between gap-2">
        <span className="text-sm font-bold uppercase tracking-wide text-zinc-400">{label}</span>
        {rost && (
          <MikrofonKnapp
            paText={(text) => satt(vardeRef.current ? `${vardeRef.current.trimEnd()} ${text}` : text)}
          />
        )}
      </span>
      {flerRad ? (
        <textarea value={varde} onChange={(e) => satt(e.target.value)} placeholder={platshallare} rows={3} className={klass} />
      ) : (
        <input value={varde} onChange={(e) => satt(e.target.value)} placeholder={platshallare} className={klass} />
      )}
    </label>
  );
}
