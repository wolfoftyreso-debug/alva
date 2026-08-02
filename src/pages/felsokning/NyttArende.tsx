import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Objekt } from "@/felsokning/domain";
import { useFelsokning } from "@/felsokning/store";
import { valjMetodik } from "@/felsokning/metodik";
import { FelsokningSkal, Panel, StorKnapp, TextFalt } from "@/felsokning/ui";

const IDENTIFIERINGSMETODER = ["Registreringsnummer", "VIN", "Serienummer", "Maskinnummer", "Manuell inmatning"];
const OBJEKTTYPER = ["Fordon", "Lastbil/Buss", "Entreprenadmaskin", "Industrimaskin", "Elsystem", "Hydraulik", "Övrigt"];

// Ingen felsökning börjar innan objektet identifierats och bekräftats.
export default function NyttArende() {
  const navigate = useNavigate();
  const skapaArende = useFelsokning((s) => s.skapaArende);

  const [steg, setSteg] = useState<"identifiera" | "bekrafta" | "felbeskrivning">("identifiera");
  const [metod, setMetod] = useState(IDENTIFIERINGSMETODER[0]);
  const [typ, setTyp] = useState(OBJEKTTYPER[0]);
  const [identifierare, setIdentifierare] = useState("");
  const [beskrivning, setBeskrivning] = useState("");
  const [kund, setKund] = useState("");
  const [fel, setFel] = useState("");

  const objektet: Objekt = {
    typ,
    identifierare: identifierare.trim().toUpperCase(),
    identifieringsmetod: metod,
    beskrivning: beskrivning.trim() || identifierare.trim().toUpperCase(),
    kund: kund.trim() || undefined,
  };

  if (steg === "identifiera") {
    return (
      <FelsokningSkal rubrik="Identifiera objekt" tillbaka={{ till: "/felsokning", text: "Ärenden" }}>
        <Panel rubrik="Objekttyp">
          <div className="grid grid-cols-2 gap-2">
            {OBJEKTTYPER.map((t) => (
              <StorKnapp key={t} variant={t === typ ? "primar" : "sekundar"} onClick={() => setTyp(t)}>
                {t}
              </StorKnapp>
            ))}
          </div>
        </Panel>
        <Panel rubrik="Identifieringsmetod">
          <div className="grid grid-cols-2 gap-2">
            {IDENTIFIERINGSMETODER.map((m) => (
              <StorKnapp key={m} variant={m === metod ? "primar" : "sekundar"} onClick={() => setMetod(m)}>
                {m}
              </StorKnapp>
            ))}
          </div>
          <p className="mt-3 text-sm text-zinc-500">
            QR-kod, streckkod och OCR från typskylt tillkommer i senare version — ange identiteten manuellt.
          </p>
        </Panel>
        <Panel rubrik="Objektets identitet">
          <TextFalt label={metod} varde={identifierare} satt={setIdentifierare} platshallare="T.ex. ABC123" />
          <TextFalt label="Beskrivning (märke, modell, år)" varde={beskrivning} satt={setBeskrivning} platshallare="T.ex. Volvo XC60 D4 2019" />
          <TextFalt label="Kund (valfritt)" varde={kund} satt={setKund} platshallare="T.ex. Anders Svensson" />
          <StorKnapp disabled={!identifierare.trim()} onClick={() => setSteg("bekrafta")}>
            Fortsätt
          </StorKnapp>
        </Panel>
      </FelsokningSkal>
    );
  }

  if (steg === "bekrafta") {
    return (
      <FelsokningSkal rubrik="Bekräfta objekt" tillbaka={{ till: "/felsokning", text: "Ärenden" }}>
        <Panel>
          <p className="text-sm font-extrabold uppercase tracking-widest text-zinc-400">{objektet.typ}</p>
          <p className="mt-1 text-3xl font-extrabold">{objektet.beskrivning}</p>
          <p className="mt-1 text-xl font-bold text-amber-400">{objektet.identifierare}</p>
          <p className="mt-1 text-sm text-zinc-400">Identifierad via: {objektet.identifieringsmetod}</p>
          {objektet.kund && <p className="mt-1 text-lg text-zinc-200">Kund: {objektet.kund}</p>}
        </Panel>
        <div className="grid grid-cols-2 gap-2">
          <StorKnapp variant="sekundar" onClick={() => setSteg("identifiera")}>
            Ändra
          </StorKnapp>
          <StorKnapp onClick={() => setSteg("felbeskrivning")}>Rätt objekt — fortsätt</StorKnapp>
        </div>
      </FelsokningSkal>
    );
  }

  const metodik = fel.trim() ? valjMetodik(fel) : undefined;

  return (
    <FelsokningSkal rubrik="Beskriv felet" tillbaka={{ till: "/felsokning", text: "Ärenden" }}>
      <Panel rubrik={`${objektet.beskrivning} · ${objektet.identifierare}`}>
        <TextFalt
          label="Kundens/användarens felbeskrivning"
          varde={fel}
          satt={setFel}
          platshallare="T.ex. Bilen vibrerar runt 88 km/h"
          flerRad
        />
        {metodik && (
          <p className="mb-3 text-sm font-bold text-zinc-400">
            Vald metodik: <span className="text-amber-400">{metodik.namn}</span>
          </p>
        )}
        <StorKnapp
          disabled={!fel.trim()}
          onClick={() => {
            const id = skapaArende(objektet, fel.trim());
            navigate(`/felsokning/arende/${id}`);
          }}
        >
          Starta arbetslogg
        </StorKnapp>
      </Panel>
    </FelsokningSkal>
  );
}
