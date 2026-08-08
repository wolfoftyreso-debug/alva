// ALVA-SPEC-040 · Garantiregimer.
//
// Vyn har ett jobb och det är inte att vara fullständig: den ska göra
// skillnaden mellan LAGSTADGAT och AVTALAT omöjlig att missa, och lyfta
// de två regler som avgör om verkstaden får utföra arbetet alls.
//
// Ordningen är därför inte alfabetisk och inte kronologisk. Skyddet för
// oberoende reparation står först, eftersom det är det som ifrågasätts —
// ibland av kunden, som blivit tillsagd något annat.

import { useState } from "react";
import {
  FORBEHALL,
  JURISDIKTIONER,
  KONTROLLERAD,
  regimerFor,
  skyddadReparation,
} from "../../../../services/gemensam/garantier.mjs";
import { Block, Etikett, FARG, Rubrik, Tabell } from "@/alva/komponenter";
import { Ram } from "./Ram";

interface Regim {
  id: string;
  jurisdiktion: string;
  grund: "lag" | "avtal";
  bärare: string;
  rubrik: string;
  kortform: string;
  källa: string;
  källänk: string | null;
  text: string;
  anmärkning: string;
  avvikelser: { marknad: string; text: string }[];
}

const BARARE: Record<string, string> = {
  säljaren: "Seller",
  tillverkaren: "Manufacturer",
};

export default function Garantier() {
  const [jurisdiktion, setJurisdiktion] = useState("EU");
  const regimer = regimerFor(jurisdiktion) as Regim[];
  const lag = regimer.filter((r) => r.grund === "lag");
  const avtal = regimer.filter((r) => r.grund === "avtal");
  const skydd = skyddadReparation(jurisdiktion) as Regim | null;

  return (
    <Ram portal>
      <div className="mx-auto max-w-[1040px] px-6 py-12">
        <Etikett>Regulatory</Etikett>
        <div className="mt-2 mb-2">
          <Rubrik niva={1}>Warranty regimes</Rubrik>
        </div>
        <p className="mb-8 max-w-[680px] text-[14px] leading-[22px]" style={{ color: FARG.steel }}>
          What the law requires as a floor, and what the manufacturer merely promises. The two are
          confused daily on the shop floor, and the confusion runs in both directions — a corrosion
          warranty treated as statutory, an emissions warranty treated as a favour.
        </p>

        {/* Jurisdiktionen först: allt nedanför beror på den, och ett svar
            för fel marknad är sämre än inget svar. */}
        <div className="mb-8">
          <Etikett>Jurisdiction</Etikett>
          <div className="mt-2 flex flex-wrap gap-2">
            {(JURISDIKTIONER as { id: string; namn: string }[]).map((j) => {
              const vald = j.id === jurisdiktion;
              return (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => setJurisdiktion(j.id)}
                  aria-pressed={vald}
                  className="border px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em]"
                  style={{
                    background: vald ? FARG.graphite : FARG.white,
                    color: vald ? FARG.white : FARG.steel,
                    borderColor: vald ? FARG.graphite : FARG.lightSteel,
                  }}
                >
                  {j.namn}
                </button>
              );
            })}
          </div>
        </div>

        {skydd && (
          <Block rubrik="Servicing here does not void the warranty" beteckning={skydd.id}>
            <p className="max-w-[680px] text-[14px] leading-[23px]">{skydd.text}</p>
            <p className="mt-4 max-w-[680px] text-[13px] leading-[21px]" style={{ color: FARG.steel }}>
              {skydd.anmärkning}
            </p>
            <p className="mt-4 font-mono text-[11px]" style={{ color: FARG.steel }}>
              {skydd.källa}
            </p>
          </Block>
        )}

        <Block rubrik="Statutory — applies regardless of any warranty booklet" beteckning="ALVA-SPEC-040">
          <Tabell
            kolumner={["Regime", "Period", "Liable", "Source"]}
            rader={lag.map((r) => [
              <span key="r">
                <span className="font-semibold">{r.rubrik}</span>
                <span className="mt-2 block text-[12px] leading-[19px]" style={{ color: FARG.steel }}>
                  {r.text}
                </span>
                {r.anmärkning && (
                  <span className="mt-2 block text-[12px] leading-[19px]" style={{ color: FARG.graphite }}>
                    {r.anmärkning}
                  </span>
                )}
                {r.avvikelser.map((a) => (
                  <span key={a.marknad} className="mt-2 block text-[12px] leading-[19px]" style={{ color: FARG.steel }}>
                    {a.marknad}: {a.text}
                  </span>
                ))}
              </span>,
              <span key="p" className="font-mono text-[12px]">
                {r.kortform}
              </span>,
              <span key="b" className="text-[12px]" style={{ color: FARG.steel }}>
                {BARARE[r.bärare] ?? r.bärare}
              </span>,
              <span key="k" className="font-mono text-[11px]" style={{ color: FARG.steel }}>
                {r.källa}
              </span>,
            ])}
          />
        </Block>

        <Block rubrik="Contractual — the manufacturer's own promise" beteckning="ALVA-SPEC-040">
          <p className="mb-4 max-w-[680px] text-[13px] leading-[21px]" style={{ color: FARG.steel }}>
            None of the following has any statutory basis in the EU or the United States. Terms are set
            by the manufacturer and vary by brand, market and model year, so the ranges below describe
            what occurs on the market — not what any given brand undertakes. Read the vehicle&rsquo;s own
            warranty terms before quoting a period to a customer.
          </p>
          <Tabell
            kolumner={["Warranty", "Typical", "Note"]}
            rader={avtal.map((r) => [
              <span key="r" className="font-semibold">
                {r.rubrik}
              </span>,
              <span key="p" className="text-[12px]" style={{ color: FARG.steel }}>
                {r.kortform}
              </span>,
              <span key="n" className="text-[12px] leading-[19px]" style={{ color: FARG.steel }}>
                {r.text} {r.anmärkning}
              </span>,
            ])}
          />
        </Block>

        <Block rubrik="Basis" beteckning={`Verified ${KONTROLLERAD}`}>
          <p className="max-w-[680px] text-[13px] leading-[21px]" style={{ color: FARG.steel }}>
            {FORBEHALL}
          </p>
        </Block>
      </div>
    </Ram>
  );
}
