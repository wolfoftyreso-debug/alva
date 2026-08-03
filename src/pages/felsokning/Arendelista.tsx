import { useState } from "react";
import { Link } from "react-router-dom";
import { useFelsokning, metodikForArende } from "@/felsokning/store";
import { arAvslutat, felbeskrivning, objekt, sistaAktivitet, brief } from "@/felsokning/projektioner";
import { byggDemoArende } from "@/felsokning/demo";
import { AI_MODELL } from "@/felsokning/ai";
import { FelsokningSkal, Panel, StorKnapp, TextFalt } from "@/felsokning/ui";
import { tidDatum, tidKlockslag } from "@/felsokning/format";

type Filter = "alla" | "pagaende" | "klara";

// Dashboard enligt direktivet: endast det viktigaste — mina ärenden,
// pågående, klara och starta nytt ärende.
export default function Arendelista() {
  const { anvandare, arenden, sattAnvandare, laggInArende, nastaNummer, aiNyckel, sattAiNyckel } = useFelsokning();
  const [namn, setNamn] = useState("");
  const [filter, setFilter] = useState<Filter>("alla");
  const [visaAi, setVisaAi] = useState(false);
  const [nyckel, setNyckel] = useState("");

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

  const alla = Object.values(arenden).sort((a, b) => b.skapad.localeCompare(a.skapad));
  const pagaende = alla.filter((a) => !arAvslutat(a));
  const klara = alla.filter((a) => arAvslutat(a));
  const lista = filter === "pagaende" ? pagaende : filter === "klara" ? klara : alla;

  const FILTER: { id: Filter; label: string; antal: number }[] = [
    { id: "alla", label: "Alla", antal: alla.length },
    { id: "pagaende", label: "Pågående", antal: pagaende.length },
    { id: "klara", label: "Klara", antal: klara.length },
  ];

  return (
    <FelsokningSkal
      rubrik="Guidad Felsökning"
      hoger={<span className="text-sm font-bold text-zinc-400">{anvandare}</span>}
    >
      <Link to="/felsokning/nytt">
        <StorKnapp className="mb-4">+ Nytt ärende</StorKnapp>
      </Link>

      {alla.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-1 rounded-lg border-2 border-zinc-700 bg-zinc-900 p-1">
          {FILTER.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`min-h-12 rounded-md text-base font-extrabold transition-colors ${
                filter === f.id ? "bg-amber-400 text-zinc-950" : "text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {f.label} · {f.antal}
            </button>
          ))}
        </div>
      )}

      {alla.length === 0 && (
        <Panel rubrik="Kom igång">
          <p className="mb-3 text-lg text-zinc-300">
            Inga ärenden ännu. Starta med att identifiera ett objekt — eller utforska ett färdigt demoärende
            med komplett arbetslogg, brief och kundrapport.
          </p>
          <StorKnapp variant="sekundar" onClick={() => laggInArende(byggDemoArende(nastaNummer, anvandare))}>
            Skapa demoärende (Volvo XC60, vibration)
          </StorKnapp>
        </Panel>
      )}

      {lista.length === 0 && alla.length > 0 && (
        <p className="text-center text-lg text-zinc-400">Inga ärenden i det här filtret.</p>
      )}

      <Panel rubrik="AI-handledning">
        <p className="mb-2 text-zinc-300">
          {aiNyckel
            ? `Aktiv — Claude (${AI_MODELL}) svarar klassificerat på dokumenterade observationer och mätvärden.`
            : "Inte aktiverad — den deterministiska metodiken guidar. Lägg till organisationens Claude API-nyckel för AI-handledning."}
        </p>
        {!visaAi ? (
          <StorKnapp variant="sekundar" onClick={() => setVisaAi(true)}>
            {aiNyckel ? "Ändra API-nyckel" : "Lägg till Claude API-nyckel"}
          </StorKnapp>
        ) : (
          <>
            <TextFalt label="Claude API-nyckel" varde={nyckel} satt={setNyckel} platshallare="sk-ant-…" losenord />
            <p className="mb-3 text-sm text-zinc-500">
              MVP: nyckeln sparas endast på den här enheten och anropen görs direkt från webbläsaren. I
              produktionsversionen hanteras nycklar av plattformens backend.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <StorKnapp variant="sekundar" onClick={() => { setVisaAi(false); setNyckel(""); }}>
                Avbryt
              </StorKnapp>
              <StorKnapp
                disabled={!nyckel.trim() && !aiNyckel}
                onClick={() => {
                  sattAiNyckel(nyckel);
                  setVisaAi(false);
                  setNyckel("");
                }}
              >
                {nyckel.trim() ? "Spara nyckel" : "Ta bort nyckel"}
              </StorKnapp>
            </div>
          </>
        )}
      </Panel>

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
