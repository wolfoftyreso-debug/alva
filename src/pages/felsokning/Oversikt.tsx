// Arbetsledarvyn: organisationens alla ärenden med status och statistik.
// Endast arbetsledare/admin (servern verifierar behörigheten). Ett ärende
// kan hämtas till den här enheten — händelserna flätas ihop konfliktfritt
// med eventuell lokal kopia.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Arende } from "@/felsokning/domain";
import {
  hamtaAnvandare,
  hamtaOversikt,
  plattformAktiv,
  plattformFetch,
  plattformKonto,
  type OversiktsRad,
  type PlattformAnvandare,
} from "@/felsokning/plattform";
import { nyLoggPost } from "@/felsokning/domain";
import { flataIhop } from "@/felsokning/synk";
import { useFelsokning } from "@/felsokning/store";
import { formateraTid } from "@/felsokning/projektioner";
import { FelsokningSkal, Panel, StorKnapp } from "@/felsokning/ui";
import { tidDatum, tidKlockslag } from "@/felsokning/format";

// Omfördelning: arbetsledaren pekar ut ny ansvarig tekniker — loggas som
// append-only-händelsen ansvarig_satt i ärendets logg (organisationsintern,
// delas aldrig i kund-/partnervyer).
function Omfordela({ rad, vidKlar }: { rad: OversiktsRad; vidKlar: () => void }) {
  const [oppen, setOppen] = useState(false);
  const [personer, setPersoner] = useState<PlattformAnvandare[]>([]);
  const konto = plattformKonto();

  if (!oppen) {
    return (
      <StorKnapp
        variant="sekundar"
        onClick={() => {
          setOppen(true);
          hamtaAnvandare().then(setPersoner).catch(() => setPersoner([]));
        }}
      >
        Omfördela
      </StorKnapp>
    );
  }
  return (
    <div className="col-span-2 rounded-lg border-2 border-zinc-700 bg-zinc-950 p-2">
      <p className="mb-2 text-sm font-bold uppercase text-zinc-400">Ny ansvarig tekniker</p>
      <div className="grid grid-cols-2 gap-2">
        {personer.map((person) => (
          <button
            key={person.id}
            className="min-h-12 rounded-lg border-2 border-zinc-600 font-extrabold text-zinc-200 hover:border-amber-400"
            onClick={async () => {
              const post = nyLoggPost(konto?.namn ?? "arbetsledare", {
                typ: "ansvarig_satt",
                ansvarig: person.namn,
              });
              await plattformFetch(`/api/arenden/${rad.id}/handelser`, {
                method: "POST",
                body: JSON.stringify({ handelser: [post] }),
              });
              setOppen(false);
              vidKlar();
            }}
          >
            {person.namn}
          </button>
        ))}
        <button
          className="min-h-12 rounded-lg border-2 border-zinc-600 font-bold text-zinc-400"
          onClick={() => setOppen(false)}
        >
          Avbryt
        </button>
      </div>
    </div>
  );
}

