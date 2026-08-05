// @vitest-environment node
// Revisionens kritiska fynd, låsta som test.
//
// De här reglerna är produktens hela värde: utan dem är loggen en
// signerad behållare för overifierade påståenden, och kvalitetsgrinden
// ett råd. Går något av testerna sönder har den garantin försvunnit —
// och det syns inte i gränssnittet förrän någon bestrider ett ärende.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { granskaHändelse, tillPost } from "../../../../services/gemensam/handelser.mjs";
import { SPARRFRAGOR as SPARR_SERVER, grinda, grindaArendetyp } from "../../../../services/gemensam/grind.mjs";
import { ALLA_METODIKER } from "../../../../services/gemensam/metodiker.mjs";
import { SPARRFRAGOR } from "../metodik";

const GENERISK = ALLA_METODIKER.at(-1)!;
const ANSPRÅK = { sub: "u-1", namn: "Anna Tekniker", org: "o-1", roll: "tekniker" };

/** Bygger en logg som passerar allt utom det testet handlar om. */
function komplettLogg(extra: Record<string, unknown>[] = []) {
  return [
    { typ: "objekt_identifierat", objekt: { identifierare: "ABC123" } },
    { typ: "historik_kontrollerad", kontrollerad: true },
    { typ: "matarstallning", lage: "ingaende", varde: "14 200" },
    { typ: "matarstallning", lage: "utgaende", varde: "14 205" },
    { typ: "reproducering", status: "ja", beskrivning: "Reproducerat vid 88 km/h." },
    { typ: "felorsak", avvikelse: "Obalans", orsaker: ["Normalt slitage"], underlag: ["Mätvärde"], sakerhet: "hog" },
    { typ: "atgard_utford", beskrivning: "Balanserade hjulen.", utford: true },
    { typ: "kundbeslut", beslut: "godkant", kanal: "Telefon" },
    { typ: "kvalitetskontroll", resultat: "symptomet_borta", beskrivning: "Provkört, symptomet borta." },
    {
      typ: "slutsats",
      motivering:
        "Uppmätt obalans 38 g på höger framhjul mot toleransen 5 g, vilket förklarar varför vibrationen " +
        "uppträder hastighetsberoende kring 88 km/h och försvann efter balansering.",
      uteslutet: "Kast och bussningar kontrollerades utan anmärkning och uteslöts därför.",
      kvarstaende: "Inget. Symptomet reproducerades före och uteblev efter åtgärd.",
      atgardsval: "Balansering valdes framför däckbyte eftersom däcket är oskadat och slitaget inom gräns.",
    },
    { typ: "matvarde", beskrivning: "Lufttryck", varde: "2,4" },
    { typ: "foto", beskrivning: "Objektet" },
    { typ: "foto", beskrivning: "Typskylt" },
    ...GENERISK.steg.flatMap((s) =>
      (s.kontroller ?? []).map((k) => ({
        typ: "kontroll_utford",
        stegId: s.id,
        kontrollId: k.id,
        text: k.text,
        resultat: "Utförd och dokumenterad.",
      })),
    ),
    ...extra,
  ];
}

describe("C-1 · härkomsten sätts av servern, inte av anroparen", () => {
  it("kastar klientens användarnamn och använder den verifierade identiteten", () => {
    const { post } = tillPost(
      { id: "h1", anvandare: "Någon annan", tidpunkt: "2020-01-01T00:00:00.000Z", handelse: { typ: "observation", text: "x" } },
      ANSPRÅK,
      new Date("2026-08-05T10:00:00.000Z"),
    );
    expect(post.anvandare).toBe("Anna Tekniker");
    expect(post.handelse.anvandarId).toBe("u-1");
  });

  it("sätter tidpunkten från serverns klocka men bevarar klientens", () => {
    const nu = new Date("2026-08-05T10:00:00.000Z");
    const { post } = tillPost(
      { id: "h1", tidpunkt: "2020-01-01T00:00:00.000Z", handelse: { typ: "observation", text: "x" } },
      ANSPRÅK,
      nu,
    );
    // Backdatering är poängen med angreppet — serverns tid vinner.
    expect(post.tidpunkt).toBe(nu.toISOString());
    // Men offline-arbetets tid får inte försvinna; glappet ska synas.
    expect(post.handelse.registrerad_tidpunkt).toBe("2020-01-01T00:00:00.000Z");
  });
});

