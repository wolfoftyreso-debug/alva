// Push-to-Talk-mikrofon: lyssnar ENDAST efter aktivt tryck, visar tydligt
// när inspelning pågår och skriver in transkriberingen i ett redigerbart
// fält. Skicka sker aldrig automatiskt.

import { useEffect, useRef, useState } from "react";
import { startaIgenkanning, stodRost } from "./rost";
import { IkonMik } from "./ikoner";
import { useWebbSprak } from "../alva/webbsprak";

export function MikrofonKnapp({ paText }: { paText: (text: string) => void }) {
  const [lyssnar, setLyssnar] = useState(false);
  const [interim, setInterim] = useState("");
  const sprak = useWebbSprak();
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
      sprak,
    );
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => (lyssnar ? stoppa() : starta())}
        aria-label={lyssnar ? "Stop recording" : "Start voice input"}
        className={`min-h-8 min-w-11 border px-4 text-[14px] font-semibold ${
          lyssnar
            ? "border-[#8B1A1A] bg-[#8B1A1A] text-white"
            : "border-[#D7DCE2] bg-white text-[#1B1E22] hover:border-[#005CA9]"
        }`}
      >
        {lyssnar ? "■" : <IkonMik />}
      </button>
      {lyssnar && (
        <span className="text-[12px] font-semibold text-[#8B1A1A]">
          ● Recording{interim ? ` — ”${interim}”` : "…"}
        </span>
      )}
    </span>
  );
}
