// @vitest-environment node
// Statistik, sammanfattning och integrationsgränssnitt.
//
// Nyckeltal är ett produktbeslut: det som mäts är det som optimeras.
// Testerna låser därför inte bara att räkningen stämmer, utan att de mått
// som medvetet uteslutits inte smyger tillbaka.
import { createHmac, timingSafeEqual } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  evidensprofil,
  omarbetning,
  oversikt,
  reproduktionsgrad,
  undantagsfrekvens,
  verifieringsgrad,
} from "../../../../services/gemensam/statistik.mjs";
import { enrading, sammanfatta } from "../../../../services/gemensam/sammanfattning.mjs";
import {
  KATEGORIER,
  UTGAENDE,
  protokollTillHandelser,
  signeraLeverans,
  verifieraLeverans,
} from "../../../../services/gemensam/integration.mjs";

const post = (tidpunkt: string, handelse: Record<string, unknown>) => ({ tidpunkt, anvandare: "Anna", handelse });

function arende(id: string, ident: string, handelser: [string, Record<string, unknown>][]) {
  return { id, nummer: 1, handelser: handelser.map(([t, h]) => post(t, h)) };
}

const AVSLUTAT_MED_ORSAK = arende("a1", "ABC123", [
  ["2026-01-01T08:00:00Z", { typ: "objekt_identifierat", objekt: { identifierare: "ABC123", beskrivning: "Volvo XC60" } }],
  ["2026-01-01T08:05:00Z", { typ: "felbeskrivning", text: "Bilen vibrerar runt 88 km/h." }],
  ["2026-01-01T09:00:00Z", { typ: "reproducering", status: "ja", beskrivning: "Reproducerat vid 88 km/h." }],
  ["2026-01-01T09:30:00Z", { typ: "matvarde", beskrivning: "Obalans", varde: "38", enhet: "g", matdonId: "m1" }],
  ["2026-01-01T10:00:00Z", { typ: "felorsak", avvikelse: "Obalans 38 g höger fram.", orsaker: ["Normalt slitage"], underlag: ["Mätresultat"], sakerhet: "hog", atgard: "Balansering" }],
  ["2026-01-01T10:30:00Z", { typ: "atgard_utford", beskrivning: "Balanserade hjulen.", utford: true }],
  ["2026-01-01T10:45:00Z", { typ: "kvalitetskontroll", resultat: "symptomet_borta", beskrivning: "Provkört." }],
  ["2026-01-01T11:00:00Z", { typ: "slutsats", motivering: "Obalansen förklarar vibrationen eftersom den är hastighetsberoende.", uteslutet: "Kast uteslöts.", kvarstaende: "Inget.", atgardsval: "Balansering eftersom däcket är helt." }],
  ["2026-01-01T11:05:00Z", { typ: "arende_avslutat", signatur: "Anna" }],
]);

const AVSLUTAT_UTAN_ORSAK = arende("a2", "DEF456", [
  ["2026-02-01T08:00:00Z", { typ: "objekt_identifierat", objekt: { identifierare: "DEF456" } }],
  ["2026-02-01T09:00:00Z", { typ: "reproducering", status: "nej", beskrivning: "Kunde inte återskapas." }],
  ["2026-02-01T10:00:00Z", { typ: "slutsats", orsakFastställd: false, motivering: "Felet uppträder bara i kyla eftersom kunden kör långt.", uteslutet: "Kablage kontrollerat.", kvarstaende: "Orsaken ej fastställd." }],
  ["2026-02-01T10:05:00Z", { typ: "arende_avslutat" }],
]);

describe("verifieringsgrad", () => {
  it("räknar avslut med fastställd orsak", () => {
    const v = verifieringsgrad([AVSLUTAT_MED_ORSAK, AVSLUTAT_UTAN_ORSAK]);
    expect(v).toEqual({ antal: 2, fastställda: 1, andel: 50 });
  });

  it("returnerar null i stället för noll när underlag saknas", () => {
    // Ett mått utan underlag ska visas som saknat, inte som noll.
    // Skillnaden avgör om någon fattar beslut på en siffra som inte finns.
    expect(verifieringsgrad([]).andel).toBeNull();
  });
});

describe("reproduktionsgrad", () => {
  it("skiljer ja, delvis och nej", () => {
    const r = reproduktionsgrad([AVSLUTAT_MED_ORSAK, AVSLUTAT_UTAN_ORSAK]);
    expect(r.ja).toBe(1);
    expect(r.nej).toBe(1);
    expect(r.andel).toBe(50);
  });
});

