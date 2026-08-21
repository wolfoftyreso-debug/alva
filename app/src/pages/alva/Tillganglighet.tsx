// ALVA-SPEC-050 · Tillgänglighetsredogörelse.
//
// Redogörelsen säger vad som är prövat, hur, och — viktigast — vad som
// INTE är prövat. En redogörelse som bara påstår att allt är tillgängligt
// är värdelös; den som namnger sina luckor går att lita på och att
// åtgärda.

import { Block, Etikett, FARG, Rubrik, Tabell } from "@/alva/komponenter";
import { Ram } from "./Ram";

const PROVAT: [string, string][] = [
  ["Contrast", "Colour pairs are checked against the design system; status is always stated in words, never by colour alone."],
  ["Structure", "Headings, lists and tables are marked up as such; every evidence image requires alternative text."],
  ["Keyboard", "The interface is operable from a keyboard, and focus is visible on interactive elements."],
  ["Machine testing", "An automated accessibility check runs against the component library on every build."],
  ["Touch targets", "Controls are sized for gloved hands; form fields are at least 16px so mobile browsers do not zoom on focus."],
];

const LUCKOR: [string, string][] = [
  [
    "Screen reader testing with real users",
    "The interface has not been walked through with people who use screen readers daily. Machine testing finds markup faults, not the ones that matter most in practice.",
  ],
  [
    "Video captions",
    "Video attached to a case is the technician's own recording of a symptom — often a sound. It carries a written description, but no captions or transcript.",
  ],
  [
    "Acoustic diagnosis",
    "The sound analysis is inherently auditory. Its results are presented as numbers and text, but the underlying evidence is a sound and cannot be made equivalent.",
  ],
];

export default function Tillganglighet() {
  return (
    <Ram>
      <div className="mx-auto max-w-[1040px] px-6 py-12">
        <Etikett>Legal</Etikett>
        <div className="mt-2 mb-2">
          <Rubrik niva={1}>Accessibility statement</Rubrik>
        </div>
        <p className="mb-8 max-w-[680px] text-[14px] leading-[22px]" style={{ color: FARG.steel }}>
          This statement is written against EN 301 549 and WCAG 2.1 AA. It names what has been tested and
          what has not — a statement that claims everything is accessible tells the reader nothing.
        </p>

        <Block rubrik="Tested" beteckning="EN 301 549">
          <Tabell kolumner={["Area", "How"]} rader={PROVAT.map(([a, h]) => [a, h])} />
        </Block>

        <Block rubrik="Known gaps" beteckning="EN 301 549">
          <p className="mb-4 max-w-[680px] text-[13px] leading-[21px]" style={{ color: FARG.steel }}>
            These are not oversights waiting to be discovered — they are known, and stated here so a reader
            can judge whether the product fits before adopting it.
          </p>
          <Tabell kolumner={["Gap", "What it means"]} rader={LUCKOR.map(([g, b]) => [g, b])} />
        </Block>

        <Block rubrik="Feedback" beteckning="ALVA-SPEC-050">
          <p className="max-w-[680px] text-[13px] leading-[21px]" style={{ color: FARG.steel }}>
            Accessibility problems can be reported through the support view inside the platform, or to the
            workshop operating this installation. A report that names the page and what could not be done
            is enough — a diagnosis is not expected of the person reporting.
          </p>
        </Block>
      </div>
    </Ram>
  );
}
