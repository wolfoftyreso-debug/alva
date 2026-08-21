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

import { useEffect, useMemo, useState } from "react";
import {
  PRISLISTA,
  fakturera,
  formateraBelopp,
} from "../../../../services/gemensam/fakturering.mjs";
import { hamtaFakturor, laddaNerFakturaPdf, plattformAktiv } from "@/felsokning/plattform";
import { Block, Demonstration, Etikett, FARG, Knapp, Rubrik, Statusmärke, Tabell } from "@/alva/komponenter";
import { Ram } from "./Ram";

interface Faktura {
  /** Serverns id. Saknas för exempelfakturan, som aldrig hämtas. */
  id?: string;
  /** Beteckningen på den faktura denna kreditfaktura rättar. */
  krediterar?: string;
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
  // Exemplet räknas alltid fram, av samma modul som servern använder. Det
  // är vad som visas när ingen plattform är konfigurerad.
  const exempel = useMemo(
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

  // Mot en konfigurerad plattform visas organisationens verkliga
  // fakturor. Misslyckas hämtningen visas felet — inte exemplet: en
  // tystnad som ser ut som data är värre än ett fel som syns.
  const [hamtade, setHamtade] = useState<Faktura[] | null>(null);
  const [hamtningsfel, setHamtningsfel] = useState("");
  const skarpt = plattformAktiv();

  useEffect(() => {
    if (!skarpt) return;
    let avbruten = false;
    hamtaFakturor()
      .then((f) => {
        if (!avbruten) setHamtade(f as unknown as Faktura[]);
      })
      .catch((orsak) => {
        if (!avbruten) setHamtningsfel(orsak instanceof Error ? orsak.message : String(orsak));
      });
    return () => {
      avbruten = true;
    };
  }, [skarpt]);

  // Senast utfärdad först — servern sorterar redan så. Vyn visade bara
  // den FÖRSTA: historiken, kreditkedjan och äldre underlag var
  // onåbara trots att hela listan redan hämtats. Nu väljs fakturan, och
  // standardvalet är den senaste.
  const [valdId, setValdId] = useState<string | null>(null);
  const [pdffel, setPdffel] = useState("");
  const lista = skarpt ? (hamtade ?? []) : [exempel];
  const faktura = lista.find((f) => f.id === valdId) ?? lista[0];

  // `!faktura` och inte `skarpt && !faktura`: exemplet är alltid
  // definierat, så det här smalnar av typen i stället för att bara
  // beskriva samma villkor en gång till.
  if (!faktura) {
    return (
      <Ram portal>
        <div className="mx-auto max-w-[1040px] px-6 py-12">
          <Etikett>Commercial</Etikett>
          <div className="mt-2 mb-8">
            <Rubrik niva={1}>Invoices</Rubrik>
          </div>
          <Block rubrik="Status" beteckning="ALVA-PROC-0001">
            <p className="text-[13px] leading-[20px]" style={{ color: FARG.steel }}>
              {hamtningsfel
                ? `Invoices could not be retrieved: ${hamtningsfel}`
                : hamtade
                  ? "No invoice has been issued for this organization."
                  : "Retrieving invoices."}
            </p>
          </Block>
        </div>
      </Ram>
    );
  }

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

        {!skarpt && (
          <Demonstration>
            The organization below is an example, and the price list is a placeholder to be set per market.
            The invoice itself is not: it is computed by the same module the server uses, from the inputs
            shown. Connected to a platform instance this page shows the organization&rsquo;s own invoices.
          </Demonstration>
        )}

        {lista.length > 1 && (
          <Block rubrik="Invoice history" beteckning="ALVA-PROC-0001">
            <div className="flex flex-wrap gap-2">
              {lista.map((f) => (
                <button
                  key={f.id ?? f.beteckning}
                  type="button"
                  onClick={() => setValdId(f.id ?? null)}
                  className="border px-4 py-2 text-left font-mono text-[12px]"
                  style={{
                    borderColor: f.beteckning === faktura.beteckning ? FARG.blue : FARG.lightSteel,
                    background: f.beteckning === faktura.beteckning ? FARG.background : FARG.white,
                    color: FARG.graphite,
                  }}
                  aria-pressed={f.beteckning === faktura.beteckning}
                >
                  {f.beteckning}
                  <span className="block text-[11px]" style={{ color: FARG.steel }}>
                    {f.utfardad}
                    {f.krediterar ? ` · credits ${f.krediterar}` : ""}
                  </span>
                </button>
              ))}
            </div>
          </Block>
        )}

        <Block rubrik="Invoice" beteckning={faktura.beteckning}>
          <div className="grid gap-6 sm:grid-cols-2">
            <dl className="text-[13px] leading-[22px]">
              {[
                ["Organization", faktura.organisation ?? "This organization"],
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
              {/* Kundens väg till sitt eget underlag. Endpointen fanns,
                  men ingenting i gränssnittet ledde dit — och hjälparen
                  som byggde en länk kunde ändå aldrig fungera, eftersom
                  en navigering inte bär sessionen. */}
              {skarpt && faktura.id && (
                <>
                  <div className="mt-4">
                    <Knapp
                      variant="sekundar"
                      onClick={() => {
                        setPdffel("");
                        laddaNerFakturaPdf(faktura.id as string, faktura.beteckning).catch((orsak) =>
                          setPdffel(orsak instanceof Error ? orsak.message : String(orsak)),
                        );
                      }}
                    >
                      Download PDF
                    </Knapp>
                  </div>
                  {pdffel && (
                    <p className="mt-2 text-[12px]" style={{ color: FARG.varning }}>
                      The PDF could not be retrieved: {pdffel}
                    </p>
                  )}
                </>
              )}
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