describe("omarbetning", () => {
  const forsta = arende("b1", "GHI789", [
    ["2026-01-01T10:00:00Z", { typ: "objekt_identifierat", objekt: { identifierare: "GHI789" } }],
    ["2026-01-01T10:00:00Z", { typ: "felorsak", avvikelse: "x", orsaker: ["Korrosion"], underlag: [] }],
    ["2026-01-01T11:00:00Z", { typ: "arende_avslutat" }],
  ]);
  const andra = arende("b2", "GHI789", [
    ["2026-02-01T10:00:00Z", { typ: "objekt_identifierat", objekt: { identifierare: "GHI789" } }],
    ["2026-02-01T10:00:00Z", { typ: "felorsak", avvikelse: "y", orsaker: ["Korrosion"], underlag: [] }],
    ["2026-02-01T11:00:00Z", { typ: "arende_avslutat" }],
  ]);

  it("hittar samma fordon tillbaka med samma orsakskategori", () => {
    const o = omarbetning([forsta, andra]);
    expect(o.antal).toBe(1);
    expect(o.fall[0].identifierare).toBe("GHI789");
    expect(o.fall[0].kategorier).toEqual(["Korrosion"]);
    expect(o.fall[0].dagar).toBe(31);
  });

  it("räknar inte återbesök utanför fönstret", () => {
    expect(omarbetning([forsta, andra], 14).antal).toBe(0);
  });

  it("räknar inte olika orsakskategorier som omarbetning", () => {
    const annanOrsak = {
      ...andra,
      handelser: andra.handelser.map((p) =>
        p.handelse.typ === "felorsak" ? post(p.tidpunkt, { ...p.handelse, orsaker: ["Yttre påverkan"] }) : p,
      ),
    };
    expect(omarbetning([forsta, annanOrsak]).antal).toBe(0);
  });
});

describe("evidensprofil", () => {
  it("kräver spårbart mätdon för E4", () => {
    const utan = arende("c1", "X", [
      ["2026-01-01T10:00:00Z", { typ: "matvarde", beskrivning: "U", varde: "12" }],
    ]);
    // Utan mätdon är det teknikerns observation av en siffra.
    expect(evidensprofil([utan]).E4).toBe(0);
    expect(evidensprofil([AVSLUTAT_MED_ORSAK]).E4).toBe(1);
  });
});

describe("undantagsfrekvens", () => {
  it("rangordnar de kontroller som oftast hoppas över", () => {
    const a = arende("d1", "X", [
      ["2026-01-01T10:00:00Z", { typ: "kontroll_utford", stegId: "matningar", kontrollId: "k1", text: "Mät spänningsfall", undantag: "Utrustning saknas" }],
      ["2026-01-01T10:01:00Z", { typ: "kontroll_utford", stegId: "visuell", kontrollId: "k2", text: "Fotografera", resultat: "Gjort" }],
    ]);
    const rader = undantagsfrekvens([a]);
    expect(rader).toHaveLength(1);
    expect(rader[0].kontroll).toBe("k1");
    expect(rader[0].andel).toBe(100);
    // Fasen följer med, så friktionen går att läsa i ALVA-termer.
    expect(rader[0].fas).toBe("verification");
  });
});

describe("nyckeltalen är ett produktbeslut", () => {
  it("översikten innehåller inga hastighetsmått", () => {
    // Ärenden per tekniker och genomsnittlig ledtid belönar den som
    // hoppar över kontroller. De ska inte smyga tillbaka.
    const nycklar = Object.keys(oversikt([AVSLUTAT_MED_ORSAK]));
    for (const förbjuden of ["arendenPerTekniker", "ledtid", "snittid", "aktivitet", "inloggningar"]) {
      expect(nycklar, förbjuden).not.toContain(förbjuden);
    }
  });

  it("bär sin egen version så en rapport går att härleda i efterhand", () => {
    expect(oversikt([]).version).toBe("ALVA-REP-0100");
  });
});

describe("sammanfattningen är härledd, inte genererad", () => {
  it("ger samma text varje gång för samma ärende", () => {
    const a = sammanfatta(AVSLUTAT_MED_ORSAK);
    const b = sammanfatta(AVSLUTAT_MED_ORSAK);
    expect(a.text).toBe(b.text);
  });

  it("innehåller objekt, kundens ord, reproduktion, orsak och åtgärd", () => {
    const s = sammanfatta(AVSLUTAT_MED_ORSAK);
    expect(s.text).toContain("Volvo XC60");
    expect(s.text).toContain("88 km/h");
    expect(s.text).toContain("The symptom was reproduced");
    expect(s.text).toContain("Obalans 38 g");
    expect(s.text).toContain("Balanserade hjulen");
    expect(s.fullstandig).toBe(true);
  });

  it("säger uttryckligen när något saknas i stället för att utelämna det", () => {
    const tomt = arende("e1", "X", []);
    const s = sammanfatta(tomt);
    expect(s.fullstandig).toBe(false);
    expect(s.saknas).toContain("fault description");
    expect(s.text).toContain("The object is not identified");
  });

  it("skriver inte felet konstaterat när orsaken inte fastställts", () => {
    const s = sammanfatta(AVSLUTAT_UTAN_ORSAK);
    expect(s.text).toContain("The cause could not be established");
    expect(s.text).toContain("could not be reproduced under the conditions");
    expect(s.text).not.toMatch(/konstaterat fel|felet konstaterat/i);
  });

  it("enradingen duger för en lista", () => {
    expect(enrading(AVSLUTAT_MED_ORSAK)).toContain("ABC123");
    expect(enrading(AVSLUTAT_UTAN_ORSAK)).toContain("without an established cause");
    expect(enrading(arende("f1", "X", []))).toContain("in progress");
  });
});

