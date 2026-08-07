// Portalens inställningsöversikt.
//
// Sidan finns för att menyordet "Settings" ska hålla vad det lovar utan
// att besökaren behöver veta systemets egna namn i förväg. Fem områden,
// vart och ett en hel klickbar rad med en mening om vad man uträttar
// där — inte en ikonmatta och inte en fällmeny.
//
// Områdeslistan ägs av installningsomraden.ts: samma data bär
// huvudmenyns markering, inställningsraden och den här sidan. En
// lista, tre användningar — annars glider de isär vid nästa område
// som tillkommer.

import { Link } from "react-router-dom";
import { Etikett, FARG, Rubrik, Symbol } from "@/alva/komponenter";
import { INSTALLNINGAR } from "./installningsomraden";
import { Ram } from "./Ram";

export default function Installningar() {
  return (
    <Ram portal>
      <div className="mx-auto max-w-[1040px] px-6 py-12">
        <div className="mb-8">
          <Etikett>Organization</Etikett>
          <div className="mt-2">
            <Rubrik niva={1}>Settings</Rubrik>
          </div>
          <p className="mt-4 max-w-[640px] text-[13px] leading-[24px]" style={{ color: FARG.steel }}>
            Everything that configures the organization is gathered here. Nothing under Settings
            touches an individual case — casework lives under Diagnostics.
          </p>
        </div>

        <ul className="grid gap-4">
          {INSTALLNINGAR.map((p) => (
            <li key={p.till}>
              <Link
                to={p.till}
                className="flex items-center justify-between gap-4 border p-6"
                style={{ borderColor: FARG.lightSteel, background: FARG.white }}
              >
                <span className="min-w-0">
                  <span
                    className="block text-[13px] font-semibold uppercase tracking-[0.08em]"
                    style={{ color: FARG.blue }}
                  >
                    {p.text}
                  </span>
                  <span className="mt-2 block text-[13px] leading-[24px]" style={{ color: FARG.steel }}>
                    {p.beskrivning}
                  </span>
                </span>
                <Symbol ikon="nasta" ton={FARG.blue} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Ram>
  );
}
