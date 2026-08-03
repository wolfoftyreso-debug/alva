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
import { plattformAktiv, plattformKonto } from "@/felsokning/plattform";
import { FelsokningSkal, Panel, StorKnapp } from "@/felsokning/ui";

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
            className={`min-h-14 rounded-lg border-2 px-2 font-extrabold transition-colors ${
              aktiv
                ? "border-amber-400 bg-amber-400 text-zinc-950"
                : "border-zinc-600 bg-zinc-900 text-zinc-400"
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
          <p className="text-lg text-zinc-300">
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
        <p className="text-zinc-300">
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

      {status === "fel" && <p className="mb-3 font-bold text-red-400">{felText}</p>}
      {status === "sparat" && <p className="mb-3 font-bold text-green-400">✓ Sparat</p>}
      <StorKnapp disabled={status === "sparar"} onClick={spara}>
        {status === "sparar" ? "Sparar …" : "Spara inställningar"}
      </StorKnapp>
    </FelsokningSkal>
  );
}
