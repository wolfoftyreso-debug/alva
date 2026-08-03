import { describe, expect, it } from "vitest";
import type { Arende, Handelse } from "../domain";
import { nyLoggPost } from "../domain";
import { VIBRATION_METODIK, nastaSteg, valjMetodik } from "../metodik";
import { brief, ejKontrollerat, tidsfordelning } from "../projektioner";

// Hjälpare: bygger ett ärende ur en lista (tidpunkt, händelse) —
// precis som produktionskoden är alla vyer rena funktioner av loggen.
function byggArende(poster: [string, Handelse][]): Arende {
  return {
    id: "test",
    nummer: 1,
    skapad: poster[0]?.[0] ?? "2026-08-02T08:00:00Z",
    handelser: poster.map(([tidpunkt, handelse]) => nyLoggPost("Anna", handelse, tidpunkt)),
  };
}

const OBJEKT: Handelse = {
  typ: "objekt_identifierat",
  objekt: {
    typ: "Fordon",
    identifierare: "ABC123",
    identifieringsmetod: "Registreringsnummer",
    beskrivning: "Volvo XC60 D4 2019",
    kund: "Anders Svensson",
  },
};

describe("verifierade checklistor", () => {
  it("varje kontroll i metodikerna har ett definierat minimikrav", async () => {
    const { METODIKER } = await import("../metodik");
    for (const metodik of METODIKER) {
      for (const steg of metodik.steg) {
        for (const kontroll of steg.kontroller ?? []) {
          expect(kontroll.krav, `${metodik.id}/${steg.id}/${kontroll.id}`).toBeDefined();
        }
      }
    }
  });
});

describe("metodikval", () => {
  it("väljer vibrationsmetodiken när felbeskrivningen nämner vibration", () => {
    expect(valjMetodik("Bilen vibrerar runt 88 km/h").id).toBe("vibration");
    expect(valjMetodik("Motorn startar inte").id).toBe("generisk");
  });

  it("väljer elsystemmetodiken vid elrelaterade symptom", () => {
    expect(valjMetodik("Reläet klickar inte").id).toBe("elsystem");
    expect(valjMetodik("Ingen spänning till bränslepumpen").id).toBe("elsystem");
    expect(valjMetodik("Belysningen fungerar inte").id).toBe("elsystem");
  });
});

describe("nastaSteg", () => {
  it("börjar med första symptomfrågan och går vidare i metodikens ordning", () => {
    const arende = byggArende([
      ["2026-08-02T08:03:00Z", OBJEKT],
      ["2026-08-02T08:05:00Z", { typ: "felbeskrivning", text: "Bilen vibrerar runt 88 km/h" }],
    ]);
    const steg = nastaSteg(arende, VIBRATION_METODIK);
    expect(steg.klart).toBe(false);
    expect(steg.steg.id).toBe("symptom");
    expect(steg.fraga?.id).toBe("hastighetsberoende");
  });

  it("hoppar till nästa obesvarade fråga när en besvarats", () => {
    const arende = byggArende([
      ["2026-08-02T08:03:00Z", OBJEKT],
      [
        "2026-08-02T08:06:00Z",
        { typ: "fraga_besvarad", stegId: "symptom", frageId: "hastighetsberoende", fraga: "…", svar: "Ja" },
      ],
    ]);
    expect(nastaSteg(arende, VIBRATION_METODIK).fraga?.id).toBe("var");
  });

  it("är klart när alla frågor och kontroller är dokumenterade", () => {
    const poster: [string, Handelse][] = [["2026-08-02T08:00:00Z", OBJEKT]];
    for (const steg of VIBRATION_METODIK.steg) {
      for (const fraga of steg.fragor ?? []) {
        poster.push([
          "2026-08-02T08:10:00Z",
          { typ: "fraga_besvarad", stegId: steg.id, frageId: fraga.id, fraga: fraga.text, svar: "Ja" },
        ]);
      }
      for (const kontroll of steg.kontroller ?? []) {
        poster.push([
          "2026-08-02T08:20:00Z",
          { typ: "kontroll_utford", stegId: steg.id, kontrollId: kontroll.id, text: kontroll.text },
        ]);
      }
    }
    expect(nastaSteg(byggArende(poster), VIBRATION_METODIK).klart).toBe(true);
  });
});

describe("ejKontrollerat", () => {
  it("krymper när kontroller utförs och härleds helt ur loggen", () => {
    const utan = byggArende([["2026-08-02T08:00:00Z", OBJEKT]]);
    const alla = ejKontrollerat(utan, VIBRATION_METODIK);
    expect(alla).toContain("Kontrollera lufttryck");

    const med = byggArende([
      ["2026-08-02T08:00:00Z", OBJEKT],
      [
        "2026-08-02T08:15:00Z",
        { typ: "kontroll_utford", stegId: "kontroller", kontrollId: "lufttryck", text: "Kontrollera lufttryck" },
      ],
    ]);
    const kvar = ejKontrollerat(med, VIBRATION_METODIK);
    expect(kvar).not.toContain("Kontrollera lufttryck");
    expect(kvar.length).toBe(alla.length - 1);
  });
});

