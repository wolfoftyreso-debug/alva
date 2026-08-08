// ALVA-SPEC-041 · Försäkringsvillkor.
//
// Vyn får aldrig se ut som ett besked. Den är byggd så att det som står
// överst är FRÅGORNA — det som faktiskt avgör en maskinskadefråga — och
// registret därunder, som det underlag det är.
//
// Ordningen är inte kosmetisk. Läggs tabellen först läses den som ett
// svar, och de fem villkor som avgör oftare än åldern gör hamnar under
// vikningen.

import { useState } from "react";
import {
  AVGORANDE_VILLKOR,
  BOLAG,
  FORBEHALL,
  bedom,
  foraldrad,
  spann,
} from "../../../../services/gemensam/forsakring.mjs";
import { Block, Etikett, FARG, Rubrik, Tabell, Textfalt } from "@/alva/komponenter";
import { Ram } from "./Ram";

interface Produkt {
  namn: string;
  maxAlderAr: number;
  maxMil: number;
}
interface Bolag {
  id: string;
  namn: string;
  marknad: string;
  produkter: Produkt[];
  kalla: string;
  kontrollerad: string;
}
interface Villkor {
  id: string;
  rubrik: string;
  fraga: string;
  text: string;
}

export default function Forsakring() {
  const [alder, setAlder] = useState("");
  const [mil, setMil] = useState("");

  const tal = (v: string) => (v.trim() === "" || Number.isNaN(Number(v)) ? undefined : Number(v));
  const utfall = bedom({ alderAr: tal(alder), mil: tal(mil) }) as {
    inom: { bolag: string; produkt: string; foraldrad: boolean }[];
    utanfor: { bolag: string; produkt: string }[];
    oklart: { bolag: string; produkt: string }[];
    nastaSteg: string;
  };
  const s = spann() as { alderAr: { minsta: number; storsta: number }; mil: { minsta: number; storsta: number } };
  const angivet = tal(alder) !== undefined || tal(mil) !== undefined;

  return (
    <Ram portal>
      <div className="mx-auto max-w-[1040px] px-6 py-12">
        <Etikett>Reasoning aid</Etikett>
        <div className="mt-2 mb-2">
          <Rubrik niva={1}>Insurance conditions</Rubrik>
        </div>
        <p className="mb-8 max-w-[680px] text-[14px] leading-[22px]" style={{ color: FARG.steel }}>
          ALVA does not decide whether a claim is covered, and cannot. Cover follows the
          customer&rsquo;s own policy and the terms in force when it was taken out. What this page gives
          you is the shape of the question and what the register recorded, so the conversation starts
          from something better than a guess.
        </p>

        <Block rubrik="What actually decides it" beteckning="ALVA-SPEC-041">
          <p className="mb-4 max-w-[680px] text-[13px] leading-[21px]" style={{ color: FARG.steel }}>
            Age and distance are two of seven. The other five decide more claims than the two that get
            asked about first.
          </p>
          <Tabell
            kolumner={["Condition", "The question", "Why it matters"]}
            rader={(AVGORANDE_VILLKOR as Villkor[]).map((v) => [
              <span key="r" className="font-semibold">
                {v.rubrik}
              </span>,
              <span key="f" className="text-[13px]">
                {v.fraga}
              </span>,
              <span key="t" className="text-[12px] leading-[19px]" style={{ color: FARG.steel }}>
                {v.text}
              </span>,
            ])}
          />
        </Block>

        <Block rubrik="Where the vehicle sits against the register" beteckning="ALVA-SPEC-041">
          <div className="grid max-w-[420px] gap-4 sm:grid-cols-2">
            <Textfalt label="Vehicle age (years)" varde={alder} andra={setAlder} platshallare="6" />
            <Textfalt label="Odometer (mil)" varde={mil} andra={setMil} platshallare="9 400" />
          </div>

          {!angivet ? (
            <p className="mt-6 text-[13px] leading-[21px]" style={{ color: FARG.steel }}>
              Recorded limits range from {s.alderAr.minsta}–{s.alderAr.storsta} years and{" "}
              {s.mil.minsta.toLocaleString("sv-SE")}–{s.mil.storsta.toLocaleString("sv-SE")} mil, depending
              on insurer and product tier.
            </p>
          ) : (
            <div className="mt-6 grid gap-4">
              {[
                ["Within recorded limits", utfall.inom],
                ["Beyond recorded limits", utfall.utanfor],
                ["Cannot be placed on what you entered", utfall.oklart],
              ].map(([rubrik, lista]) => {
                const rader = lista as { bolag: string; produkt: string; foraldrad?: boolean }[];
                return (
                  <div key={rubrik as string}>
                    <Etikett>{rubrik as string}</Etikett>
                    {rader.length === 0 ? (
                      <p className="mt-2 text-[13px]" style={{ color: FARG.steel }}>
                        —
                      </p>
                    ) : (
                      <ul className="mt-2 grid gap-2">
                        {rader.map((r) => (
                          <li key={`${r.bolag}${r.produkt}`} className="text-[13px]">
                            <span className="font-semibold">{r.bolag}</span> · {r.produkt}
                            {r.foraldrad && (
                              <span className="ml-2 text-[11px] uppercase tracking-[0.08em]" style={{ color: FARG.steel }}>
                                register entry out of date
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
              {/* Står även när fordonet ligger utanför varje noterad
                  gräns. Registret kan vara ofullständigt, produkten en
                  annan, och villkoren vid tecknandet andra. */}
              <p className="border-t pt-4 text-[13px] leading-[21px]" style={{ borderColor: FARG.lightSteel }}>
                {utfall.nastaSteg}
              </p>
            </div>
          )}
        </Block>

        <Block rubrik="Register" beteckning="ALVA-SPEC-041">
          <Tabell
            kolumner={["Insurer", "Product", "Age", "Distance", "Read"]}
            rader={(BOLAG as Bolag[]).flatMap((b) =>
              b.produkter.map((p) => [
                <span key="b" className="font-semibold">
                  {b.namn}
                </span>,
                <span key="p" className="text-[13px]">
                  {p.namn}
                </span>,
                <span key="a" className="font-mono text-[12px]">
                  {p.maxAlderAr} yr
                </span>,
                <span key="m" className="font-mono text-[12px]">
                  {p.maxMil.toLocaleString("sv-SE")} mil
                </span>,
                <span
                  key="k"
                  className="font-mono text-[11px]"
                  style={{ color: foraldrad(b) ? FARG.graphite : FARG.steel }}
                >
                  {b.kontrollerad}
                  {foraldrad(b) ? " — out of date" : ""}
                </span>,
              ]),
            )}
          />
          <p className="mt-4 max-w-[680px] text-[12px] leading-[19px]" style={{ color: FARG.steel }}>
            The register covers the insurers read so far and is not a market survey. Smaller insurers
            and non-Swedish markets have to be added by the organization, with a source and a date —
            an entry without those two is not usable as a starting point for anything.
          </p>
        </Block>

        <Block rubrik="Basis" beteckning="ALVA-SPEC-041">
          <p className="max-w-[680px] text-[13px] leading-[21px]" style={{ color: FARG.steel }}>
            {FORBEHALL}
          </p>
        </Block>
      </div>
    </Ram>
  );
}
