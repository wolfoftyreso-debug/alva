import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Objekt } from "@/felsokning/domain";
import { useFelsokning } from "@/felsokning/store";
import { valjMetodik } from "@/felsokning/metodik";
import { valjMetodikMedAi } from "@/felsokning/ai";
import { hamtaInstallningar, lastaInstallningar } from "@/felsokning/installningar";
import { FelsokningSkal, Panel, StorKnapp, TextFalt } from "@/felsokning/ui";

// Ingen felsökning börjar innan objektet identifierats och bekräftats.
// Vilka objekttyper och identifieringsmetoder som visas styrs av
// organisationens inställningar (systemadmin) — enhetens val i lokalt läge.
export default function NyttArende() {
  const navigate = useNavigate();
  const skapaArende = useFelsokning((s) => s.skapaArende);

  const [inst, setInst] = useState(lastaInstallningar());
  const [steg, setSteg] = useState<"identifiera" | "bekrafta" | "felbeskrivning">("identifiera");
  const [metod, setMetod] = useState(inst.identifieringsmetoder[0]);
  const [typ, setTyp] = useState(inst.objekttyper[0]);

  useEffect(() => {
    hamtaInstallningar().then((farsk) => {
      setInst(farsk);
      setTyp((t) => (farsk.objekttyper.includes(t) ? t : farsk.objekttyper[0]));
      setMetod((m) => (farsk.identifieringsmetoder.includes(m) ? m : farsk.identifieringsmetoder[0]));
    });
  }, []);
  const [identifierare, setIdentifierare] = useState("");
  const [beskrivning, setBeskrivning] = useState("");
  const [kund, setKund] = useState("");
  const [fel, setFel] = useState("");
  const [startar, setStartar] = useState(false);

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
            {inst.objekttyper.map((t) => (
              <StorKnapp key={t} variant={t === typ ? "primar" : "sekundar"} onClick={() => setTyp(t)}>
                {t}
              </StorKnapp>
            ))}
          </div>
        </Panel>
        <Panel rubrik="Identifieringsmetod">
          <div className="grid grid-cols-2 gap-2">
            {inst.identifieringsmetoder.map((m) => (
              <StorKnapp key={m} variant={m === metod ? "primar" : "sekundar"} onClick={() => setMetod(m)}>
                {m}
              </StorKnapp>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-[#707070]">
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
          <p className="text-[12px] font-semibold uppercase tracking-widest text-[#4A5560]">{objektet.typ}</p>
          <p className="mt-1 text-[20px] font-semibold">{objektet.beskrivning}</p>
          <p className="mt-1 text-[15px] font-semibold text-[#00437A]">{objektet.identifierare}</p>
          <p className="mt-1 text-[12px] text-[#4A5560]">Identifierad via: {objektet.identifieringsmetod}</p>
          {objektet.kund && <p className="mt-1 text-[14px] text-[#333333]">Kund: {objektet.kund}</p>}
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
          rost
        />
        {metodik && (
          <p className="mb-3 text-[12px] font-semibold text-[#4A5560]">
            Vald metodik: <span className="text-[#00437A]">{metodik.namn}</span>
          </p>
        )}
        <StorKnapp
          disabled={!fel.trim() || startar}
          onClick={async () => {
            setStartar(true);
            // Träffar nyckelordsvalet ingen specifik metodik får orkesterns
            // klassificerare (Haiku 4.5) välja; i lokalt läge blir det generisk.
            let metodikId: string | undefined;
            if (valjMetodik(fel).id === "generisk") {
              metodikId = (await valjMetodikMedAi(fel.trim())) ?? undefined;
            }
            const id = skapaArende(objektet, fel.trim(), metodikId);
            navigate(`/felsokning/arende/${id}`);
          }}
        >
          {startar ? "Startar …" : "Starta arbetslogg"}
        </StorKnapp>
      </Panel>
    </FelsokningSkal>
  );
}
