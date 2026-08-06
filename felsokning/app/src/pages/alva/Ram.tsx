// Sidramen. Samma på webbplatsen och i portalen — det är därför
// inloggningen inte känns som ett byte av system.
//
// Navigationen är en rad text, inte en meny med ikoner. Den som söker
// något i ett industrisystem vet vad det heter.
//
// ---- Språket -----------------------------------------------------------
//
// Den publika navigationen och sidfoten talar besökarens språk (val i
// sidfoten → webbläsare → engelska). Portalens länkar står MEDVETET kvar
// på engelska: portalen är produkten, och dess språk styrs av konto och
// organisation (ALVA-SPEC-060) — inte av ett besöksval i en sidfot.

import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loggaUtPlattform, plattformKonto } from "@/felsokning/plattform";
import { ALVA, PLATTFORMSVERSION } from "@/alva/system";
import { FARG } from "@/alva/komponenter";
import { useWebbSprak, sattWebbSprak } from "@/alva/webbsprak";
import { SPRAK, oversattare } from "../../../../services/gemensam/sprak/index.mjs";

type Sprakpost = { kod: string; namn: string; egetNamn: string; granskat: boolean };
const SPRAKEN = SPRAK as Sprakpost[];

const PUBLIKT = [
  { till: "/alva", nyckel: "webb.nav.oversikt" },
  { till: "/alva/ansokan", nyckel: "webb.ansok" },
  { till: "/alva/logga-in", nyckel: "webb.loggain" },
];

const PORTAL = [
  { till: "/alva/portal", text: "Dashboard" },
  { till: "/alva/portal/analys", text: "Analysis" },
  { till: "/alva/portal/kunskapskallor", text: "Knowledge sources" },
  { till: "/alva/portal/integration", text: "Integration" },
  { till: "/alva/portal/garantier", text: "Warranty" },
  { till: "/alva/portal/forsakring", text: "Insurance" },
  { till: "/alva/portal/support", text: "Support" },
  { till: "/alva/portal/abonnemang", text: "Subscription" },
  { till: "/alva/portal/fakturor", text: "Invoices" },
  { till: "/felsokning", text: "Diagnostics" },
];

const FOT = [
  ["/alva/impressum", "webb.fot.impressum"],
  ["/alva/dataskydd", "webb.fot.dataskydd"],
  ["/alva/villkor", "webb.fot.villkor"],
  ["/alva/tillganglighet", "webb.fot.tillganglighet"],
  ["/alva/sprak", "webb.fot.sprak"],
  ["/alva/utgavor", "webb.fot.utgavor"],
] as const;

export function Ram({ children, portal = false }: { children: ReactNode; portal?: boolean }) {
  const plats = useLocation();
  const navigera = useNavigate();
  const sprak = useWebbSprak();
  const t = oversattare(sprak) as (nyckel: string) => string;
  // Finns en riktig session ska den gå att avsluta. Utan konfigurerad
  // plattform finns ingen, och då visas ingen utloggning heller — en
  // knapp som inte loggar ut något är samma sorts sken som m-9 gällde.
  const konto = portal ? plattformKonto() : null;

  return (
    // `alva-yta` bär typografin ur ALVA-SPEC-001 och håller den skild
    // från värdapplikationens antikva. Se src/index.css.
    <div lang={sprak} className="alva-yta min-h-screen" style={{ background: FARG.background, color: FARG.graphite }}>
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

          {/* Portalens länkar fick inte plats på en telefon och sköt ut
              dokumentet i sidled i stället för att brytas. Raden bryts nu.

              På smal skärm ligger navigationen dessutom på EGEN rad och
              fördelas över hela måttet, i stället för att tryckas ihop mot
              höger kant med ett tomrum efter ordmärket. Det är samma
              fördelning som sidfoten redan använder — raden får sin balans
              av marginalerna, inte av att posterna klumpas ihop. */}
          <nav aria-label={portal ? "Portal" : "Site"} className="w-full sm:w-auto">
            <ul className="flex flex-wrap justify-between gap-x-4 gap-y-2 sm:justify-end sm:gap-6">
              {(portal ? PORTAL : PUBLIKT).map((l) => {
                const aktiv = plats.pathname === l.till;
                const text = "nyckel" in l ? t(l.nyckel) : l.text;
                return (
                  <li key={l.till}>
                    <Link
                      to={l.till}
                      aria-current={aktiv ? "page" : undefined}
                      className="text-[12px] font-semibold uppercase tracking-[0.08em]"
                      style={{ color: aktiv ? FARG.blue : FARG.steel }}
                    >
                      {text}
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

      {/* Foten bär det som en näringsidkare måste hålla synligt. Listan
          är byggd mot tyskt krav — § 5 DDG är den strängaste och mest
          utkrävbara i EU, och den som klarar den klarar de andra på
          köpet. Se services/gemensam/foretagsuppgifter.mjs.

          Här ligger MEDVETET ingen länk till EU:s ODR-plattform. Den
          upphävdes genom förordning (EU) 2024/3228 och stängdes den
          20 juli 2025; en kvarliggande länk är en död hänvisning som ser
          ut som en lagstadgad upplysning. */}
      <footer className="border-t" style={{ borderColor: FARG.lightSteel, background: FARG.white }}>
        <div className="mx-auto max-w-[1040px] px-6 py-6">
          <nav aria-label="Legal">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[12px]">
              {FOT.map(([till, nyckel]) => (
                <li key={till}>
                  <Link to={till} style={{ color: FARG.steel }}>
                    {t(nyckel)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div
            className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t pt-6"
            style={{ borderColor: FARG.lightSteel, color: FARG.steel }}
          >
            {/* Väljaren sätter besökarens val, som väger tyngre än
                webbläsarens språk men aldrig rör plattformens eget
                språkval — se filhuvudet. */}
            <div className="flex items-center gap-4">
              <label
                htmlFor="webbsprak"
                className="text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: FARG.steel }}
              >
                {t("sprak.valj")}
              </label>
              <select
                id="webbsprak"
                value={sprak}
                onChange={(h) => sattWebbSprak(h.target.value)}
                className="border px-4 py-2 text-[12px]"
                style={{ borderColor: FARG.lightSteel, background: FARG.white, color: FARG.graphite }}
              >
                {SPRAKEN.map((s) => (
                  <option key={s.kod} value={s.kod}>
                    {s.egetNamn}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px]">
              <Link to="/alva/utgavor" style={{ color: FARG.steel }}>
                {PLATTFORMSVERSION}
              </Link>
              <span>{t("webb.hero.position")}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
