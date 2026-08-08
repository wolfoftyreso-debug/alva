// Kunskapskällor — Operational Knowledge Infrastructure.
//
// Arkitekturprincipen: ALVA antar aldrig en viss leverantör. Varje källa
// implementerar samma gränssnitt, och organisationen ansluter det den har
// licens till. Det gör att produkten aldrig behöver marknadsföras med
// "vi stödjer X" — den använder organisationens auktoriserade källor.
//
// Praktiskt betyder det att en betainstallation fungerar med enbart egna
// PDF:er, och att externa leverantörer aktiveras senare genom separata
// anslutningar utan att plattformens kärna ändras.
//
// Livscykeln är fem tillstånd med avsikt. "Configured" och "Connected"
// är inte samma sak — en nyckel kan vara ifylld och ändå fel — och
// "Validated" skiljer sig från "Connected": anslutningen svarar, men har
// den data för de fordon organisationen faktiskt arbetar med? Det är den
// frågan som avgör om källan är till nytta.

import { Block, Etikett, FARG, Knapp, Rubrik, Statusmärke, Symbol, Tabell } from "@/alva/komponenter";
import type { Status } from "@/alva/sprak";
import { Ram } from "./Ram";

export type Livscykel = "installed" | "configured" | "connected" | "validated" | "operational";

export const LIVSCYKEL: { id: Livscykel; namn: string; innebord: string }[] = [
  { id: "installed", namn: "Installed", innebord: "Connector present. No credentials." },
  { id: "configured", namn: "Configured", innebord: "Credentials stored. Not yet contacted." },
  { id: "connected", namn: "Connected", innebord: "Provider responds to authentication." },
  { id: "validated", namn: "Validated", innebord: "Coverage confirmed for the organization's fleet." },
  { id: "operational", namn: "Operational", innebord: "In use during diagnostics." },
];

export interface Kunskapskalla {
  beteckning: string;
  namn: string;
  livscykel: Livscykel;
  autentisering: "API key" | "OAuth" | "File import" | "Network share" | "Internal";
  formagor: string[];
  senastSynk: string;
  prioritet: number;
}

// Beta: interna dokument räcker för att systemet ska fungera. De externa
// raderna visar gränssnittet, inte en färdig integration — och statusen
// säger det rakt ut i stället för att antyda något annat.
const KALLOR: Kunskapskalla[] = [
  {
    beteckning: "ALVA-SRC-001",
    namn: "Internal company procedures",
    livscykel: "operational",
    autentisering: "Internal",
    formagor: ["Procedures", "Inspection protocols", "Warranty policy"],
    senastSynk: "Continuous",
    prioritet: 1,
  },
  {
    beteckning: "ALVA-SRC-002",
    namn: "Document library",
    livscykel: "operational",
    autentisering: "File import",
    formagor: ["Service manuals", "Technical bulletins", "PDF documentation"],
    senastSynk: "On upload",
    prioritet: 2,
  },
  {
    beteckning: "ALVA-SRC-010",
    namn: "OEM documentation",
    livscykel: "installed",
    autentisering: "API key",
    formagor: ["Repair procedures", "Technical bulletins", "Service information"],
    senastSynk: "—",
    prioritet: 3,
  },
  {
    beteckning: "ALVA-SRC-011",
    namn: "Wiring diagram provider",
    livscykel: "installed",
    autentisering: "API key",
    formagor: ["Wiring diagrams", "Component locations"],
    senastSynk: "—",
    prioritet: 4,
  },
  {
    beteckning: "ALVA-SRC-012",
    namn: "Vehicle data provider",
    livscykel: "installed",
    autentisering: "API key",
    formagor: ["Vehicle identification", "Equipment level", "Service campaigns"],
    senastSynk: "—",
    prioritet: 5,
  },
  {
    beteckning: "ALVA-SRC-013",
    namn: "Repair time catalogue",
    livscykel: "installed",
    autentisering: "API key",
    formagor: ["Operation times", "Parts catalogue"],
    senastSynk: "—",
    prioritet: 6,
  },
];

const STATUSAV: Record<Livscykel, Status> = {
  installed: "pending",
  configured: "in_progress",
  connected: "in_progress",
  validated: "passed",
  operational: "complete",
};

export default function Kunskapskallor() {
  return (
    <Ram portal>
      <div className="mx-auto max-w-[1040px] px-6 py-12">
        <Etikett>Operational Knowledge Infrastructure</Etikett>
        <div className="mt-2 mb-2">
          <Rubrik niva={1}>Knowledge sources</Rubrik>
        </div>
        <p className="mb-8 max-w-[680px] text-[14px] leading-[22px]" style={{ color: FARG.steel }}>
          ALVA is provider-agnostic. Each source implements the same interface; the organization connects those
          it holds licenses for. No provider is assumed by the platform.
        </p>

        <Block rubrik="Configured sources" beteckning="ALVA-DOC-014">
          <Tabell
            kolumner={["Reference", "Source", "Status", "Authentication", "Capabilities", "Last sync", "Priority"]}
            rader={KALLOR.map((k) => [
              <span key="r" className="font-mono text-[11px]">
                {k.beteckning}
              </span>,
              k.namn,
              <Statusmärke key="s" status={STATUSAV[k.livscykel]} />,
              k.autentisering,
              <span key="f" className="text-[12px]" style={{ color: FARG.steel }}>
                {k.formagor.join(" · ")}
              </span>,
              k.senastSynk,
              String(k.prioritet),
            ])}
          />
          <div className="mt-6 flex gap-4">
            <Knapp>Add provider</Knapp>
            <Knapp variant="sekundar">Test connection</Knapp>
          </div>
          <p className="mt-4 text-[12px] leading-[18px]" style={{ color: FARG.steel }}>
            Configuration requires the organization administrator role.
          </p>
        </Block>

        <Block rubrik="Connector lifecycle" beteckning="ALVA-SPEC-011">
          <ol>
            {LIVSCYKEL.map((l, i) => (
              <li key={l.id} className="flex gap-4 border-t py-2 first:border-t-0" style={{ borderColor: FARG.lightSteel }}>
                <span className="font-mono text-[12px] leading-[20px]" style={{ color: FARG.steel }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="text-[13px] font-semibold uppercase tracking-[0.08em]" style={{ color: FARG.graphite }}>
                    {l.namn}
                  </div>
                  <div className="mt-2 text-[13px]" style={{ color: FARG.steel }}>
                    {l.innebord}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Block>

        <Block rubrik="Resolution order during diagnostics" beteckning="ALVA-RULE-120">
          <p className="mb-4 text-[13px] leading-[20px]" style={{ color: FARG.steel }}>
            Sources are consulted in order. The technician does not search across systems; relevant information
            is presented within the procedure with full source attribution.
          </p>
          <ol className="text-[14px] leading-[26px]" style={{ color: FARG.graphite }}>
            {[
              "Internal company procedures",
              "OEM documentation",
              "Technical bulletins",
              "Warranty information",
              "Service manuals",
              "Historical verified diagnostics",
              "Organization best practices",
            ].map((rad, i) => (
              <li key={rad} className="flex gap-4">
                <span className="font-mono text-[12px]" style={{ color: FARG.steel }}>
                  {i + 1}
                </span>
                <Symbol ikon="nasta" />
                {rad}
              </li>
            ))}
          </ol>
        </Block>
      </div>
    </Ram>
  );
}
