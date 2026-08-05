// ALVA-SPEC-020 · Integrationsvyn.
//
// Sidan säger uttryckligen vad som är validerat mot en leverantör och
// vad som inte är det. Det är ovanligt och det är avsiktligt: en
// integrationslista där allt ser färdigt ut är den snabbaste vägen till
// ett misslyckat införande, eftersom verkstaden planerar efter den.

import { Block, Etikett, FARG, Knapp, Rubrik, Statusmärke, Tabell } from "@/alva/komponenter";
import type { Status } from "@/alva/sprak";
import { Ram } from "./Ram";

type Mognad = "draft" | "tested" | "validated";

const STATUSAV: Record<Mognad, Status> = {
  draft: "pending",
  tested: "in_progress",
  validated: "passed",
};

interface Profil {
  beteckning: string;
  system: string;
  kategori: string;
  riktning: "In" | "Out" | "Bidirectional";
  mognad: Mognad;
  anmarkning: string;
}

// Profilerna beskriver KATEGORIER av system. Namnen nedan är exempel på
// vad respektive kategori brukar heta i en svensk verkstad — inte
// färdiga klienter. En profil märks `validated` först efter att den
// körts mot leverantörens faktiska gränssnitt.
const PROFILER: Profil[] = [
  {
    beteckning: "ALVA-SRC-020",
    system: "Generic diagnostic protocol (JSON)",
    kategori: "Diagnostic protocol",
    riktning: "In",
    mognad: "tested",
    anmarkning: "Profile-driven mapping. Fault codes and live data become evidence with source attribution.",
  },
  {
    beteckning: "ALVA-SRC-021",
    system: "OEM diagnostic tool export",
    kategori: "Diagnostic protocol",
    riktning: "In",
    mognad: "draft",
    anmarkning: "Field paths not yet confirmed against a vendor export.",
  },
  {
    beteckning: "ALVA-SRC-030",
    system: "Dealer management system",
    kategori: "DMS",
    riktning: "Bidirectional",
    mognad: "draft",
    anmarkning: "Work orders in, closed cases and time records out. Awaiting a vendor test account.",
  },
  {
    beteckning: "ALVA-SRC-040",
    system: "Video quotation platform",
    kategori: "Video quotation",
    riktning: "Bidirectional",
    mognad: "draft",
    anmarkning:
      "Video evidence in, case record and closing statement out. Vendor interface not yet examined — profile is a placeholder, not an implementation.",
  },
  {
    beteckning: "ALVA-SRC-045",
    system: "Damage calculation (CABAS and equivalents)",
    kategori: "Damage calculation",
    riktning: "Bidirectional",
    mognad: "draft",
    anmarkning:
      "Damage assessment in, diagnostic record out. What ALVA adds to an estimate is not more line items but " +
      "the chain behind them: what was checked, what was ruled out, and why. Vendor interface not yet examined.",
  },
  {
    beteckning: "ALVA-SRC-050",
    system: "Warranty administration",
    kategori: "Warranty",
    riktning: "Out",
    mognad: "draft",
    anmarkning: "Traceability package: evidence chain, closing statement, rule-pack version.",
  },
  {
    beteckning: "ALVA-SRC-060",
    system: "Insurance assessment",
    kategori: "Insurance",
    riktning: "Out",
    mognad: "draft",
    anmarkning: "Assessor-facing record: what was checked, what was ruled out, and why.",
  },
];

const HANDELSER = [
  ["arende.skapat", "A case was opened."],
  ["arende.fas", "The case entered a new ALVA phase."],
  ["arende.slutsats", "A closing statement was recorded."],
  ["arende.avslutat", "The case was closed and passed the quality gate."],
  ["media.tillagt", "Photo or video evidence was added."],
  ["atgardsforslag.lamnat", "A repair proposal was issued to the customer."],
  ["kundbeslut.registrerat", "The customer's decision was recorded."],
];

export default function Integration() {
  return (
    <Ram portal>
      <div className="mx-auto max-w-[1040px] px-6 py-12">
        <Etikett>Integration interface</Etikett>
        <div className="mt-2 mb-2">
          <Rubrik niva={1}>Connected systems</Rubrik>
        </div>
        <p className="mb-8 max-w-[680px] text-[14px] leading-[22px]" style={{ color: FARG.steel }}>
          ALVA connects to the systems the workshop already runs. The interface is profile-driven: a profile
          describes what a category of system expects, and is marked validated only after it has been run against
          the vendor&rsquo;s actual interface.
        </p>

        <Block rubrik="Profiles" beteckning="ALVA-SPEC-020">
          <div className="overflow-x-auto">
            <Tabell
              kolumner={["Reference", "System", "Category", "Direction", "Maturity", "Note"]}
              rader={PROFILER.map((p) => [
                <span key="r" className="font-mono text-[11px]">
                  {p.beteckning}
                </span>,
                p.system,
                p.kategori,
                p.riktning,
                <Statusmärke key="m" status={STATUSAV[p.mognad]} />,
                <span key="a" className="text-[12px]" style={{ color: FARG.steel }}>
                  {p.anmarkning}
                </span>,
              ])}
            />
          </div>
          <p className="mt-6 border-t pt-4 text-[12px] leading-[18px]" style={{ borderColor: FARG.lightSteel, color: FARG.steel }}>
            A profile at <strong>draft</strong> has an interface but has not been run against the vendor. Listing
            it as ready would be the fastest route to a failed rollout, because the workshop plans around it.
          </p>
        </Block>

        <Block rubrik="Outbound events" beteckning="ALVA-SPEC-021">
          <p className="mb-4 text-[13px] leading-[20px]" style={{ color: FARG.steel }}>
            An integration subscribes to what it needs. Deliveries are signed with HMAC over timestamp and body;
            the timestamp is inside the signature so a captured delivery cannot be replayed.
          </p>
          <div className="overflow-x-auto">
            <Tabell
              kolumner={["Event", "Meaning"]}
              rader={HANDELSER.map(([id, text]) => [
                <span key="e" className="font-mono text-[11px]">
                  {id}
                </span>,
                text,
              ])}
            />
          </div>
        </Block>

        <Block rubrik="Inbound: diagnostic protocol" beteckning="ALVA-PROC-0020">
          <p className="mb-4 text-[13px] leading-[20px]" style={{ color: FARG.steel }}>
            Readings become <strong>evidence</strong>, not an attachment. Provenance travels with every entry, so
            a value that arrived from outside never looks like something the technician measured. Where the
            instrument identity is supplied it is retained — without it the value is graded E1 rather than E4.
          </p>
          <pre
            className="overflow-x-auto border p-4 font-mono text-[12px] leading-[20px]"
            style={{ borderColor: FARG.lightSteel, background: FARG.background, color: FARG.graphite }}
          >
{`POST /api/arenden/{arendeId}/protokoll
Authorization: Bearer <token>

{
  "kalla": "Diagnostic tool, bay 3",
  "profil": {
    "felkoder":  { "vag": "dtcs", "kod": "code", "text": "description" },
    "matvarden": { "vag": "liveData", "beskrivning": "name",
                   "varde": "value", "enhet": "unit",
                   "instrumentId": "toolSerial" }
  },
  "protokoll": { "...": "vendor payload, unchanged" }
}`}
          </pre>
          <div className="mt-6 flex flex-wrap gap-4">
            <Knapp>Add profile</Knapp>
            <Knapp variant="sekundar">Download OpenAPI</Knapp>
          </div>
        </Block>
      </div>
    </Ram>
  );
}
