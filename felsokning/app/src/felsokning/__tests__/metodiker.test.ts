// Metodikbiblioteket är produktens innehåll — går det sönder märks det
// inte som ett krasch, utan som att teknikern får sämre frågor. Därför
// låser testerna strukturen, inte bara att koden kör.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ALLA_METODIKER, GENERISK, HOGVOLT, metodikForId, metodikPoang, valjMetodik } from "../metodik";

describe("metodikbiblioteket", () => {
  it("har unika id:n och stabila namn", () => {
    const id = ALLA_METODIKER.map((m) => m.id);
    expect(new Set(id).size).toBe(id.length);
    for (const m of ALLA_METODIKER) {
      expect(m.namn.length, m.id).toBeGreaterThan(0);
      expect(m.omrade.length, m.id).toBeGreaterThan(0);
    }
  });

  it("varje kontroll kräver bevis — en kryssruta är inte evidens", () => {
    for (const m of ALLA_METODIKER) {
      for (const steg of m.steg) {
        for (const kontroll of steg.kontroller ?? []) {
          expect(kontroll.krav, `${m.id}/${steg.id}/${kontroll.id}`).toBeDefined();
        }
      }
    }
  });

  it("varje metodik börjar med att verifiera symptomet, inte med att åtgärda", () => {
    for (const m of ALLA_METODIKER) {
      const symptom = m.steg.find((s) => s.id === "symptom");
      expect(symptom, m.id).toBeDefined();
      expect(symptom!.fragor?.length, m.id).toBeGreaterThan(0);

      // Undantaget är det enda som får gå före: säkerheten.
      const index = m.steg.indexOf(symptom!);
      expect(m.steg.slice(0, index).map((s) => s.id), m.id).toEqual(
        index === 0 ? [] : ["sakerhet"],
      );
    }
  });

  it("id:n inom en metodik är unika — nastaSteg spårar dem som steg/id", () => {
    for (const m of ALLA_METODIKER) {
      const nycklar = m.steg.flatMap((s) => [
        ...(s.fragor ?? []).map((f) => `${s.id}/f/${f.id}`),
        ...(s.kontroller ?? []).map((k) => `${s.id}/k/${k.id}`),
      ]);
      expect(new Set(nycklar).size, m.id).toBe(nycklar.length);
      expect(new Set(m.steg.map((s) => s.id)).size, m.id).toBe(m.steg.length);
    }
  });

  it("val-frågor har alternativ att välja mellan", () => {
    for (const m of ALLA_METODIKER) {
      for (const steg of m.steg) {
        for (const f of steg.fragor ?? []) {
          if (f.svarstyp === "val") {
            expect(f.val?.length, `${m.id}/${steg.id}/${f.id}`).toBeGreaterThan(1);
          }
        }
      }
    }
  });

  it("högvolt kan inte påbörjas utan att säkerheten är dokumenterad", () => {
    // Fel här kan döda någon. Steget ligger först och kräver mätvärde på
    // spänningsfrihet — inte ett ja på en fråga.
    expect(HOGVOLT.steg[0].id).toBe("sakerhet");
    const krav = HOGVOLT.steg[0].kontroller ?? [];
    expect(krav.some((k) => k.id === "spanningsfrihet" && k.krav === "matvarde")).toBe(true);
    expect(krav.some((k) => k.id === "service_disconnect")).toBe(true);
    expect(HOGVOLT.steg[0].beskrivning).toMatch(/livsfarlig/i);
  });
});

