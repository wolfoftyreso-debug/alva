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
    // Utan spårbart instrument är ett mätvärde teknikerns observation
    // av en siffra, inte en mätning (QUALITY-AUDIT M-1).
    expect(evidensNiva(byggArende([{ typ: "matvarde", beskrivning: "U", varde: "12" }]))).toBe("E1");
    expect(
      evidensNiva(
        byggArende([
          {
            typ: "matvarde",
            beskrivning: "U",
            varde: "12",
            matdonId: "m1",
            matdonBeteckning: "Fluke 87V",
            matdonKalibreradTill: "2099-01-01",
          },
        ]),
      ),
    ).toBe("E4");
    expect(evidensNiva(byggArende([{ typ: "arbetsorder_skannad", falt: [] }]))).toBe("E5");
    expect(
      evidensNiva(
        byggArende([
          { typ: "foto", beskrivning: "x", dataUrl: "data:" },
          { typ: "matvarde", beskrivning: "U", varde: "12", matdonId: "m1", matdonBeteckning: "Fluke 87V", matdonKalibreradTill: "2099-01-01" },
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
    expect(poster[1].sammanfattning).toBe("Obalans = 38 g (instrument ej angivet)");
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

describe("Felorsaksanalys (Root Cause Analysis)", () => {
  it("kvalitetsregeln avvisar generella formuleringar utan förklaring", async () => {
    const { granskaAvvikelse } = await import("../ecm");
    for (const daligt of ["Trasig.", "defekt", "Sliten", "Behöver bytas", "kort"]) {
      expect(granskaAvvikelse(daligt), daligt).not.toBeNull();
    }
    expect(
      granskaAvvikelse("Startmotorn aktiverar inte trots korrekt matningsspänning och god jordförbindelse."),
    ).toBeNull();
  });

  it("valda evidenskällor måste finnas i loggen", async () => {
    const { underlagFinns } = await import("../ecm");
    const utanFoto = byggArende([OBJEKT, { typ: "matvarde", beskrivning: "U", varde: "12" }]);
    expect(underlagFinns(utanFoto, "Foto")).toBe(false);
    expect(underlagFinns(utanFoto, "Mätresultat")).toBe(true);
    expect(underlagFinns(utanFoto, "Servicehistorik")).toBe(false);
    const medHistorik = byggArende([{ typ: "historik_kontrollerad", kontrollerad: true }]);
    expect(underlagFinns(medHistorik, "Servicehistorik")).toBe(true);
  });

  it("avslut kräver reproducering och felorsak — grinden blir obligatorisk vid stängning", () => {
    const stangdUtan = byggArende([OBJEKT, ...PREDIAG, { typ: "arende_avslutat" }]);
    const rader = kvalitetsgrind(stangdUtan, VIBRATION_METODIK);
    expect(rader.find((r) => r.id === "svp")?.kravs).toBe(true);
    expect(rader.find((r) => r.id === "svp")?.ok).toBe(false);
    expect(rader.find((r) => r.id === "felorsak")?.ok).toBe(false);

    const stangdMed = byggArende([
      OBJEKT,
      ...PREDIAG,
      { typ: "reproducering", status: "nej", beskrivning: "Felet uppträdde inte vid provkörning; fordonet var varmt." },
      {
        typ: "felorsak",
        avvikelse: "Ingen avvikelse kunde konstateras vid undersökningen trots systematisk genomgång.",
        orsaker: ["Okänd orsak"],
        underlag: ["Direkt observation"],
        sakerhet: "lag",
        atgard: "Återkom vid kall motor så att symptomet kan reproduceras.",
        motivering: "Symptomet kunde inte reproduceras under rådande förhållanden.",
      },
      { typ: "observation", text: "Systematisk genomgång utan anmärkning" },
      { typ: "arende_avslutat" },
    ]);
    const rader2 = kvalitetsgrind(stangdMed, VIBRATION_METODIK);
    expect(rader2.find((r) => r.id === "svp")?.ok).toBe(true);
    expect(rader2.find((r) => r.id === "svp")?.detalj).toContain("kunde inte reproduceras");
    expect(rader2.find((r) => r.id === "felorsak")?.ok).toBe(true);
  });

  it("rapportformuleringen skiljer reproducerat från ej reproducerat", async () => {
    const { reproduceringsText } = await import("../ecm");
    expect(reproduceringsText("ja")).toContain("reproducerades");
    expect(reproduceringsText("nej")).toContain("kunde inte reproduceras under de förhållanden");
  });

  it("demoärendet bär hela beviskedjan: reproducering + felorsak med underlag", () => {
    const demo = byggDemoArende(1);
    const repro = demo.handelser.find((p) => p.handelse.typ === "reproducering");
    expect(repro).toBeDefined();
    const orsak = demo.handelser.find((p) => p.handelse.typ === "felorsak");
    expect(orsak?.handelse.typ === "felorsak" && orsak.handelse.underlag.length > 0).toBe(true);
  });
});

describe("ECM Knowledge Library (regelpaket)", () => {
  it("serverpaketet och det inbyggda standardpaketet är samma regler", async () => {
    const { readFileSync } = await import("node:fs");
    const { STANDARD_REGELPAKET, normaliseraRegelpaket } = await import("../ecm");
    const server = normaliseraRegelpaket(JSON.parse(readFileSync("../services/plattform/ecm-regler.json", "utf8")));
    expect(server.version).toBe(STANDARD_REGELPAKET.version);
    expect(server.arendetypRegler).toEqual(STANDARD_REGELPAKET.arendetypRegler);
    expect(server.orsakskategorier).toEqual(STANDARD_REGELPAKET.orsakskategorier);
  });

  it("trasiga paket faller tillbaka till standard, okända krav-typer filtreras", async () => {
    const { STANDARD_REGELPAKET, normaliseraRegelpaket } = await import("../ecm");
    expect(normaliseraRegelpaket(null)).toEqual(STANDARD_REGELPAKET);
    const paket = normaliseraRegelpaket({
      version: "2.1",
      arendetypRegler: {
        Garanti: [
          { id: "x", rubrik: "Ny regel", krav: "foto", detaljVidBrist: "Kräver foto." },
          { id: "y", rubrik: "Trasig", krav: "pahittad_kravtyp", detaljVidBrist: "…" },
        ],
      },
    });
    expect(paket.version).toBe("2.1");
    expect(paket.arendetypRegler.Garanti).toHaveLength(1);
    expect(paket.undantagsorsaker).toEqual(STANDARD_REGELPAKET.undantagsorsaker);
  });

  it("ett uppdaterat regelpaket ändrar kvalitetsgrinden utan appändring", async () => {
    const { normaliseraRegelpaket } = await import("../ecm");
    localStorage.setItem(
      "gf-ecm-regelpaket",
      JSON.stringify(
        normaliseraRegelpaket({
          version: "2.1-test",
          arendetypRegler: {
            "Privat kund": [
              { id: "test_foto", rubrik: "Foto krävs för alla privatkunder", krav: "foto", detaljVidBrist: "Testregel." },
            ],
          },
        }),
      ),
    );
    try {
      const utanFoto = byggArende([OBJEKT]);
      const rad = kvalitetsgrind(utanFoto, VIBRATION_METODIK).find((r) => r.id === "test_foto");
      expect(rad?.ok).toBe(false);
      expect(rad?.rubrik).toContain("Privat kund");
      // Spårbarheten bär paketversionen.
      expect(sparbarhetspaket(utanFoto, VIBRATION_METODIK).regelpaketVersion).toBe("2.1-test");
    } finally {
      localStorage.removeItem("gf-ecm-regelpaket");
    }
  });
});

describe("Fordonshistorik (lokal projektion)", () => {
  it("hittar tidigare ärenden på samma identifierare med felorsaker", async () => {
    const { lokalFordonshistorik } = await import("../projektioner");
    const tidigare = byggArende([
      OBJEKT,
      {
        typ: "felorsak",
        avvikelse: "Vattenpumpen läcker vid axeltätningen.",
        orsaker: ["Normalt slitage"],
        underlag: ["Foto"],
        sakerhet: "hog",
        atgard: "Byt vattenpump.",
      },
      { typ: "arende_avslutat" },
    ]);
    const aktuellt = byggArende([OBJEKT]);
    aktuellt.id = "nytt-arende";
    const historik = lokalFordonshistorik({ [tidigare.id]: tidigare, [aktuellt.id]: aktuellt }, "abc123", aktuellt.id);
    expect(historik).toHaveLength(1);
    expect(historik[0].avslutat).toBe(true);
    expect(historik[0].felorsaker[0].orsaker).toContain("Normalt slitage");
    // Annat fordon → ingen träff.
    expect(lokalFordonshistorik({ [tidigare.id]: tidigare }, "ZZZ111")).toHaveLength(0);
  });
});

describe("Videoevidens (E3) och signerat avslut", () => {
  it("video höjer evidensnivån till E3 och räknas som oberoende källa", () => {
    const medVideo = byggArende([{ typ: "video", beskrivning: "Motorljud vid tomgång", dataUrl: "data:video/webm;base64,x" }]);
    expect(evidensNiva(medVideo)).toBe("E3");
    expect(evidensposter(medVideo)[0].kategori).toBe("video");
    const tvaKallor = byggArende([
      { typ: "video", beskrivning: "Motorljud", dataUrl: "data:video/webm;base64,x" },
      { typ: "matvarde", beskrivning: "Oljetryck", varde: "3,1", enhet: "bar", matdonId: "m1", matdonBeteckning: "Fluke 87V", matdonKalibreradTill: "2099-01-01" },
    ]);
    expect(evidensNiva(tvaKallor)).toBe("E6");

    // Utan kalibrerat instrument är det inte två oberoende källor utan
    // en: video plus en observation av en siffra.
    const enKalla = byggArende([
      { typ: "video", beskrivning: "Motorljud", dataUrl: "data:video/webm;base64,x" },
      { typ: "matvarde", beskrivning: "Oljetryck", varde: "3,1", enhet: "bar" },
    ]);
    expect(evidensNiva(enKalla)).toBe("E3");
  });

  it("underlagskällan Video valideras mot loggen i felorsaksanalysen", async () => {
    const { underlagFinns } = await import("../ecm");
    expect(underlagFinns(byggArende([OBJEKT]), "Video")).toBe(false);
    expect(underlagFinns(byggArende([{ typ: "video", beskrivning: "x", dataUrl: "data:" }]), "Video")).toBe(true);
  });

  it("avslutet signeras och grinden redovisar signaturen", async () => {
    const { handelseRubrik, nyLoggPost: ny } = await import("../domain");
    expect(handelseRubrik(ny("Erik", { typ: "arende_avslutat", signatur: "Erik" }))).toContain("signerad av Erik");
    const stangd = byggArende([OBJEKT, ...PREDIAG, { typ: "arende_avslutat", signatur: "Erik" }]);
    const rad = kvalitetsgrind(stangd, VIBRATION_METODIK).find((r) => r.id === "signering");
    expect(rad?.ok).toBe(true);
    expect(rad?.detalj).toContain("Erik");
  });
});

describe("Åtgärdsfasen och kvalitetskontroll", () => {
  it("avslut kräver dokumenterad åtgärd — och kvalitetskontroll när åtgärd utförts", async () => {
    const { atgarder, kvalitetskontroll } = await import("../ecm");
    const bas: Handelse[] = [
      OBJEKT,
      ...PREDIAG,
      { typ: "reproducering", status: "ja", beskrivning: "Reproducerad vid provkörning." },
      {
        typ: "felorsak",
        avvikelse: "Framhjulen uppvisar obalans om 38 g på höger sida.",
        orsaker: ["Yttre påverkan"],
        underlag: ["Direkt observation"],
        sakerhet: "hog",
        atgard: "Balansera om hjulet.",
      },
      { typ: "observation", text: "Obalans uppmätt" },
    ];

    // Utan åtgärd: grinden kräver den vid avslut.
    const utanAtgard = byggArende([...bas, { typ: "arende_avslutat", signatur: "Erik" }]);
    const rad = kvalitetsgrind(utanAtgard, VIBRATION_METODIK).find((r) => r.id === "atgard");
    expect(rad?.kravs).toBe(true);
    expect(rad?.ok).toBe(false);

    // Utförd åtgärd utan kvalitetskontroll: kontrollen blir obligatorisk.
    const utanKk = byggArende([
      ...bas,
      { typ: "atgard_utford", beskrivning: "Balanserade om höger framhjul.", utford: true },
      { typ: "arende_avslutat", signatur: "Erik" },
    ]);
    expect(atgarder(utanKk)).toHaveLength(1);
    const kkRad = kvalitetsgrind(utanKk, VIBRATION_METODIK).find((r) => r.id === "kvalitetskontroll");
    expect(kkRad?.kravs).toBe(true);
    expect(kkRad?.ok).toBe(false);

    // Komplett kedja: åtgärd + verifierat borta.
    const komplett = byggArende([
      ...bas,
      { typ: "atgard_utford", beskrivning: "Balanserade om höger framhjul.", utford: true },
      { typ: "kvalitetskontroll", resultat: "symptomet_borta", beskrivning: "Ny provkörning utan vibration." },
      { typ: "arende_avslutat", signatur: "Erik" },
    ]);
    expect(kvalitetskontroll(komplett)?.resultat).toBe("symptomet_borta");
    const rader = kvalitetsgrind(komplett, VIBRATION_METODIK);
    expect(rader.find((r) => r.id === "atgard")?.ok).toBe(true);
    expect(rader.find((r) => r.id === "kvalitetskontroll")?.detalj).toContain("verifierat borta");
  });

  it("motiverat uteblivande godtas utan kvalitetskontroll", () => {
    const ingenAtgard = byggArende([
      OBJEKT,
      ...PREDIAG,
      { typ: "atgard_utford", beskrivning: "Ingen åtgärd utförd", utford: false, motivering: "Kunden avböjde åtgärd" },
      { typ: "arende_avslutat", signatur: "Erik" },
    ]);
    const rader = kvalitetsgrind(ingenAtgard, VIBRATION_METODIK);
    expect(rader.find((r) => r.id === "atgard")?.ok).toBe(true);
    expect(rader.find((r) => r.id === "atgard")?.detalj).toContain("orsaken är dokumenterad");
    // Inget att verifiera → kvalitetskontrollen är inte obligatorisk.
    expect(rader.find((r) => r.id === "kvalitetskontroll")?.kravs).toBe(false);
  });

  it("kvarstående symptom flaggas i grinden i stället för att döljas", () => {
    const kvarstar = byggArende([
      OBJEKT,
      ...PREDIAG,
      { typ: "atgard_utford", beskrivning: "Bytte hjullager höger fram.", utford: true },
      { typ: "kvalitetskontroll", resultat: "kvarstar", beskrivning: "Missljudet finns kvar vid 60 km/h." },
    ]);
    const rad = kvalitetsgrind(kvarstar, VIBRATION_METODIK).find((r) => r.id === "kvalitetskontroll");
    expect(rad?.detalj).toContain("bör inte avslutas som åtgärdat");
  });

  it("demoärendet bär hela kedjan symptom → orsak → åtgärd → verifiering", () => {
    const demo = byggDemoArende(1);
    const typer = demo.handelser.map((p) => p.handelse.typ);
    for (const typ of ["reproducering", "felorsak", "atgard_utford", "kvalitetskontroll"]) {
      expect(typer, typ).toContain(typ);
    }
  });
});

describe("Kundgodkännande före arbete", () => {
  const FORSLAG: Handelse = {
    typ: "atgardsforslag",
    beskrivning: "Balansera om höger framhjul och genomför ny provkörning.",
    uppskattadKostnad: "890 kr",
  };
  const ATGARD: Handelse = { typ: "atgard_utford", beskrivning: "Balanserade om höger framhjul.", utford: true };

  it("lämnat förslag kräver registrerat besked innan arbetet utförs", async () => {
    const { atgardsforslag, kundbeslut } = await import("../ecm");
    const utanBesked = byggArende([OBJEKT, ...PREDIAG, FORSLAG, ATGARD]);
    expect(atgardsforslag(utanBesked)).toHaveLength(1);
    expect(kundbeslut(utanBesked)).toBeUndefined();
    const rad = kvalitetsgrind(utanBesked, VIBRATION_METODIK).find((r) => r.id === "kundgodkannande");
    expect(rad?.kravs).toBe(true);
    expect(rad?.ok).toBe(false);
    expect(rad?.detalj).toContain("registrera kundens besked");

    const medBesked = byggArende([
      OBJEKT,
      ...PREDIAG,
      FORSLAG,
      { typ: "kundbeslut", beslut: "godkant", kanal: "Telefon" },
      ATGARD,
    ]);
    const rad2 = kvalitetsgrind(medBesked, VIBRATION_METODIK).find((r) => r.id === "kundgodkannande");
    expect(rad2?.ok).toBe(true);
    expect(rad2?.detalj).toContain("Telefon");
  });

  it("utfört arbete trots avböjt förslag flaggas som konflikt", () => {
    const konflikt = byggArende([
      OBJEKT,
      ...PREDIAG,
      FORSLAG,
      { typ: "kundbeslut", beslut: "avbojt", kanal: "Telefon", kommentar: "Kunden vill vänta." },
      ATGARD,
    ]);
    const rad = kvalitetsgrind(konflikt, VIBRATION_METODIK).find((r) => r.id === "godkannande_konflikt");
    expect(rad?.ok).toBe(false);
    expect(rad?.kravs).toBe(true);
  });

  it("utan lämnat förslag ställs inget godkännandekrav", () => {
    const utanForslag = byggArende([OBJEKT, ...PREDIAG, ATGARD]);
    expect(kvalitetsgrind(utanForslag, VIBRATION_METODIK).some((r) => r.id === "kundgodkannande")).toBe(false);
  });

  it("demoärendet visar hela kundkedjan: förslag → godkännande → åtgärd", () => {
    const demo = byggDemoArende(1);
    const typer = demo.handelser.map((p) => p.handelse.typ);
    expect(typer.indexOf("atgardsforslag")).toBeLessThan(typer.indexOf("kundbeslut"));
    expect(typer.indexOf("kundbeslut")).toBeLessThan(typer.indexOf("atgard_utford"));
  });
});
