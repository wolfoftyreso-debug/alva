// ALVA-SPEC-050 · Villkor.
//
// Villkoren beskriver det systemet faktiskt gör, och särskilt de två
// utfästelser produkten är byggd kring: att ärendeloggen tillhör
// verkstaden och förblir läsbar även vid utebliven betalning, och att
// systemet aldrig påstår en diagnos. Avtalsparterna är operatörens att
// fylla i och står som osatta tills de är det.

import { Block, Etikett, FARG, Rubrik, Tabell } from "@/alva/komponenter";
import { Ram } from "./Ram";

// Driftens uppgifter. Sätts vid driftsättning; tomt betyder tomt.
const PARTER: Record<string, string> = {};

const TILLSTAND: [string, string][] = [
  ["Active", "Full use. New cases can be opened."],
  [
    "Warning",
    "An invoice is past due. A visible countdown runs; nothing is restricted yet.",
  ],
  [
    "Locked",
    "New cases cannot be started. Reading and export remain open — see below.",
  ],
];

export default function Villkor() {
  const satt = Object.keys(PARTER).length > 0;

  return (
    <Ram>
      <div className="mx-auto max-w-[1040px] px-6 py-12">
        <Etikett>Legal</Etikett>
        <div className="mt-2 mb-2">
          <Rubrik niva={1}>Terms of service</Rubrik>
        </div>
        <p className="mb-8 max-w-[680px] text-[14px] leading-[22px]" style={{ color: FARG.steel }}>
          The terms state what the system does. Where a term is a promise about behaviour, that behaviour
          is implemented and tested — it is not a statement of intent.
        </p>

        {!satt && (
          <Block rubrik="Contracting parties not yet set" beteckning="ALVA-SPEC-050">
            <p className="max-w-[680px] text-[13px] leading-[21px]" style={{ color: FARG.steel }}>
              The supplier&rsquo;s legal entity, governing law and venue have not been configured for this
              deployment. They are shown as outstanding rather than invented. Until they are set, the
              workshop operating this installation is your counterparty.
            </p>
          </Block>
        )}

        <Block rubrik="The case record is yours" beteckning="ALVA-PROC-0002">
          <p className="mb-4 max-w-[680px] text-[13px] leading-[21px]" style={{ color: FARG.steel }}>
            The case log is the workshop&rsquo;s evidence in a dispute that concerns its customer — a third
            party with no part in any unpaid invoice between us. Reading and export therefore stay open in
            every subscription state, including a locked one. This is not a courtesy and is not negotiable.
          </p>
          <p className="max-w-[680px] text-[13px] leading-[21px]" style={{ color: FARG.steel }}>
            Export is available at any time in a machine-readable form, so leaving does not mean losing the
            record.
          </p>
        </Block>

        <Block rubrik="Non-payment" beteckning="ALVA-PROC-0002">
          <Tabell kolumner={["State", "What it means"]} rader={TILLSTAND.map(([s, b]) => [s, b])} />
          <p className="mt-4 max-w-[680px] text-[13px] leading-[21px]" style={{ color: FARG.steel }}>
            No card is required and no payment is taken online. Invoices are issued against the active
            accounts at the time of issue, and each line states where its quantity comes from.
          </p>
        </Block>

        <Block rubrik="What the system does not do" beteckning="ALVA-SPEC-001">
          <p className="mb-4 max-w-[680px] text-[13px] leading-[21px]" style={{ color: FARG.steel }}>
            ALVA does not state a diagnosis. It structures the work, refuses to close a case whose evidence
            is incomplete, and records what the technician concluded and why. Suggestions — including
            acoustic ones and those from the AI assistance — are presented as hypotheses at stated
            confidence and are only recorded when a technician accepts them.
          </p>
          <p className="max-w-[680px] text-[13px] leading-[21px]" style={{ color: FARG.steel }}>
            Professional responsibility for the work performed on a vehicle remains with the workshop and
            the technician. A quality gate that passes is a statement about documentation, not a warranty
            that the repair is correct.
          </p>
        </Block>

        <Block rubrik="Availability and changes" beteckning="ALVA-SPEC-050">
          <p className="max-w-[680px] text-[13px] leading-[21px]" style={{ color: FARG.steel }}>
            The methodology and the event schema are versioned, and a case keeps the version that applied
            when it was closed — a later change never rewrites an earlier record. Material changes to these
            terms are announced in the releases page before they take effect.
          </p>
        </Block>
      </div>
    </Ram>
  );
}
