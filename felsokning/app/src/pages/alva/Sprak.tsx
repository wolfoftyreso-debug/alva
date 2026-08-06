// ALVA-SPEC-060 · Språksidan.
//
// Sidan finns i foten och inte i portalens navigation, av två skäl. Den
// är dokumentation snarare än ett arbetsverktyg, och portalraden har
// redan tio poster — en elfte hade brutit raden till ytterligare en rad
// på telefon utan att någon sökt sig dit oftare.
//
// ---- Vad sidan gör som en språkmeny inte gör -----------------------------
//
// En vanlig språkväljare påstår att produkten finns på tio språk och
// slutar där. Den här redovisar i stället skillnaden mellan att en text
// ÄR översatt och att den är GRANSKAD av någon som kan yrket, och den
// visar det på de strängar där skillnaden faktiskt betyder något:
// grindens hinder, alltså de meningar som nekar en tekniker att avsluta
// ett ärende.
//
// Det är ett obekvämt sätt att presentera sin egen produkt, och det är
// hela poängen. En verkstadschef i Rumänien som får veta att metodiken
// inte är fackgranskad på rumänska kan planera för det. Samma chef som
// får veta det av en tekniker som missförstått en säkerhetsinstruktion
// kan inte.
//
// Sidans egen text står på besökarens språk (webb.sprak.-nycklarna).
// Förhandsvisningen har en EGEN väljare: den visar hur grindens hinder
// ser ut på ett språk man granskar, inte det språk man läser sidan på.

import { useState } from "react";
import { SPRAK, metodikvarning, oversattare, tackning } from "../../../../services/gemensam/sprak/index.mjs";
import { Block, Etikett, FARG, Rubrik, Tabell } from "@/alva/komponenter";
import { useWebbSprak } from "@/alva/webbsprak";
import { Ram } from "./Ram";

type Sprakpost = { kod: string; namn: string; egetNamn: string; granskat: boolean };
const SPRAKEN = SPRAK as Sprakpost[];

// De strängar som väljs för förhandsvisningen är inte slumpvis valda.
// Var och en är en mening som nekar ett avslut, och därmed en mening som
// måste gå att förstå av den som blir nekad.
const PROV = [
  "grind.objekt",
  "grind.historik",
  "grind.matarstallning.ej_foto",
  "grind.hogvolt.spanningslos",
  "slutsats.utan_slutsats",
];

function Sektion({ etikett, rubrik, children }: { etikett: string; rubrik: string; children: React.ReactNode }) {
  return (
    <section className="border-t py-16" style={{ borderColor: FARG.lightSteel }}>
      <div className="mx-auto max-w-[1040px] px-6">
        <Etikett>{etikett}</Etikett>
        <div className="mt-2 mb-8">
          <Rubrik niva={2}>{rubrik}</Rubrik>
        </div>
        {children}
      </div>
    </section>
  );
}

