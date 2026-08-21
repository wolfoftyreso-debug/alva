// Gemensam Live Share-vy: används både av den interna förhandsvisningen
// (läser ur lokala storen) och den publika delningssidan (läser via
// delningskod genom backend). Skrivskyddad; interna poster (kategoribyten,
// hypoteser) ingår aldrig i underlaget som når hit externt, och filtreras
// bort även lokalt.
//
// ---- Mottagarens språk (ALVA-SPEC-060) ----------------------------------
//
// Mottagaren av en delning — kunden, en försäkringshandläggare, en
// flottansvarig — är den enda läsare som aldrig valt verktyget. Vyn
// talar därför MOTTAGARENS språk: allt härlett (sammanfattningen,
// etiketterna, beskedsflödet) hämtas ur språkkatalogen, och valet följer
// besökarens eget val → webbläsaren → engelska, samma kedja som den
// publika webben. Tidslinjens poster är teknikerns egna ord och visas
// ordagrant på verkstadens arbetsspråk — en översatt logg är inte längre
// en logg, och det säger vyn öppet i stället för att låtsas.

import { useState } from "react";
import type { Arende } from "./domain";
import { handelseRubrik } from "./domain";
import { arAvslutat, arendeidentitet, brief, foton, tidsfordelningsRader, videor } from "./projektioner";
import { metodikForArende } from "./store";
import { Bild, Klipp } from "./Bilagevisning";
import { sammanfatta } from "../../../services/gemensam/sammanfattning.mjs";
import { SPRAK, oversattare } from "../../../services/gemensam/sprak/index.mjs";
import { sattWebbSprak, useWebbSprak } from "../alva/webbsprak";
import { tidDatum, tidKlockslag } from "./format";
import { FelsokningSkal, Panel, StorKnapp } from "./ui";
import { IkonCheck, IkonKlocka, IkonUppdatera } from "./ikoner";

type Oversatt = (nyckel: string, variabler?: Record<string, string | number>) => string;

