// Tillstånd för Guidad Felsökning (MVP).
// Persistens: localStorage. I produktionsversionen ersätts detta av ett
// API-first-backend med samma händelsemodell — append-only-loggen gör
// synkronisering (inkl. offline-läge) konfliktfri.

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { LAGRINGSNYCKEL, flikSakerLagring } from "./lagring";
import type { Arende, Handelse, LoggPost, Objekt } from "./domain";
import { nyLoggPost } from "./domain";
import { felbeskrivning } from "./projektioner";
import { GENERISK_METODIK, metodikForId, valjMetodik, type Metodik } from "./metodik";

interface FelsokningState {
  anvandare: string;
  arenden: Record<string, Arende>;
  nastaNummer: number;
  sattAnvandare: (namn: string) => void;
  skapaArende: (objekt: Objekt, felbeskrivningText: string, metodikId?: string) => string;
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

      skapaArende: (objekt, felbeskrivningText, metodikId) => {
        const { anvandare, nastaNummer } = get();
        const id = `arende-${Date.now().toString(36)}`;
        const arende: Arende = {
          id,
          nummer: nastaNummer,
          skapad: new Date().toISOString(),
          delningskod: nyDelningskod(),
          metodikId,
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
    {
      // Flikssäker lagring: flätar mot det som redan står i localStorage i
      // stället för att skriva över det, fångar kvotfel i stället för att
      // kasta genom store-aktionen, och lämnar en trasig post orörd i
      // stället för att nollställa allt. Se lagring.ts.
      name: LAGRINGSNYCKEL,
      version: 1,
      storage: createJSONStorage(() => flikSakerLagring),
    },
  ),
);

// Ett annat fönster skrev — läs om och fläta in.
//
// Utan det här levde varje flik i sin egen bild: den som senast skrev
// vann, och den andres händelser fanns bara i ett minne som snart var
// borta. Rehydreringen är säker eftersom lagringen redan flätat ihop
// bägge bilderna (se lagring.ts) — det som läses tillbaka innehåller
// alltså både fönstrens arbete, aldrig mindre än det egna.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (h) => {
    if (h.key === LAGRINGSNYCKEL) void useFelsokning.persist.rehydrate();
  });
}

export function metodikForArende(arende: Arende | undefined): Metodik {
  if (!arende) return GENERISK_METODIK;
  if (arende.metodikId) return metodikForId(arende.metodikId);
  const text = felbeskrivning(arende);
  return text ? valjMetodik(text) : GENERISK_METODIK;
}
