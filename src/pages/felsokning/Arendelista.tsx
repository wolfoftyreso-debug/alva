import { useState } from "react";
import { Link } from "react-router-dom";
import { useFelsokning, metodikForArende } from "@/felsokning/store";
import { arAvslutat, felbeskrivning, objekt, sistaAktivitet, brief } from "@/felsokning/projektioner";
import { byggDemoArende } from "@/felsokning/demo";
import {
  hamtaAnvandare,
  loggaInPlattform,
  loggaUtPlattform,
  plattformAktiv,
  plattformKonto,
  registreraPlattform,
  skapaAnvandare,
  type PlattformAnvandare,
  type PlattformKonto,
  type PlattformRoll,
} from "@/felsokning/plattform";
import { FelsokningSkal, Panel, StorKnapp, TextFalt } from "@/felsokning/ui";
import { tidDatum, tidKlockslag } from "@/felsokning/format";

type Filter = "alla" | "pagaende" | "klara";

const ROLL_LABEL: Record<PlattformRoll, string> = {
  tekniker: "Tekniker",
  arbetsledare: "Arbetsledare",
  admin: "Systemadministratör",
};

// Självhostat läge: inloggning mot plattformstjänsten i klustret.
// Registrering skapar en ny organisation (tenant) med användaren som
// systemadministratör; övriga användare skapas av admin.
function PlattformInloggning() {
  const [konto, setKonto] = useState<PlattformKonto | null>(plattformKonto());
  const [lage, setLage] = useState<"stangd" | "loggaIn" | "registrera">("stangd");
  const [epost, setEpost] = useState("");
  const [losenord, setLosenord] = useState("");
  const [nyttNamn, setNyttNamn] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [fel, setFel] = useState("");

  if (konto) {
    return (
      <>
        <Panel rubrik="Plattformskonto">
          <div className="flex items-center justify-between gap-3">
            <p className="text-lg">
              <span className="font-extrabold">{konto.namn}</span> · {ROLL_LABEL[konto.roll]} ·{" "}
              {konto.organisation} — synk och AI aktiva.
            </p>
            <button
              className="whitespace-nowrap rounded-lg border-2 border-zinc-600 px-4 py-2 font-bold text-zinc-300 hover:border-zinc-400"
              onClick={() => {
                loggaUtPlattform();
                setKonto(null);
              }}
            >
              Logga ut
            </button>
          </div>
        </Panel>
        {konto.roll === "admin" && <AnvandarAdmin />}
      </>
    );
  }

  return (
    <Panel rubrik="Plattformskonto">
      {lage === "stangd" ? (
        <>
          <p className="mb-2 text-zinc-300">
            Logga in för synk mellan enheter, samarbete i ärenden och AI-orkestern. Utan inloggning
            arbetar appen i lokalt läge. Ny organisation? Skapa konto — du blir systemadministratör.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <StorKnapp variant="sekundar" onClick={() => setLage("registrera")}>
              Skapa organisation
            </StorKnapp>
            <StorKnapp onClick={() => setLage("loggaIn")}>Logga in</StorKnapp>
          </div>
        </>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setFel("");
            try {
              setKonto(
                lage === "loggaIn"
                  ? await loggaInPlattform(epost, losenord)
                  : await registreraPlattform(epost, losenord, nyttNamn, organisation),
              );
            } catch (misslyckande) {
              setFel(misslyckande instanceof Error ? misslyckande.message : "Något gick fel.");
            }
          }}
        >
          {lage === "registrera" && (
            <>
              <TextFalt label="Organisation" varde={organisation} satt={setOrganisation} platshallare="T.ex. Verkstad Syd AB" />
              <TextFalt label="Ditt namn" varde={nyttNamn} satt={setNyttNamn} platshallare="T.ex. Anna" />
            </>
          )}
          <TextFalt label="E-post" varde={epost} satt={setEpost} platshallare="anna@verkstaden.se" />
          <TextFalt label="Lösenord (minst 8 tecken)" varde={losenord} satt={setLosenord} losenord />
          {fel && <p className="mb-3 font-bold text-red-400">{fel}</p>}
          <div className="grid grid-cols-2 gap-2">
            <StorKnapp variant="sekundar" onClick={() => setLage("stangd")}>
              Avbryt
            </StorKnapp>
            <StorKnapp
              type="submit"
              disabled={
                !epost.trim() ||
                losenord.length < 8 ||
                (lage === "registrera" && (!nyttNamn.trim() || !organisation.trim()))
              }
            >
              {lage === "loggaIn" ? "Logga in" : "Skapa organisation"}
            </StorKnapp>
          </div>
        </form>
      )}
    </Panel>
  );
}

