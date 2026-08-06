// @vitest-environment node
// ALVA-SPEC-070/071 · Hashkedjan och säkerhetstaket.
//
// Panelgranskningens två tyngsta fynd, låsta som test:
//
//   Triggrar skyddar loggen mot applikationen, inte mot den som äger
//   databasen. Kedjan flyttar skyddet till matematik — och det här
//   testet är beviset på att matematiken faktiskt biter: en ändrad rad
//   ska peka ut sig själv.
//
//   Säkerhetsnivån var teknikerns eget val. Ett självskattat värde som
//   ser ut som en mätning är värre än inget värde. Nu är den ett tak
//   härlett ur underlaget, och teknikern kan bara sänka.
import { describe, expect, it } from "vitest";
import { forsegla, grund, lank, provaForsegling, verifiera } from "../../../../services/gemensam/kedja.mjs";
import { inomTak, sakerhetstak } from "../../../../services/gemensam/sakerhet.mjs";

// En liten kedja byggd som servern bygger den.
function bygg(arendeId: string, poster: { id: string; tidpunkt: string; anvandare: string; digest: string }[]) {
  let h = grund(arendeId);
  return poster.map((p) => {
    h = lank(h, p);
    return { ...p, kedjehash: h };
  });
}

const POSTER = [
  { id: "h1", tidpunkt: "2026-08-06T10:00:00.000Z", anvandare: "Anna", digest: "d1" },
  { id: "h2", tidpunkt: "2026-08-06T10:01:00.000Z", anvandare: "Anna", digest: "d2" },
  { id: "h3", tidpunkt: "2026-08-06T10:02:00.000Z", anvandare: "Johan", digest: "d3" },
];

describe("kedjan", () => {
  it("en obruten kedja verifierar och ger en rot", () => {
    const rader = bygg("arende-1", POSTER);
    const svar = verifiera("arende-1", rader);
    expect(svar.ok).toBe(true);
    expect(svar.rot).toBe(rader.at(-1)!.kedjehash);
    expect(svar.okedjade).toBe(0);
  });

  it("en ändrad rad pekar ut sig själv — inte bara att något är fel", () => {
    const rader = bygg("arende-1", POSTER);
    rader[1] = { ...rader[1], digest: "manipulerad" };
    const svar = verifiera("arende-1", rader);
    expect(svar.ok).toBe(false);
    expect(svar.brott).toEqual({ index: 1, id: "h2" });
  });

  it("en borttagen rad bryter kedjan vid nästa länk", () => {
    const rader = bygg("arende-1", POSTER);
    rader.splice(1, 1);
    const svar = verifiera("arende-1", rader);
    expect(svar.ok).toBe(false);
    expect(svar.brott?.id).toBe("h3");
  });

  it("omordnade rader bryter kedjan — ordningen är en del av beviset", () => {
    const rader = bygg("arende-1", POSTER);
    const [a, b] = [rader[0], rader[1]];
    rader[0] = b;
    rader[1] = a;
    expect(verifiera("arende-1", rader).ok).toBe(false);
  });

  it("kedjan är bunden till sitt ärende och kan inte lyftas till ett annat", () => {
    // Utan ärende-id i grunden hade två ärenden med samma första händelse
    // haft utbytbara kedjor — och en "verifierad" logg hade kunnat vara
    // ett annat fordons.
    const rader = bygg("arende-1", POSTER);
    expect(verifiera("arende-2", rader).ok).toBe(false);
  });

  it("rader utan länk bryter inte kedjan men räknas — gammal data ska inte se starkare ut än den är", () => {
    const rader = bygg("arende-1", POSTER).map((r, i) => (i === 0 ? { ...r, kedjehash: null } : r));
    // Länken för rad 0 saknas, men rad 1:s länk räknades ursprungligen
    // ovanpå den — kedjan hänger ihop, bara med ett omärkt första steg.
    const svar = verifiera("arende-1", rader);
    expect(svar.ok).toBe(true);
    expect(svar.okedjade).toBe(1);
  });

  it("avskiljaren gör att fältgränser inte kan flyttas", () => {
    // ("ab","c") och ("a","bc") ska ge olika länkar. Utan avskiljare hade
    // en angripare kunnat flytta tecken mellan fält utan att hashen såg det.
    const a = lank("x", { id: "ab", tidpunkt: "c", anvandare: "u", digest: "d" });
    const b = lank("x", { id: "a", tidpunkt: "bc", anvandare: "u", digest: "d" });
    expect(a).not.toBe(b);
  });
});

