// Gemensam Live Share-vy: används både av den interna förhandsvisningen
// (läser ur lokala storen) och den publika delningssidan (läser via
// delningskod genom backend). Skrivskyddad; interna poster (kategoribyten,
// hypoteser) ingår aldrig i underlaget som når hit externt, och filtreras
// bort även lokalt.

import type { Arende } from "./domain";
import { handelseRubrik } from "./domain";
import { arAvslutat, brief, foton, tidsfordelningsRader } from "./projektioner";
import { metodikForArende } from "./store";
import { tidDatum, tidKlockslag } from "./format";
import { FelsokningSkal, Panel } from "./ui";

export function DelatArendeVy({
  arende,
  nu,
  notis,
  redanFiltrerad = false,
}: {
  arende: Arende;
  nu: string;
  notis: string;
  // Sant när servern redan filtrerat per behörighetsnivå (publik delning) —
  // då renderas händelserna som de kom, inklusive t.ex. hypoteser på
  // partner-/internnivå.
  redanFiltrerad?: boolean;
}) {
  const metodik = metodikForArende(arende);
  const b = brief(arende, metodik, nu);
  const avslutat = arAvslutat(arende);
  const bilder = foton(arende);
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
          {avslutat ? "Avslutat" : "🟢 Felsökning pågår"}
        </span>
      }
    >
      <p className="mb-4 rounded border border-[#C6C6C6] bg-[#F7F7F7] p-3 text-[12px] text-[#4A5560] print:hidden">
        {notis}
      </p>

      {b.felbeskrivning && (
        <Panel rubrik="Kundens felbeskrivning">
          <p className="text-[14px]">”{b.felbeskrivning}”</p>
        </Panel>
      )}

      <Panel rubrik="Aktuell status">
        {b.utfordaKontroller.map((k, i) => (
          <p key={`u${i}`} className="py-0.5 text-[14px]">✔ {k.text}</p>
        ))}
        {!avslutat && pagaende && <p className="py-0.5 text-[14px] text-[#00437A]">🔄 {pagaende}</p>}
        {b.ejKontrollerat.slice(avslutat ? 0 : 1).map((e, i) => (
          <p key={`e${i}`} className="py-0.5 text-[14px] text-[#4A5560]">⏳ {e}</p>
        ))}
      </Panel>

      {bilder.length > 0 && (
        <Panel rubrik="Bilder">
          <div className="grid grid-cols-2 gap-2">
            {bilder.map((bild, i) => (
              <figure key={i}>
                <img src={bild.dataUrl} alt={bild.beskrivning} className="rounded border border-[#C6C6C6]" />
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
