// Kontoansökan.
//
// Ingen självbetjäning, ingen kortbetalning, ingen provperiod. Ansökan
// granskas manuellt och det står på sidan — inte som en ursäkt utan som
// en uppgift. Ett system som avgör vad som får kallas verifierat i en
// garantitvist kan inte dela ut konton automatiskt.

import { type FormEvent, useState } from "react";
import { Demonstration, Block, Etikett, FARG, Knapp, Rubrik, Statusmärke } from "@/alva/komponenter";
import { useWebbSprak } from "@/alva/webbsprak";
import { oversattare } from "../../../../services/gemensam/sprak/index.mjs";
import { Ram } from "./Ram";

interface Falt {
  namn: string;
  nyckel: string;
  typ?: string;
  kravs?: boolean;
}

const FALT: Falt[] = [
  { namn: "foretag", nyckel: "webb.falt.foretag", kravs: true },
  { namn: "orgnummer", nyckel: "webb.falt.orgnummer", kravs: true },
  { namn: "kontakt", nyckel: "webb.falt.kontakt", kravs: true },
  { namn: "epost", nyckel: "webb.falt.epost", typ: "email", kravs: true },
  { namn: "telefon", nyckel: "webb.falt.telefon", typ: "tel", kravs: true },
  { namn: "tekniker", nyckel: "webb.falt.tekniker", typ: "number", kravs: true },
  { namn: "bransch", nyckel: "webb.falt.bransch", kravs: true },
  { namn: "land", nyckel: "webb.falt.land", kravs: true },
  { namn: "anvandare", nyckel: "webb.falt.anvandare", typ: "number" },
];

export default function Ansokan() {
  const sprak = useWebbSprak();
  const t = oversattare(sprak) as (nyckel: string) => string;
  const [skickad, setSkickad] = useState(false);
  const [referens, setReferens] = useState("");

  const skicka = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Referensen bildas lokalt så sökanden har något att hänvisa till
    // omedelbart. Den slutliga beteckningen sätts vid granskning.
    const data = new FormData(e.currentTarget);
    const bas = String(data.get("orgnummer") ?? "").replace(/\D/g, "").slice(-4) || "0000";
    setReferens(`ALVA-ORG-${bas}`);
    setSkickad(true);
  };

  if (skickad) {
    return (
      <Ram>
        <div className="mx-auto max-w-[680px] px-6 py-16">
          <Etikett>{t("webb.ansokan.mottagen.etikett")}</Etikett>
          <div className="mt-2 mb-8">
            <Rubrik niva={1}>{t("webb.ansokan.mottagen")}</Rubrik>
          </div>
          <Demonstration>{t("webb.ansokan.mottagen.demo")}</Demonstration>
          <Block rubrik={t("webb.ansokan.etikett")} beteckning={referens}>
            <dl className="text-[14px] leading-[24px]">
              <div className="flex justify-between border-b py-2" style={{ borderColor: FARG.lightSteel }}>
                <dt style={{ color: FARG.steel }}>{t("webb.ansokan.status")}</dt>
                <dd>
                  <Statusmärke status="pending" />
                </dd>
              </div>
              <div className="flex justify-between py-2">
                <dt style={{ color: FARG.steel }}>{t("webb.ansokan.referens")}</dt>
                <dd className="font-mono">{referens}</dd>
              </div>
            </dl>
            <p className="mt-4 border-t pt-4 text-[13px] leading-[20px]" style={{ borderColor: FARG.lightSteel, color: FARG.steel }}>
              {t("webb.ansokan.granskning")}
            </p>
          </Block>
        </div>
      </Ram>
    );
  }

  return (
    <Ram>
      <div className="mx-auto max-w-[680px] px-6 py-16">
        <Etikett>{t("webb.ansokan.etikett")}</Etikett>
        <div className="mt-2 mb-2">
          <Rubrik niva={1}>{t("webb.ansok")}</Rubrik>
        </div>
        <Demonstration>{t("webb.ansokan.demo")}</Demonstration>
        <p className="mb-8 text-[14px] leading-[22px]" style={{ color: FARG.steel }}>
          {t("webb.ansokan.avsikt")}
        </p>

        <form onSubmit={skicka} noValidate={false}>
          <Block>
            {FALT.map((f) => (
              <div key={f.namn} className="border-t py-2 first:border-t-0" style={{ borderColor: FARG.lightSteel }}>
                <label htmlFor={f.namn} className="block text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: FARG.steel }}>
                  {t(f.nyckel)}
                  {f.kravs && <span aria-hidden="true"> ·</span>}
                  {f.kravs && <span className="sr-only"> {t("webb.falt.kravs")}</span>}
                </label>
                <input
                  id={f.namn}
                  name={f.namn}
                  type={f.typ ?? "text"}
                  required={f.kravs}
                  className="mt-2 w-full border px-4 py-2 text-[14px]"
                  style={{ borderColor: FARG.lightSteel, background: FARG.white, color: FARG.graphite }}
                />
              </div>
            ))}
            <div className="border-t py-2" style={{ borderColor: FARG.lightSteel }}>
              <label htmlFor="noteringar" className="block text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: FARG.steel }}>
                {t("webb.falt.noteringar")}
              </label>
              <textarea
                id="noteringar"
                name="noteringar"
                rows={4}
                className="mt-2 w-full border px-4 py-2 text-[14px]"
                style={{ borderColor: FARG.lightSteel, background: FARG.white, color: FARG.graphite }}
              />
            </div>
          </Block>

          <Knapp type="submit">{t("webb.ansokan.skicka")}</Knapp>
        </form>
      </div>
    </Ram>
  );
}