// Användarhantering för systemadministratören: lista och skapa användare
// i den egna organisationen (servern verifierar behörigheten).
function AnvandarAdmin() {
  const [oppen, setOppen] = useState(false);
  const [lista, setLista] = useState<PlattformAnvandare[]>([]);
  const [epost, setEpost] = useState("");
  const [namn, setNamn] = useState("");
  const [losenord, setLosenord] = useState("");
  const [roll, setRoll] = useState<PlattformRoll>("tekniker");
  const [fel, setFel] = useState("");

  const uppdatera = async () => {
    try {
      setLista(await hamtaAnvandare());
    } catch {
      setFel("Kunde inte hämta användare.");
    }
  };

  if (!oppen) {
    return (
      <Panel rubrik="Användare">
        <StorKnapp
          variant="sekundar"
          onClick={() => {
            setOppen(true);
            uppdatera();
          }}
        >
          Hantera användare i organisationen
        </StorKnapp>
      </Panel>
    );
  }

  return (
    <Panel rubrik="Användare">
      {lista.map((anv) => (
        <p key={anv.id} className="border-b border-zinc-800 py-1 text-lg last:border-0">
          <span className="font-extrabold">{anv.namn}</span> · {ROLL_LABEL[anv.roll]}{" "}
          <span className="text-zinc-500">{anv.epost}</span>
        </p>
      ))}
      <form
        className="mt-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setFel("");
          try {
            await skapaAnvandare(epost, losenord, namn, roll);
            setEpost("");
            setNamn("");
            setLosenord("");
            await uppdatera();
          } catch (misslyckande) {
            setFel(misslyckande instanceof Error ? misslyckande.message : "Något gick fel.");
          }
        }}
      >
        <TextFalt label="Namn" varde={namn} satt={setNamn} />
        <TextFalt label="E-post" varde={epost} satt={setEpost} />
        <TextFalt label="Lösenord (minst 8 tecken)" varde={losenord} satt={setLosenord} losenord />
        <div className="mb-3 grid grid-cols-3 gap-2">
          {(Object.keys(ROLL_LABEL) as PlattformRoll[]).map((valbar) => (
            <button
              key={valbar}
              type="button"
              onClick={() => setRoll(valbar)}
              className={`min-h-12 rounded-lg border-2 text-sm font-extrabold ${
                roll === valbar
                  ? "border-amber-400 bg-amber-400 text-zinc-950"
                  : "border-zinc-600 bg-zinc-900 text-zinc-200"
              }`}
            >
              {ROLL_LABEL[valbar]}
            </button>
          ))}
        </div>
        {fel && <p className="mb-3 font-bold text-red-400">{fel}</p>}
        <StorKnapp type="submit" disabled={!epost.trim() || !namn.trim() || losenord.length < 8}>
          Skapa användare
        </StorKnapp>
      </form>
    </Panel>
  );
}

// Dashboard enligt direktivet: endast det viktigaste — mina ärenden,
// pågående, klara och starta nytt ärende.
export default function Arendelista() {
  const { anvandare, arenden, sattAnvandare, laggInArende, nastaNummer } = useFelsokning();
  const [namn, setNamn] = useState("");
  const [filter, setFilter] = useState<Filter>("alla");

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

      {plattformAktiv() && <PlattformInloggning />}

      <Panel rubrik="AI-orkestern">
        <p className="text-zinc-300">
          Ingår i tjänsten och drivs av plattformen — flera Claude-modeller med olika roller: handledning i
          realtid på varje dokumentation, djupgranskning av hela underlaget, överlämningssammanfattning och
          metodikklassificering. Anropen går via plattformens backend; inga AI-nycklar hanteras av
          verkstaden. Aktiveras automatiskt för inloggade användare; i lokalt läge guidar den deterministiska
          metodiken ensam.
        </p>
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
