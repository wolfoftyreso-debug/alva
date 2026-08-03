// Tillstånd för Guidad Felsökning (MVP).
// Persistens: localStorage. I produktionsversionen ersätts detta av ett
// API-first-backend med samma händelsemodell — append-only-loggen gör
// synkronisering (inkl. offline-läge) konfliktfri.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Arende, Handelse, LoggPost, Objekt } from "./domain";
import { nyLoggPost } from "./domain";
import { felbeskrivning } from "./projektioner";
import { GENERISK_METODIK, valjMetodik, type Metodik } from "./metodik";

interface FelsokningState {
  anvandare: string;
  arenden: Record<string, Arende>;
  nastaNummer: number;
  sattAnvandare: (namn: string) => void;
  skapaArende: (objekt: Objekt, felbeskrivningText: string) => string;
  laggTill: (arendeId: string, handelse: Handelse) => void;
  // Används endast av synken: ersätter listan med den ihopflätade versionen.
  // Semantiken är fortfarande append-only — flätningen lägger bara till.
  sammanfoga: (arendeId: string, handelser: LoggPost[]) => void;
  // Lägger in ett färdigbyggt ärende (demoärende, importerat ärende).
  laggInArende: (arende: Arende) => void;
}

function nyDelningskod(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) =>
    "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36],
  ).join("");
}

export const useFelsokning = create<FelsokningState>()(
  persist(
    (set, get) => ({
      anvandare: "",
      arenden: {},
      nastaNummer: 1,

      sattAnvandare: (namn) => set({ anvandare: namn.trim() }),

      skapaArende: (objekt, felbeskrivningText) => {
        const { anvandare, nastaNummer } = get();
        const id = `arende-${Date.now().toString(36)}`;
        const arende: Arende = {
          id,
          nummer: nastaNummer,
          skapad: new Date().toISOString(),
          delningskod: nyDelningskod(),
          handelser: [
            nyLoggPost(anvandare, { typ: "objekt_identifierat", objekt }),
            nyLoggPost(anvandare, { typ: "felbeskrivning", text: felbeskrivningText }),
          ],
        };
        set((s) => ({
          arenden: { ...s.arenden, [id]: arende },
          nastaNummer: s.nastaNummer + 1,
        }));
        return id;
      },

      laggTill: (arendeId, handelse) => {
        const { anvandare } = get();
        set((s) => {
          const arende = s.arenden[arendeId];
          if (!arende) return s;
          return {
            arenden: {
              ...s.arenden,
              [arendeId]: {
                ...arende,
                handelser: [...arende.handelser, nyLoggPost(anvandare, handelse)],
              },
            },
          };
        });
      },

      sammanfoga: (arendeId, handelser) => {
        set((s) => {
          const arende = s.arenden[arendeId];
          if (!arende || handelser.length === arende.handelser.length) return s;
          return {
            arenden: { ...s.arenden, [arendeId]: { ...arende, handelser } },
          };
        });
      },

      laggInArende: (arende) => {
        set((s) => ({
          arenden: { ...s.arenden, [arende.id]: arende },
          nastaNummer: Math.max(s.nastaNummer, arende.nummer + 1),
        }));
      },
    }),
    { name: "guidad-felsokning" },
  ),
);

export function metodikForArende(arende: Arende | undefined): Metodik {
  if (!arende) return GENERISK_METODIK;
  const text = felbeskrivning(arende);
  return text ? valjMetodik(text) : GENERISK_METODIK;
}