describe("integrationsgränssnittet", () => {
  it("täcker de systemkategorier en verkstad faktiskt har", () => {
    for (const k of ["diagnosprotokoll", "dms", "videooffert", "skadekalkyl", "garanti", "forsakring"]) {
      expect(Object.keys(KATEGORIER), k).toContain(k);
    }
    // Skadekalkyl går åt båda håll: bedömningen in, beviskedjan ut.
    expect(KATEGORIER.skadekalkyl.riktning).toBe("bada");
    expect(KATEGORIER.skadekalkyl.tillfor).toContain("slutsats");
  });

  it("de utgående händelserna är namngivna och beskrivna", () => {
    expect(Object.keys(UTGAENDE)).toContain("arende.slutsats");
    for (const [namn, text] of Object.entries(UTGAENDE)) {
      expect(namn, namn).toMatch(/^[a-z_]+\.[a-z_]+$/);
      expect(text, namn).toMatch(/\.$/);
    }
  });

  it("signaturen går att verifiera med samma kod hos mottagaren", () => {
    const kropp = JSON.stringify({ handelse: "arende.avslutat", arende: "ALVA-CASE-00007" });
    const t = Math.floor(Date.parse("2026-08-05T12:00:00Z") / 1000);
    const huvud = signeraLeverans(kropp, "hemlighet", t, createHmac);
    const nu = t * 1000;

    expect(verifieraLeverans(kropp, huvud, "hemlighet", createHmac, timingSafeEqual, nu).ok).toBe(true);
    expect(verifieraLeverans(kropp, huvud, "fel-hemlighet", createHmac, timingSafeEqual, nu).ok).toBe(false);
    expect(verifieraLeverans(`${kropp} `, huvud, "hemlighet", createHmac, timingSafeEqual, nu).ok).toBe(false);
  });

  it("en fångad leverans går inte att spela upp i morgon", () => {
    const kropp = "{}";
    const t = Math.floor(Date.parse("2026-08-05T12:00:00Z") / 1000);
    const huvud = signeraLeverans(kropp, "h", t, createHmac);
    const imorgon = (t + 86400) * 1000;
    const svar = verifieraLeverans(kropp, huvud, "h", createHmac, timingSafeEqual, imorgon);
    expect(svar.ok).toBe(false);
    expect(svar.orsak).toMatch(/Timestamp/);
  });

  it("ett diagnosprotokoll blir evidens med bevarad härkomst", () => {
    const handelser = protokollTillHandelser(
      {
        dtcs: [{ code: "P0301", description: "Cylinder 1 misfire" }],
        liveData: [{ name: "Batterispänning", value: "12,4", unit: "V", toolSerial: "VCDS-99" }],
      },
      {
        felkoder: { vag: "dtcs", kod: "code", text: "description" },
        matvarden: { vag: "liveData", beskrivning: "name", varde: "value", enhet: "unit", instrumentId: "toolSerial" },
      },
      "Diagnosinstrument, plats 3",
    );

    expect(handelser).toHaveLength(2);
    expect(handelser[0]).toMatchObject({ typ: "observation", kalla: "Diagnosinstrument, plats 3" });
    expect(handelser[0].text).toContain("P0301");
    // Instrumentets identitet följer med — utan den vore värdet E1.
    expect(handelser[1]).toMatchObject({ typ: "matvarde", varde: "12,4", matdonId: "VCDS-99" });
    // Härkomsten finns på varje post, så ett inläst värde aldrig ser ut
    // som något teknikern själv mätt.
    expect(handelser.every((h) => h.kalla)).toBe(true);
  });

  it("tomma värden släpps inte igenom som mätningar", () => {
    const handelser = protokollTillHandelser(
      { liveData: [{ name: "Tomt", value: null }] },
      { matvarden: { vag: "liveData", beskrivning: "name", varde: "value" } },
      "x",
    );
    expect(handelser).toEqual([]);
  });
});
