import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useFelsokning, metodikForArende } from "@/felsokning/store";
import { arAvslutat, felbeskrivning, objekt, sistaAktivitet, brief } from "@/felsokning/projektioner";
import { byggDemoArende } from "@/felsokning/demo";
import {
  loggaInPlattform,
  plattformAktiv,
  plattformKonto,
  registreraPlattform,
  type PlattformKonto,
} from "@/felsokning/plattform";
import { FelsokningSkal, Panel, StorKnapp, TextFalt } from "@/felsokning/ui";
import { IkonDiagram, IkonKugghjul } from "@/felsokning/ikoner";
import { tidDatum, tidKlockslag } from "@/felsokning/format";

type Filter = "alla" | "pagaende" | "klara";

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

  // Inloggad: kontot och användaradministrationen hör hemma under
  // Inställningar. Diagnosrutan är teknikerns startskärm och visar
  // arbetet — inget annat.
  if (konto) return null;

  return (
    <Panel rubrik="Platform account">
      {lage === "stangd" ? (
        <>
          <p className="mb-2 text-[#1B1E22]">
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
          {fel && <p className="mb-4 font-semibold text-[#8B1A1A]">{fel}</p>}
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
          <p className="mb-4 text-[14px] text-[#1B1E22]">
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
      hoger={
        // Diagnosrutan är teknikerns startskärm. Härifrån når man
        // statistiken och inställningarna — de ligger i sidhuvudet, inte
        // som paneler i arbetsflödet. På smal skärm bär ikonen ensam;
        // aria-label finns alltid.
        <div className="flex items-center gap-4">
          <span className="hidden text-[12px] font-semibold uppercase tracking-[0.08em] text-[#4D5662] md:inline">
            {anvandare}
          </span>
          <Link
            to="/felsokning/oversikt"
            aria-label="Statistics"
            className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#4D5662] hover:text-[#005CA9]"
          >
            <IkonDiagram /> <span className="hidden sm:inline">Statistics</span>
          </Link>
          <Link
            to="/felsokning/installningar"
            aria-label="Settings"
            className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#4D5662] hover:text-[#005CA9]"
          >
            <IkonKugghjul /> <span className="hidden sm:inline">Settings</span>
          </Link>
        </div>
      }
    >
      <Link to="/felsokning/nytt">
        <StorKnapp className="mb-4">+ New case</StorKnapp>
      </Link>

      {alla.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-2 border border-[#D7DCE2] bg-[#F6F7F8] p-2">
          {FILTER.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`min-h-9 text-[13px] font-semibold ${
                filter === f.id ? "bg-[#005CA9] text-white" : "text-[#1B1E22] hover:bg-[#D7DCE2]"
              }`}
            >
              {f.label} · {f.antal}
            </button>
          ))}
        </div>
      )}

      {lista.length === 0 && alla.length > 0 && (
        <p className="text-center text-[14px] text-[#4D5662]">No cases in this filter.</p>
      )}

      {/* Ärendet öppnas i ett eget fönster — teknikern behåller
          diagnosrutan som den är och kan ha flera ärenden uppe
          samtidigt, ett per bil på golvet. */}
      {lista.map((arende) => {
        const o = objekt(arende);
        const fel = felbeskrivning(arende);
        const sista = sistaAktivitet(arende);
        const avslutat = arAvslutat(arende);
        const b = brief(arende, metodikForArende(arende), new Date().toISOString());
        return (
          <Link
            key={arende.id}
            to={`/felsokning/arende/${arende.id}`}
            target="_blank"
            rel="noopener"
            className="block"
          >
            <div className="mb-4 border border-[#D7DCE2] bg-[#F6F7F8] p-4 hover:border-[#005CA9]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold uppercase tracking-widest text-[#4D5662]">
                  Case #{arende.nummer}
                </span>
                <span
                  className={`px-2 py-0 text-[11px] font-semibold uppercase ${
                    avslutat ? "bg-[#4D5662] text-white" : "bg-[#005CA9] text-white"
                  }`}
                >
                  {avslutat ? "Closed" : "In progress"}
                </span>
              </div>
              <p className="mt-2 text-[15px] font-semibold">{o ? o.beskrivning : "Unknown object"}</p>
              {o && <p className="text-[12px] font-semibold text-[#4D5662]">{o.identifierare}{o.kund ? ` · ${o.kund}` : ""}</p>}
              {fel && <p className="mt-2 text-[14px] text-[#1B1E22]">”{fel}”</p>}
              <p className="mt-2 text-[12px] text-[#4D5662]">
                {sista ? `Last activity ${tidDatum(sista.tidpunkt)} ${tidKlockslag(sista.tidpunkt)}` : ""}
                {" · "}
                {b.totalArbetstid}
              </p>
            </div>
          </Link>
        );
      })}

      {alla.length === 0 && (
        <Panel rubrik="Get started">
          <p className="mb-4 text-[14px] text-[#1B1E22]">
            No cases yet. Start by identifying an object — or explore a finished demo case with a complete work log, brief and customer report.
          </p>
          <StorKnapp variant="sekundar" onClick={() => laggInArende(byggDemoArende(nastaNummer, anvandare))}>
            Create demo case (Volvo XC60, vibration)
          </StorKnapp>
        </Panel>
      )}

      {plattformAktiv() && <PlattformInloggning />}

      {/* Beslutsstödet förklaras för den som är ny — inte på varje
          besök. Har listan ärenden är rutan brus framför arbetet. */}
      {alla.length === 0 && (
        <Panel rubrik="Decision support">
          <p className="text-[#1B1E22]">
            When you are signed in the system helps while you work: it proposes the next step from what you document, reviews the whole case on request and drafts the handover. It always separates verified from hypothesis — and never states a root cause that is not confirmed. Nothing to install or configure; it is part of the service. Without sign-in the checklist guides you step by step.
          </p>
        </Panel>
      )}
    </FelsokningSkal>
  );
}
