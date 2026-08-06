// Kontoansökan.
//
// Ingen självbetjäning, ingen kortbetalning, ingen provperiod. Ansökan
// granskas manuellt och det står på sidan — inte som en ursäkt utan som
// en uppgift. Ett system som avgör vad som får kallas verifierat i en
// garantitvist kan inte dela ut konton automatiskt.

import { type FormEvent, useState } from "react";
import { Demonstration, Block, Etikett, FARG, Knapp, Rubrik, Statusmärke } from "@/alva/komponenter";
import { Ram } from "./Ram";

interface Falt {
  namn: string;
  etikett: string;
  typ?: string;
  kravs?: boolean;
  hjalp?: string;
}

const FALT: Falt[] = [
  { namn: "foretag", etikett: "Company", kravs: true },
  { namn: "orgnummer", etikett: "Organization number", kravs: true },
  { namn: "kontakt", etikett: "Contact person", kravs: true },
  { namn: "epost", etikett: "Email", typ: "email", kravs: true },
  { namn: "telefon", etikett: "Phone", typ: "tel", kravs: true },
  { namn: "tekniker", etikett: "Number of technicians", typ: "number", kravs: true },
  { namn: "bransch", etikett: "Industry", kravs: true },
  { namn: "land", etikett: "Country", kravs: true },
  { namn: "anvandare", etikett: "Expected number of users", typ: "number" },
];

export default function Ansokan() {
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
          <Etikett>Application</Etikett>
          <div className="mt-2 mb-8">
            <Rubrik niva={1}>Submitted</Rubrik>
          </div>
          <Demonstration>
            Nothing was submitted and no one was notified. The reference below was computed in your
            browser from what you typed, and exists nowhere else — it will be gone when you close
            this page.
          </Demonstration>
          <Block rubrik="Registration" beteckning={referens}>
            <dl className="text-[14px] leading-[24px]">
              <div className="flex justify-between border-b py-2" style={{ borderColor: FARG.lightSteel }}>
                <dt style={{ color: FARG.steel }}>Status</dt>
                <dd>
                  <Statusmärke status="pending" />
                </dd>
              </div>
              <div className="flex justify-between py-2">
                <dt style={{ color: FARG.steel }}>Reference</dt>
                <dd className="font-mono">{referens}</dd>
              </div>
            </dl>
            <p className="mt-4 border-t pt-4 text-[13px] leading-[20px]" style={{ borderColor: FARG.lightSteel, color: FARG.steel }}>
              Applications are reviewed manually. An invoice is issued on approval. The organization is activated
              once payment is registered.
            </p>
          </Block>
        </div>
      </Ram>
    );
  }

  return (
    <Ram>
      <div className="mx-auto max-w-[680px] px-6 py-16">
        <Etikett>Registration</Etikett>
        <div className="mt-2 mb-2">
          <Rubrik niva={1}>Request account</Rubrik>
        </div>
        <Demonstration>
          Nothing is sent. Submitting this form stores nothing, notifies no one, and creates no
          application — there is no intake behind it yet. The description below states how
          registration is intended to work, not what happens today.
        </Demonstration>
        <p className="mb-8 text-[14px] leading-[22px]" style={{ color: FARG.steel }}>
          Intended operation: applications are reviewed manually and no payment is taken at this
          stage.
        </p>

        <form onSubmit={skicka} noValidate={false}>
          <Block>
            {FALT.map((f) => (
              <div key={f.namn} className="border-t py-2 first:border-t-0" style={{ borderColor: FARG.lightSteel }}>
                <label htmlFor={f.namn} className="block text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: FARG.steel }}>
                  {f.etikett}
                  {f.kravs && <span aria-hidden="true"> ·</span>}
                  {f.kravs && <span className="sr-only"> (required)</span>}
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
                Notes
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

          <Knapp type="submit">Submit application</Knapp>
        </form>
      </div>
    </Ram>
  );
}
