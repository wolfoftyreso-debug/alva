// Inställningar: vilka objekttyper och identifieringsmetoder som visas
// när ett ärende startas. På plattformen får bara systemadministratören
// ändra (valet gäller hela organisationen); i lokalt läge gäller valet
// den här enheten.

import { useEffect, useState } from "react";
import {
  ALLA_IDENTIFIERINGSMETODER,
  ALLA_OBJEKTTYPER,
  hamtaInstallningar,
  lastaInstallningar,
  sparaInstallningar,
  type Installningar as Inst,
} from "@/felsokning/installningar";
import {
  hamtaIntegrationer,
  hamtaLeverantorer,
  plattformAktiv,
  plattformKonto,
  sparaIntegration,
  taBortIntegration,
  type Integration,
  type Leverantor,
} from "@/felsokning/plattform";
import { FelsokningSkal, Panel, StorKnapp, TextFalt } from "@/felsokning/ui";

function Vallista({
  alla,
  valda,
  vidByte,
}: {
  alla: string[];
  valda: string[];
  vidByte: (nya: string[]) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {alla.map((val) => {
        const aktiv = valda.includes(val);
        return (
          <button
            key={val}
            onClick={() => vidByte(aktiv ? valda.filter((v) => v !== val) : [...valda, val])}
            className={`min-h-10 rounded border px-2 font-semibold transition-colors ${
              aktiv
                ? "border-[#00437A] bg-[#00437A] text-white"
                : "border-[#ADADAD] bg-[#F7F7F7] text-[#4A5560]"
            }`}
          >
            {aktiv ? "✓ " : ""}
            {val}
          </button>
        );
      })}
    </div>
  );
}


