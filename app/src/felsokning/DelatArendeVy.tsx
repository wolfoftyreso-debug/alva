// Gemensam Live Share-vy: används både av den interna förhandsvisningen
// (läser ur lokala storen) och den publika delningssidan (läser via
// delningskod genom backend). Skrivskyddad; interna poster (kategoribyten,
// hypoteser) ingår aldrig i underlaget som når hit externt, och filtreras
// bort även lokalt.

import { useState } from "react";
import type { Arende } from "./domain";
import { KUNDBESLUT_LABEL, handelseRubrik } from "./domain";
import { arAvslutat, arendeidentitet, brief, foton, tidsfordelningsRader, videor } from "./projektioner";
import { metodikForArende } from "./store";
import { Bild, Klipp } from "./Bilagevisning";
import { sammanfatta } from "../../../services/gemensam/sammanfattning.mjs";
import { tidDatum, tidKlockslag } from "./format";
import { FelsokningSkal, Panel, StorKnapp } from "./ui";
import { IkonCheck, IkonKlocka, IkonUppdatera } from "./ikoner";

// Kundens svar på åtgärdsförslaget — den enda skrivande åtgärden i hela
// delningsvyn. Beskedet kan lämnas en gång och kan inte ändras här.
function BeslutsKnappar({
  vidBeslut,
}: {
  vidBeslut: (beslut: "godkant" | "avbojt", kommentar: string) => Promise<string | null>;
}) {
  const [val, setVal] = useState<"" | "godkant" | "avbojt">("");
  const [kommentar, setKommentar] = useState("");
  const [skickar, setSkickar] = useState(false);
  const [fel, setFel] = useState("");

  return (
    <div className="mt-2 border-t border-[#D7DCE2] pt-2 print:hidden">
      <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#4D5662]">
        Your decision to the workshop
      </p>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <StorKnapp variant={val === "godkant" ? "primar" : "sekundar"} onClick={() => setVal("godkant")}>
          Approve the action
        </StorKnapp>
        <StorKnapp variant={val === "avbojt" ? "fara" : "sekundar"} onClick={() => setVal("avbojt")}>
          Decline
        </StorKnapp>
      </div>
      {val && (
        <>
          <label className="mb-2 block">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-[#4D5662]">
              {val === "avbojt" ? "Short rationale (optional)" : "Comment (optional)"}
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
            {skickar ? "Sending …" : "Send decision"}
          </StorKnapp>
          <p className="mt-2 text-[11px] text-[#4D5662]">
            The decision is recorded in the case and cannot be changed here — contact the workshop if you change your mind.
          </p>
        </>
      )}
    </div>
  );
}

function IdentitetsPanel({ arende, avslutat }: { arende: Arende; avslutat: boolean }) {
  const idn = arendeidentitet(arende);
  const falt: [string, string | undefined][] = [
    ["Work order", idn.arbetsorder],
    ["Claim", idn.claim],
    ["Claim no.", idn.skadenummer],
    ["Reg. no.", idn.identifierare],
    ["VIN", idn.vin],
    ["Mileage", idn.miltal],
    ["Responsible technician", idn.ansvarig],
    ["Status", avslutat ? "Closed" : "Diagnosis in progress"],
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
      rubrik={b.objekt?.beskrivning ?? "Case"}
      hoger={
        <span
          className={`px-4 py-2 text-[12px] font-semibold uppercase ${
            avslutat ? "bg-[#4D5662] text-white" : "bg-[#005CA9] text-white"
          }`}
        >
          {avslutat ? "Closed" : "Diagnosis in progress"}
        </span>
      }
    >
      {/* Ärendeidentiteten: låst överst — mottagaren (kund, försäkrings-
          handläggare, kollega) ska aldrig tveka om vilket fordon och
          ärende vyn avser. Härledd ur det nivåfiltrerade underlaget. */}
      <IdentitetsPanel arende={arende} avslutat={avslutat} />

      {/* ALVA-PROC-0030 · Sammanfattningen först. Mottagaren är oftast
          inte tekniker: kunden, en försäkringshandläggare, en
          flottansvarig. De ska få bilden på fem sekunder och sedan kunna
          gå djupare — inte tvärtom. Texten härleds ur det nivåfiltrerade
          underlaget, så den kan aldrig avslöja något som nivån döljer. */}
      <Panel rubrik="Summary">
        <p className="text-[15px] leading-[24px] text-[#1B1E22]">{sammanfatta(arende).text}</p>
      </Panel>

      {/* ALVA-RULE-200 · Teknikerns varför. Den enda rad en
          försäkringsbedömare egentligen behöver, kunddelbar med avsikt. */}
      {(() => {
        const post = [...arende.handelser].reverse().find((p) => p.handelse.typ === "slutsats");
        if (!post || post.handelse.typ !== "slutsats") return null;
        const h = post.handelse;
        const rader: [string, string][] = [
          [h.orsakFastställd === false ? "Reason the cause could not be established" : "Rationale", h.motivering],
          ["Dismissed alternatives", h.uteslutet],
          ...(h.atgardsval ? ([["Choice of action", h.atgardsval]] as [string, string][]) : []),
          ["Remaining uncertainty", h.kvarstaende],
        ];
        return (
          <Panel rubrik="Closing statement and rationale">
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
        {notis}
      </p>

      {b.felbeskrivning && (
        <Panel rubrik="Customer's fault description">
          <p className="text-[14px]">”{b.felbeskrivning}”</p>
        </Panel>
      )}

      {forslag.length > 0 && (
        <Panel rubrik="Proposed action">
          {forslag.map((p) => {
            const h = p.handelse;
            if (h.typ !== "atgardsforslag") return null;
            return (
              <div key={p.id} className="mb-2 last:mb-0">
                <p className="text-[14px]">{h.beskrivning}</p>
                {h.uppskattadKostnad && (
                  <p className="text-[13px] text-[#4D5662]">Estimated cost: {h.uppskattadKostnad}</p>
                )}
              </div>
            );
          })}
          {beslut?.handelse.typ === "kundbeslut" ? (
            <p className="mt-2 border-t border-[#D7DCE2] pt-2 text-[13px] font-semibold">
              Your decision: {KUNDBESLUT_LABEL[beslut.handelse.beslut]}{" "}
              <span className="font-normal text-[#4D5662]">(recorded via {beslut.handelse.kanal})</span>
            </p>
          ) : vidBeslut ? (
            <BeslutsKnappar vidBeslut={vidBeslut} />
          ) : (
            <p className="mt-2 border-t border-[#D7DCE2] pt-2 text-[12px] text-[#4D5662]">
              Awaiting your decision — contact the workshop to approve or decline.
            </p>
          )}
        </Panel>
      )}

      <Panel rubrik="Current status">
        {b.utfordaKontroller.map((k, i) => (
          <p key={`u${i}`} className="py-0 text-[14px]"><span className="text-[#005CA9]"><IkonCheck /></span> {k.text}</p>
        ))}
        {!avslutat && pagaende && <p className="py-0 text-[14px] text-[#005CA9]"><IkonUppdatera /> {pagaende}</p>}
        {b.ejKontrollerat.slice(avslutat ? 0 : 1).map((e, i) => (
          <p key={`e${i}`} className="py-0 text-[14px] text-[#4D5662]"><IkonKlocka /> {e}</p>
        ))}
      </Panel>

      {klipp.length > 0 && (
        <Panel rubrik="Video">
          {klipp.map((v, i) => (
            <figure key={i} className="mb-2">
              <Klipp bilaga={v.bilaga} delningskod={delningskod} className="w-full border border-[#D7DCE2]" />
              <figcaption className="mt-2 text-[11px] text-[#4D5662]">{v.beskrivning}</figcaption>
            </figure>
          ))}
        </Panel>
      )}
      {bilder.length > 0 && (
        <Panel rubrik="Images">
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
        <Panel rubrik="Measurements">
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

      <Panel rubrik="Timeline">
        {kundposter.map((post) => (
          <p key={post.id} className="py-0 text-[13px]">
            <span className="font-mono font-semibold text-[#005CA9]">{tidKlockslag(post.tidpunkt)}</span>{" "}
            {handelseRubrik(post)}
          </p>
        ))}
      </Panel>

      {!avslutat && pagaende && (
        <Panel rubrik="Recommended next step">
          <p className="text-[14px]">{pagaende}</p>
        </Panel>
      )}

      <Panel rubrik="Labour time">
        <p className="text-[17px] font-semibold">{b.totalArbetstid}</p>
        {tidsfordelningsRader(arende, nu).map((r) => (
          <p key={r.label} className="text-[#1B1E22]">
            {r.label}: {r.tid}
          </p>
        ))}
      </Panel>

      <p className="text-center text-[11px] text-[#4D5662]">
        Case #{arende.nummer} · started {tidDatum(arende.skapad)} · generated from the case log
      </p>
    </FelsokningSkal>
  );
}
