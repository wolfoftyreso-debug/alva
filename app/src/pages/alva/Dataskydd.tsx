// ALVA-SPEC-050 · Dataskydd.
//
// Sidan beskriver vad systemet FAKTISKT gör med personuppgifter — inte
// vad en mall brukar säga. Varje påstående här motsvarar en mekanism i
// koden och går att pröva: krypto-shredding (personuppgifter.mjs),
// gallringen (gallring.mjs), åtkomstloggen och delningsnivåerna.
//
// Det som är operatörens att fylla i — vem som är personuppgiftsansvarig,
// vilka underbiträden som anlitas — står som osatt i stället för att
// gissas. Ett dataskyddsbesked med påhittad ansvarig är inte ofullständigt
// utan vilseledande, precis som ett Impressum med påhittad adress.

import { Block, Etikett, FARG, Rubrik, Tabell } from "@/alva/komponenter";
import { Ram } from "./Ram";

// Driftens uppgifter. Sätts vid driftsättning; tomt betyder tomt.
const ANSVARIG: Record<string, string> = {};

const BEHANDLINGAR: [string, string, string][] = [
  [
    "Case record",
    "Vehicle identifier, VIN, owner and customer name, odometer readings, the technician's own entries",
    "Documenting the diagnosis — the workshop's own record in a warranty or insurance dispute",
  ],
  [
    "Accounts",
    "Name, e-mail address, role, organization",
    "Access control and traceability: every entry names who made it",
  ],
  [
    "Access log",
    "Account, case, path, source, share code",
    "Answering who has seen a customer's data — a requirement, not a convenience",
  ],
  [
    "Invoicing",
    "Organization details, active accounts, invoice history",
    "Charging the subscription and keeping an auditable accounting record",
  ],
];

const RATTIGHETER: [string, string][] = [
  ["Access", "The case log can be exported in full at any time, including in a locked account."],
  [
    "Erasure",
    "Crypto-shredding: identifying fields are encrypted with a key per data subject, and erasure destroys that key. The log stays intact and verifiable — what becomes unreadable is who it concerned, not what was checked.",
  ],
  [
    "Rectification",
    "The log is append-only and is never rewritten. A correction is a new entry that refers back, so the record shows both what was believed and what was corrected.",
  ],
  ["Restriction and objection", "Handled by the operator named above; the platform provides the export and the erasure."],
];

export default function Dataskydd() {
  const satt = Object.keys(ANSVARIG).length > 0;

  return (
    <Ram>
      <div className="mx-auto max-w-[1040px] px-6 py-12">
        <Etikett>Legal</Etikett>
        <div className="mt-2 mb-2">
          <Rubrik niva={1}>Data protection</Rubrik>
        </div>
        <p className="mb-8 max-w-[680px] text-[14px] leading-[22px]" style={{ color: FARG.steel }}>
          What the system does with personal data, stated as mechanisms rather than intentions. Each
          statement below corresponds to something that can be inspected in the platform: how a field is
          stored, when it is deleted, and who can read it.
        </p>

        {!satt && (
          <Block rubrik="Controller not yet set" beteckning="ALVA-SPEC-050">
            <p className="max-w-[680px] text-[13px] leading-[21px]" style={{ color: FARG.steel }}>
              The controller and, where applicable, the data protection officer have not been configured
              for this deployment. They are shown as outstanding rather than filled with placeholder text.
              Until they are set, direct any request to the workshop operating this installation.
            </p>
          </Block>
        )}

        <Block rubrik="What is processed, and why" beteckning="ALVA-SPEC-050">
          <Tabell
            kolumner={["Processing", "Data", "Purpose"]}
            rader={BEHANDLINGAR.map(([vad, data, syfte]) => [vad, data, syfte])}
          />
        </Block>

        <Block rubrik="Retention" beteckning="ALVA-PROC-0040">
          <p className="mb-4 max-w-[680px] text-[13px] leading-[21px]" style={{ color: FARG.steel }}>
            Retention is a control, not an intention: a scheduled job destroys the keys of records past
            their retention period and leaves a trace in the erasure register. The period follows the case
            type — a warranty case is kept as long as the warranty can be invoked, an internal quality
            check considerably shorter.
          </p>
          <p className="max-w-[680px] text-[13px] leading-[21px]" style={{ color: FARG.steel }}>
            The case log itself is not deleted. What is destroyed is the ability to tell whom it concerned.
          </p>
        </Block>

        <Block rubrik="Your rights" beteckning="GDPR Art. 15–21">
          <Tabell kolumner={["Right", "How it is met"]} rader={RATTIGHETER.map(([r, h]) => [r, h])} />
        </Block>

        <Block rubrik="Sharing" beteckning="ALVA-PROC-0030">
          <p className="mb-4 max-w-[680px] text-[13px] leading-[21px]" style={{ color: FARG.steel }}>
            A share link carries a level — customer, partner or internal — and the server filters the
            record against an allow-list for that level. Entries that are not explicitly shareable stay
            internal, including hypotheses, payer references and escalations. A link can be revoked, and
            every read is written to the access log.
          </p>
          <p className="max-w-[680px] text-[13px] leading-[21px]" style={{ color: FARG.steel }}>
            No analytics, advertising or third-party tracking runs on this site. Fonts are served from the
            same origin as the application, so visiting a page does not contact anyone else.
          </p>
        </Block>
      </div>
    </Ram>
  );
}
