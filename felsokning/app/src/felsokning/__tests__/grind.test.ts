// @vitest-environment node
// Revisionens kritiska fynd, låsta som test.
//
// De här reglerna är produktens hela värde: utan dem är loggen en
// signerad behållare för overifierade påståenden, och kvalitetsgrinden
// ett råd. Går något av testerna sönder har den garantin försvunnit —
// och det syns inte i gränssnittet förrän någon bestrider ett ärende.
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
    { typ: "atgard_utford", text: "Balanserade hjulen." },
    { typ: "kundbeslut", utfall: "godkant", kanal: "Telefon" },
    { typ: "kvalitetskontroll", utfall: "borta", beskrivning: "Provkört, symptomet borta." },
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
      h.typ === "kundbeslut" ? { ...h, utfall: "avbojt" } : h,
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