describe("M-3 · formen kontrolleras före skrivning", () => {
  it("avvisar okända händelsetyper — append-only gör felet permanent", () => {
    expect(granskaHändelse({ typ: "pahittad", text: "x" })).toMatch(/okänd händelsetyp/);
    expect(granskaHändelse(null)).toBeTruthy();
    expect(granskaHändelse({ typ: "observation" })).toMatch(/observation\.text/);
  });

  it("hypotesen kan aldrig anta hög tillförlitlighet", () => {
    expect(granskaHändelse({ typ: "hypotes", text: "x", niva: "hog" })).toBeTruthy();
    expect(granskaHändelse({ typ: "hypotes", text: "x", niva: "medel" })).toBeNull();
  });

  it("avvisar id med otillåtna tecken", () => {
    expect(tillPost({ id: "../etc/passwd", handelse: { typ: "observation", text: "x" } }, ANSPRÅK).fel).toBeTruthy();
  });

  it("varje typ i schemat är känd av delningslistan — annars läcker eller tappas den", async () => {
    const { HÄNDELSESCHEMA } = await import("../../../../services/gemensam/handelser.mjs");
    const { DELBART_KUND, ENDAST_INTERNT } = await import("../../../../services/plattform/server.mjs");
    for (const typ of Object.keys(HÄNDELSESCHEMA)) {
      expect([...DELBART_KUND, ...ENDAST_INTERNT], typ).toContain(typ);
    }
  });
});

describe("C-2 · kvalitetsgrinden spärrar på servern", () => {
  it("en tom logg kan inte avslutas", () => {
    const hinder = grinda([], GENERISK).map((h) => h.id);
    expect(hinder).toContain("objekt");
    expect(hinder).toContain("reproducering");
    expect(hinder).toContain("felorsak");
    expect(hinder).toContain("evidens");
  });

  it("ett komplett ärende passerar", () => {
    expect(grinda(komplettLogg(), GENERISK)).toEqual([]);
  });

  it.each([
    ["objekt_identifierat", "objekt"],
    ["reproducering", "reproducering"],
    ["felorsak", "felorsak"],
    ["kvalitetskontroll", "kvalitetskontroll"],
  ])("saknad %s spärrar avslutet", (typ, id) => {
    const logg = komplettLogg().filter((h) => h.typ !== typ);
    expect(grinda(logg, GENERISK).map((h) => h.id)).toContain(id);
  });

  it("arbete utfört trots avböjt förslag är ett hårt fel, inte en varning", () => {
    const logg = komplettLogg().map((h) =>
      h.typ === "kundbeslut" ? { ...h, beslut: "avbojt" } : h,
    );
    expect(grinda(logg, GENERISK).map((h) => h.id)).toContain("avbojt_men_utfort");
  });

  it("nekad historikkontroll utan motivering spärrar; med motivering passerar", () => {
    const utan = komplettLogg().map((h) =>
      h.typ === "historik_kontrollerad" ? { typ: "historik_kontrollerad", kontrollerad: false } : h,
    );
    expect(grinda(utan, GENERISK).map((h) => h.id)).toContain("historik");

    const med = komplettLogg().map((h) =>
      h.typ === "historik_kontrollerad"
        ? { typ: "historik_kontrollerad", kontrollerad: false, kommentar: "Fordonet nytt hos oss." }
        : h,
    );
    expect(grinda(med, GENERISK)).toEqual([]);
  });

  it("en kontroll utan resultat räknas inte som utförd", () => {
    const logg = komplettLogg().map((h) =>
      h.typ === "kontroll_utford" ? { ...h, resultat: "" } : h,
    );
    expect(grinda(logg, GENERISK).map((h) => h.id)).toContain("metodik_kontroller");
  });

  it("ett dokumenterat undantag ersätter evidens — men bara med orsak", () => {
    const utan = komplettLogg().map((h) =>
      h.typ === "kontroll_utford" ? { ...h, resultat: "", undantag: "  " } : h,
    );
    expect(grinda(utan, GENERISK).map((h) => h.id)).toContain("metodik_kontroller");

    const med = komplettLogg().map((h) =>
      h.typ === "kontroll_utford" ? { ...h, resultat: "", undantag: "Lyft upptaget hela dagen." } : h,
    );
    expect(grinda(med, GENERISK)).toEqual([]);
  });
});

