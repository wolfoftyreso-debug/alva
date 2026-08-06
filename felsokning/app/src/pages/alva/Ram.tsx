// Sidramen. Samma på webbplatsen och i portalen — det är därför
// inloggningen inte känns som ett byte av system.
//
// Navigationen är en rad text, inte en meny med ikoner. Den som söker
// något i ett industrisystem vet vad det heter.

import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loggaUtPlattform, plattformKonto } from "@/felsokning/plattform";
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
  { till: "/alva/portal/fakturor", text: "Invoices" },
  { till: "/felsokning", text: "Diagnostics" },
];

export function Ram({ children, portal = false }: { children: ReactNode; portal?: boolean }) {
  const plats = useLocation();
  const navigera = useNavigate();
  const lankar = portal ? PORTAL : PUBLIKT;
  // Finns en riktig session ska den gå att avsluta. Utan konfigurerad
  // plattform finns ingen, och då visas ingen utloggning heller — en
  // knapp som inte loggar ut något är samma sorts sken som m-9 gällde.
  const konto = portal ? plattformKonto() : null;

  return (
    // `alva-yta` bär typografin ur ALVA-SPEC-001 och håller den skild
    // från värdapplikationens antikva. Se src/index.css.
    <div className="alva-yta min-h-screen" style={{ background: FARG.background, color: FARG.graphite }}>
      <header className="border-b" style={{ borderColor: FARG.lightSteel, background: FARG.white }}>
        <div className="mx-auto flex max-w-[1040px] flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link to={portal ? "/alva/portal" : "/alva"} className="flex items-baseline gap-4">
            <span className="text-[20px] font-semibold tracking-[0.02em]" style={{ color: FARG.graphite }}>
              {ALVA.namn}
            </span>
            <span className="hidden text-[10px] uppercase tracking-[0.08em] sm:inline" style={{ color: FARG.steel }}>
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
                      className="text-[12px] font-semibold uppercase tracking-[0.08em]"
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

      {konto && (
        <div className="border-b" style={{ borderColor: FARG.lightSteel, background: FARG.white }}>
          <div
            className="mx-auto flex max-w-[1040px] flex-wrap items-center justify-between gap-2 px-6 py-2 text-[11px] uppercase tracking-[0.08em]"
            style={{ color: FARG.steel }}
          >
            <span>
              {konto.organisation} · {konto.namn} · {konto.roll}
            </span>
            <button
              type="button"
              onClick={() => {
                loggaUtPlattform();
                navigera("/alva/logga-in", { replace: true });
              }}
              className="uppercase tracking-[0.08em] underline"
              style={{ color: FARG.steel }}
            >
              Sign out
            </button>
          </div>
        </div>
      )}

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
