// Metodikmotor: deterministiska felsökningsflöden.
// Systemet presenterar aldrig en hypotes som ett konstaterat fel —
// motorn föreslår nästa verifierbara steg utifrån vad som redan är dokumenterat.
//
// I MVP:t är metodikerna fördefinierade flöden. Den framtida AI-integrationen
// ansluter här: den väljer/genererar steg, men händelseloggen och
// projektionerna är oförändrade.

import type { Arende } from "./domain";

export interface Fraga {
  id: string;
  text: string;
  svarstyp: "janej" | "text" | "val";
  val?: string[];
}

export interface Kontroll {
  id: string;
  text: string;
}

export interface MetodikSteg {
  id: string;
  rubrik: string;
  beskrivning?: string;
  fragor?: Fraga[];
  kontroller?: Kontroll[];
}

export interface Metodik {
  id: string;
  namn: string;
  steg: MetodikSteg[];
}

export const VIBRATION_METODIK: Metodik = {
  id: "vibration",
  namn: "Vibration under körning",
  steg: [
    {
      id: "symptom",
      rubrik: "Verifiera symptom",
      fragor: [
        { id: "hastighetsberoende", text: "Är vibrationen hastighetsberoende?", svarstyp: "janej" },
        {
          id: "var",
          text: "Var känns vibrationen?",
          svarstyp: "val",
          val: ["I ratten", "I stolen", "I hela bilen"],
        },
        {
          id: "nar",
          text: "När uppstår vibrationen?",
          svarstyp: "val",
          val: ["Vid acceleration", "Vid jämn fart", "Vid inbromsning", "Alltid under körning"],
        },
        {
          id: "intervall",
          text: "Försvinner den över eller under ett visst hastighetsintervall?",
          svarstyp: "text",
        },
      ],
    },
    {
      id: "visuell",
      rubrik: "Visuell kontroll",
      beskrivning: "Fotografera samtliga hjul. Skilj på observation och slutsats.",
      kontroller: [
        { id: "foto_vf", text: "Fotografera vänster framhjul" },
        { id: "foto_hf", text: "Fotografera höger framhjul" },
        { id: "foto_vb", text: "Fotografera vänster bakhjul" },
        { id: "foto_hb", text: "Fotografera höger bakhjul" },
        { id: "dot", text: "Dokumentera DOT-/tillverkningsdatum" },
        { id: "slitage", text: "Kontrollera däckslitage" },
      ],
    },
    {
      id: "kontroller",
      rubrik: "Rekommenderade kontroller",
      kontroller: [
        { id: "lufttryck", text: "Kontrollera lufttryck" },
        { id: "hjulmoment", text: "Kontrollera hjulmoment" },
        { id: "kast", text: "Kontrollera radial- och sidokast" },
        { id: "balansering", text: "Kontrollera hjulbalansering" },
        { id: "bussningar", text: "Kontrollera bussningar och leder" },
      ],
    },
    {
      id: "provkorning",
      rubrik: "Provkörning",
      beskrivning: "Verifiera under provkörning:",
      kontroller: [
        { id: "pk_hastighet", text: "Hastighet där vibration uppstår" },
        { id: "pk_acc", text: "Förändring vid acceleration" },
        { id: "pk_motorbroms", text: "Förändring vid motorbroms" },
        { id: "pk_kurva", text: "Förändring vid kurvtagning" },
        { id: "pk_var", text: "Om vibration känns i ratt eller kaross" },
      ],
    },
  ],
};

export const GENERISK_METODIK: Metodik = {
  id: "generisk",
  namn: "Generell strukturerad felsökning",
  steg: [
    {
      id: "symptom",
      rubrik: "Verifiera symptom",
      fragor: [
        { id: "reproducerbart", text: "Går felet att reproducera?", svarstyp: "janej" },
        {
          id: "nar",
          text: "När uppträder felet?",
          svarstyp: "val",
          val: ["Alltid", "Ibland", "Endast under drift", "Endast vid start"],
        },
        { id: "forlopp", text: "Beskriv förloppet när felet uppstår", svarstyp: "text" },
        { id: "forandring", text: "Har något förändrats nyligen (service, reparation, miljö)?", svarstyp: "text" },
      ],
    },
    {
      id: "visuell",
      rubrik: "Visuell kontroll",
      kontroller: [
        { id: "foto_objekt", text: "Fotografera objektet och det berörda området" },
        { id: "skador", text: "Kontrollera synliga skador, läckage eller lösa anslutningar" },
        { id: "typskylt", text: "Dokumentera typskylt/märkning" },
      ],
    },
    {
      id: "grundkontroller",
      rubrik: "Grundkontroller",
      kontroller: [
        { id: "matning", text: "Utför grundläggande mätningar (spänning, tryck, temperatur — det som är relevant)" },
        { id: "sakringar", text: "Kontrollera säkringar/skydd" },
        { id: "anslutningar", text: "Kontrollera kontaktdon och anslutningar" },
      ],
    },
    {
      id: "funktionstest",
      rubrik: "Funktionstest",
      kontroller: [
        { id: "test", text: "Genomför funktionstest och dokumentera resultatet" },
      ],
    },
  ],
};

const METODIKER = [VIBRATION_METODIK, GENERISK_METODIK];

export function metodikForId(id: string): Metodik {
  return METODIKER.find((m) => m.id === id) ?? GENERISK_METODIK;
}

export function valjMetodik(felbeskrivning: string): Metodik {
  const text = felbeskrivning.toLowerCase();
  if (/vibr|skak|obalans/.test(text)) return VIBRATION_METODIK;
  return GENERISK_METODIK;
}

export interface NastaSteg {
  steg: MetodikSteg;
  fraga?: Fraga;
  kontroll?: Kontroll;
  klart: boolean;
}

// Nästa steg = första obesvarade frågan, därefter första ej utförda kontrollen,
// i metodikens ordning. Helt härlett ur händelseloggen.
export function nastaSteg(arende: Arende, metodik: Metodik): NastaSteg {
  const besvarade = new Set<string>();
  const utforda = new Set<string>();
  for (const post of arende.handelser) {
    const h = post.handelse;
    if (h.typ === "fraga_besvarad") besvarade.add(`${h.stegId}/${h.frageId}`);
    if (h.typ === "kontroll_utford") utforda.add(`${h.stegId}/${h.kontrollId}`);
  }
  for (const steg of metodik.steg) {
    for (const fraga of steg.fragor ?? []) {
      if (!besvarade.has(`${steg.id}/${fraga.id}`)) return { steg, fraga, klart: false };
    }
    for (const kontroll of steg.kontroller ?? []) {
      if (!utforda.has(`${steg.id}/${kontroll.id}`)) return { steg, kontroll, klart: false };
    }
  }
  const sista = metodik.steg[metodik.steg.length - 1];
  return { steg: sista, klart: true };
}
