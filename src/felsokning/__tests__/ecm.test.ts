import { describe, expect, it } from "vitest";
import type { Arende, Handelse } from "../domain";
import { nyLoggPost } from "../domain";
import { VIBRATION_METODIK } from "../metodik";
import {
  arendetyp,
  evidensNiva,
  evidensposter,
  grindGodkand,
  kvalitetsgrind,
  preDiagnostik,
  sparbarhetspaket,
} from "../ecm";
import { arendeidentitet } from "../projektioner";
import { byggDemoArende } from "../demo";

function byggArende(handelser: Handelse[]): Arende {
  return {
    id: "ecm-test",
    nummer: 1,
    skapad: "2026-08-03T08:00:00Z",
    handelser: handelser.map((h) => nyLoggPost("Anna", h, "2026-08-03T08:00:00Z")),
  };
}

const OBJEKT: Handelse = {
  typ: "objekt_identifierat",
  objekt: {
    typ: "Personbil",
    identifierare: "ABC123",
    identifieringsmetod: "Regnr",
    beskrivning: "Volvo XC60",
    vin: "YV1DZ8256F2123456",
    miltal: "8 432 mil",
    arbetsorder: "AO-2496",
    claim: "G-2026-00481",
    skadenummer: "SK-77812",
  },
};

// Grundkontroller som gör pre-diagnostiken klar.
const PREDIAG: Handelse[] = [
  { typ: "historik_kontrollerad", kontrollerad: true },
  { typ: "matarstallning", lage: "ingaende", varde: "84 320 km" },
  { typ: "kommentar", text: "Kundens felbeskrivning verifierad vid mottagandet." },
  { typ: "kommentar", text: "Inga ytterligare observationer vid mottagandet." },
];

describe("Evidence Engine", () => {
  it("härleder nivån ur loggens faktiska innehåll", () => {
    expect(evidensNiva(byggArende([]))).toBe("E0");
    expect(evidensNiva(byggArende([{ typ: "observation", text: "x" }]))).toBe("E1");
    expect(evidensNiva(byggArende([{ typ: "foto", beskrivning: "x", dataUrl: "data:" }]))).toBe("E2");
    expect(evidensNiva(byggArende([{ typ: "matvarde", beskrivning: "U", varde: "12" }]))).toBe("E4");
    expect(evidensNiva(byggArende([{ typ: "arbetsorder_skannad", falt: [] }]))).toBe("E5");
    expect(
      evidensNiva(
        byggArende([
          { typ: "foto", beskrivning: "x", dataUrl: "data:" },
          { typ: "matvarde", beskrivning: "U", varde: "12" },
        ]),
      ),
    ).toBe("E6");
  });

  it("katalogiserar evidensposter med tekniker, nivå och innehållshash", () => {
    const arende = byggArende([
      { typ: "foto", beskrivning: "Höger framhjul", dataUrl: "data:x" },
      { typ: "matvarde", beskrivning: "Obalans", varde: "38", enhet: "g" },
    ]);
    const poster = evidensposter(arende);
    expect(poster).toHaveLength(2);
    expect(poster[0].niva).toBe("E2");
    expect(poster[1].sammanfattning).toBe("Obalans = 38 g");
    expect(poster[0].tekniker).toBe("Anna");
    expect(poster[0].hash).toMatch(/^[0-9a-f]{8}$/);
    // Samma innehåll → samma hash (deterministisk spårbarhet).
    expect(evidensposter(arende)[0].hash).toBe(poster[0].hash);
  });
});

describe("Pre-Diagnostic Validation", () => {
  it("ingen felsökning utan grundkontroller — allt härleds ur loggen", () => {
    const tomt = byggArende([OBJEKT]);
    expect(preDiagnostik(tomt).every((r) => r.klar)).toBe(false);

    const klart = byggArende([OBJEKT, ...PREDIAG]);
    expect(preDiagnostik(klart).every((r) => r.klar)).toBe(true);
  });

  it("ej kontrollerad historik godtas med orsak men flaggas som kvalitetsvarning", () => {
    const arende = byggArende([
      OBJEKT,
      { typ: "historik_kontrollerad", kontrollerad: false, kommentar: "Historiksystemet otillgängligt" },
    ]);
    const rad = preDiagnostik(arende).find((r) => r.id === "historik")!;
    expect(rad.klar).toBe(true);
    expect(rad.varning).toContain("Historiksystemet otillgängligt");
  });
});

