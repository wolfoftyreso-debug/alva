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
    <div className="mt-2 border-t border-[#DDDDDD] pt-2 print:hidden">
      <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#4A5560]">
        Ditt besked till verkstaden
      </p>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <StorKnapp variant={val === "godkant" ? "primar" : "sekundar"} onClick={() => setVal("godkant")}>
          Godkänn åtgärden
        </StorKnapp>
        <StorKnapp variant={val === "avbojt" ? "fara" : "sekundar"} onClick={() => setVal("avbojt")}>
          Avböj
        </StorKnapp>
      </div>
      {val && (
        <>
          <label className="mb-2 block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#4A5560]">
              {val === "avbojt" ? "Kort motivering (valfritt)" : "Kommentar (valfritt)"}
            </span>
            <input
              value={kommentar}
              maxLength={500}
              onChange={(e) => setKommentar(e.target.value)}
              className="w-full rounded border border-[#ADADAD] bg-white px-2.5 py-1.5 text-[13px] focus:border-[#00437A] focus:outline-none"
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
            {skickar ? "Skickar …" : "Skicka besked"}
          </StorKnapp>
          <p className="mt-1 text-[11px] text-[#707070]">
            Beskedet registreras i ärendet och kan inte ändras här — kontakta verkstaden om du ändrar dig.
          </p>
        </>
      )}
    </div>
  );
}

