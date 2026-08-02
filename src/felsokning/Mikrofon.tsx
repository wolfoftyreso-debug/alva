// Push-to-Talk-mikrofon: lyssnar ENDAST efter aktivt tryck, visar tydligt
// när inspelning pågår och skriver in transkriberingen i ett redigerbart
// fält. Skicka sker aldrig automatiskt.

import { useEffect, useRef, useState } from "react";
import { startaIgenkanning, stodRost } from "./rost";

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
        className={`min-h-11 min-w-11 rounded-full border-2 px-3 text-lg font-bold transition-colors ${
          lyssnar
            ? "animate-pulse border-red-500 bg-red-600 text-white"
            : "border-zinc-600 bg-zinc-800 text-zinc-100 hover:border-amber-400"
        }`}
      >
        {lyssnar ? "■" : "🎤"}
      </button>
      {lyssnar && (
        <span className="text-sm font-bold text-red-400">
          ● Inspelning pågår{interim ? ` — ”${interim}”` : "…"}
        </span>
      )}
    </span>
  );
}
