// ALVA-PROC-0001 · Fakturor.
//
// Fakturan skapas i systemet, inte hos en betalleverantör. Det finns
// ingen kassa, ingen kortinmatning och ingen prenumeration att säga upp:
// ansökan granskas, faktura utfärdas, betalning registreras av en
// människa, organisationen aktiveras.
//
// Vyn visar därför två saker och inget mer: vad organisationen betalar
// för, och varför beloppet blev det det blev. Varje rad bär sitt
// underlag — antalet aktiva användare är inte en uppskattning utan de
// konton som faktiskt kan logga in.

import { useMemo } from "react";
import {
  PRISLISTA,
  fakturera,
  formateraBelopp,
} from "../../../../services/gemensam/fakturering.mjs";
import { Block, Demonstration, Etikett, FARG, Rubrik, Statusmärke, Tabell } from "@/alva/komponenter";
import { Ram } from "./Ram";

interface Faktura {
  beteckning: string;
  organisation: string;
  period: { fran: string; till: string };
  utfardad: string;
  forfaller: string;
  valuta: string;
  rader: { benamning: string; underlag: string; antal: number; enhet: string; apris: number; belopp: number }[];
  netto: number;
  moms: number;
  momssats: number;
  totalt: number;
  status: string;
  betalningssatt: string;
}

// Exempelorganisationen. Siffrorna nedan är indata, inte resultat —
// fakturan under dem räknas fram av samma modul som servern använder.
const ORGANISATION = {
  namn: "Verkstad Nord AB",
  moduler: ["forsakringsrapportering"],
};
const AKTIVA_ANVANDARE = 12;
const PERIOD = { fran: "2026-01-01", till: "2026-12-31" };

const STATUSAV: Record<string, "passed" | "pending" | "not_applicable"> = {
  betald: "passed",
  utfardad: "pending",
  krediterad: "not_applicable",
};

export default function Fakturor() {
  const faktura = useMemo(
    () =>
      fakturera({
        nummer: 1,
        org: ORGANISATION,
        aktiva: AKTIVA_ANVANDARE,
        period: PERIOD,
        utfardad: "2026-01-15",
      }) as Faktura,
    [],
  );

  return (
    <Ram portal>
      <div className="mx-auto max-w-[1040px] px-6 py-12">
        <Etikett>Commercial</Etikett>
        <div className="mt-2 mb-2">
          <Rubrik niva={1}>Invoices</Rubrik>
        </div>
        <p className="mb-8 max-w-[680px] text-[14px] leading-[22px]" style={{ color: FARG.steel }}>
          ALVA is invoiced, not purchased online. No card details are handled and no payment provider is
          involved. An invoice is derived from the organization&rsquo;s own state — its licence period, its
          active accounts, its enabled modules — so the amount cannot disagree with what the platform
          actually holds.
        </p>

        <Demonstration>
          The organization below is an example, and the price list is a placeholder to be set per market.
          The invoice itself is not: it is computed by the same module the server uses, from the inputs
          shown.
        </Demonstration>

        <Block rubrik="Invoice" beteckning={faktura.beteckning}>
          <div className="grid gap-6 sm:grid-cols-2">
            <dl className="text-[13px] leading-[22px]">
              {[
                ["Organization", faktura.organisation],
                ["Period", `${faktura.period.fran} – ${faktura.period.till}`],
                ["Issued", faktura.utfardad],
                ["Due", faktura.forfaller],
              ].map(([etikett, varde]) => (
                <div key={etikett} className="flex justify-between border-b py-2" style={{ borderColor: FARG.lightSteel }}>
                  <dt style={{ color: FARG.steel }}>{etikett}</dt>
                  <dd className="font-mono">{varde}</dd>
                </div>
              ))}
            </dl>
            <div>
              <Etikett>Status</Etikett>
              <div className="mt-2">
                <Statusmärke status={STATUSAV[faktura.status] ?? "pending"} />
              </div>
              <p className="mt-6 text-[12px] leading-[18px]" style={{ color: FARG.steel }}>
                {faktura.betalningssatt} Payment is registered by an administrator when the funds arrive —
                the platform never records an invoice as paid on its own.
              </p>
            </div>
          </div>
        </Block>

        <Block rubrik="Lines" beteckning="ALVA-PROC-0001">
          <Tabell
            kolumner={["Item", "Basis", "Quantity", "Unit price", "Amount"]}
            rader={faktura.rader.map((r) => [
              r.benamning,
              <span key="u" className="text-[12px]" style={{ color: FARG.steel }}>
                {r.underlag}
              </span>,
              <span key="a" className="font-mono">
                {r.antal} {r.enhet}
              </span>,
              <span key="p" className="font-mono">
                {formateraBelopp(r.apris, faktura.valuta)}
              </span>,
              <span key="b" className="font-mono">
                {formateraBelopp(r.belopp, faktura.valuta)}
              </span>,
            ])}
          />

          <dl className="mt-6 ml-auto max-w-[320px] text-[13px] leading-[22px]">
            {[
              ["Net", faktura.netto],
              [`VAT ${Math.round(faktura.momssats * 100)} %`, faktura.moms],
            ].map(([etikett, belopp]) => (
              <div key={etikett as string} className="flex justify-between border-b py-2" style={{ borderColor: FARG.lightSteel }}>
                <dt style={{ color: FARG.steel }}>{etikett}</dt>
                <dd className="font-mono">{formateraBelopp(belopp as number, faktura.valuta)}</dd>
              </div>
            ))}
            <div className="flex justify-between border-b-2 py-2" style={{ borderColor: FARG.graphite }}>
              <dt className="font-semibold">Total</dt>
              <dd className="font-mono font-semibold">{formateraBelopp(faktura.totalt, faktura.valuta)}</dd>
            </div>
          </dl>
        </Block>

        <Block rubrik="Price list" beteckning="ALVA-SPEC-030">
          <p className="mb-4 text-[13px] leading-[20px]" style={{ color: FARG.steel }}>
            One list, one place. Change a figure here and every invoice issued afterwards follows —
            invoices already issued do not, because an issued invoice is never edited. A correction is a
            credit note that points back at it, and it requires a stated reason.
          </p>
          <Tabell
            kolumner={["Component", "Basis", "Price"]}
            rader={[
              ["Platform license", "Per organization, annually", formateraBelopp(PRISLISTA.plattform_ar)],
              ["User licenses", "Per active user, monthly", formateraBelopp(PRISLISTA.anvandare_manad)],
              ...Object.values(PRISLISTA.moduler).map((m) => [
                (m as { namn: string }).namn,
                "Enterprise module, annually",
                formateraBelopp((m as { ar: number }).ar),
              ]),
            ].map((rad) => [
              rad[0],
              <span key="b" className="text-[12px]" style={{ color: FARG.steel }}>
                {rad[1]}
              </span>,
              <span key="p" className="font-mono">
                {rad[2]}
              </span>,
            ])}
          />
        </Block>
      </div>
    </Ram>
  );
}