function IdentitetsPanel({ arende, avslutat }: { arende: Arende; avslutat: boolean }) {
  const idn = arendeidentitet(arende);
  const falt: [string, string | undefined][] = [
    ["Arbetsorder", idn.arbetsorder],
    ["Claim", idn.claim],
    ["Skadenr", idn.skadenummer],
    ["Regnr", idn.identifierare],
    ["VIN", idn.vin],
    ["Miltal", idn.miltal],
    ["Ansvarig tekniker", idn.ansvarig],
    ["Status", avslutat ? "Avslutat" : "Felsökning pågår"],
  ];
  return (
    <div className="sticky top-11 z-10 mb-3 rounded border border-[#C6C6C6] bg-[#F7F7F7] px-3 py-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.1)] print:static">
      {idn.beskrivning && <p className="text-[13px] font-semibold">{idn.beskrivning}</p>}
      <p className="flex flex-wrap gap-x-4 gap-y-0.5 text-[12px]">
        {falt
          .filter(([, varde]) => varde)
          .map(([etikett, varde]) => (
            <span key={etikett} className="whitespace-nowrap">
              <span className="text-[#707070]">{etikett}:</span> <span className="font-medium">{varde}</span>
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
      rubrik={b.objekt?.beskrivning ?? "Ärende"}
      hoger={
        <span
          className={`rounded px-3 py-1 text-[12px] font-semibold uppercase ${
            avslutat ? "bg-[#3E5A78] text-white" : "bg-[#1E6B34] text-white"
          }`}
        >
          {avslutat ? "Avslutat" : "Felsökning pågår"}
        </span>
      }
    >
      {/* Ärendeidentiteten: låst överst — mottagaren (kund, försäkrings-
          handläggare, kollega) ska aldrig tveka om vilket fordon och
          ärende vyn avser. Härledd ur det nivåfiltrerade underlaget. */}
      <IdentitetsPanel arende={arende} avslutat={avslutat} />

      <p className="mb-4 rounded border border-[#C6C6C6] bg-[#F7F7F7] p-3 text-[12px] text-[#4A5560] print:hidden">
        {notis}
      </p>

      {b.felbeskrivning && (
        <Panel rubrik="Kundens felbeskrivning">
          <p className="text-[14px]">”{b.felbeskrivning}”</p>
        </Panel>
      )}

      {forslag.length > 0 && (
        <Panel rubrik="Åtgärdsförslag">
          {forslag.map((p) => {
            const h = p.handelse;
            if (h.typ !== "atgardsforslag") return null;
            return (
              <div key={p.id} className="mb-2 last:mb-0">
                <p className="text-[14px]">{h.beskrivning}</p>
                {h.uppskattadKostnad && (
                  <p className="text-[13px] text-[#4A5560]">Uppskattad kostnad: {h.uppskattadKostnad}</p>
                )}
              </div>
            );
          })}
          {beslut?.handelse.typ === "kundbeslut" ? (
            <p className="mt-2 border-t border-[#DDDDDD] pt-2 text-[13px] font-semibold">
              Ditt besked: {KUNDBESLUT_LABEL[beslut.handelse.beslut]}{" "}
              <span className="font-normal text-[#4A5560]">(registrerat via {beslut.handelse.kanal})</span>
            </p>
          ) : vidBeslut ? (
            <BeslutsKnappar vidBeslut={vidBeslut} />
          ) : (
            <p className="mt-2 border-t border-[#DDDDDD] pt-2 text-[12px] text-[#707070]">
              Inväntar ditt besked — kontakta verkstaden för att godkänna eller avböja.
            </p>
          )}
        </Panel>
      )}

      <Panel rubrik="Aktuell status">
        {b.utfordaKontroller.map((k, i) => (
          <p key={`u${i}`} className="py-0.5 text-[14px]"><span className="text-[#1E6B34]"><IkonCheck /></span> {k.text}</p>
        ))}
        {!avslutat && pagaende && <p className="py-0.5 text-[14px] text-[#00437A]"><IkonUppdatera /> {pagaende}</p>}
        {b.ejKontrollerat.slice(avslutat ? 0 : 1).map((e, i) => (
          <p key={`e${i}`} className="py-0.5 text-[14px] text-[#4A5560]"><IkonKlocka /> {e}</p>
        ))}
      </Panel>

      {klipp.length > 0 && (
        <Panel rubrik="Video">
          {klipp.map((v, i) => (
            <figure key={i} className="mb-2">
              <Klipp bilaga={v.bilaga} delningskod={delningskod} className="w-full rounded border border-[#C6C6C6]" />
              <figcaption className="mt-1 text-[11px] text-[#4A5560]">{v.beskrivning}</figcaption>
            </figure>
          ))}
        </Panel>
      )}
      {bilder.length > 0 && (
        <Panel rubrik="Bilder">
          <div className="grid grid-cols-2 gap-2">
            {bilder.map((bild, i) => (
              <figure key={i}>
                <Bild bilaga={bild.bilaga} alt={bild.beskrivning} delningskod={delningskod} className="rounded border border-[#C6C6C6]" />
                <figcaption className="mt-1 text-[11px] text-[#4A5560]">{bild.beskrivning}</figcaption>
              </figure>
            ))}
          </div>
        </Panel>
      )}

      {matvarden.length > 0 && (
        <Panel rubrik="Mätvärden">
          <table className="w-full text-[14px]">
            <tbody>
              {matvarden.map((p) => {
                const h = p.handelse;
                if (h.typ !== "matvarde") return null;
                return (
                  <tr key={p.id} className="border-b border-[#DDDDDD] last:border-0">
                    <td className="py-1 pr-3 text-[#333333]">{h.beskrivning}</td>
                    <td className="py-1 font-semibold">
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

      <Panel rubrik="Tidslinje">
        {kundposter.map((post) => (
          <p key={post.id} className="py-0.5 text-[13px]">
            <span className="font-mono font-semibold text-[#00437A]">{tidKlockslag(post.tidpunkt)}</span>{" "}
            {handelseRubrik(post)}
          </p>
        ))}
      </Panel>

      {!avslutat && pagaende && (
        <Panel rubrik="Rekommenderat nästa steg">
          <p className="text-[14px]">{pagaende}</p>
        </Panel>
      )}

      <Panel rubrik="Arbetstid">
        <p className="text-[17px] font-semibold">{b.totalArbetstid}</p>
        {tidsfordelningsRader(arende, nu).map((r) => (
          <p key={r.label} className="text-[#333333]">
            {r.label}: {r.tid}
          </p>
        ))}
      </Panel>

      <p className="text-center text-[11px] text-[#8A8A8A]">
        Ärende #{arende.nummer} · startat {tidDatum(arende.skapad)} · genererad ur ärendets händelselogg
      </p>
    </FelsokningSkal>
  );
}
