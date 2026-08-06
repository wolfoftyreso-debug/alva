// ALVA-SPEC-050 · Impressum och lagstadgad information.
//
// Sidan visar två saker: uppgifterna, och — så länge de inte är satta —
// exakt vilka som fattas och med vilken rättslig grund.
//
// Att fylla rutorna med påhittade uppgifter vore inte ett halvfärdigt
// Impressum utan ett vilseledande, och skadan större än den tomma rutans.
// Därför står det som saknas som en åtgärdslista i stället.

import {
  AVSKAFFAT,
  FALT,
  HANDLINGAR,
  saknade,
} from "../../../../services/gemensam/foretagsuppgifter.mjs";
import { Block, Etikett, FARG, Rubrik, Tabell } from "@/alva/komponenter";
import { Ram } from "./Ram";

interface Falt {
  id: string;
  rubrik: string;
  grund: string;
  kravs: boolean;
  hjalp: string;
}
interface Handling {
  id: string;
  rubrik: string;
  grund: string;
  kravs: boolean;
  nar: string;
}

// Driftens uppgifter. Sätts vid driftsättning; tomt betyder tomt.
const UPPGIFTER: Record<string, string> = {};

export default function Impressum() {
  const fattas = saknade(UPPGIFTER) as { id: string; rubrik: string; grund: string }[];

  return (
    <Ram>
      <div className="mx-auto max-w-[1040px] px-6 py-12">
        <Etikett>Legal</Etikett>
        <div className="mt-2 mb-2">
          <Rubrik niva={1}>Impressum</Rubrik>
        </div>
        <p className="mb-8 max-w-[680px] text-[14px] leading-[22px]" style={{ color: FARG.steel }}>
          Angaben gemäß § 5 DDG. The requirement set is German because it is the strictest and the most
          enforceable in the EU — meeting it meets the other markets as a by-product, and spares a
          second review per country.
        </p>

        {fattas.length > 0 && (
          <Block rubrik="Not yet set" beteckning="ALVA-SPEC-050">
            <p className="mb-4 max-w-[680px] text-[13px] leading-[21px]" style={{ color: FARG.steel }}>
              The operator&rsquo;s details have not been configured. They are shown as outstanding rather
              than filled with placeholder text: an Impressum with an invented address is not an
              incomplete Impressum but a misleading one, and the harm is greater than an empty field.
            </p>
            <Tabell
              kolumner={["Field", "Legal basis"]}
              rader={fattas.map((f) => [
                <span key="r" className="font-semibold">
                  {f.rubrik}
                </span>,
                <span key="g" className="font-mono text-[11px]" style={{ color: FARG.steel }}>
                  {f.grund}
                </span>,
              ])}
            />
          </Block>
        )}

        <Block rubrik="Required details" beteckning="§ 5 DDG">
          <Tabell
            kolumner={["Field", "Value", "Legal basis", "Note"]}
            rader={(FALT as Falt[]).map((f) => [
              <span key="r" className="font-semibold">
                {f.rubrik}
                {!f.kravs && (
                  <span className="ml-2 text-[10px] uppercase tracking-[0.08em]" style={{ color: FARG.steel }}>
                    conditional
                  </span>
                )}
              </span>,
              <span key="v" className="font-mono text-[12px]" style={{ color: UPPGIFTER[f.id] ? FARG.graphite : FARG.steel }}>
                {UPPGIFTER[f.id] || "— not set"}
              </span>,
              <span key="g" className="font-mono text-[11px]" style={{ color: FARG.steel }}>
                {f.grund}
              </span>,
              <span key="h" className="text-[12px] leading-[19px]" style={{ color: FARG.steel }}>
                {f.hjalp}
              </span>,
            ])}
          />
        </Block>

        <Block rubrik="Documents that must be reachable from every page" beteckning="ALVA-SPEC-050">
          <Tabell
            kolumner={["Document", "Legal basis", "When it applies"]}
            rader={(HANDLINGAR as Handling[]).map((h) => [
              <span key="r" className="font-semibold">
                {h.rubrik}
              </span>,
              <span key="g" className="font-mono text-[11px]" style={{ color: FARG.steel }}>
                {h.grund}
              </span>,
              <span key="n" className="text-[12px] leading-[19px]" style={{ color: FARG.steel }}>
                {h.nar}
              </span>,
            ])}
          />
        </Block>

        {/* Den här rutan är sidans egentliga behållning. Två hänvisningar
            som legat i tiotusentals fotnoter är numera fel, och bägge ser
            fortfarande ut som upplysningar. */}
        <Block rubrik="What must no longer be here" beteckning="ALVA-SPEC-050">
          <Tabell
            kolumner={["No longer valid", "Basis", "What to do"]}
            rader={(AVSKAFFAT as { rubrik: string; grund: string; text: string }[]).map((a) => [
              <span key="r" className="font-semibold">
                {a.rubrik}
              </span>,
              <span key="g" className="font-mono text-[11px]" style={{ color: FARG.steel }}>
                {a.grund}
              </span>,
              <span key="t" className="text-[12px] leading-[19px]" style={{ color: FARG.steel }}>
                {a.text}
              </span>,
            ])}
          />
        </Block>
      </div>
    </Ram>
  );
}
