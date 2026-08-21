// ALVA-REP-0100 · Analysvy.
//
// En instrumentpanel, inte en rapport. Skillnaden är att en
// instrumentpanel svarar på "är något fel" innan den svarar på "hur går
// det" — och att ett värde som saknar underlag visas som saknat i
// stället för som noll.
//
// Diagrammen är staplar av ren CSS, ingen graf-bibliotek och ingen
// animation. Ett stapeldiagram med tio värden behöver inte 90 kB
// JavaScript, och ett värde som rör sig när sidan laddas är svårare att
// läsa av än ett som står stilla.

import { useEffect, useMemo, useState } from "react";
import { Block, Etikett, FARG, Rubrik, Statusmärke, Tabell } from "@/alva/komponenter";
import { FASER } from "@/alva/system";
import { hamtaOrganisationsstatistik, plattformAktiv } from "@/felsokning/plattform";
import { useFelsokning } from "@/felsokning/store";
import { oversikt } from "../../../../services/gemensam/statistik.mjs";
import { Ram } from "./Ram";

interface Nyckeltal {
  etikett: string;
  varde: number | null;
  enhet?: string;
  underlag: string;
  /** Åt vilket håll är bättre? Styr inget färgval — bara läsningen. */
  riktning: "hogre" | "lagre";
  tolkning: string;
}

function Tal({ tal }: { tal: Nyckeltal }) {
  const saknas = tal.varde === null;
  return (
    <div className="bg-white p-6">
      <Etikett>{tal.etikett}</Etikett>
      <div className="mt-4 flex items-baseline gap-2">
        {saknas ? (
          <Statusmärke status="not_applicable" />
        ) : (
          <>
            <span
              className="text-[40px] font-semibold leading-none tabular-nums"
              style={{ color: FARG.graphite }}
            >
              {tal.varde}
            </span>
            {tal.enhet && (
              <span className="text-[16px]" style={{ color: FARG.steel }}>
                {tal.enhet}
              </span>
            )}
          </>
        )}
      </div>
      <div className="mt-2 text-[11px] uppercase tracking-[0.08em]" style={{ color: FARG.steel }}>
        {tal.riktning === "hogre" ? "↑ better" : "↓ better"} · {tal.underlag}
      </div>
      <p className="mt-4 border-t pt-4 text-[12px] leading-[18px]" style={{ borderColor: FARG.lightSteel, color: FARG.steel }}>
        {tal.tolkning}
      </p>
    </div>
  );
}

