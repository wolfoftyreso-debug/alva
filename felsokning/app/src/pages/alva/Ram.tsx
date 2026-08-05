// Sidramen. Samma på webbplatsen och i portalen — det är därför
// inloggningen inte känns som ett byte av system.
//
// Navigationen är en rad text, inte en meny med ikoner. Den som söker
// något i ett industrisystem vet vad det heter.

import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ALVA, PLATTFORMSVERSION } from "@/alva/system";
import { FARG } from "@/alva/komponenter";

const PUBLIKT = [
  { till: "/alva", text: "Overview" },
  { till: "/alva/ansokan", text: "Request account" },
  { till: "/alva/logga-in", text: "Login" },
];

const PORTAL = [
  { till: "/alva/portal", text: "Dashboard" },
  { till: "/alva/portal/analys", text: "Analysis" },
  { till: "/alva/portal/kunskapskallor", text: "Knowledge sources" },
  { till: "/alva/portal/integration", text: "Integration" },
  { till: "/felsokning", text: "Diagnostics" },
];

export function Ram({ children, portal = false }: { children: ReactNode; portal?: boolean }) {
  const plats = useLocation();
  const lankar = portal ? PORTAL : PUBLIKT;

  return (
    <div className="min-h-screen" style={{ background: FARG.background, color: FARG.graphite }}>
      <header className="border-b" style={{ borderColor: FARG.lightSteel, background: FARG.white }}>
        <div className="mx-auto flex max-w-[1040px] flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link to={portal ? "/alva/portal" : "/alva"} className="flex items-baseline gap-4">
            <span className="text-[20px] font-semibold tracking-[0.04em]" style={{ color: FARG.graphite }}>
              {ALVA.namn}
            </span>
            <span className="hidden text-[10px] uppercase tracking-[0.16em] sm:inline" style={{ color: FARG.steel }}>
              {ALVA.utlast}
            </span>
          </Link>

          {/* Portalens fem länkar fick inte plats på en telefon och sköt
              ut dokumentet i sidled i stället för att brytas. Raden bryts
              nu, med tätare mellanrum på smal skärm. */}
          <nav aria-label={portal ? "Portal" : "Site"}>
            <ul className="flex flex-wrap gap-2 sm:gap-6">
              {lankar.map((l) => {
                const aktiv = plats.pathname === l.till;
                return (
                  <li key={l.till}>
                    <Link
                      to={l.till}
                      aria-current={aktiv ? "page" : undefined}
                      className="text-[12px] font-semibold uppercase tracking-[0.1em]"
                      style={{ color: aktiv ? FARG.blue : FARG.steel }}
                    >
                      {l.text}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t" style={{ borderColor: FARG.lightSteel, background: FARG.white }}>
        <div
          className="mx-auto flex max-w-[1040px] flex-wrap justify-between gap-4 px-6 py-6 font-mono text-[11px]"
          style={{ color: FARG.steel }}
        >
          <span>{PLATTFORMSVERSION}</span>
          <span>{ALVA.position}</span>
        </div>
      </footer>
    </div>
  );
}