describe("tidsfordelning", () => {
  it("attribuerar intervall till aktiv kategori och räknar inte paus i totalen", () => {
    const arende = byggArende([
      ["2026-08-02T08:00:00Z", OBJEKT],
      // 30 min aktiv felsökning (standardkategori)
      ["2026-08-02T08:30:00Z", { typ: "kategori_byte", kategori: "paus" }],
      // 15 min paus
      ["2026-08-02T08:45:00Z", { typ: "kategori_byte", kategori: "provkorning" }],
      // 20 min provkörning
      ["2026-08-02T09:05:00Z", { typ: "arende_avslutat" }],
    ]);
    const { totalMs, perKategori } = tidsfordelning(arende);
    expect(perKategori.aktiv_felsokning).toBe(30 * 60000);
    expect(perKategori.paus).toBe(15 * 60000);
    expect(perKategori.provkorning).toBe(20 * 60000);
    expect(totalMs).toBe(50 * 60000);
  });

  it("räknar pågående tid fram till 'nu' för öppna ärenden", () => {
    const arende = byggArende([["2026-08-02T08:00:00Z", OBJEKT]]);
    const { totalMs } = tidsfordelning(arende, "2026-08-02T08:10:00Z");
    expect(totalMs).toBe(10 * 60000);
  });
});

describe("ansvarig", () => {
  it("skaparen är ansvarig tills överlämning eller omfördelning pekar ut någon annan", async () => {
    const { ansvarig } = await import("../projektioner");
    const bas: [string, Handelse][] = [["2026-08-03T08:00:00Z", OBJEKT]];
    expect(ansvarig(byggArende(bas))).toBe("Anna");

    const efterOverlamning = byggArende([
      ...bas,
      ["2026-08-03T09:00:00Z", { typ: "overlamning", fran: "Anna", till: "Johan" }],
    ]);
    expect(ansvarig(efterOverlamning)).toBe("Johan");

    const efterOmfordelning = byggArende([
      ...bas,
      ["2026-08-03T09:00:00Z", { typ: "overlamning", fran: "Anna", till: "Johan" }],
      ["2026-08-03T10:00:00Z", { typ: "ansvarig_satt", ansvarig: "Lisa" }],
    ]);
    expect(ansvarig(efterOmfordelning)).toBe("Lisa");
  });
});

describe("brief", () => {
  const arende = byggArende([
    ["2026-08-02T08:03:00Z", OBJEKT],
    ["2026-08-02T08:05:00Z", { typ: "felbeskrivning", text: "Bilen vibrerar runt 88 km/h" }],
    [
      "2026-08-02T08:11:00Z",
      { typ: "kontroll_utford", stegId: "kontroller", kontrollId: "lufttryck", text: "Kontrollera lufttryck", resultat: "2,4 bar" },
    ],
    ["2026-08-02T08:18:00Z", { typ: "matvarde", beskrivning: "Matningsspänning", varde: "13,9", enhet: "V" }],
    ["2026-08-02T08:20:00Z", { typ: "observation", text: "Höger framdäck visar ojämnt slitage" }],
    ["2026-08-02T08:22:00Z", { typ: "hypotes", text: "Obalans i höger framhjul", niva: "lag" }],
  ]);

  it("sammanställer utfört, observerat, ej kontrollerat och nästa steg ur loggen", () => {
    const b = brief(arende, VIBRATION_METODIK, "2026-08-02T08:30:00Z");
    expect(b.objekt?.identifierare).toBe("ABC123");
    expect(b.felbeskrivning).toBe("Bilen vibrerar runt 88 km/h");
    expect(b.utfordaKontroller.map((k) => k.text)).toContain("Kontrollera lufttryck");
    expect(b.observationer).toContain("Höger framdäck visar ojämnt slitage");
    expect(b.observationer).toContain("Matningsspänning: 13,9 V");
    expect(b.ejKontrollerat).toContain("Kontrollera hjulbalansering");
    expect(b.ejKontrollerat).not.toContain("Kontrollera lufttryck");
    expect(b.rekommenderatNastaSteg[0]).toContain("hastighetsberoende");
    expect(b.totalArbetstid).toBe("27 min");
  });

  it("skiljer hypoteser från fakta och markerar felorsak som ej verifierad", () => {
    const b = brief(arende, VIBRATION_METODIK, "2026-08-02T08:30:00Z");
    expect(b.hypoteser).toEqual([{ text: "Obalans i höger framhjul", niva: "lag" }]);
    expect(b.observationer).not.toContain("Obalans i höger framhjul");
    expect(b.tillforlitlighet.some((r) => r.niva === "medel" && /inte verifierad/.test(r.text))).toBe(true);
  });

  it("är regenererbar: samma logg ger alltid samma brief", () => {
    const b1 = brief(arende, VIBRATION_METODIK, "2026-08-02T08:30:00Z");
    const b2 = brief(arende, VIBRATION_METODIK, "2026-08-02T08:30:00Z");
    expect(b2).toEqual(b1);
  });
});
