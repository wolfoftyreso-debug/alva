// @vitest-environment node
// ALVA som metod, inte som etikett.
//
// Testerna låser tre saker: att varje procedursteg hör till exakt en fas,
// att statusspråket inte glider tillbaka mot vänlighet, och att
// beteckningarna är stabila. Går något av dem sönder har ALVA blivit ett
// namn på en app igen.
import { describe, expect, it } from "vitest";
import { FASORDNING, STEGFAS, fasFor, faserI, klaraFaser } from "../../../../services/gemensam/faser.mjs";
import { ALLA_METODIKER } from "../../../../services/gemensam/metodiker.mjs";
import { FASER, arendebeteckning, beteckning, tolkaBeteckning } from "@/alva/system";
import { FORBJUDNA_ORD, MEDDELANDE, STATUS, bedomning } from "@/alva/sprak";

describe("ALVA-modellen är tillämpad på varje procedur", () => {
  it("varje steg i varje metodik är klassificerat — ingen tyst fallback", () => {
    const oklassade: string[] = [];
    for (const m of ALLA_METODIKER) {
      for (const steg of m.steg) {
        if (!(steg.id in STEGFAS)) oklassade.push(`${m.id}/${steg.id}`);
      }
    }
    expect(oklassade).toEqual([]);
  });

  it("faserna kommer i ALVA-ordning inom varje metodik", () => {
    for (const m of ALLA_METODIKER) {
      const ordning = m.steg.map((s: { id: string }) => FASORDNING.indexOf(fasFor(s.id)));
      // En procedur får hoppa över en fas, men aldrig gå bakåt: att
      // verifiera före lokalisering är att gissa.
      for (let i = 1; i < ordning.length; i += 1) {
        expect(ordning[i], `${m.id} steg ${i}`).toBeGreaterThanOrEqual(ordning[i - 1]);
      }
    }
  });

  it("varje metodik börjar i Analysis", () => {
    for (const m of ALLA_METODIKER) {
      expect(fasFor(m.steg[0].id), m.id).toBe("analysis");
    }
  });

  it("säkerhetssteget hör till Analysis — det är förutsättningen, inte en åtgärd", () => {
    expect(fasFor("sakerhet")).toBe("analysis");
    const hogvolt = ALLA_METODIKER.find((m: { id: string }) => m.id === "hogvolt")!;
    expect(faserI(hogvolt)[0]).toBe("analysis");
  });

  it("en metodik behöver inte innehålla alla fyra faser", () => {
    // Läckagemetodiken slutar med lokalisering. Läckan är hittad;
    // åtgärden är ett annat arbete. Att fylla ut modellen med ett
    // konstruerat Action-steg hade varit att tillämpa den slarvigt.
    const lackage = ALLA_METODIKER.find((m: { id: string }) => m.id === "lackage")!;
    expect(faserI(lackage)).not.toContain("action");
    expect(faserI(lackage).length).toBeGreaterThan(1);
  });

  it("härleder klara faser ur loggen", () => {
    const m = ALLA_METODIKER.find((x: { id: string }) => x.id === "generisk")!;
    const symptom = m.steg.find((s: { id: string }) => s.id === "symptom")!;
    const logg = (symptom.fragor ?? []).map((f: { id: string }) => ({
      typ: "fraga_besvarad",
      stegId: "symptom",
      frageId: f.id,
      svar: "x",
    }));
    expect(klaraFaser(m, logg)).toEqual(["analysis"]);
    expect(klaraFaser(m, [])).toEqual([]);
  });
});

describe("statusspråket", () => {
  it("meddelanden är konstateranden, inte tilltal", () => {
    for (const [nyckel, text] of Object.entries(MEDDELANDE)) {
      expect(text, nyckel).not.toMatch(/!/);
      expect(text, nyckel).not.toMatch(/\b(du|din|ditt|dina|vi|vår|our|your)\b/i);
      // Varje rad slutar med punkt: det är ett protokoll, inte en etikett.
      expect(text, nyckel).toMatch(/\.$/);
    }
  });

  it("inget förbjudet ord finns i katalogen", () => {
    const allt = [...Object.values(MEDDELANDE), ...Object.values(STATUS)].join(" ").toLowerCase();
    for (const ord of FORBJUDNA_ORD) expect(allt, ord).not.toContain(ord);
  });

  it("bedömning uttrycks som ett tal, aldrig som en åsikt", () => {
    const rad = bedomning("continuity is interrupted between pin 14 and ground", 0.92);
    expect(rad).toBe(
      "Evidence indicates continuity is interrupted between pin 14 and ground. Confidence level: 92%.",
    );
    expect(rad).not.toMatch(/\b(I think|jag tror|verkar som)\b/i);
  });

  it("statusord är versaler och oöversatta — ramen är invariant", () => {
    for (const [nyckel, ord] of Object.entries(STATUS)) {
      expect(ord, nyckel).toBe(ord.toUpperCase());
      expect(ord, nyckel).toMatch(/^[A-Z ]+$/);
    }
  });
});

describe("nomenklaturen", () => {
  it("bildar beteckningar med fast bredd per objektklass", () => {
    expect(beteckning("CASE", 91821)).toBe("ALVA-CASE-91821");
    expect(beteckning("PROC", 42)).toBe("ALVA-PROC-0042");
    expect(beteckning("RULE", 120)).toBe("ALVA-RULE-120");
    expect(beteckning("VAL", 19)).toBe("ALVA-VAL-19");
  });

  it("är återläsbar — det som skrivs på papper går att slå upp", () => {
    expect(tolkaBeteckning("ALVA-CASE-91821")).toEqual({ klass: "CASE", nummer: 91821 });
    expect(tolkaBeteckning(" alva-proc-0042 ")).toEqual({ klass: "PROC", nummer: 42 });
    expect(tolkaBeteckning("ALVA-HITTEPA-1")).toBeNull();
    expect(tolkaBeteckning("CASE-1")).toBeNull();
  });

  it("samma ärende ger alltid samma beteckning", () => {
    expect(arendebeteckning(7)).toBe(arendebeteckning(7));
    expect(arendebeteckning(7)).toBe("ALVA-CASE-00007");
  });
});

describe("metoden är dokumenterad, inte antydd", () => {
  it("fyra faser med bokstäverna A L V A", () => {
    expect(FASER.map((f) => f.bokstav).join("")).toBe("ALVA");
    expect(FASER.map((f) => f.id)).toEqual(FASORDNING);
  });

  it("varje fas säger både vad den gör och vad den inte gör", () => {
    for (const f of FASER) {
      expect(f.syfte, f.id).toMatch(/\.$/);
      expect(f.avgransning.length, f.id).toBeGreaterThan(10);
    }
  });
});
