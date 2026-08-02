// Live Share: skrivskyddad livevy av ett ärende — det kunden, arbetsledaren
// eller en extern partner ser via delningslänken. Uppdateras automatiskt
// när ny information registreras. Interna poster (kategoribyten) visas inte.

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { handelseRubrik } from "@/felsokning/domain";
import { arAvslutat, brief, foton, tidsfordelningsRader } from "@/felsokning/projektioner";
import { metodikForArende, useFelsokning } from "@/felsokning/store";
import { tidDatum, tidKlockslag } from "@/felsokning/format";
import { FelsokningSkal, Panel } from "@/felsokning/ui";

export default function DelatArende() {
  const { id } = useParams<{ id: string }>();
  const arende = useFelsokning((s) => (id ? s.arenden[id] : undefined));
  const [nu, setNu] = useState(() => new Date().toISOString());

  useEffect(() => {
    const timer = setInterval(() => setNu(new Date().toISOString()), 30000);
    return () => clearInterval(timer);
  }, []);

  if (!arende) {
    return (
      <FelsokningSkal rubrik="Delat ärende">
        <p className="text-lg text-zinc-300">Ärendet är inte tillgängligt.</p>
      </FelsokningSkal>
    );
  }

  const metodik = metodikForArende(arende);
  const b = brief(arende, metodik, nu);
  const avslutat = arAvslutat(arende);
  const bilder = foton(arende);
  const matvarden = arende.handelser.filter((p) => p.handelse.typ === "matvarde");
  // Hypoteser är internt arbetsmaterial och delas inte externt —
  // de får aldrig riskera att läsas som konstaterade fel.
  const kundposter = arende.handelser.filter(
    (p) => p.handelse.typ !== "kategori_byte" && p.handelse.typ !== "hypotes",
  );
  const pagaende = b.rekommenderatNastaSteg[0];

  return (
    <FelsokningSkal
      rubrik={b.objekt?.beskrivning ?? "Ärende"}
      hoger={
        <span
          className={`rounded px-3 py-1 text-sm font-extrabold uppercase ${
            avslutat ? "bg-zinc-700 text-zinc-200" : "bg-green-500 text-zinc-950"
          }`}
        >
          {avslutat ? "Avslutat" : "🟢 Felsökning pågår"}
        </span>
      }
    >
      <p className="mb-4 rounded-lg border-2 border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-400">
        Skrivskyddad livevy — uppdateras automatiskt när verkstaden registrerar ny information. Extern delning
        via säker länk aktiveras när backend är i drift; detta är samma vy.
      </p>

      {b.felbeskrivning && (
        <Panel rubrik="Kundens felbeskrivning">
          <p className="text-lg">”{b.felbeskrivning}”</p>
        </Panel>
      )}

      <Panel rubrik="Aktuell status">
        {b.utfordaKontroller.map((k, i) => (
          <p key={`u${i}`} className="py-0.5 text-lg">✔ {k.text}</p>
        ))}
        {!avslutat && pagaende && <p className="py-0.5 text-lg text-amber-400">🔄 {pagaende}</p>}
        {b.ejKontrollerat.slice(avslutat ? 0 : 1).map((e, i) => (
          <p key={`e${i}`} className="py-0.5 text-lg text-zinc-400">⏳ {e}</p>
        ))}
      </Panel>

      {bilder.length > 0 && (
        <Panel rubrik="Bilder">
          <div className="grid grid-cols-2 gap-2">
            {bilder.map((bild, i) => (
              <figure key={i}>
                <img src={bild.dataUrl} alt={bild.beskrivning} className="rounded border border-zinc-700" />
                <figcaption className="mt-1 text-xs text-zinc-400">{bild.beskrivning}</figcaption>
              </figure>
            ))}
          </div>
        </Panel>
      )}

      {matvarden.length > 0 && (
        <Panel rubrik="Mätvärden">
          <table className="w-full text-lg">
            <tbody>
              {matvarden.map((p) => {
                const h = p.handelse;
                if (h.typ !== "matvarde") return null;
                return (
                  <tr key={p.id} className="border-b border-zinc-800 last:border-0">
                    <td className="py-1 pr-3 text-zinc-300">{h.beskrivning}</td>
                    <td className="py-1 font-bold">
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
          <p key={post.id} className="py-0.5 text-base">
            <span className="font-mono font-bold text-amber-400">{tidKlockslag(post.tidpunkt)}</span>{" "}
            {handelseRubrik(post)}
          </p>
        ))}
      </Panel>

      {!avslutat && pagaende && (
        <Panel rubrik="Rekommenderat nästa steg">
          <p className="text-lg">{pagaende}</p>
        </Panel>
      )}

      <Panel rubrik="Arbetstid">
        <p className="text-2xl font-extrabold">{b.totalArbetstid}</p>
        {tidsfordelningsRader(arende, nu).map((r) => (
          <p key={r.label} className="text-zinc-300">
            {r.label}: {r.tid}
          </p>
        ))}
      </Panel>

      <p className="text-center text-xs text-zinc-600">
        Ärende #{arende.nummer} · startat {tidDatum(arende.skapad)} · genererad ur ärendets händelselogg
      </p>
    </FelsokningSkal>
  );
}
