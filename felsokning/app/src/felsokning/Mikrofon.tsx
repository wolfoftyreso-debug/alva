// Push-to-Talk-mikrofon: lyssnar ENDAST efter aktivt tryck, visar tydligt
// när inspelning pågår och skriver in transkriberingen i ett redigerbart
// fält. Skicka sker aldrig automatiskt.

import { useEffect, useRef, useState } from "react";
import { startaIgenkanning, stodRost } from "./rost";
import { IkonMik } from "./ikoner";

export function MikrofonKnapp({ paText }: { paText: (text: string) => void }) {
  const [lyssnar, setLyssnar] = useState(false);
  const [interim, setInterim] = useState("");
  const igenkanningRef = useRef<ReturnType<typeof startaIgenkanning>>(undefined);
  const paTextRef = useRef(paText);
  paTextRef.current = paText;

  useEffect(() => () => igenkanningRef.current?.abort(), []);

  if (!stodRost()) return null;

  const stoppa = () => {
    igenkanningRef.current?.stop();
    igenkanningRef.current = undefined;
    setLyssnar(false);
    setInterim("");
  };

  const starta = () => {
    setLyssnar(true);
    igenkanningRef.current = startaIgenkanning(
      ({ transkript, slutgiltigt }) => {
        if (slutgiltigt) {
          setInterim("");
          paTextRef.current(transkript.trim());
        } else {
          setInterim(transkript);
        }
      },
      () => {
        setLyssnar(false);
        setInterim("");
      },
    );
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => (lyssnar ? stoppa() : starta())}
        aria-label={lyssnar ? "Stoppa inspelning" : "Starta röstinmatning"}
        className={`min-h-8 min-w-11 rounded border px-3 text-[14px] font-semibold transition-colors ${
          lyssnar
            ? "animate-pulse border-[#6E1414] bg-[#8B1A1A] text-white"
            : "border-[#ADADAD] bg-white text-[#1A1A1A] hover:border-[#00437A]"
        }`}
      >
        {lyssnar ? "■" : <IkonMik />}
      </button>
      {lyssnar && (
        <span className="text-[12px] font-semibold text-[#8B1A1A]">
          ● Inspelning pågår{interim ? ` — ”${interim}”` : "…"}
        </span>
      )}
    </span>
  );
}