describe("val av metodik", () => {
  it("väljer på symptomets ord, inte på ordningen i biblioteket", () => {
    const fall: [string, string][] = [
      ["Bilen vibrerar runt 88 km/h", "vibration"],
      ["Reläet klickar inte", "elsystem"],
      ["Ingen spänning till bränslepumpen", "elsystem"],
      ["Belysningen fungerar inte", "elsystem"],
      ["Bilen startar inte, det klickar bara", "start_laddning"],
      ["Motorn rycker vid acceleration och tappar kraft", "motor_drift"],
      ["Det gnisslar vid inbromsning och bromspedalen pulserar", "bromsar"],
      ["Bilen överhettar i kö, kylvätskan försvinner", "kylsystem"],
      ["Automatlådan rycker vid växling", "drivlina"],
      ["Partikelfiltret regenererar hela tiden", "avgas_emission"],
      ["AC:n kyler inte längre", "klimat"],
      ["Elbilen laddar inte på DC och räckvidden har minskat", "hogvolt"],
      ["Ingen kontakt med styrenheten, flera lampor lyser", "diagnos_natverk"],
      ["Det droppar olja på garagegolvet", "lackage"],
      ["Ett knackande missljud från fram vänster", "missljud"],
      ["Filhållningsassistansen måste kalibreras efter byte av vindruta", "adas"],
      ["Stötdämparen läcker och bilen gungar", "styrning_fjadring"],
    ];
    for (const [text, forvantat] of fall) {
      expect(valjMetodik(text).id, text).toBe(forvantat);
    }
  });

  it("faller tillbaka på generisk i stället för att gissa", () => {
    for (const text of ["", "Kunden är missnöjd", "Se bifogad arbetsorder", "Konstigt beteende ibland"]) {
      expect(valjMetodik(text).id, text).toBe("generisk");
    }
  });

  it("korta nyckelord matchas som helt ord, långa som ordstam", () => {
    // "ac" får inte träffa "acceleration" — annars hamnar en vibration i
    // klimatanläggningen.
    expect(metodikPoang(ALLA_METODIKER.find((m) => m.id === "klimat")!, "vibration vid acceleration")).toBe(0);
    // Men stammen "vibration" ska träffa böjda former.
    const vibration = ALLA_METODIKER.find((m) => m.id === "vibration")!;
    expect(metodikPoang(vibration, "kraftiga vibrationer")).toBeGreaterThan(0);
    expect(metodikPoang(vibration, "skakningar i ratten")).toBeGreaterThan(0);
  });

  it("mer specifikt nyckelord vinner över mindre specifikt", () => {
    // Både elsystem ("batteri" via ström/spänning) och högvolt kan kännas
    // relevanta — "traktionsbatteri" avgör.
    expect(valjMetodik("Traktionsbatteriet ger felmeddelande").id).toBe("hogvolt");
  });

  it("är stabil: samma text ger samma metodik", () => {
    const text = "Bilen drar åt höger och det gnisslar";
    const forsta = valjMetodik(text).id;
    for (let i = 0; i < 5; i += 1) expect(valjMetodik(text).id).toBe(forsta);
  });

  it("metodikForId faller tillbaka på generisk vid okänt id", () => {
    expect(metodikForId("hogvolt").id).toBe("hogvolt");
    expect(metodikForId("finns_inte")).toBe(GENERISK);
  });
});

describe("orkestern och klienten känner till samma metodiker", () => {
  // Klassificeraren i orkestern kan bara returnera id:n som finns i
  // schemat. Glider listorna isär returnerar den ett id klienten inte
  // känner igen, och valet faller tyst tillbaka på generisk.
  const idn = ALLA_METODIKER.map((m) => m.id).sort();

  for (const fil of ["../services/ai-orkester/server.mjs", "../supabase/functions/felsokning-ai/index.ts"]) {
    it(fil, () => {
      const kalla = readFileSync(fil, "utf8");
      const katalog = kalla.match(/const METODIK_KATALOG = \[([\s\S]*?)\n\];/);
      expect(katalog, "METODIK_KATALOG saknas").not.toBeNull();

      const iOrkestern = [...katalog![1].matchAll(/\["([a-z_]+)",/g)].map((m) => m[1]).sort();
      expect(iOrkestern).toEqual(idn);
    });
  }
});
