import { useState } from "react";
import { Link } from "react-router-dom";
import { useFelsokning, metodikForArende } from "@/felsokning/store";
import { arAvslutat, felbeskrivning, objekt, sistaAktivitet, brief } from "@/felsokning/projektioner";
import { FelsokningSkal, Panel, StorKnapp, TextFalt } from "@/felsokning/ui";
import { tidDatum, tidKlockslag } from "@/felsokning/format";

export default function Arendelista() {
  const { anvandare, arenden, sattAnvandare } = useFelsokning();
  const [namn, setNamn] = useState("");

  if (!anvandare) {
    return (
      <FelsokningSkal rubrik="Guidad Felsökning">
        <Panel rubrik="Vem arbetar?">
          <p className="mb-3 text-lg text-zinc-300">
            Allt arbete loggas med användare och tidpunkt. Ange ditt namn för att börja.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (namn.trim()) sattAnvandare(namn);
            }}
          >
            <TextFalt label="Namn" varde={namn} satt={setNamn} platshallare="T.ex. Anna" />
            <StorKnapp type="submit" disabled={!namn.trim()}>
              Fortsätt
            </StorKnapp>
          </form>
        </Panel>
      </FelsokningSkal>
    );
  }

  const lista = Object.values(arenden).sort((a, b) => b.skapad.localeCompare(a.skapad));

  return (
    <FelsokningSkal
      rubrik="Guidad Felsökning"
      hoger={<span className="text-sm font-bold text-zinc-400">{anvandare}</span>}
    >
      <Link to="/felsokning/nytt">
        <StorKnapp className="mb-5">+ Nytt ärende</StorKnapp>
      </Link>

      {lista.length === 0 && (
        <p className="text-center text-lg text-zinc-400">
          Inga ärenden ännu. Starta med att identifiera ett objekt.
        </p>
      )}

      {lista.map((arende) => {
        const o = objekt(arende);
        const fel = felbeskrivning(arende);
        const sista = sistaAktivitet(arende);
        const avslutat = arAvslutat(arende);
        const b = brief(arende, metodikForArende(arende), new Date().toISOString());
        return (
          <Link key={arende.id} to={`/felsokning/arende/${arende.id}`} className="block">
            <div className="mb-3 rounded-lg border-2 border-zinc-700 bg-zinc-900 p-4 transition-colors hover:border-amber-400">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-extrabold uppercase tracking-widest text-zinc-400">
                  Ärende #{arende.nummer}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-extrabold uppercase ${
                    avslutat ? "bg-zinc-700 text-zinc-300" : "bg-amber-400 text-zinc-950"
                  }`}
                >
                  {avslutat ? "Avslutat" : "Pågående"}
                </span>
              </div>
              <p className="mt-1 text-xl font-extrabold">{o ? o.beskrivning : "Okänt objekt"}</p>
              {o && <p className="text-sm font-bold text-zinc-400">{o.identifierare}{o.kund ? ` · ${o.kund}` : ""}</p>}
              {fel && <p className="mt-2 text-lg text-zinc-200">”{fel}”</p>}
              <p className="mt-2 text-sm text-zinc-500">
                {sista ? `Senaste aktivitet ${tidDatum(sista.tidpunkt)} ${tidKlockslag(sista.tidpunkt)}` : ""}
                {" · "}
                {b.totalArbetstid}
              </p>
            </div>
          </Link>
        );
      })}
    </FelsokningSkal>
  );
}
