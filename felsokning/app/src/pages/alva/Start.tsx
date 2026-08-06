// ALVA — publik webbplats.
//
// Webbplatsen och plattformen är samma system. Besökaren ska aldrig
// uppleva att den lämnar marknadswebben när den loggar in, eftersom den
// inte gör det: samma komponentbibliotek, samma rutnät, samma ord.
//
// Det som saknas här är lika viktigt som det som finns. Ingen hjälte-
// bild, ingen gradient, ingen animation, inga kundlogotyper, ingen
// uppmaning att boka demo. En sida som försöker övertyga läser som
// marknadsföring; en sida som redovisar läser som dokumentation. Den
// senare är vad en teknisk chef fattar beslut utifrån.

import { Link } from "react-router-dom";
import { ALVA, FASER, PLATTFORMSVERSION } from "@/alva/system";
import { Block, Etikett, FARG, Knapp, Rubrik, Symbol, Tabell } from "@/alva/komponenter";
import { Ram } from "./Ram";

function Sektion({ etikett, rubrik, children }: { etikett: string; rubrik?: string; children: React.ReactNode }) {
  return (
    <section className="border-t py-16" style={{ borderColor: FARG.lightSteel }}>
      <div className="mx-auto max-w-[1040px] px-6">
        <Etikett>{etikett}</Etikett>
        {rubrik && (
          <div className="mt-2 mb-8">
            <Rubrik niva={2}>{rubrik}</Rubrik>
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

export default function Start() {
  return (
    <Ram>
      {/* ---- Hero. En mening. Ingen slogan. ---- */}
      <section className="border-b" style={{ borderColor: FARG.lightSteel, background: FARG.white }}>
        <div className="mx-auto max-w-[1040px] px-6 py-24">
          <h1 className="text-[64px] font-semibold leading-none tracking-[0.02em]" style={{ color: FARG.graphite }}>
            {ALVA.namn}
          </h1>
          <p className="mt-4 text-[15px] uppercase tracking-[0.08em]" style={{ color: FARG.steel }}>
            {ALVA.utlast}
          </p>
          <p className="mt-2 text-[13px] uppercase tracking-[0.08em]" style={{ color: FARG.steel }}>
            {ALVA.position}
          </p>

          <p className="mt-10 max-w-[620px] text-[18px] leading-[28px]" style={{ color: FARG.graphite }}>
            {ALVA.definition}
          </p>

          <div className="mt-10 flex gap-4">
            <Link to="/alva/ansokan">
              <Knapp>Request account</Knapp>
            </Link>
            <Link to="/alva/logga-in">
              <Knapp variant="sekundar">Login</Knapp>
            </Link>
          </div>
        </div>
      </section>

      {/* ---- Metoden ---- */}
      <Sektion etikett="Methodology" rubrik="The ALVA model">
        <p className="mb-8 max-w-[680px] text-[15px] leading-[24px]" style={{ color: FARG.steel }}>
          ALVA is a standardized method for systematic analysis, localization, verification and action. Every
          decision is traceable, every conclusion verifiable, every action reproducible.
        </p>

        <div className="grid gap-px md:grid-cols-4" style={{ background: FARG.lightSteel }}>
          {FASER.map((f, i) => (
            <div key={f.id} className="bg-white p-6">
              <div className="flex items-baseline justify-between">
                <span className="text-[40px] font-semibold leading-none" style={{ color: FARG.blue }}>
                  {f.bokstav}
                </span>
                <span className="font-mono text-[11px]" style={{ color: FARG.lightSteel }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="mt-4 text-[13px] font-semibold uppercase tracking-[0.08em]" style={{ color: FARG.graphite }}>
                {f.namn}
              </div>
              <p className="mt-2 text-[14px] leading-[20px]" style={{ color: FARG.graphite }}>
                {f.syfte}
              </p>
              <p className="mt-4 border-t pt-4 text-[12px] leading-[18px]" style={{ borderColor: FARG.lightSteel, color: FARG.steel }}>
                {f.avgransning}
              </p>
            </div>
          ))}
        </div>
      </Sektion>

      {/* ---- Arbetsgång. Numrerad, inte illustrerad. ---- */}
      <Sektion etikett="Operation" rubrik="How it works">
        <ol className="max-w-[680px]">
          {[
            ["Create organization", "Registration is submitted and reviewed."],
            ["Users receive accounts", "Roles are assigned by the organization administrator."],
            ["Guided diagnostic procedures", "Each case follows a defined procedure."],
            ["Verification", "Root cause is confirmed before corrective action."],
            ["Documentation", "The record is generated from the case log."],
            ["Continuous improvement", "Verified outcomes refine subsequent procedures."],
          ].map(([rubrik, text], i) => (
            <li key={rubrik} className="flex gap-6 border-t py-6" style={{ borderColor: FARG.lightSteel }}>
              <span className="font-mono text-[13px] leading-[20px]" style={{ color: FARG.steel }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <div className="text-[15px] font-semibold" style={{ color: FARG.graphite }}>
                  {rubrik}
                </div>
                <div className="mt-2 text-[14px] leading-[20px]" style={{ color: FARG.steel }}>
                  {text}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Sektion>

      {/* ---- Organisationens eget lärande ---- */}
      <Sektion etikett="Capability" rubrik="Enterprise learning">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <p className="text-[15px] leading-[24px]" style={{ color: FARG.graphite }}>
              The platform continuously refines diagnostic procedures using verified operational experience from
              your own organization.
            </p>
            <p className="mt-4 text-[14px] leading-[22px]" style={{ color: FARG.steel }}>
              Every completed diagnostic contributes to subsequent guidance. Only verified outcomes are used —
              a case closed without confirmed root cause contributes nothing, by design.
            </p>
            <p className="mt-4 text-[14px] leading-[22px]" style={{ color: FARG.steel }}>
              The knowledge base belongs to the organization. It is derived from your cases, your procedures and
              your documentation, and it is not aggregated across customers.
            </p>
          </div>
          <Block rubrik="Derived from" beteckning="ALVA-SPEC-004">
            <ul className="text-[14px] leading-[24px]" style={{ color: FARG.graphite }}>
              {[
                "Verified root causes",
                "Confirmed corrective actions",
                "Recurring fault categories",
                "Procedure completion records",
                "Organization documentation",
              ].map((rad) => (
                <li key={rad} className="flex gap-4">
                  <Symbol ikon="klar" />
                  {rad}
                </li>
              ))}
            </ul>
          </Block>
        </div>
      </Sektion>

      {/* ---- Kvartalsrapport ---- */}
      <Sektion etikett="Reporting" rubrik="Quarterly improvement report">
        <p className="mb-8 max-w-[680px] text-[15px] leading-[24px]" style={{ color: FARG.steel }}>
          Each quarter the organization receives an automatically generated operational report. The format is
          that of an engineering audit: findings, evidence, recommendation.
        </p>
        <Tabell
          kolumner={["Section", "Content", "Basis"]}
          rader={[
            ["New validated diagnostic patterns", "Patterns confirmed by verified outcomes", "Case log"],
            ["Diagnostic precision", "Ratio of confirmed to hypothesized causes", "Verification records"],
            ["Recurring fault categories", "Distribution across the fleet", "Root cause analyses"],
            ["Recommended procedural improvements", "Steps with high exemption rates", "Procedure records"],
            ["Knowledge growth", "Documents, sources and coverage", "Knowledge infrastructure"],
            ["Organizational maturity", "Completion, verification and documentation ratios", "Aggregate"],
          ]}
        />
      </Sektion>

      {/* ---- Roadmap. Faser, inte löften med datum. ---- */}
      <Sektion etikett="Development" rubrik="Roadmap">
        <div className="grid gap-px md:grid-cols-4" style={{ background: FARG.lightSteel }}>
          {[
            ["Phase 1", "Guided diagnostics", "Current"],
            ["Phase 2", "Organization learning", "In development"],
            ["Phase 3", "Performance analytics", "Specified"],
            ["Phase 4", "Operational intelligence", "Planned"],
          ].map(([fas, namn, status], i) => (
            <div key={fas} className="bg-white p-6">
              <Etikett ton={i === 0 ? "blue" : "steel"}>{fas}</Etikett>
              <div className="mt-4 text-[15px] font-semibold" style={{ color: FARG.graphite }}>
                {namn}
              </div>
              <div className="mt-2 text-[12px] uppercase tracking-[0.08em]" style={{ color: FARG.steel }}>
                {status}
              </div>
            </div>
          ))}
        </div>
      </Sektion>

      {/* ---- Pris. Ingen onlinebetalning. ---- */}
      <Sektion etikett="Commercial" rubrik="Licensing">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <Tabell
              kolumner={["Component", "Basis"]}
              rader={[
                ["Platform license", "Per organization, annually"],
                ["User licenses", "Per active user, monthly"],
                ["Enterprise modules", "Optional, per module"],
              ]}
            />
            <p className="mt-6 text-[13px] leading-[20px]" style={{ color: FARG.steel }}>
              No online payment. No subscription sign-up. Invoicing follows review of the application.
            </p>
          </div>
          <Block rubrik="Activation sequence" beteckning="ALVA-PROC-0001">
            <ol className="text-[14px] leading-[26px]" style={{ color: FARG.graphite }}>
              {[
                "Organization submits registration.",
                "Application is reviewed.",
                "Invoice is issued.",
                "Payment is registered.",
                "Organization is activated.",
                "Additional users are billed monthly.",
              ].map((rad, i) => (
                <li key={rad} className="flex gap-4">
                  <span className="font-mono text-[12px]" style={{ color: FARG.steel }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {rad}
                </li>
              ))}
            </ol>
          </Block>
        </div>
      </Sektion>

      {/* ---- Kunskapskällor ---- */}
      <Sektion etikett="Infrastructure" rubrik="Operational Knowledge Infrastructure">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <p className="text-[15px] leading-[24px]" style={{ color: FARG.graphite }}>
              ALVA uses the organization&rsquo;s own authorized knowledge sources. The architecture is
              provider-agnostic: every source implements the same interface, and no provider is assumed.
            </p>
            <p className="mt-4 text-[14px] leading-[22px]" style={{ color: FARG.steel }}>
              A beta installation operates on internal documentation alone. External providers are enabled later
              through separate connectors, without change to the platform core.
            </p>
          </div>
          <Block rubrik="Source resolution order" beteckning="ALVA-SPEC-011">
            <ol className="text-[14px] leading-[24px]" style={{ color: FARG.graphite }}>
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
                  {rad}
                </li>
              ))}
            </ol>
          </Block>
        </div>
      </Sektion>

      <div className="border-t py-16" style={{ borderColor: FARG.lightSteel }}>
        <div className="mx-auto flex max-w-[1040px] flex-wrap items-baseline justify-between gap-4 px-6">
          <div className="font-mono text-[11px]" style={{ color: FARG.steel }}>
            {PLATTFORMSVERSION}
          </div>
          <div className="flex gap-4">
            <Link to="/alva/ansokan">
              <Knapp>Request account</Knapp>
            </Link>
            <Link to="/alva/logga-in">
              <Knapp variant="sekundar">Login</Knapp>
            </Link>
          </div>
        </div>
      </div>
    </Ram>
  );
}