export default function Sprak() {
  const sprak = useWebbSprak();
  const t = oversattare(sprak) as (nyckel: string, variabler?: Record<string, string>) => string;

  // Förhandsvisningens språk är inte sidans. Den som läser på engelska
  // ska kunna granska den polska översättningen — utgångsvalet är därför
  // besökarens eget språk när det inte är källspråket, annars tyska.
  const [valt, setValt] = useState(sprak !== "en" ? sprak : "de");
  const prov = oversattare(valt) as (nyckel: string) => string;
  const post = SPRAKEN.find((s) => s.kod === valt)!;
  const varning = metodikvarning(valt) as string | null;

  return (
    <Ram>
      <section className="border-b" style={{ borderColor: FARG.lightSteel, background: FARG.white }}>
        <div className="mx-auto max-w-[1040px] px-6 py-16">
          <Etikett>{t("webb.sprak.etikett")}</Etikett>
          <div className="mt-2">
            <Rubrik niva={1}>{t("webb.sprak.rubrik")}</Rubrik>
          </div>
          <p className="mt-6 max-w-[680px] text-[16px] leading-[26px]" style={{ color: FARG.graphite }}>
            {t("webb.sprak.ingress")}
          </p>
        </div>
      </section>

      {/* ---- Den avgränsning som styr allt annat ---- */}
      <Sektion etikett={t("webb.sprak.princip.etikett")} rubrik={t("webb.sprak.princip.rubrik")}>
        <div className="grid gap-8 md:grid-cols-2">
          <Block rubrik={t("webb.sprak.granssnitt.rubrik")} beteckning={t("webb.sprak.granssnitt.beteckning")}>
            <p className="text-[14px] leading-[22px]" style={{ color: FARG.graphite }}>
              {t("webb.sprak.granssnitt.text")}
            </p>
          </Block>
          <Block rubrik={t("webb.sprak.metodik.rubrik")} beteckning={t("webb.sprak.metodik.beteckning")}>
            <p className="text-[14px] leading-[22px]" style={{ color: FARG.graphite }}>
              {t("webb.sprak.metodik.text")}
            </p>
          </Block>
        </div>

        <p className="mt-8 max-w-[760px] border-l-2 pl-6 text-[15px] leading-[24px]"
           style={{ borderColor: FARG.lightSteel, color: FARG.steel }}>
          {t("webb.sprak.invariant")}
        </p>
      </Sektion>

      {/* ---- Redovisningen ---- */}
      <Sektion etikett={t("webb.sprak.tackning.etikett")} rubrik={t("webb.sprak.tackning.rubrik")}>
        <Tabell
          kolumner={[t("webb.sprak.kolumn.sprak"), t("webb.sprak.kolumn.granssnitt"), t("webb.sprak.kolumn.granskat")]}
          rader={SPRAKEN.map((s) => [
            `${s.namn} — ${s.egetNamn}`,
            `${Math.round((tackning(s.kod) as number) * 100)} %`,
            s.granskat ? t("webb.sprak.granskat.ja") : t("webb.sprak.granskat.nej"),
          ])}
        />
        <p className="mt-6 max-w-[680px] text-[13px] leading-[20px]" style={{ color: FARG.steel }}>
          {t("webb.sprak.matt")}
        </p>
        {/* Att engelska är källspråket betyder inte att den engelska
            metodiktexten är fackgranskad. Den är översatt från svenska,
            och att inte säga det hade varit att göra precis det sidan
            varnar för på de andra nio språken. */}
        <p className="mt-4 max-w-[680px] border-l-2 pl-6 text-[13px] leading-[20px]"
           style={{ borderColor: FARG.varning, color: FARG.graphite }}>
          {t("webb.sprak.kallsprak")}
        </p>
      </Sektion>

      {/* ---- Beviset ---- */}
      <Sektion etikett={t("webb.sprak.bevis.etikett")} rubrik={t("webb.sprak.bevis.rubrik")}>
        <p className="mb-8 max-w-[680px] text-[15px] leading-[24px]" style={{ color: FARG.steel }}>
          {t("webb.sprak.bevis.ingress")}
        </p>

        {/* Rutnät, inte flexradbrytning. Tio språk bryts av flex till nio
            plus ett ensamt, och den ensamma knappen läser sig som en
            eftertanke i stället för som ett språk bland tio. Fem kolonner
            och två gör tio jämnt i båda riktningarna. */}
        <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {SPRAKEN.map((s) => (
            <button
              key={s.kod}
              type="button"
              onClick={() => setValt(s.kod)}
              aria-pressed={s.kod === valt}
              className="border px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em]"
              style={{
                borderColor: s.kod === valt ? FARG.blue : FARG.lightSteel,
                color: s.kod === valt ? FARG.white : FARG.steel,
                background: s.kod === valt ? FARG.blue : FARG.white,
              }}
            >
              {s.egetNamn}
            </button>
          ))}
        </div>

        <ul className="grid gap-px" style={{ background: FARG.lightSteel }}>
          {PROV.map((nyckel) => (
            <li key={nyckel} className="bg-white p-6">
              <div className="font-mono text-[11px]" style={{ color: FARG.steel }}>
                {nyckel}
              </div>
              <div className="mt-2 text-[15px] leading-[24px]" lang={valt} style={{ color: FARG.graphite }}>
                {prov(nyckel)}
              </div>
            </li>
          ))}
        </ul>

        {/* Varningen står under provet, inte över det. Den som just läst
            fem meningar på sitt eget språk ska mötas av vad de INTE
            garanterar — inte varnas i förväg och sedan lugnas av att
            texten ser bra ut. Varningen själv står på PROVSPRÅKET,
            precis som i drift: den riktar sig till den som skulle
            arbeta på det språket. */}
        {varning && (
          <div className="mt-8 border-l-2 p-6" style={{ borderColor: FARG.varning, background: FARG.white }}>
            <Etikett>{t("webb.sprak.ej_granskad")} — {post.egetNamn}</Etikett>
            <p className="mt-2 max-w-[760px] text-[14px] leading-[22px]" lang={valt} style={{ color: FARG.graphite }}>
              {varning}
            </p>
          </div>
        )}
        {!varning && (
          <div className="mt-8 border-l-2 p-6" style={{ borderColor: FARG.blue, background: FARG.white }}>
            <Etikett>{t("webb.sprak.granskad")} — {post.egetNamn}</Etikett>
            <p className="mt-2 max-w-[760px] text-[14px] leading-[22px]" style={{ color: FARG.graphite }}>
              {t("webb.sprak.granskad.text", { sprak: post.egetNamn })}
            </p>
          </div>
        )}
      </Sektion>

      {/* ---- Hur språket väljs ---- */}
      <Sektion etikett={t("webb.sprak.val.etikett")} rubrik={t("webb.sprak.val.rubrik")}>
        <ol className="max-w-[680px]">
          {[1, 2, 3, 4].map((steg, i) => (
            <li key={steg} className="flex gap-6 border-t py-6" style={{ borderColor: FARG.lightSteel }}>
              <span className="font-mono text-[13px] leading-[20px]" style={{ color: FARG.steel }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <div className="text-[15px] font-semibold" style={{ color: FARG.graphite }}>
                  {t(`webb.sprak.val.s${steg}.rubrik`)}
                </div>
                <div className="mt-2 text-[14px] leading-[20px]" style={{ color: FARG.steel }}>
                  {t(`webb.sprak.val.s${steg}.text`)}
                </div>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-8 max-w-[680px] text-[14px] leading-[22px]" style={{ color: FARG.steel }}>
          {t("webb.sprak.val.notering")}
        </p>
      </Sektion>
    </Ram>
  );
}
