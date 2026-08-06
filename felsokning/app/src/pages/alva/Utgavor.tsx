// ALVA-SPEC-002 · Utgåvor.
//
// Historiken är härledd ur vad som faktiskt levererats, och varje post
// pekar på den commit där arbetet finns. En utgåva som inte går att peka
// på hör inte hemma i listan.

import { NUVARANDE, UTGAVOR } from "../../../../services/gemensam/version.mjs";
import { Block, Etikett, FARG, Rubrik } from "@/alva/komponenter";
import { Ram } from "./Ram";

interface Utgava {
  version: string;
  datum: string;
  commit: string;
  rubrik: string;
  stor?: boolean;
  andringar: string[];
}

export default function Utgavor() {
  const utgavor = UTGAVOR as Utgava[];
  const nu = NUVARANDE as Utgava;

  return (
    <Ram>
      <div className="mx-auto max-w-[1040px] px-6 py-12">
        <Etikett>Release notes</Etikett>
        <div className="mt-2 mb-2">
          <Rubrik niva={1}>Versions</Rubrik>
        </div>
        <p className="mb-8 max-w-[680px] text-[14px] leading-[22px]" style={{ color: FARG.steel }}>
          Current release <span className="font-mono">ALVA {nu.version}</span>, {nu.datum}. The second
          digit moves for new capability. The first moves only when the <em>guarantees</em> change —
          what the system undertakes about a record. That has happened twice.
        </p>

        <div className="grid gap-4">
          {utgavor.map((u) => (
            <Block key={u.version} rubrik={`ALVA ${u.version} — ${u.rubrik}`} beteckning={u.commit}>
              <div className="mb-4 flex flex-wrap items-center gap-4">
                <span className="font-mono text-[12px]" style={{ color: FARG.steel }}>
                  {u.datum}
                </span>
                {u.stor && (
                  <span
                    className="border px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.08em]"
                    style={{ borderColor: FARG.graphite, color: FARG.graphite }}
                  >
                    Guarantees changed
                  </span>
                )}
              </div>
              <ul className="grid gap-2">
                {u.andringar.map((a) => (
                  <li key={a} className="max-w-[680px] text-[13px] leading-[21px]">
                    {a}
                  </li>
                ))}
              </ul>
            </Block>
          ))}
        </div>

        <Block rubrik="How versions are numbered" beteckning="ALVA-SPEC-002">
          <p className="max-w-[680px] text-[13px] leading-[21px]" style={{ color: FARG.steel }}>
            ALVA 1.0, ALVA 1.1, ALVA 2.0. Not Summer Edition, not AI Edition, not Pro Max. A version is
            a state of the system, not a marketing event. A release that cannot be pointed at in the
            history does not belong in this list — an invented changelog is the same unfounded
            certainty the product exists to avoid.
          </p>
        </Block>
      </div>
    </Ram>
  );
}
