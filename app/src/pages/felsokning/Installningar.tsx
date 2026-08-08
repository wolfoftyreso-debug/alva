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
            className={`min-h-10 border px-2 font-semibold ${
              aktiv
                ? "border-[#005CA9] bg-[#005CA9] text-white"
                : "border-[#D7DCE2] bg-[#F6F7F8] text-[#4D5662]"
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
    <Panel rubrik="Brand-specific connectors">
      <p className="mb-2 text-[12px] text-[#4D5662]">
        The organization's own agreements with manufacturers and data providers. The details are stored encrypted on the platform and used only by the server — they are never sent to technicians' devices.
      </p>
      {!krypteringKlar && (
        <p className="mb-2 border border-[#8A5A00] bg-[#FFFFFF] p-2 text-[12px] font-semibold text-[#8A5A00]">
          Encryption is not configured in this deployment (INTEGRATION_NYCKEL) — details cannot be saved until the key exists.
        </p>
      )}

      {leverantorer.map((lev) => {
        const finns = befintliga.find((i) => i.leverantor === lev.id);
        return (
          <div key={lev.id} className="border-b border-[#D7DCE2] py-2 last:border-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold">{lev.namn}</p>
                {lev.beskrivning && <p className="text-[12px] text-[#4D5662]">{lev.beskrivning}</p>}
                {finns && (
                  <p className="mt-2 text-[12px] text-[#4D5662]">
                    {Object.entries(finns.uppgifter)
                      .map(([nyckel, varde]) => `${nyckel}: ${varde || "—"}`)
                      .join(" · ")}
                    {finns.senaste_status && ` · senaste uppslag: ${finns.senaste_status}`}
                  </p>
                )}
              </div>
              <span className={`shrink-0 text-[11px] font-semibold ${finns ? "text-[#005CA9]" : "text-[#4D5662]"}`}>
                {finns ? "Configured" : "Not configured"}
              </span>
            </div>

            {oppen === lev.id ? (
              <div className="mt-2 border border-[#D7DCE2] bg-white p-2">
                {lev.falt.map((falt) => (
                  <TextFalt
                    key={falt.nyckel}
                    label={`${falt.etikett}${falt.hemlig ? " (stored encrypted)" : ""}`}
                    varde={varden[falt.nyckel] ?? ""}
                    satt={(v) => setVarden((f) => ({ ...f, [falt.nyckel]: v }))}
                    losenord={falt.hemlig}
                  />
                ))}
                {fel && <p className="mb-2 text-[12px] font-semibold text-[#8B1A1A]">{fel}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <StorKnapp variant="sekundar" onClick={() => { setOppen(null); setFel(""); }}>
                    Cancel
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
                        setFel(misslyckande instanceof Error ? misslyckande.message : "Could not save.");
                      }
                    }}
                  >
                    Save details
                  </StorKnapp>
                </div>
                <p className="mt-2 text-[11px] text-[#4D5662]">
                  Secret fields are never shown again after saving — enter a new value to replace one.
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
                  {finns ? "Update details" : "Add details"}
                </StorKnapp>
                {finns && (
                  <StorKnapp
                    variant="fara"
                    onClick={async () => {
                      await taBortIntegration(lev.id);
                      ladda();
                    }}
                  >
                    Delete
                  </StorKnapp>
                )}
              </div>
            )}
          </div>
        );
      })}
      {sparat && <p className="mt-2 text-[12px] font-semibold text-[#005CA9]">Details saved for {sparat}.</p>}
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
      <FelsokningSkal rubrik="Settings" tillbaka={{ till: "/felsokning", text: "Cases" }}>
        <Panel>
          <p className="text-[14px] text-[#1B1E22]">
            Organization settings are managed by your system administrator.
          </p>
        </Panel>
      </FelsokningSkal>
    );
  }

  const spara = async () => {
    if (inst.objekttyper.length === 0 || inst.identifieringsmetoder.length === 0) {
      setStatus("fel");
      setFelText("At least one option must be selected in each list.");
      return;
    }
    setStatus("sparar");
    setFelText("");
    try {
      await sparaInstallningar(inst);
      setStatus("sparat");
    } catch (misslyckande) {
      setStatus("fel");
      setFelText(misslyckande instanceof Error ? misslyckande.message : "Could not save.");
    }
  };

  const byt = (nya: Partial<Inst>) => {
    setInst((f) => ({ ...f, ...nya }));
    setStatus("");
  };

  return (
    <FelsokningSkal rubrik="Settings" tillbaka={{ till: "/felsokning", text: "Cases" }}>
      <Panel>
        <p className="text-[#1B1E22]">
          Choose what is shown when a new case is started.{" "}
          {inloggad
            ? "The setting applies to everyone in the organization."
            : "In local mode the setting applies to this device; a signed-in system administrator governs the whole organization."}
        </p>
      </Panel>

      <Panel rubrik="Object types">
        <Vallista
          alla={ALLA_OBJEKTTYPER}
          valda={inst.objekttyper}
          vidByte={(objekttyper) => byt({ objekttyper })}
        />
      </Panel>

      <Panel rubrik="Identification methods">
        <Vallista
          alla={ALLA_IDENTIFIERINGSMETODER}
          valda={inst.identifieringsmetoder}
          vidByte={(identifieringsmetoder) => byt({ identifieringsmetoder })}
        />
      </Panel>

      {inloggad && <Integrationer />}

      {status === "fel" && <p className="mb-4 font-semibold text-[#8B1A1A]">{felText}</p>}
      {status === "sparat" && <p className="mb-4 font-semibold text-[#005CA9]">✓ Saved</p>}
      <StorKnapp disabled={status === "sparar"} onClick={spara}>
        {status === "sparar" ? "Saving …" : "Save settings"}
      </StorKnapp>
    </FelsokningSkal>
  );
}
