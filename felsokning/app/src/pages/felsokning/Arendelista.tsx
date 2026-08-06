import { useEffect, useState } from "react";
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
  sattKontoAktiv,
  skapaAnvandare,
  type PlattformAnvandare,
  type PlattformKonto,
  type PlattformRoll,
} from "@/felsokning/plattform";
import { FelsokningSkal, Panel, StorKnapp, TextFalt } from "@/felsokning/ui";
import { IkonDiagram, IkonKugghjul } from "@/felsokning/ikoner";
import { tidDatum, tidKlockslag } from "@/felsokning/format";

type Filter = "alla" | "pagaende" | "klara";

const ROLL_LABEL: Record<PlattformRoll, string> = {
  tekniker: "Technician",
  arbetsledare: "Supervisor",
  admin: "System administrator",
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
        <Panel rubrik="Platform account">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[14px]">
              <span className="font-semibold">{konto.namn}</span> · {ROLL_LABEL[konto.roll]} ·{" "}
              {konto.organisation} — synchronization and decision support active.
            </p>
            <button
              className="whitespace-nowrap border border-[#ADADAD] px-4 py-2 font-semibold text-[#333333] hover:border-[#8FA8C0]"
              onClick={() => {
                loggaUtPlattform();
                setKonto(null);
              }}
            >
              Sign out
            </button>
          </div>
          {(konto.roll === "arbetsledare" || konto.roll === "admin") && (
            <Link to="/felsokning/oversikt" className="mt-3 block">
              <StorKnapp variant="sekundar"><IkonDiagram /> Organization overview</StorKnapp>
            </Link>
          )}
          {konto.roll === "admin" && (
            <Link to="/felsokning/installningar" className="mt-2 block">
              <StorKnapp variant="sekundar"><IkonKugghjul /> Organization settings</StorKnapp>
            </Link>
          )}
        </Panel>
        {konto.roll === "admin" && <AnvandarAdmin />}
      </>
    );
  }

  return (
    <Panel rubrik="Platform account">
      {lage === "stangd" ? (
        <>
          <p className="mb-2 text-[#333333]">
            Sign in for synchronization across devices, collaboration on cases and decision support. Without sign-in the app works in local mode. New organization? Create an account — you become the system administrator.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <StorKnapp variant="sekundar" onClick={() => setLage("registrera")}>
              Create organization
            </StorKnapp>
            <StorKnapp onClick={() => setLage("loggaIn")}>Sign in</StorKnapp>
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
              setFel(misslyckande instanceof Error ? misslyckande.message : "Something went wrong.");
            }
          }}
        >
          {lage === "registrera" && (
            <>
              <TextFalt label="Organisation" varde={organisation} satt={setOrganisation} platshallare="e.g. Southside Motors Ltd" />
              <TextFalt label="Your name" varde={nyttNamn} satt={setNyttNamn} platshallare="e.g. Anna" />
            </>
          )}
          <TextFalt label="E-mail" varde={epost} satt={setEpost} platshallare="anna@workshop.example" />
          <TextFalt label="Password (at least 8 characters)" varde={losenord} satt={setLosenord} losenord />
          {fel && <p className="mb-3 font-semibold text-[#8B1A1A]">{fel}</p>}
          <div className="grid grid-cols-2 gap-2">
            <StorKnapp variant="sekundar" onClick={() => setLage("stangd")}>
              Cancel
            </StorKnapp>
            <StorKnapp
              type="submit"
              disabled={
                !epost.trim() ||
                losenord.length < 8 ||
                (lage === "registrera" && (!nyttNamn.trim() || !organisation.trim()))
              }
            >
              {lage === "loggaIn" ? "Sign in" : "Create organization"}
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
      setFel("Could not retrieve users.");
    }
  };

  if (!oppen) {
    return (
      <Panel rubrik="Users">
        <StorKnapp
          variant="sekundar"
          onClick={() => {
            setOppen(true);
            uppdatera();
          }}
        >
          Manage users in the organization
        </StorKnapp>
      </Panel>
    );
  }

  return (
    <Panel rubrik="Users">
      {lista.map((anv) => (
        <div
          key={anv.id}
          className="flex items-center justify-between gap-3 border-b border-[#DDDDDD] py-1.5 last:border-0"
        >
          <p className="min-w-0 text-[14px]">
            <span className={`font-semibold ${anv.aktiv === false ? "text-[#8A8A8A] line-through" : ""}`}>
              {anv.namn}
            </span>{" "}
            · {ROLL_LABEL[anv.roll]} <span className="text-[#707070]">{anv.epost}</span>
            {anv.aktiv === false && (
              <span className="ml-1 text-[12px] font-semibold text-[#8B1A1A]">Disabled</span>
            )}
          </p>
          <button
            type="button"
            className={`shrink-0 border px-2 py-1 text-[12px] font-semibold ${
              anv.aktiv === false
                ? "border-[#1E6B34] bg-white text-[#1E6B34]"
                : "border-[#6E1414] bg-white text-[#8B1A1A]"
            }`}
            onClick={async () => {
              setFel("");
              try {
                await sattKontoAktiv(anv.id, anv.aktiv === false);
                await uppdatera();
              } catch (misslyckande) {
                setFel(misslyckande instanceof Error ? misslyckande.message : "Something went wrong.");
              }
            }}
          >
            {anv.aktiv === false ? "Reopen" : "Disable"}
          </button>
        </div>
      ))}
      <p className="mt-1 text-[12px] text-[#707070]">
        Disabling takes effect immediately — active sessions on that person's devices end at once.
      </p>
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
            setFel(misslyckande instanceof Error ? misslyckande.message : "Something went wrong.");
          }
        }}
      >
        <TextFalt label="Name" varde={namn} satt={setNamn} />
        <TextFalt label="E-mail" varde={epost} satt={setEpost} />
        <TextFalt label="Password (at least 8 characters)" varde={losenord} satt={setLosenord} losenord />
        <div className="mb-3 grid grid-cols-3 gap-2">
          {(Object.keys(ROLL_LABEL) as PlattformRoll[]).map((valbar) => (
            <button
              key={valbar}
              type="button"
              onClick={() => setRoll(valbar)}
              className={`min-h-9 border text-[12px] font-semibold ${
                roll === valbar
                  ? "border-[#00437A] bg-[#00437A] text-white"
                  : "border-[#ADADAD] bg-[#F7F7F7] text-[#333333]"
              }`}
            >
              {ROLL_LABEL[valbar]}
            </button>
          ))}
        </div>
        {fel && <p className="mb-3 font-semibold text-[#8B1A1A]">{fel}</p>}
        <StorKnapp type="submit" disabled={!epost.trim() || !namn.trim() || losenord.length < 8}>
          Create user
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

  // Inloggad användare tillfrågas aldrig om namn — kontot vet redan.
  const kontoNamn = plattformKonto()?.namn;
  useEffect(() => {
    if (!anvandare && kontoNamn) sattAnvandare(kontoNamn);
  }, [anvandare, kontoNamn, sattAnvandare]);

  if (!anvandare) {
    return (
      <FelsokningSkal rubrik="Guided Diagnostics">
        <Panel rubrik="Who is working?">
          <p className="mb-3 text-[14px] text-[#333333]">
            All work is logged with user and timestamp. Enter your name to begin.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (namn.trim()) sattAnvandare(namn);
            }}
          >
            <TextFalt label="Name" varde={namn} satt={setNamn} platshallare="e.g. Anna" />
            <StorKnapp type="submit" disabled={!namn.trim()}>
              Continue
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
    { id: "alla", label: "All", antal: alla.length },
    { id: "pagaende", label: "In progress", antal: pagaende.length },
    { id: "klara", label: "Complete", antal: klara.length },
  ];

  return (
    <FelsokningSkal
      rubrik="Guided Diagnostics"
      hoger={<span className="text-[12px] font-semibold text-[#A9C3DE]">{anvandare}</span>}
    >
      <Link to="/felsokning/nytt">
        <StorKnapp className="mb-4">+ New case</StorKnapp>
      </Link>

      {alla.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-1 border border-[#C6C6C6] bg-[#F7F7F7] p-1">
          {FILTER.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`min-h-9 text-[13px] font-semibold transition-colors ${
                filter === f.id ? "bg-[#00437A] text-white" : "text-[#333333] hover:bg-[#E4E9EE]"
              }`}
            >
              {f.label} · {f.antal}
            </button>
          ))}
        </div>
      )}

      {alla.length === 0 && (
        <Panel rubrik="Get started">
          <p className="mb-3 text-[14px] text-[#333333]">
            No cases yet. Start by identifying an object — or explore a finished demo case with a complete work log, brief and customer report.
          </p>
          <StorKnapp variant="sekundar" onClick={() => laggInArende(byggDemoArende(nastaNummer, anvandare))}>
            Create demo case (Volvo XC60, vibration)
          </StorKnapp>
        </Panel>
      )}

      {lista.length === 0 && alla.length > 0 && (
        <p className="text-center text-[14px] text-[#4A5560]">No cases in this filter.</p>
      )}

      {plattformAktiv() && <PlattformInloggning />}

      {!plattformKonto() && (
        <Link to="/felsokning/installningar" className="mb-4 block">
          <StorKnapp variant="sekundar"><IkonKugghjul /> Settings</StorKnapp>
        </Link>
      )}

      <Panel rubrik="Decision support">
        <p className="text-[#333333]">
          When you are signed in the system helps while you work: it proposes the next step from what you document, reviews the whole case on request and drafts the handover. It always separates verified from hypothesis — and never states a root cause that is not confirmed. Nothing to install or configure; it is part of the service. Without sign-in the checklist guides you step by step.
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
            <div className="mb-3 border border-[#C6C6C6] bg-[#F7F7F7] p-4 transition-colors hover:border-[#00437A]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold uppercase tracking-widest text-[#4A5560]">
                  Case #{arende.nummer}
                </span>
                <span
                  className={`px-2 py-0.5 text-[11px] font-semibold uppercase ${
                    avslutat ? "bg-[#8A94A0] text-white" : "bg-[#00437A] text-white"
                  }`}
                >
                  {avslutat ? "Closed" : "In progress"}
                </span>
              </div>
              <p className="mt-1 text-[15px] font-semibold">{o ? o.beskrivning : "Unknown object"}</p>
              {o && <p className="text-[12px] font-semibold text-[#4A5560]">{o.identifierare}{o.kund ? ` · ${o.kund}` : ""}</p>}
              {fel && <p className="mt-2 text-[14px] text-[#333333]">”{fel}”</p>}
              <p className="mt-2 text-[12px] text-[#707070]">
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