// Märkesspecifika kopplingar: systemadministratören lägger in
// organisationens egna leverantörsuppgifter. Värdena skickas till
// servern, lagras krypterade och kommer aldrig tillbaka i klartext —
// hemliga fält visas alltid maskerade. Alla uppslag görs av servern.
function Integrationer() {
  const [leverantorer, setLeverantorer] = useState<Leverantor[]>([]);
  const [befintliga, setBefintliga] = useState<Integration[]>([]);
  const [krypteringKlar, setKrypteringKlar] = useState(true);
  const [oppen, setOppen] = useState<string | null>(null);
  const [varden, setVarden] = useState<Record<string, string>>({});
  const [fel, setFel] = useState("");
  const [sparat, setSparat] = useState("");

  const ladda = () => {
    hamtaLeverantorer().then(setLeverantorer).catch(() => setLeverantorer([]));
    hamtaIntegrationer()
      .then((svar) => {
        setBefintliga(svar.integrationer);
        setKrypteringKlar(svar.krypteringKonfigurerad);
      })
      .catch(() => setBefintliga([]));
  };

  useEffect(ladda, []);
  if (leverantorer.length === 0) return null;

  return (
    <Panel rubrik="Märkesspecifika kopplingar">
      <p className="mb-2 text-[12px] text-[#707070]">
        Organisationens egna avtal hos tillverkare och dataleverantörer. Uppgifterna lagras krypterat på
        plattformen och används bara av servern — de skickas aldrig till teknikernas enheter.
      </p>
      {!krypteringKlar && (
        <p className="mb-2 rounded border border-[#E0C36A] bg-[#FFF8E1] p-2 text-[12px] font-semibold text-[#9A6700]">
          Kryptering är inte konfigurerad i driften (INTEGRATION_NYCKEL) — uppgifter kan inte sparas förrän
          nyckeln finns.
        </p>
      )}

      {leverantorer.map((lev) => {
        const finns = befintliga.find((i) => i.leverantor === lev.id);
        return (
          <div key={lev.id} className="border-b border-[#EBEBEB] py-2 last:border-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold">{lev.namn}</p>
                {lev.beskrivning && <p className="text-[12px] text-[#707070]">{lev.beskrivning}</p>}
                {finns && (
                  <p className="mt-1 text-[12px] text-[#4A5560]">
                    {Object.entries(finns.uppgifter)
                      .map(([nyckel, varde]) => `${nyckel}: ${varde || "—"}`)
                      .join(" · ")}
                    {finns.senaste_status && ` · senaste uppslag: ${finns.senaste_status}`}
                  </p>
                )}
              </div>
              <span className={`shrink-0 text-[11px] font-semibold ${finns ? "text-[#1E6B34]" : "text-[#707070]"}`}>
                {finns ? "Konfigurerad" : "Ej konfigurerad"}
              </span>
            </div>

            {oppen === lev.id ? (
              <div className="mt-2 rounded border border-[#C6C6C6] bg-white p-2">
                {lev.falt.map((falt) => (
                  <TextFalt
                    key={falt.nyckel}
                    label={`${falt.etikett}${falt.hemlig ? " (lagras krypterat)" : ""}`}
                    varde={varden[falt.nyckel] ?? ""}
                    satt={(v) => setVarden((f) => ({ ...f, [falt.nyckel]: v }))}
                    losenord={falt.hemlig}
                  />
                ))}
                {fel && <p className="mb-2 text-[12px] font-semibold text-[#8B1A1A]">{fel}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <StorKnapp variant="sekundar" onClick={() => { setOppen(null); setFel(""); }}>
                    Avbryt
                  </StorKnapp>
                  <StorKnapp
                    disabled={!krypteringKlar}
                    onClick={async () => {
                      setFel("");
                      try {
                        await sparaIntegration(lev.id, varden);
                        setVarden({});
                        setOppen(null);
                        setSparat(lev.namn);
                        ladda();
                      } catch (misslyckande) {
                        setFel(misslyckande instanceof Error ? misslyckande.message : "Kunde inte spara.");
                      }
                    }}
                  >
                    Spara uppgifter
                  </StorKnapp>
                </div>
                <p className="mt-1 text-[11px] text-[#707070]">
                  Hemliga fält visas aldrig igen efter sparande — fyll i på nytt för att byta värde.
                </p>
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <StorKnapp
                  variant="sekundar"
                  onClick={() => {
                    setOppen(lev.id);
                    setFel("");
                    // Icke-hemliga värden förifylls så bara hemligheten
                    // behöver skrivas om.
                    const start: Record<string, string> = {};
                    for (const falt of lev.falt) {
                      if (!falt.hemlig && finns?.uppgifter[falt.nyckel]) start[falt.nyckel] = finns.uppgifter[falt.nyckel];
                    }
                    setVarden(start);
                  }}
                >
                  {finns ? "Uppdatera uppgifter" : "Lägg till uppgifter"}
                </StorKnapp>
                {finns && (
                  <StorKnapp
                    variant="fara"
                    onClick={async () => {
                      await taBortIntegration(lev.id);
                      ladda();
                    }}
                  >
                    Ta bort
                  </StorKnapp>
                )}
              </div>
            )}
          </div>
        );
      })}
      {sparat && <p className="mt-2 text-[12px] font-semibold text-[#1E6B34]">Uppgifter sparade för {sparat}.</p>}
    </Panel>
  );
}

export default function Installningar() {
  const konto = plattformKonto();
  const inloggad = plattformAktiv() && !!konto;
  const farAndra = !inloggad || konto?.roll === "admin";

  const [inst, setInst] = useState<Inst>(lastaInstallningar());
  const [status, setStatus] = useState<"" | "sparar" | "sparat" | "fel">("");
  const [felText, setFelText] = useState("");

  useEffect(() => {
    hamtaInstallningar().then(setInst);
  }, []);

  if (!farAndra) {
    return (
      <FelsokningSkal rubrik="Inställningar" tillbaka={{ till: "/felsokning", text: "Ärenden" }}>
        <Panel>
          <p className="text-[14px] text-[#333333]">
            Organisationens inställningar hanteras av er systemadministratör.
          </p>
        </Panel>
      </FelsokningSkal>
    );
  }

  const spara = async () => {
    if (inst.objekttyper.length === 0 || inst.identifieringsmetoder.length === 0) {
      setStatus("fel");
      setFelText("Minst ett alternativ måste vara valt i varje lista.");
      return;
    }
    setStatus("sparar");
    setFelText("");
    try {
      await sparaInstallningar(inst);
      setStatus("sparat");
    } catch (misslyckande) {
      setStatus("fel");
      setFelText(misslyckande instanceof Error ? misslyckande.message : "Kunde inte spara.");
    }
  };

  const byt = (nya: Partial<Inst>) => {
    setInst((f) => ({ ...f, ...nya }));
    setStatus("");
  };

  return (
    <FelsokningSkal rubrik="Inställningar" tillbaka={{ till: "/felsokning", text: "Ärenden" }}>
      <Panel>
        <p className="text-[#333333]">
          Välj vad som visas när ett nytt ärende startas.{" "}
          {inloggad
            ? "Valet gäller alla i organisationen."
            : "I lokalt läge gäller valet den här enheten; inloggad systemadministratör styr hela organisationen."}
        </p>
      </Panel>

      <Panel rubrik="Objekttyper">
        <Vallista
          alla={ALLA_OBJEKTTYPER}
          valda={inst.objekttyper}
          vidByte={(objekttyper) => byt({ objekttyper })}
        />
      </Panel>

      <Panel rubrik="Identifieringsmetoder">
        <Vallista
          alla={ALLA_IDENTIFIERINGSMETODER}
          valda={inst.identifieringsmetoder}
          vidByte={(identifieringsmetoder) => byt({ identifieringsmetoder })}
        />
      </Panel>

      {inloggad && <Integrationer />}

      {status === "fel" && <p className="mb-3 font-semibold text-[#8B1A1A]">{felText}</p>}
      {status === "sparat" && <p className="mb-3 font-semibold text-[#1E6B34]">✓ Sparat</p>}
      <StorKnapp disabled={status === "sparar"} onClick={spara}>
        {status === "sparar" ? "Sparar …" : "Spara inställningar"}
      </StorKnapp>
    </FelsokningSkal>
  );
}