/** Vågrätt stapeldiagram. Etikett, stapel, tal — i den ordningen. */
function Staplar({ rader }: { rader: { etikett: string; antal: number; extra?: string }[] }) {
  const hogsta = Math.max(1, ...rader.map((r) => r.antal));
  return (
    <div>
      {rader.map((r) => (
        <div key={r.etikett} className="border-t py-2" style={{ borderColor: FARG.lightSteel }}>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-[13px]" style={{ color: FARG.graphite }}>
              {r.etikett}
            </span>
            <span className="font-mono text-[12px] tabular-nums" style={{ color: FARG.steel }}>
              {r.extra ?? r.antal}
            </span>
          </div>
          <div className="mt-2 h-2" style={{ background: FARG.background }}>
            <div className="h-2" style={{ width: `${(r.antal / hogsta) * 100}%`, background: FARG.blue }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Analys() {
  const arenden = useFelsokning((s) => s.arenden);
  const [fran, setFran] = useState<Record<string, unknown> | null>(null);
  const [hamtningsfel, setHamtningsfel] = useState("");
  const skarpt = plattformAktiv();

  // I inloggat läge äger servern siffrorna — samma modul, samma resultat.
  // Utan inloggning räknas de lokalt så vyn går att visa i demo.
  //
  // Anropet gick tidigare med ett bart fetch mot en relativ väg, utan
  // Authorization och utan plattformens bas. Det kunde alltså aldrig
  // lyckas: vyn föll tyst tillbaka på den HÄR ENHETENS ärenden och visade
  // dem som organisationens analys. Nu går det genom plattformslagret, och
  // ett misslyckande syns i stället för att bli lokal data i förklädnad.
  useEffect(() => {
    if (!skarpt) return;
    let avbruten = false;
    hamtaOrganisationsstatistik()
      .then((d) => {
        if (!avbruten) setFran(d);
      })
      .catch((orsak) => {
        if (!avbruten) setHamtningsfel(orsak instanceof Error ? orsak.message : String(orsak));
      });
    return () => {
      avbruten = true;
    };
  }, [skarpt]);

  const data = useMemo(
    () => fran ?? (oversikt(Object.values(arenden)) as Record<string, never>),
    [fran, arenden],
  ) as ReturnType<typeof oversikt>;

  const tal: Nyckeltal[] = [
    {
      etikett: "Verification rate",
      varde: data.verifiering.andel,
      enhet: "%",
      underlag: `${data.verifiering.fastställda} of ${data.verifiering.antal} closures`,
      riktning: "hogre",
      tolkning:
        "Share of closures with an established cause. Anything below 100% is healthy — an organization that never writes “the cause could not be established” either only sees easy faults, or is not writing the truth.",
    },
    {
      etikett: "Reproduction rate",
      varde: data.reproduktion.andel,
      enhet: "%",
      underlag: `${data.reproduktion.ja} of ${data.reproduktion.antal} symptoms`,
      riktning: "hogre",
      tolkning:
        "Share of symptoms reproduced. A low figure predicts returning vehicles: you cannot fix what you have not seen.",
    },
    {
      etikett: "Rework",
      varde: data.omarbetning.andel,
      enhet: "%",
      underlag: `${data.omarbetning.antal} cases within 90 days`,
      riktning: "lagre",
      tolkning:
        "The same vehicle back with the same cause category. The most expensive fault in a workshop, and the one nobody measures — it requires linking two cases.",
    },
  ];

  return (
    <Ram portal>
      <div className="mx-auto max-w-[1040px] px-6 py-12">
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <Etikett>Operational metrics</Etikett>
            <div className="mt-2">
              <Rubrik niva={1}>Analysis</Rubrik>
            </div>
          </div>
          <span className="font-mono text-[11px]" style={{ color: FARG.steel }}>
            ALVA-REP-0100 · {data.antal.avslutade}/{data.antal.totalt} closed
          </span>
        </div>

        {hamtningsfel && (
          <p
            className="mb-6 border p-4 text-[13px] leading-[20px]"
            style={{ borderColor: FARG.lightSteel, background: FARG.white, color: FARG.varning }}
          >
            The organization&rsquo;s figures could not be retrieved ({hamtningsfel}). The numbers below are
            calculated from the cases on this device only — they are not the organization&rsquo;s.
          </p>
        )}

        <div className="mb-6 grid gap-px md:grid-cols-3" style={{ background: FARG.lightSteel, border: `1px solid ${FARG.lightSteel}` }}>
          {tal.map((t) => (
            <Tal key={t.etikett} tal={t} />
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Block rubrik="Evidence profile" beteckning="ALVA-SPEC-004">
            <p className="mb-2 text-[12px] leading-[18px]" style={{ color: FARG.steel }}>
              Strongest evidence grade per case. A measurement counts as E4 only with a traceable instrument.
            </p>
            <Staplar
              rader={Object.entries(data.evidens as Record<string, number>)
                .filter(([, n]) => n > 0)
                .map(([niva, antal]) => ({ etikett: niva, antal }))}
            />
          </Block>

          <Block rubrik="Phase distribution" beteckning="ALVA-ES-0001">
            <p className="mb-2 text-[12px] leading-[18px]" style={{ color: FARG.steel }}>
              Where the work sits, in ALVA terms. A weight towards Localization means faults are found but not established.
            </p>
            <Staplar
              rader={FASER.map((f) => ({
                etikett: f.namn,
                antal: data.faser[f.id].antal,
                extra: data.faser[f.id].andel === null ? "—" : `${data.faser[f.id].andel} %`,
              }))}
            />
          </Block>
        </div>

        <Block rubrik="Procedure friction" beteckning="ALVA-RULE-120">
          <p className="mb-4 text-[13px] leading-[20px]" style={{ color: FARG.steel }}>
            Checks most often skipped with a documented exception. A step high in this list is either badly
            worded or requires equipment the workshop does not have. Both are fixable — but only if you know
            which step it is.
          </p>
          {data.undantag.length === 0 ? (
            <Statusmärke status="not_applicable" />
          ) : (
            <div className="overflow-x-auto">
              <Tabell
                kolumner={["Step", "Check", "Phase", "Exempted", "Rate"]}
                rader={data.undantag.map((u) => [
                  <span key="s" className="font-mono text-[11px]">
                    {u.steg}
                  </span>,
                  u.text,
                  u.fas,
                  <span key="a" className="tabular-nums">
                    {u.undantag}/{u.utforda}
                  </span>,
                  <span key="p" className="tabular-nums">
                    {u.andel} %
                  </span>,
                ])}
              />
            </div>
          )}
        </Block>

        <Block rubrik="Fault categories" beteckning="ALVA-DOC-002">
          {data.orsaker.length === 0 ? (
            <Statusmärke status="not_applicable" />
          ) : (
            <Staplar rader={data.orsaker.map((o) => ({ etikett: o.kategori, antal: o.antal }))} />
          )}
        </Block>

        {data.omarbetning.fall.length > 0 && (
          <Block rubrik="Rework detail" beteckning="ALVA-REP-0101">
            <div className="overflow-x-auto">
              <Tabell
                kolumner={["Object", "Shared cause", "Interval"]}
                rader={data.omarbetning.fall.map((f) => [
                  <span key="o" className="font-mono text-[11px]">
                    {f.identifierare}
                  </span>,
                  f.kategorier.join(" · "),
                  <span key="d" className="tabular-nums">
                    {f.dagar} d
                  </span>,
                ])}
              />
            </div>
          </Block>
        )}
      </div>
    </Ram>
  );
}
