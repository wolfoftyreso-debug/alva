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
//
// Texten hämtas ur språkkatalogen (webb.-nycklarna) på besökarens språk.
// Ordmärket och utläsningen är ALVA:s struktur och står kvar på engelska
// i varje språk — precis som fasnamnen i metodkorten nedan.

import { Link } from "react-router-dom";
import { ALVA, FASER, PLATTFORMSVERSION } from "@/alva/system";
import { Block, Etikett, FARG, Knapp, Rubrik, Symbol, Tabell } from "@/alva/komponenter";
import { useWebbSprak } from "@/alva/webbsprak";
import { oversattare } from "../../../../services/gemensam/sprak/index.mjs";
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
  const sprak = useWebbSprak();
  const t = oversattare(sprak) as (nyckel: string) => string;

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
            {t("webb.hero.position")}
          </p>

          <p className="mt-10 max-w-[620px] text-[18px] leading-[28px]" style={{ color: FARG.graphite }}>
            {t("webb.hero.definition")}
          </p>

          {/* Lika breda, inte innehållsbreda. Två knappar bredvid varandra
              där den ena är dubbelt så bred som den andra läser sig som en
              huvudåtgärd och en eftertanke — och det är inte förhållandet
              mellan dem. Rutnätet ger dem samma bredd; vikten skiljs av
              fyllning mot kontur, som resten av systemet gör. */}
          <div className="mt-10 grid max-w-[420px] grid-cols-2 gap-4">
            <Link to="/alva/ansokan" className="block h-full">
              <Knapp bred>{t("webb.ansok")}</Knapp>
            </Link>
            <Link to="/alva/logga-in" className="block h-full">
              <Knapp bred variant="sekundar">{t("webb.loggain")}</Knapp>
            </Link>
          </div>
        </div>
      </section>

      {/* ---- Metoden. Fasnamnen är invarianta; syfte och avgränsning
              är webbtext och följer besökarens språk. ---- */}
      <Sektion etikett={t("webb.metod.etikett")} rubrik={t("webb.metod.rubrik")}>
        <p className="mb-8 max-w-[680px] text-[15px] leading-[24px]" style={{ color: FARG.steel }}>
          {t("webb.metod.ingress")}
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
                {t(`webb.fas.${f.id}.syfte`)}
              </p>
              <p className="mt-4 border-t pt-4 text-[12px] leading-[18px]" style={{ borderColor: FARG.lightSteel, color: FARG.steel }}>
                {t(`webb.fas.${f.id}.avgransning`)}
              </p>
            </div>
          ))}
        </div>
      </Sektion>

      {/* ---- Arbetsgång. Numrerad, inte illustrerad. ---- */}
      <Sektion etikett={t("webb.drift.etikett")} rubrik={t("webb.drift.rubrik")}>
        <ol className="max-w-[680px]">
          {[1, 2, 3, 4, 5, 6].map((steg, i) => (
            <li key={steg} className="flex gap-6 border-t py-6" style={{ borderColor: FARG.lightSteel }}>
              <span className="font-mono text-[13px] leading-[20px]" style={{ color: FARG.steel }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <div className="text-[15px] font-semibold" style={{ color: FARG.graphite }}>
                  {t(`webb.drift.s${steg}.rubrik`)}
                </div>
                <div className="mt-2 text-[14px] leading-[20px]" style={{ color: FARG.steel }}>
                  {t(`webb.drift.s${steg}.text`)}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Sektion>

      {/* ---- Organisationens eget lärande ---- */}
      <Sektion etikett={t("webb.larande.etikett")} rubrik={t("webb.larande.rubrik")}>
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <p className="text-[15px] leading-[24px]" style={{ color: FARG.graphite }}>
              {t("webb.larande.p1")}
            </p>
            <p className="mt-4 text-[14px] leading-[22px]" style={{ color: FARG.steel }}>
              {t("webb.larande.p2")}
            </p>
            <p className="mt-4 text-[14px] leading-[22px]" style={{ color: FARG.steel }}>
              {t("webb.larande.p3")}
            </p>
          </div>
          <Block rubrik={t("webb.larande.block")} beteckning="ALVA-SPEC-004">
            <ul className="text-[14px] leading-[24px]" style={{ color: FARG.graphite }}>
              {[1, 2, 3, 4, 5].map((rad) => (
                <li key={rad} className="flex gap-4">
                  <Symbol ikon="klar" />
                  {t(`webb.larande.k${rad}`)}
                </li>
              ))}
            </ul>
          </Block>
        </div>
      </Sektion>

      {/* ---- Kvartalsrapport ----
          Stod tidigare som en tabell med kolumnerna Section, Content och
          Basis — alltså en beskrivning av rapportens DISPOSITION. Det är
          dokumentation, inte en startsida: läsaren fick veta hur
          rapporten är uppbyggd innan den fått veta vad den svarar på.

          Nu står frågorna i stället. En verkstadschef känner igen sina
          egna frågor; ingen känner igen en innehållsförteckning. */}
      <Sektion etikett={t("webb.rapport.etikett")} rubrik={t("webb.rapport.rubrik")}>
        <p className="mb-8 max-w-[680px] text-[15px] leading-[24px]" style={{ color: FARG.steel }}>
          {t("webb.rapport.ingress")}
        </p>
        <ul className="grid max-w-[760px] gap-4">
          {[1, 2, 3, 4, 5, 6].map((fraga) => (
            <li
              key={fraga}
              className="border-l-2 pl-6 text-[15px] leading-[24px]"
              style={{ borderColor: FARG.lightSteel, color: FARG.graphite }}
            >
              {t(`webb.rapport.f${fraga}`)}
            </li>
          ))}
        </ul>
      </Sektion>

      {/* ---- Pris. Ingen onlinebetalning. ---- */}
      <Sektion etikett={t("webb.pris.etikett")} rubrik={t("webb.pris.rubrik")}>
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <Tabell
              kolumner={[t("webb.pris.komponent"), t("webb.pris.grund")]}
              rader={[
                [t("webb.pris.plattform"), t("webb.pris.plattform.grund")],
                [t("webb.pris.anvandare"), t("webb.pris.anvandare.grund")],
                [t("webb.pris.moduler"), t("webb.pris.moduler.grund")],
              ]}
            />
            <p className="mt-6 text-[13px] leading-[20px]" style={{ color: FARG.steel }}>
              {t("webb.pris.betalning")}
            </p>
          </div>
          <Block rubrik={t("webb.pris.aktivering")} beteckning="ALVA-PROC-0001">
            <ol className="text-[14px] leading-[26px]" style={{ color: FARG.graphite }}>
              {[1, 2, 3, 4, 5, 6].map((steg, i) => (
                <li key={steg} className="flex gap-4">
                  <span className="font-mono text-[12px]" style={{ color: FARG.steel }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {t(`webb.pris.a${steg}`)}
                </li>
              ))}
            </ol>
          </Block>
        </div>
      </Sektion>

      {/* ---- Kunskapskällor ---- */}
      <Sektion etikett={t("webb.kallor.etikett")} rubrik={t("webb.kallor.rubrik")}>
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <p className="text-[15px] leading-[24px]" style={{ color: FARG.graphite }}>
              {t("webb.kallor.p1")}
            </p>
            <p className="mt-4 text-[14px] leading-[22px]" style={{ color: FARG.steel }}>
              {t("webb.kallor.p2")}
            </p>
          </div>
          <Block rubrik={t("webb.kallor.block")} beteckning="ALVA-SPEC-011">
            <ol className="text-[14px] leading-[24px]" style={{ color: FARG.graphite }}>
              {[1, 2, 3, 4, 5, 6, 7].map((rad, i) => (
                <li key={rad} className="flex gap-4">
                  <span className="font-mono text-[12px]" style={{ color: FARG.steel }}>
                    {i + 1}
                  </span>
                  {t(`webb.kallor.k${rad}`)}
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
          <div className="grid max-w-[420px] grid-cols-2 gap-4">
            <Link to="/alva/ansokan" className="block h-full">
              <Knapp bred>{t("webb.ansok")}</Knapp>
            </Link>
            <Link to="/alva/logga-in" className="block h-full">
              <Knapp bred variant="sekundar">{t("webb.loggain")}</Knapp>
            </Link>
          </div>
        </div>
      </div>
    </Ram>
  );
}