describe("M-2 · högvoltsspärren är ett hinder, inte en varning", () => {
  const HOGVOLT = ALLA_METODIKER.find((m) => m.id === "hogvolt")!;

  it("klientens och serverns spärrlistor är identiska", () => {
    expect(Object.keys(SPARRFRAGOR).sort()).toEqual(Object.keys(SPARR_SERVER).sort());
  });

  it("ett nekande svar på behörighetsfrågan spärrar avslutet", () => {
    const logg = [
      ...komplettLogg(),
      { typ: "fraga_besvarad", stegId: "sakerhet", frageId: "behorighet", fraga: "?", svar: "Nej" },
      { typ: "fraga_besvarad", stegId: "sakerhet", frageId: "avstangt", fraga: "?", svar: "Ja" },
    ];
    expect(grinda(logg, HOGVOLT).map((h) => h.id)).toContain("sparr_behorighet");
  });

  it("ett obesvarat säkerhetskrav spärrar också — tystnad är inte ett ja", () => {
    expect(grinda(komplettLogg(), HOGVOLT).map((h) => h.id)).toContain("sparr_behorighet");
  });
});

describe("ärendetypens regelpaket", () => {
  const paket = { arendetyper: { Garanti: { krav: [{ typ: "miltal" }, { typ: "historik" }] } } };

  it("garantiärende kräver miltal och historik", () => {
    const utan = [{ typ: "arendetyp_satt", arendetyp: "Garanti" }];
    expect(grindaArendetyp(utan, paket).map((h) => h.id)).toEqual([
      "arendetyp_miltal",
      "arendetyp_historik",
    ]);
  });

  it("en okänd kravtyp spärrar i stället för att tolkas som uppfylld", () => {
    const trasigt = { arendetyper: { Garanti: { krav: [{ typ: "hittepa" }] } } };
    const logg = [{ typ: "arendetyp_satt", arendetyp: "Garanti" }];
    expect(grindaArendetyp(logg, trasigt)[0].rubrik).toMatch(/Okänt krav/);
  });
});

// Skydd mot den drift som faktiskt inträffade: schemat på servern skrevs
// mot antagna fältnamn i stället för mot domänmodellen. Följden var värre
// än ett typfel — grinden såg utförd åtgärd som utebliven, och krävde
// därför aldrig kundbesked eller kvalitetskontroll. Det syntes inte,
// eftersom testfixturerna hade samma antagande.
describe("schemat följer domänmodellen", () => {
  it("varje obligatoriskt fält i schemat finns i domain.ts", async () => {
    const { HÄNDELSESCHEMA } = await import("../../../../services/gemensam/handelser.mjs");
    const domain = readFileSync("src/felsokning/domain.ts", "utf8");
    const avvikelser: string[] = [];

    for (const [typ, schema] of Object.entries(HÄNDELSESCHEMA as Record<string, object>)) {
      // Klipp ut den del av unionen som beskriver typen.
      const start = domain.indexOf(`typ: "${typ}"`);
      if (start < 0) {
        avvikelser.push(`${typ}: saknas i domain.ts`);
        continue;
      }
      const block = domain.slice(start, start + 700);
      for (const falt of Object.keys(schema)) {
        // Bilagefälten ärvs via intersektion med Bilaga och står inte i blocket.
        if (["bilagaId", "bilagaHash", "dataUrl"].includes(falt)) continue;
        if (!new RegExp(`\\b${falt}\\??:`).test(block)) avvikelser.push(`${typ}.${falt}`);
      }
    }
    expect(avvikelser).toEqual([]);
  });

  it("demoärendets händelser passerar serverns validering", async () => {
    // Slutkontrollen: allt klienten faktiskt producerar måste gå igenom.
    // Ett schema som avvisar riktig trafik är värre än inget schema.
    const { granskaHändelse } = await import("../../../../services/gemensam/handelser.mjs");
    const { byggDemoArende } = await import("../demo");
    const avvisade = byggDemoArende(1)
      .handelser.map((p) => [p.handelse.typ, granskaHändelse(p.handelse)] as const)
      .filter(([, fel]) => fel !== null)
      .map(([typ, fel]) => `${typ}: ${fel}`);
    expect([...new Set(avvisade)]).toEqual([]);
  });
});