// Kundens svar på åtgärdsförslaget — den enda skrivande åtgärden i hela
// delningsvyn. Beskedet kan lämnas en gång och kan inte ändras här.
function BeslutsKnappar({
  t,
  vidBeslut,
}: {
  t: Oversatt;
  vidBeslut: (beslut: "godkant" | "avbojt", kommentar: string) => Promise<string | null>;
}) {
  const [val, setVal] = useState<"" | "godkant" | "avbojt">("");
  const [kommentar, setKommentar] = useState("");
  const [skickar, setSkickar] = useState(false);
  const [fel, setFel] = useState("");

  return (
    <div className="mt-2 border-t border-[#D7DCE2] pt-2 print:hidden">
      <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#4D5662]">
        {t("delning.beslut.rubrik")}
      </p>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <StorKnapp variant={val === "godkant" ? "primar" : "sekundar"} onClick={() => setVal("godkant")}>
          {t("delning.beslut.godkann")}
        </StorKnapp>
        <StorKnapp variant={val === "avbojt" ? "fara" : "sekundar"} onClick={() => setVal("avbojt")}>
          {t("delning.beslut.avboj")}
        </StorKnapp>
      </div>
      {val && (
        <>
          <label className="mb-2 block">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-[#4D5662]">
              {val === "avbojt" ? t("delning.beslut.motivering") : t("delning.beslut.kommentar")}
            </span>
            <input
              value={kommentar}
              maxLength={500}
              onChange={(e) => setKommentar(e.target.value)}
              className="w-full border border-[#D7DCE2] bg-white px-2 py-2 text-[13px] focus:border-[#005CA9] focus:outline-none"
            />
          </label>
          {fel && <p className="mb-2 text-[12px] font-semibold text-[#8B1A1A]">{fel}</p>}
          <StorKnapp
            disabled={skickar}
            onClick={async () => {
              setSkickar(true);
              setFel("");
              const felmeddelande = await vidBeslut(val, kommentar);
              if (felmeddelande) setFel(felmeddelande);
              setSkickar(false);
            }}
          >
            {skickar ? t("delning.beslut.skickar") : t("delning.beslut.skicka")}
          </StorKnapp>
          <p className="mt-2 text-[11px] text-[#4D5662]">{t("delning.beslut.info")}</p>
        </>
      )}
    </div>
  );
}

function IdentitetsPanel({ arende, avslutat, t }: { arende: Arende; avslutat: boolean; t: Oversatt }) {
  const idn = arendeidentitet(arende);
  const falt: [string, string | undefined][] = [
    [t("delning.identitet.arbetsorder"), idn.arbetsorder],
    [t("delning.identitet.claim"), idn.claim],
    [t("delning.identitet.skadenummer"), idn.skadenummer],
    [t("delning.identitet.regnr"), idn.identifierare],
    [t("delning.identitet.vin"), idn.vin],
    [t("delning.identitet.miltal"), idn.miltal],
    [t("delning.identitet.ansvarig"), idn.ansvarig],
    [t("delning.identitet.status"), avslutat ? t("delning.status.avslutat") : t("delning.status.pagaende")],
  ];
  return (
    <div className="sticky top-12 z-10 mb-4 border border-[#D7DCE2] bg-[#F6F7F8] px-4 py-2 print:static">
      {idn.beskrivning && <p className="text-[13px] font-semibold">{idn.beskrivning}</p>}
      <p className="flex flex-wrap gap-x-4 gap-y-0.5 text-[12px]">
        {falt
          .filter(([, varde]) => varde)
          .map(([etikett, varde]) => (
            <span key={etikett} className="whitespace-nowrap">
              <span className="text-[#4D5662]">{etikett}:</span> <span className="font-medium">{varde}</span>
            </span>
          ))}
      </p>
    </div>
  );
}

export function DelatArendeVy({
  arende,
  nu,
  notis,
  redanFiltrerad = false,
  vidBeslut,
  delningskod,
}: {
  arende: Arende;
  nu: string;
  // Antingen en katalognyckel (delning.notis.*) som översätts till
  // mottagarens språk, eller fri text (interna förhandsvisningen).
  notis: string;
  // Satt i den publika vyn: bilagor hämtas då via delningens egen väg,
  // som filtrerar på samma behörighetsnivå som händelserna.
  delningskod?: string;
  // Satt endast på den publika kundlänken: kunden kan svara på ett
  // åtgärdsförslag. Utan den är vyn helt skrivskyddad.
  vidBeslut?: (beslut: "godkant" | "avbojt", kommentar: string) => Promise<string | null>;
  // Sant när servern redan filtrerat per behörighetsnivå (publik delning) —
  // då renderas händelserna som de kom, inklusive t.ex. hypoteser på
  // partner-/internnivå.
  redanFiltrerad?: boolean;
}) {
  const sprak = useWebbSprak();
  const t = oversattare(sprak) as Oversatt;
  const metodik = metodikForArende(arende);
  const b = brief(arende, metodik, nu);
  const avslutat = arAvslutat(arende);
  const bilder = foton(arende);
  const klipp = videor(arende);
  // Åtgärdsförslaget är avsett för kunden — det visas alltid överst i
  // delningsvyn, tillsammans med det besked som registrerats.
  const forslag = arende.handelser.filter((p) => p.handelse.typ === "atgardsforslag");
  const beslut = [...arende.handelser].reverse().find((p) => p.handelse.typ === "kundbeslut");
  const matvarden = arende.handelser.filter((p) => p.handelse.typ === "matvarde");
  const kundposter = redanFiltrerad
    ? arende.handelser
    : arende.handelser.filter((p) => !["kategori_byte", "hypotes", "ai_svar", "ansvarig_satt", "arbetsorder_skannad"].includes(p.handelse.typ));
  const pagaende = b.rekommenderatNastaSteg[0];

  return (
    <FelsokningSkal
      rubrik={b.objekt?.beskrivning ?? t("delning.rubrik.fall")}
      hoger={
        <span
          className={`px-4 py-2 text-[12px] font-semibold uppercase ${
            avslutat ? "bg-[#4D5662] text-white" : "bg-[#005CA9] text-white"
          }`}
        >
          {avslutat ? t("delning.status.avslutat") : t("delning.status.pagaende")}
        </span>
      }
    >
      {/* Mottagarens språkval: besökarens eget val → webbläsaren →
          engelska, sparat lokalt — samma kedja som den publika webben. */}
      <div className="mb-2 flex justify-end print:hidden">
        <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#4D5662]">
          {t("sprak.valj")}
          <select
            value={sprak}
            onChange={(e) => sattWebbSprak(e.target.value)}
            className="border border-[#D7DCE2] bg-white px-2 py-2 text-[12px] font-normal normal-case tracking-normal text-[#1B1E22]"
          >
            {SPRAK.map((s) => (
              <option key={s.kod} value={s.kod}>
                {s.egetNamn}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Ärendeidentiteten: låst överst — mottagaren (kund, försäkrings-
          handläggare, kollega) ska aldrig tveka om vilket fordon och
          ärende vyn avser. Härledd ur det nivåfiltrerade underlaget. */}
      <IdentitetsPanel arende={arende} avslutat={avslutat} t={t} />

      {/* ALVA-PROC-0030 · Sammanfattningen först. Mottagaren är oftast
          inte tekniker: kunden, en försäkringshandläggare, en
          flottansvarig. De ska få bilden på fem sekunder och sedan kunna
          gå djupare — inte tvärtom. Texten härleds ur det nivåfiltrerade
          underlaget, så den kan aldrig avslöja något som nivån döljer. */}
      <Panel rubrik={t("delning.rubrik.sammanfattning")}>
        <p className="text-[15px] leading-[24px] text-[#1B1E22]">{sammanfatta(arende, sprak).text}</p>
      </Panel>

      {/* ALVA-RULE-200 · Teknikerns varför. Den enda rad en
          försäkringsbedömare egentligen behöver, kunddelbar med avsikt. */}
      {(() => {
        const post = [...arende.handelser].reverse().find((p) => p.handelse.typ === "slutsats");
        if (!post || post.handelse.typ !== "slutsats") return null;
        const h = post.handelse;
        const rader: [string, string][] = [
          [
            h.orsakFastställd === false ? t("delning.slutsats.ej_faststalld") : t("delning.slutsats.motivering"),
            h.motivering,
          ],
          [t("delning.slutsats.uteslutet"), h.uteslutet],
          ...(h.atgardsval ? ([[t("delning.slutsats.atgardsval"), h.atgardsval]] as [string, string][]) : []),
          [t("delning.slutsats.kvarstaende"), h.kvarstaende],
        ];
        return (
          <Panel rubrik={t("delning.rubrik.slutsats")}>
            <dl className="text-[14px] leading-[22px]">
              {rader.map(([etikett, text]) => (
                <div key={etikett} className="border-t border-[#D7DCE2] py-2 first:border-t-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4D5662]">{etikett}</dt>
                  <dd className="mt-2 text-[#1B1E22]">{text}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        );
      })()}

      <p className="mb-4 border border-[#D7DCE2] bg-[#F6F7F8] p-4 text-[12px] text-[#4D5662] print:hidden">
        {notis.startsWith("delning.notis.") ? t(notis) : notis}
      </p>

      {b.felbeskrivning && (
        <Panel rubrik={t("delning.rubrik.felbeskrivning")}>
          <p className="text-[14px]">”{b.felbeskrivning}”</p>
        </Panel>
      )}

      {forslag.length > 0 && (
        <Panel rubrik={t("delning.rubrik.forslag")}>
          {forslag.map((p) => {
            const h = p.handelse;
            if (h.typ !== "atgardsforslag") return null;
            return (
              <div key={p.id} className="mb-2 last:mb-0">
                <p className="text-[14px]">{h.beskrivning}</p>
                {h.uppskattadKostnad && (
                  <p className="text-[13px] text-[#4D5662]">
                    {t("delning.forslag.kostnad", { kostnad: h.uppskattadKostnad })}
                  </p>
                )}
              </div>
            );
          })}
          {beslut?.handelse.typ === "kundbeslut" ? (
            <p className="mt-2 border-t border-[#D7DCE2] pt-2 text-[13px] font-semibold">
              {t("delning.forslag.beslut", { beslut: t(`delning.beslut.${beslut.handelse.beslut}`) })}{" "}
              <span className="font-normal text-[#4D5662]">
                {t("delning.forslag.via", { kanal: beslut.handelse.kanal })}
              </span>
            </p>
          ) : vidBeslut ? (
            <BeslutsKnappar t={t} vidBeslut={vidBeslut} />
          ) : (
            <p className="mt-2 border-t border-[#D7DCE2] pt-2 text-[12px] text-[#4D5662]">
              {t("delning.forslag.vantar")}
            </p>
          )}
        </Panel>
      )}

      <Panel rubrik={t("delning.rubrik.laget")}>
        {b.utfordaKontroller.map((k, i) => (
          <p key={`u${i}`} className="py-0 text-[14px]"><span className="text-[#005CA9]"><IkonCheck /></span> {k.text}</p>
        ))}
        {!avslutat && pagaende && <p className="py-0 text-[14px] text-[#005CA9]"><IkonUppdatera /> {pagaende}</p>}
        {b.ejKontrollerat.slice(avslutat ? 0 : 1).map((e, i) => (
          <p key={`e${i}`} className="py-0 text-[14px] text-[#4D5662]"><IkonKlocka /> {e}</p>
        ))}
      </Panel>

      {klipp.length > 0 && (
        <Panel rubrik={t("delning.rubrik.video")}>
          {klipp.map((v, i) => (
            <figure key={i} className="mb-2">
              <Klipp bilaga={v.bilaga} delningskod={delningskod} className="w-full border border-[#D7DCE2]" />
              <figcaption className="mt-2 text-[11px] text-[#4D5662]">{v.beskrivning}</figcaption>
            </figure>
          ))}
        </Panel>
      )}
      {bilder.length > 0 && (
        <Panel rubrik={t("delning.rubrik.bilder")}>
          <div className="grid grid-cols-2 gap-2">
            {bilder.map((bild, i) => (
              <figure key={i}>
                <Bild bilaga={bild.bilaga} alt={bild.beskrivning} delningskod={delningskod} className="border border-[#D7DCE2]" />
                <figcaption className="mt-2 text-[11px] text-[#4D5662]">{bild.beskrivning}</figcaption>
              </figure>
            ))}
          </div>
        </Panel>
      )}

      {matvarden.length > 0 && (
        <Panel rubrik={t("delning.rubrik.matningar")}>
          <table className="w-full text-[14px]">
            <tbody>
              {matvarden.map((p) => {
                const h = p.handelse;
                if (h.typ !== "matvarde") return null;
                return (
                  <tr key={p.id} className="border-b border-[#D7DCE2] last:border-0">
                    <td className="py-2 pr-4 text-[#1B1E22]">{h.beskrivning}</td>
                    <td className="py-2 font-semibold">
                      {h.varde}
                      {h.enhet ? ` ${h.enhet}` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}

      <Panel rubrik={t("delning.rubrik.tidslinje")}>
        {/* Teknikerns ord är evidens, inte gränssnittstext — de visas
            ordagrant, och vyn säger det i stället för att låtsas. */}
        {sprak !== "en" && (
          <p className="mb-2 text-[11px] text-[#4D5662]">{t("delning.tidslinje.arbetssprak")}</p>
        )}
        {kundposter.map((post) => (
          <p key={post.id} className="py-0 text-[13px]">
            <span className="font-mono font-semibold text-[#005CA9]">{tidKlockslag(post.tidpunkt)}</span>{" "}
            {handelseRubrik(post)}
          </p>
        ))}
      </Panel>

      {!avslutat && pagaende && (
        <Panel rubrik={t("delning.rubrik.nasta")}>
          <p className="text-[14px]">{pagaende}</p>
        </Panel>
      )}

      <Panel rubrik={t("delning.rubrik.arbetstid")}>
        <p className="text-[17px] font-semibold">{b.totalArbetstid}</p>
        {tidsfordelningsRader(arende, nu).map((r) => (
          <p key={r.label} className="text-[#1B1E22]">
            {r.label}: {r.tid}
          </p>
        ))}
      </Panel>

      <p className="text-center text-[11px] text-[#4D5662]">
        {t("delning.fot", { nummer: arende.nummer, datum: tidDatum(arende.skapad) })}
      </p>
    </FelsokningSkal>
  );
}
