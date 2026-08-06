// Arbetsledarvyn: organisationens alla ärenden med status och statistik.
// Endast arbetsledare/admin (servern verifierar behörigheten). Ett ärende
// kan hämtas till den här enheten — händelserna flätas ihop konfliktfritt
// med eventuell lokal kopia.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Arende } from "@/felsokning/domain";
import {
  hamtaAnvandare,
  hamtaFelorsaksstatistik,
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
        Reassign
      </StorKnapp>
    );
  }
  return (
    <div className="col-span-2 border border-[#D7DCE2] bg-white p-2">
      <p className="mb-2 text-[12px] font-semibold uppercase text-[#4D5662]">New responsible technician</p>
      <div className="grid grid-cols-2 gap-2">
        {personer.map((person) => (
          <button
            key={person.id}
            className="min-h-9 border border-[#D7DCE2] font-semibold text-[#1B1E22] hover:border-[#005CA9]"
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
          className="min-h-9 border border-[#D7DCE2] font-semibold text-[#4D5662]"
          onClick={() => setOppen(false)}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function Oversikt() {
  const navigate = useNavigate();
  const { arenden, laggInArende, sammanfoga } = useFelsokning();
  const [rader, setRader] = useState<OversiktsRad[] | null>(null);
  const [felorsaker, setFelorsaker] = useState<{ orsak: string; antal: number }[]>([]);
  const [fel, setFel] = useState("");
  const konto = plattformKonto();
  const behorig = plattformAktiv() && (konto?.roll === "arbetsledare" || konto?.roll === "admin");

  useEffect(() => {
    if (!behorig) return;
    hamtaOversikt()
      .then(setRader)
      .catch(() => setFel("Could not retrieve the overview — check the sign-in."));
    // Flottdata: återkommande felorsaker över organisationen.
    hamtaFelorsaksstatistik().then(setFelorsaker).catch(() => setFelorsaker([]));
  }, [behorig]);

  if (!behorig) {
    return (
      <FelsokningSkal rubrik="Organization overview" tillbaka={{ till: "/felsokning", text: "Cases" }}>
        <Panel>
          <p className="text-[14px] text-[#1B1E22]">
            The overview requires supervisor or administrator rights on the platform.
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
      setFel("Could not retrieve the case.");
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
      rubrik="Organization overview"
      tillbaka={{ till: "/felsokning", text: "Cases" }}
      hoger={<span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#4D5662]">{konto?.organisation}</span>}
    >
      {fel && <p className="mb-4 font-semibold text-[#8B1A1A]">{fel}</p>}
      {!rader && !fel && <p className="text-[14px] text-[#4D5662]">Retrieving …</p>}

      {rader && (
        <>
          <Panel rubrik="Statistics">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[20px] font-semibold">{rader.length}</p>
                <p className="text-[12px] font-semibold uppercase text-[#4D5662]">Total</p>
              </div>
              <div>
                <p className="text-[20px] font-semibold text-[#005CA9]">{pagaende.length}</p>
                <p className="text-[12px] font-semibold uppercase text-[#4D5662]">In progress</p>
              </div>
              <div>
                <p className="text-[20px] font-semibold">{avslutade.length}</p>
                <p className="text-[12px] font-semibold uppercase text-[#4D5662]">Closed</p>
              </div>
            </div>
            {avslutade.length > 0 && (
              <p className="mt-4 text-center text-[#1B1E22]">
                Average lead time for closed cases: <span className="font-semibold">{formateraTid(medelLedtidMs)}</span>
              </p>
            )}
          </Panel>

          {felorsaker.length > 0 && (
            <Panel rubrik="Root cause statistics — recurring faults in the organization">
              {felorsaker.map((rad) => (
                <div key={rad.orsak} className="flex items-center gap-2 py-0 text-[13px]">
                  <span className="w-52 shrink-0 text-[#1B1E22]">{rad.orsak}</span>
                  <span
                    className="h-3 bg-[#005CA9]"
                    style={{ width: `${Math.min(100, (rad.antal / felorsaker[0].antal) * 100)}%`, minWidth: 6 }}
                  />
                  <span className="font-semibold">{rad.antal}</span>
                </div>
              ))}
              <p className="mt-2 text-[11px] text-[#4D5662]">
                From documented root cause analyses — shows patterns such as wear, previous repairs or possible design problems.
              </p>
            </Panel>
          )}

          {rader.length === 0 && <p className="text-center text-[14px] text-[#4D5662]">No cases in the organization yet.</p>}

          {rader.map((rad) => (
            <div key={rad.id} className="mb-4 border border-[#D7DCE2] bg-[#F6F7F8] p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold uppercase tracking-widest text-[#4D5662]">
                  Case #{rad.nummer}
                </span>
                <span
                  className={`px-2 py-0 text-[11px] font-semibold uppercase ${
                    rad.avslutat ? "bg-[#4D5662] text-white" : "bg-[#005CA9] text-white"
                  }`}
                >
                  {rad.avslutat ? "Closed" : "In progress"}
                </span>
              </div>
              <p className="mt-2 text-[15px] font-semibold">{rad.objekt ?? "Unknown object"}</p>
              {rad.felbeskrivning && <p className="text-[14px] text-[#1B1E22]">”{rad.felbeskrivning}”</p>}
              <p className="mt-2 text-[12px] text-[#4D5662]">
                Ansvarig: <span className="font-semibold text-[#1B1E22]">{rad.ansvarig ?? rad.skapare ?? "—"}</span>
                {` · ${rad.antal_handelser} events`}
                {rad.senaste ? ` · senast ${tidDatum(rad.senaste)} ${tidKlockslag(rad.senaste)}` : ""}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <StorKnapp variant="sekundar" onClick={() => oppna(rad)}>
                  Open the case
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