describe("förseglingen", () => {
  it("giltig mot rätt nyckel, rot och tid — och inget annat", () => {
    const f = forsegla("nyckel", "arende-1", "rot", "2026-08-06T12:00:00.000Z");
    expect(provaForsegling("nyckel", "arende-1", "rot", "2026-08-06T12:00:00.000Z", f)).toBe(true);
    expect(provaForsegling("fel-nyckel", "arende-1", "rot", "2026-08-06T12:00:00.000Z", f)).toBe(false);
    expect(provaForsegling("nyckel", "arende-1", "annan-rot", "2026-08-06T12:00:00.000Z", f)).toBe(false);
    expect(provaForsegling("nyckel", "arende-2", "rot", "2026-08-06T12:00:00.000Z", f)).toBe(false);
    expect(provaForsegling("nyckel", "arende-1", "rot", "2026-08-06T12:00:01.000Z", f)).toBe(false);
  });

  it("en tom eller saknad försegling är aldrig giltig", () => {
    expect(provaForsegling("nyckel", "a", "r", "t", "")).toBe(false);
    expect(provaForsegling("nyckel", "a", "r", "t", undefined)).toBe(false);
  });
});

describe("säkerhetstaket (ALVA-SPEC-071)", () => {
  const REPRO = { typ: "reproducering", status: "ja", beskrivning: "Reproducerad tre gånger." };
  const SPARBAR = { typ: "matvarde", beskrivning: "Obalans", varde: "38 g", matdonId: "m-1" };
  const OSPARBAR = { typ: "matvarde", beskrivning: "Obalans", varde: "38 g" };
  const FOTO = { typ: "foto", beskrivning: "Höger framhjul" };
  const OBS = { typ: "observation", text: "Slitage på innerkanten" };

  it("hög kräver reproducerat symptom OCH spårbart mätvärde", () => {
    expect(sakerhetstak([REPRO, SPARBAR])).toBe("hog");
    expect(sakerhetstak([REPRO, OSPARBAR])).toBe("medel");
    expect(sakerhetstak([SPARBAR])).toBe("medel");
  });

  it("delvis reproducerat bär inte hög — delvis betyder att felet inte är förstått", () => {
    expect(sakerhetstak([{ ...REPRO, status: "delvis" }, SPARBAR])).toBe("medel");
  });

  it("enbart observationer bär inte ens medel", () => {
    expect(sakerhetstak([OBS])).toBe("lag");
    expect(sakerhetstak([])).toBe("lag");
    expect(sakerhetstak([FOTO])).toBe("medel");
  });

  it("sänkning är alltid tillåten, höjning aldrig", () => {
    expect(inomTak("lag", "hog")).toBe(true);
    expect(inomTak("medel", "hog")).toBe(true);
    expect(inomTak("hog", "medel")).toBe(false);
    expect(inomTak("medel", "lag")).toBe(false);
  });

  it("grinden spärrar en felorsak som påstår mer än underlaget bär", async () => {
    const { grinda } = await import("../../../../services/gemensam/grind.mjs");
    const logg = [OBS, { typ: "felorsak", avvikelse: "x", orsaker: [], underlag: [], sakerhet: "hog", atgard: "y" }];
    const hinder = grinda(logg, { steg: [] }).filter((h: { id: string }) => h.id === "sakerhetstak");
    expect(hinder).toHaveLength(1);
    expect(hinder[0].nyckel).toBe("grind.sakerhet");
    // Hindret säger båda nivåerna — vad som påstods och vad som bärs.
    expect(hinder[0].detalj).toContain("hog");
    expect(hinder[0].detalj).toContain("lag");
  });

  it("grinden släpper samma felorsak när underlaget bär den", async () => {
    const { grinda } = await import("../../../../services/gemensam/grind.mjs");
    const logg = [
      REPRO,
      SPARBAR,
      { typ: "felorsak", avvikelse: "x", orsaker: [], underlag: [], sakerhet: "hog", atgard: "y" },
    ];
    expect(grinda(logg, { steg: [] }).filter((h: { id: string }) => h.id === "sakerhetstak")).toHaveLength(0);
  });
});
