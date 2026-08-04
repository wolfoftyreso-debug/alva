// Tal-till-text enligt kommunikationsmodellen: rösten är ett inmatningssätt,
// inte ett separat gränssnitt. All logik bygger på text — transkriberingen
// hamnar i ett redigerbart fält och ingenting skickas utan bekräftelse.
//
// MVP:t använder webbläsarens SpeechRecognition (sv-SE). I produktions-
// versionen ersätts motorn av leverantörens Voice-to-Text-API bakom samma
// gränssnitt.

interface IgenkanningsResultat {
  transkript: string;
  slutgiltigt: boolean;
}

interface Igenkanning {
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

function ctor(): SpeechRecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function stodRost(): boolean {
  return ctor() !== undefined;
}

export function startaIgenkanning(
  paResultat: (r: IgenkanningsResultat) => void,
  paSlut: () => void,
): Igenkanning | undefined {
  const Ctor = ctor();
  if (!Ctor) return undefined;
  const igenkanning = new Ctor();
  igenkanning.lang = "sv-SE";
  igenkanning.continuous = true;
  igenkanning.interimResults = true;
  igenkanning.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const resultat = event.results[i];
      paResultat({ transkript: resultat[0].transcript, slutgiltigt: resultat.isFinal });
    }
  };
  igenkanning.onend = paSlut;
  igenkanning.onerror = paSlut;
  igenkanning.start();
  return igenkanning;
}