export default function Oversikt() {
  const navigate = useNavigate();
  const { arenden, laggInArende, sammanfoga } = useFelsokning();
  const [rader, setRader] = useState<OversiktsRad[] | null>(null);
  const [fel, setFel] = useState("");
  const konto = plattformKonto();
  const behorig = plattformAktiv() && (konto?.roll === "arbetsledare" || konto?.roll === "admin");

  useEffect(() => {
    if (!behorig) return;
    hamtaOversikt()
      .then(setRader)
      .catch(() => setFel("Kunde inte hämta översikten — kontrollera inloggningen."));
  }, [behorig]);

  if (!behorig) {
    return (
      <FelsokningSkal rubrik="Organisationsöversikt" tillbaka={{ till: "/felsokning", text: "Ärenden" }}>
        <Panel>
          <p className="text-lg text-zinc-300">
            Översikten kräver arbetsledar- eller administratörsbehörighet på plattformen.
          </p>
        </Panel>
      </FelsokningSkal>
    );
  }

  // Hämtar ärendets händelser och materialiserar det lokalt (flätning om
  // en lokal kopia redan finns), sedan öppnas arbetsytan.
  const oppna = async (rad: OversiktsRad) => {
    try {
      const res = await plattformFetch(`/api/arenden/${rad.id}/handelser`);
      if (!res.ok) throw new Error(`Fel ${res.status}`);
      const { handelser } = (await res.json()) as {
        handelser: { id: string; tidpunkt: string; anvandare: string; handelse: Arende["handelser"][number]["handelse"] }[];
      };
      const fjarr = handelser.map((h) => ({ ...h, tidpunkt: new Date(h.tidpunkt).toISOString() }));
      const lokal = arenden[rad.id];
      if (lokal) {
        sammanfoga(rad.id, flataIhop(lokal.handelser, fjarr));
      } else {
        laggInArende({
          id: rad.id,
          nummer: rad.nummer,
          skapad: new Date(rad.skapad).toISOString(),
          delningskod: rad.delningskod ?? undefined,
          metodikId: rad.metodik_id ?? undefined,
          handelser: fjarr,
        });
      }
      navigate(`/felsokning/arende/${rad.id}`);
    } catch {
      setFel("Kunde inte hämta ärendet.");
    }
  };

  const pagaende = rader?.filter((r) => !r.avslutat) ?? [];
  const avslutade = rader?.filter((r) => r.avslutat) ?? [];
  const medelLedtidMs =
    avslutade.length > 0
      ? avslutade.reduce(
          (summa, r) =>
            summa + (r.forsta && r.senaste ? new Date(r.senaste).getTime() - new Date(r.forsta).getTime() : 0),
          0,
        ) / avslutade.length
      : 0;

  return (
    <FelsokningSkal
      rubrik="Organisationsöversikt"
      tillbaka={{ till: "/felsokning", text: "Ärenden" }}
      hoger={<span className="text-sm font-bold text-zinc-400">{konto?.organisation}</span>}
    >
      {fel && <p className="mb-3 font-bold text-red-400">{fel}</p>}
      {!rader && !fel && <p className="animate-pulse text-lg text-zinc-400">Hämtar …</p>}

      {rader && (
        <>
          <Panel rubrik="Statistik">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-3xl font-extrabold">{rader.length}</p>
                <p className="text-sm font-bold uppercase text-zinc-400">Totalt</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-amber-400">{pagaende.length}</p>
                <p className="text-sm font-bold uppercase text-zinc-400">Pågående</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold">{avslutade.length}</p>
                <p className="text-sm font-bold uppercase text-zinc-400">Avslutade</p>
              </div>
            </div>
            {avslutade.length > 0 && (
              <p className="mt-3 text-center text-zinc-300">
                Genomsnittlig ledtid för avslutade: <span className="font-extrabold">{formateraTid(medelLedtidMs)}</span>
              </p>
            )}
          </Panel>

          {rader.length === 0 && <p className="text-center text-lg text-zinc-400">Inga ärenden i organisationen ännu.</p>}

          {rader.map((rad) => (
            <div key={rad.id} className="mb-3 rounded-lg border-2 border-zinc-700 bg-zinc-900 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-extrabold uppercase tracking-widest text-zinc-400">
                  Ärende #{rad.nummer}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-extrabold uppercase ${
                    rad.avslutat ? "bg-zinc-700 text-zinc-300" : "bg-amber-400 text-zinc-950"
                  }`}
                >
                  {rad.avslutat ? "Avslutat" : "Pågående"}
                </span>
              </div>
              <p className="mt-1 text-xl font-extrabold">{rad.objekt ?? "Okänt objekt"}</p>
              {rad.felbeskrivning && <p className="text-lg text-zinc-200">”{rad.felbeskrivning}”</p>}
              <p className="mt-1 text-sm text-zinc-500">
                Ansvarig: <span className="font-bold text-zinc-300">{rad.ansvarig ?? rad.skapare ?? "—"}</span>
                {` · ${rad.antal_handelser} händelser`}
                {rad.senaste ? ` · senast ${tidDatum(rad.senaste)} ${tidKlockslag(rad.senaste)}` : ""}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <StorKnapp variant="sekundar" onClick={() => oppna(rad)}>
                  Öppna ärendet
                </StorKnapp>
                {!rad.avslutat && <Omfordela rad={rad} vidKlar={() => hamtaOversikt().then(setRader)} />}
              </div>
            </div>
          ))}
        </>
      )}
    </FelsokningSkal>
  );
}
