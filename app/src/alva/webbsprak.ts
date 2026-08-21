// ALVA-SPEC-060 · Webbplatsens språk.
//
// Plattformen väljer språk ur konto → organisation → webbläsare. Den
// publika webbplatsen har inget konto och ingen organisation — där är
// kedjan besökarens eget val (sparat lokalt) → webbläsaren → engelska.
// Rangordningen ligger kvar i `valjSprak`, så att "hur språk väljs" bara
// finns implementerat på ett ställe.
//
// Valet lagras i localStorage men hålls också i minnet: en webbläsare i
// privat läge kan neka lagring, och då ska väljaren ändå fungera för
// sidvisningen i stället för att tyst göra ingenting.

import { useEffect, useSyncExternalStore } from "react";
import { STANDARD, valjSprak } from "../../../services/gemensam/sprak/index.mjs";

const NYCKEL = "alva.webbsprak";
const lyssnare = new Set<() => void>();
let minne: string | undefined;

function lagratVal(): string | undefined {
  try {
    return localStorage.getItem(NYCKEL) ?? minne;
  } catch {
    return minne;
  }
}

/** Webbplatsens språk just nu: eget val → webbläsare → engelska. */
export function webbSprak(): string {
  const webblasare =
    typeof navigator === "undefined" ? [] : (navigator.languages ?? [navigator.language]);
  return valjSprak({ anvandare: lagratVal(), webblasare }) as string;
}

/** Sätter besökarens val och meddelar alla vyer som lyssnar. */
export function sattWebbSprak(kod: string): void {
  minne = kod;
  try {
    localStorage.setItem(NYCKEL, kod);
  } catch {
    // Se filhuvudet: minnesvärdet bär valet när lagringen nekar.
  }
  for (const meddela of lyssnare) meddela();
}

/** React-krok: webbplatsens språk, med omritning vid byte. */
export function useWebbSprak(): string {
  return useSyncExternalStore(
    (meddela) => {
      lyssnare.add(meddela);
      return () => lyssnare.delete(meddela);
    },
    webbSprak,
    () => STANDARD as string,
  );
}

/**
 * Speglar det aktiva språket till <html lang>. index.html står på
 * lang="en", och utan detta blev attributet kvar där även när innehållet
 * bytte språk — en skärmläsare läste då nio av tio språk med engelskt
 * uttal (WCAG 3.1.1 Språk i sidan). Anropas en gång i roten; useWebbSprak
 * ritar om vid byte, så effekten håller attributet i takt med språket
 * både vid start och vid val. Returnerar språket så roten kan använda det.
 */
export function useDokumentSprak(): string {
  const sprak = useWebbSprak();
  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = sprak;
  }, [sprak]);
  return sprak;
}