// ---- En mätning ska loggas som en mätning -------------------------------
//
// Bakgrund: en kontroll vars krav är "matvarde" loggade bara
// kontroll_utford. Följden var att 56 av metodikernas 153 kontroller —
// drygt en tredjedel — mätte utan att det syntes någonstans:
// felorsaksanalysen nekade "Mätresultat" som underlag trots att
// teknikern just hade mätt, och evidensprofilen i analysvyn underskattade
// systematiskt hur mycket som faktiskt mäts i verkstaden.
//
// Testet låser förhållandet mellan metodikernas krav och den evidens de
// måste ge, så att en framtida kontrolltyp inte kan införas utan att
// någon tar ställning till vilken evidens den producerar.
describe("metodikernas mätkontroller producerar mätevidens", () => {
  it("varje kontroll har ett känt krav", async () => {
    const { ALLA_METODIKER } = await import("../../../../services/gemensam/metodiker.mjs");
    const kravtyper = new Set<string>();
    for (const m of ALLA_METODIKER) {
      for (const steg of m.steg) {
        for (const k of steg.kontroller ?? []) if (k.krav) kravtyper.add(k.krav);
      }
    }
    expect([...kravtyper].sort()).toEqual(["foto", "kommentar", "matvarde"]);
  });

  it("KontrollKort loggar ett matvarde när kravet är matvarde", () => {
    const kod = readFileSync("src/pages/felsokning/ArendeSida.tsx", "utf8");
    expect(kod).toMatch(/krav === "matvarde" && resultat\.trim\(\)/);
    expect(kod).toMatch(/skicka\(\{ typ: "matvarde", beskrivning: kontroll\.text/);
  });

  it('underlagskällan "Mätresultat" godtar just den händelsetypen', async () => {
    const { underlagFinns } = await import("../ecm");
    const arende = {
      handelser: [{ id: "1", tidpunkt: "", anvandare: "A", handelse: { typ: "matvarde", beskrivning: "Lufttryck", varde: "2,4 bar" } }],
    } as never;
    expect(underlagFinns(arende, "Mätresultat")).toBe(true);
  });
});

// ---- C-5 · Schemat är stängt --------------------------------------------
//
// Revision 2 fann att granskaHändelse itererade schemats nycklar och
// aldrig händelsens. Följden: vilket okänt fält som helst accepterades och
// sparades ordagrant. Ett registreringsnummer på en vanlig observation
// hamnade aldrig i krypteringslistan, överlevde därför raderingen, och
// gick ut i kundens delningslänk eftersom delningsfiltret arbetar på
// typnivå.
//
// Testerna nedan låser tre saker: att okända fält avvisas, att avslaget
// är hårt (inte en tyst strykning), och att deklarationen inte kan glida
// från domänmodellen åt något håll.
describe("händelseschemat är stängt", () => {
  it("avvisar påhängda fält på en i övrigt giltig händelse", async () => {
    const { granskaHändelse } = await import("../../../../services/gemensam/handelser.mjs");
    const fel = granskaHändelse({
      typ: "observation",
      text: "Kontroll av bromsok.",
      vin: "YV1DZ8256F2123456",
      personnummer: "19800101-1234",
    });
    expect(fel).toMatch(/okända fält/);
    expect(fel).toContain("vin");
    expect(fel).toContain("personnummer");
  });

  it("avslaget är hårt — händelsen skrivs inte utan de okända fälten", async () => {
    // En tyst strykning vore värre än att spara skräpet: anroparen tror
    // att värdet finns i loggen och upptäcker motsatsen när det behövs.
    const { tillPost } = await import("../../../../services/gemensam/handelser.mjs");
    const { post, fel } = tillPost(
      { id: "a1", handelse: { typ: "observation", text: "Kontroll.", vin: "ABC123" } },
      { sub: "u1", namn: "Anna", org: "o1" },
    );
    expect(post).toBeUndefined();
    expect(fel).toMatch(/okända fält/);
  });

  it("systemets egna fält passerar", async () => {
    const { granskaHändelse } = await import("../../../../services/gemensam/handelser.mjs");
    expect(
      granskaHändelse({
        typ: "observation",
        text: "Kontroll av bromsok.",
        anvandarId: "u1",
        registrerad_tidpunkt: "2026-01-01T10:00:00.000Z",
      }),
    ).toBeNull();
  });

  it("protokollinläsningens härkomstfält är deklarerat", async () => {
    // Integrationen fungerade tidigare bara därför att schemat var öppet.
    // Stängs schemat utan att `kalla` deklareras slutar den fungera.
    const { granskaHändelse } = await import("../../../../services/gemensam/handelser.mjs");
    const { protokollTillHandelser } = await import("../../../../services/gemensam/integration.mjs");
    const handelser = protokollTillHandelser(
      { dtcs: [{ code: "P0420", description: "Katalysator under tröskel" }], liveData: [{ name: "Lambda", value: "0,81", unit: "V" }] },
      { felkoder: { vag: "dtcs", kod: "code", text: "description" },
        matvarden: { vag: "liveData", beskrivning: "name", varde: "value", enhet: "unit" } },
      "Diagnosinstrument, bås 3",
    );
    expect(handelser.length).toBe(2);
    for (const h of handelser) expect(granskaHändelse(h)).toBeNull();
  });

  it("varje valfritt fält i schemat finns i domänmodellen", async () => {
    const { VALFRIA_FÄLT } = await import("../../../../services/gemensam/handelser.mjs");
    const domain = readFileSync("src/felsokning/domain.ts", "utf8");
    const ärvda = ["bilagaId", "bilagaHash", "dataUrl"];
    const avvikelser: string[] = [];
    for (const [typ, falt] of Object.entries(VALFRIA_FÄLT as Record<string, string[]>)) {
      const start = domain.indexOf(`typ: "${typ}"`);
      const block = domain.slice(start, start + 900);
      for (const f of falt) {
        if (ärvda.includes(f) || f === "kalla") continue; // Bilaga respektive härkomst
        if (!new RegExp(`\\b${f}\\?:`).test(block)) avvikelser.push(`${typ}.${f}`);
      }
    }
    expect(avvikelser).toEqual([]);
  });

  it("varje valfritt fält i domänmodellen är deklarerat i schemat", async () => {
    // Den riktningen är den farliga: ett nytt valfritt fält i modellen
    // som ingen deklarerar avvisas i produktion, inte i testet.
    const { HÄNDELSESCHEMA, VALFRIA_FÄLT } = await import("../../../../services/gemensam/handelser.mjs");
    const domain = readFileSync("src/felsokning/domain.ts", "utf8");
    // Unionen måste avgränsas: annars svämmar den sista medlemmen in i
    // resten av filen och testet rapporterar andra typers fält.
    const fran = domain.indexOf("export type Handelse =");
    const till = domain.indexOf("\n\nexport ", fran);
    const union = domain.slice(fran, till > 0 ? till : undefined);
    // `(?!\s*\|)` sållar bort ai_svar-radernas egen typunion
    // (`typ: "observation" | "verifierat" | …`), som annars läses som en
    // ny unionsmedlem och förskjuter alla block efter den.
    const traffar = [...union.matchAll(/typ: "([a-z_]+)"(?!\s*\|)/g)];
    const typer = traffar.map((m) => m[1]);
    const avvikelser: string[] = [];

    traffar.forEach((traff, i) => {
      const typ = traff[1];
      const start = traff.index!;
      const nasta = i + 1 < traffar.length ? traffar[i + 1].index! : union.length;
      const block = union.slice(start, nasta);
      const deklarerade = new Set([
        ...Object.keys((HÄNDELSESCHEMA as Record<string, object>)[typ] ?? {}),
        ...((VALFRIA_FÄLT as Record<string, string[]>)[typ] ?? []),
      ]);
      for (const m of block.matchAll(/^\s+(\w+)\?:/gm)) {
        if (!deklarerade.has(m[1])) avvikelser.push(`${typ}.${m[1]}`);
      }
    });
    expect(avvikelser).toEqual([]);
  });
});

// ---- Fotokontroller verifieras av foton ----------------------------------
//
// QUALITY-AUDIT-2 · M-7, funnet först när klienten slutade ha en egen,
// mildare mening om avslut. Grinden krävde ett textresultat även på
// kontroller vars krav är foto — trots att gränssnittet märker det fältet
// "Observation (valfritt)". Servern hade alltså nekat avslut på nästan
// varje riktigt ärende, och teknikern fått veta det först vid synk.
describe("grinden räknar rätt sorts evidens per kontrolltyp", () => {
  const kontrollHandelser = (metodik: { steg: { id: string; kontroller?: { id: string; krav?: string; text: string }[] }[] }, medResultat: boolean) =>
    metodik.steg.flatMap((s) =>
      (s.kontroller ?? []).map((k) => ({
        typ: "kontroll_utford",
        stegId: s.id,
        kontrollId: k.id,
        text: k.text,
        ...(medResultat && k.krav !== "foto" ? { resultat: "Uppmätt inom tolerans." } : {}),
      })),
    );

  it("en fotokontroll utan textresultat är inte ett hinder när fotot finns", async () => {
    const { grinda } = await import("../../../../services/gemensam/grind.mjs");
    const { VIBRATION } = await import("../../../../services/gemensam/metodiker.mjs");
    const fotokrav = VIBRATION.steg.flatMap((s: { kontroller?: { krav?: string }[] }) =>
      (s.kontroller ?? []).filter((k) => k.krav === "foto"),
    ).length;
    expect(fotokrav).toBeGreaterThan(0);

    const logg = [
      ...kontrollHandelser(VIBRATION, true),
      ...Array.from({ length: fotokrav }, (_, i) => ({ typ: "foto", beskrivning: `Hjul ${i + 1}` })),
    ];
    const hinder = grinda(logg, VIBRATION).map((h: { id: string }) => h.id);
    expect(hinder).not.toContain("metodik_kontroller");
    expect(hinder).not.toContain("foton");
  });

  it("men saknas fotona spärrar det fortfarande", async () => {
    const { grinda } = await import("../../../../services/gemensam/grind.mjs");
    const { VIBRATION } = await import("../../../../services/gemensam/metodiker.mjs");
    const hinder = grinda(kontrollHandelser(VIBRATION, true), VIBRATION).map((h: { id: string }) => h.id);
    expect(hinder).toContain("foton");
  });

  it("en mät- eller kommentarkontroll utan resultat spärrar fortfarande", async () => {
    const { grinda } = await import("../../../../services/gemensam/grind.mjs");
    const { VIBRATION } = await import("../../../../services/gemensam/metodiker.mjs");
    const hinder = grinda(kontrollHandelser(VIBRATION, false), VIBRATION).map((h: { id: string }) => h.id);
    expect(hinder).toContain("metodik_kontroller");
  });
});