describe("Completion Engine (kvalitetsgrind)", () => {
  it("utan evidens är grinden stängd — inga påståenden utan underlag", () => {
    const tomt = byggArende([]);
    expect(grindGodkand(tomt, VIBRATION_METODIK)).toBe(false);
    const rader = kvalitetsgrind(tomt, VIBRATION_METODIK);
    expect(rader.find((r) => r.id === "objekt")?.ok).toBe(false);
    expect(rader.find((r) => r.id === "kontroller")?.detalj).toContain("Evidens saknas");
  });

  it("dokumenterade undantag öppnar grinden men redovisas med orsak", () => {
    const handelser: Handelse[] = [
      OBJEKT,
      ...PREDIAG,
      { typ: "foto", beskrivning: "Översikt", dataUrl: "data:" },
      { typ: "matvarde", beskrivning: "Lufttryck", varde: "2,4", enhet: "bar" },
    ];
    for (const steg of VIBRATION_METODIK.steg) {
      for (const kontroll of steg.kontroller ?? []) {
        handelser.push({
          typ: "kontroll_utford",
          stegId: steg.id,
          kontrollId: kontroll.id,
          text: kontroll.text,
          undantag: "Kunden avböjde demontering",
        });
      }
    }
    const arende = byggArende(handelser);
    expect(grindGodkand(arende, VIBRATION_METODIK)).toBe(true);
    const rad = kvalitetsgrind(arende, VIBRATION_METODIK).find((r) => r.id === "kontroller");
    expect(rad?.detalj).toContain("Undantag med orsak");
  });

  it("utgående mätarställning blir obligatorisk när ärendet avslutas", () => {
    const bas: Handelse[] = [OBJEKT, ...PREDIAG];
    const oppen = byggArende(bas);
    expect(kvalitetsgrind(oppen, VIBRATION_METODIK).find((r) => r.id === "matarstallning_ut")?.kravs).toBe(false);
    const stangd = byggArende([...bas, { typ: "arende_avslutat" }]);
    expect(kvalitetsgrind(stangd, VIBRATION_METODIK).find((r) => r.id === "matarstallning_ut")?.kravs).toBe(true);
  });
});

describe("Compliance Engine", () => {
  it("ärendetypen styr dokumentationskraven", () => {
    const privat = byggArende([OBJEKT]);
    expect(arendetyp(privat)).toBe("Privat kund");
    expect(kvalitetsgrind(privat, VIBRATION_METODIK).some((r) => r.id.startsWith("garanti_"))).toBe(false);

    const garanti = byggArende([OBJEKT, { typ: "arendetyp_satt", arendetyp: "Garanti" }]);
    const rader = kvalitetsgrind(garanti, VIBRATION_METODIK);
    expect(rader.find((r) => r.id === "garanti_claim")?.ok).toBe(true); // claim finns i objektet
    expect(rader.find((r) => r.id === "garanti_historik")?.ok).toBe(false); // historik ej kontrollerad
  });

  it("försäkringsärenden kräver skadenummer och bildbevis", () => {
    const utanBild = byggArende([OBJEKT, { typ: "arendetyp_satt", arendetyp: "Försäkring" }]);
    const rader = kvalitetsgrind(utanBild, VIBRATION_METODIK);
    expect(rader.find((r) => r.id === "forsakring_skadenummer")?.ok).toBe(true);
    expect(rader.find((r) => r.id === "forsakring_bildbevis")?.ok).toBe(false);
  });
});

describe("Traceability Engine + ärendeidentitet", () => {
  it("spårbarhetspaketet innehåller version, grindstatus och evidensposter", () => {
    const arende = byggArende([OBJEKT, { typ: "foto", beskrivning: "x", dataUrl: "data:" }]);
    const paket = sparbarhetspaket(arende, VIBRATION_METODIK);
    expect(paket.ecmVersion).toBe("2.0");
    expect(paket.arendetyp).toBe("Privat kund");
    expect(paket.evidensposter).toHaveLength(1);
    expect(paket.kvalitetsgrind.some((r) => r.id === "objekt" && r.ok)).toBe(true);
  });

  it("ärendeidentiteten registreras en gång och återanvänds överallt", () => {
    const arende = byggArende([OBJEKT, { typ: "matarstallning", lage: "ingaende", varde: "84 320 km" }]);
    const idn = arendeidentitet(arende);
    expect(idn.arbetsorder).toBe("AO-2496");
    expect(idn.claim).toBe("G-2026-00481");
    expect(idn.skadenummer).toBe("SK-77812");
    expect(idn.vin).toBe("YV1DZ8256F2123456");
    // Den fotograferade mätarställningen ersätter arbetsorderns uppgift.
    expect(idn.miltal).toBe("84 320 km");
  });

  it("demoärendet passerar pre-diagnostiken men blockeras av okontrollerade metodiksteg", () => {
    const demo = byggDemoArende(1);
    expect(preDiagnostik(demo).every((r) => r.klar)).toBe(true);
    expect(grindGodkand(demo, VIBRATION_METODIK)).toBe(false);
    expect(evidensNiva(demo)).toBe("E6");
  });
});
