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

import { useState } from "react";
import { SPRAK, metodikvarning, oversattare, tackning } from "../../../../services/gemensam/sprak/index.mjs";
import { Block, Etikett, FARG, Rubrik, Tabell } from "@/alva/komponenter";
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
  const [valt, setValt] = useState("de");
  const t = oversattare(valt) as (nyckel: string) => string;
  const post = SPRAKEN.find((s) => s.kod === valt)!;
  const varning = metodikvarning(valt) as string | null;

  return (
    <Ram>
      <section className="border-b" style={{ borderColor: FARG.lightSteel, background: FARG.white }}>
        <div className="mx-auto max-w-[1040px] px-6 py-16">
          <Etikett>Localization</Etikett>
          <div className="mt-2">
            <Rubrik niva={1}>Languages</Rubrik>
          </div>
          <p className="mt-6 max-w-[680px] text-[16px] leading-[26px]" style={{ color: FARG.graphite }}>
            English is the default and the source language. Nine translations follow. What the platform does
            not do is claim that a translated interface means a translated method.
          </p>
        </div>
      </section>

      {/* ---- Den avgränsning som styr allt annat ---- */}
      <Sektion etikett="Principle" rubrik="Two kinds of text">
        <div className="grid gap-8 md:grid-cols-2">
          <Block rubrik="Interface text" beteckning="Falls back silently">
            <p className="text-[14px] leading-[22px]" style={{ color: FARG.graphite }}>
              Labels, buttons, statuses. Finite, rarely changed. An English string reaching a German user is
              an irritation, not a hazard — so a missing translation falls back to English without comment.
            </p>
          </Block>
          <Block rubrik="Procedure text" beteckning="Never falls back silently">
            <p className="text-[14px] leading-[22px]" style={{ color: FARG.graphite }}>
              Instructions for work on a vehicle. Here an unreviewed translation is worse than a foreign
              language one — because English <em>looks</em> foreign, while a bad translation looks like an
              instruction. It is shown in English and marked, with the language named.
            </p>
          </Block>
        </div>

        <p className="mt-8 max-w-[760px] border-l-2 pl-6 text-[15px] leading-[24px]"
           style={{ borderColor: FARG.lightSteel, color: FARG.steel }}>
          The method itself is never translated. Phase names and status words are ALVA&rsquo;s structure and
          read identically in every country, so an auditor can read a Romanian and a German case record
          without knowing which language the workshop works in.
        </p>
      </Sektion>

      {/* ---- Redovisningen ---- */}
      <Sektion etikett="Coverage" rubrik="What is translated, and what is reviewed">
        <Tabell
          kolumner={["Language", "Interface", "Method reviewed by a specialist"]}
          rader={SPRAKEN.map((s) => [
            `${s.namn} — ${s.egetNamn}`,
            `${Math.round((tackning(s.kod) as number) * 100)} %`,
            s.granskat ? "Yes" : "No — procedure text shown in English",
          ])}
        />
        <p className="mt-6 max-w-[680px] text-[13px] leading-[20px]" style={{ color: FARG.steel }}>
          Interface coverage is measured, not estimated: a test fails the build if any key is missing from
          any language. Review status is a statement about people, not about files, and is set by hand.
        </p>
        {/* Att engelska är källspråket betyder inte att den engelska
            metodiktexten är fackgranskad. Den är översatt från svenska,
            och att inte säga det hade varit att göra precis det sidan
            varnar för på de andra nio språken. */}
        <p className="mt-4 max-w-[680px] border-l-2 pl-6 text-[13px] leading-[20px]"
           style={{ borderColor: FARG.varning, color: FARG.graphite }}>
          The English procedure text is a translation of the Swedish source and has not yet been read by a
          specialist working in the trade. It is held to the same standard as the other nine languages, and
          the same statement is made about it here rather than quietly excepted because it is the source.
        </p>
      </Sektion>

      {/* ---- Beviset ---- */}
      <Sektion etikett="Verification" rubrik="The strings that stop a case">
        <p className="mb-8 max-w-[680px] text-[15px] leading-[24px]" style={{ color: FARG.steel }}>
          These are the sentences that refuse to let a technician close a case. A refusal nobody understands
          is a refusal with no way through — so they are the right strings to judge a translation by.
        </p>

        {/* Rutnät, inte flexradbrytning. Tio språk bryts av flex till nio
            plus ett ensamt, och den ensamma knappen läser sig som en
            eftertanke i stället för som ett språk bland tio. Fem kolumner
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
              <div className="mt-2 text-[15px] leading-[24px]" style={{ color: FARG.graphite }}>
                {t(nyckel)}
              </div>
            </li>
          ))}
        </ul>

        {/* Varningen står under provet, inte över det. Den som just läst
            fem meningar på sitt eget språk ska mötas av vad de INTE
            garanterar — inte varnas i förväg och sedan lugnas av att
            texten ser bra ut. */}
        {varning && (
          <div className="mt-8 border-l-2 p-6" style={{ borderColor: FARG.varning, background: FARG.white }}>
            <Etikett>Not reviewed — {post.egetNamn}</Etikett>
            <p className="mt-2 max-w-[760px] text-[14px] leading-[22px]" style={{ color: FARG.graphite }}>
              {varning}
            </p>
          </div>
        )}
        {!varning && (
          <div className="mt-8 border-l-2 p-6" style={{ borderColor: FARG.blue, background: FARG.white }}>
            <Etikett>Reviewed — {post.egetNamn}</Etikett>
            <p className="mt-2 max-w-[760px] text-[14px] leading-[22px]" style={{ color: FARG.graphite }}>
              Procedure text in {post.egetNamn} has been read by a specialist working in the trade. Steps and
              checks are shown in {post.egetNamn} throughout.
            </p>
          </div>
        )}
      </Sektion>

      {/* ---- Hur språket väljs ---- */}
      <Sektion etikett="Operation" rubrik="How the language is chosen">
        <ol className="max-w-[680px]">
          {[
            ["User preference", "What the individual has selected."],
            ["Organization setting", "The workshop's documentation language."],
            ["Browser language", "The first language the platform recognises."],
            ["English", "The default, and the source."],
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
        <p className="mt-8 max-w-[680px] text-[14px] leading-[22px]" style={{ color: FARG.steel }}>
          The organization ranks above the browser deliberately. A workshop in Germany with a Polish
          technician needs one documentation language — the case record must not change language depending on
          who happened to write the line.
        </p>
      </Sektion>
    </Ram>
  );
}
