// @vitest-environment node
// ALVA-RULE-200 · Ett ärende stängs aldrig utan ett varför.
//
// Regeln är värdelös om den går att uppfylla med "klart". Testerna nedan
// är därför mest en katalog över hur någon med bråttom faktiskt skriver,
// och ett krav på att systemet inte accepterar det.
//
// Den viktigaste regeln är den sista: en hypotes som dokumenterats och
// inte blivit slutsatsen måste bemötas. Utan den är en felsökning en
// gissning som råkade stämma — och det är precis den skillnaden en
// försäkringsbedömare försöker avgöra.
import { describe, expect, it } from "vitest";
import {
  MINSTA_MOTIVERING,
  granskaFalt,
  granskaSlutsats,
  obemottaHypoteser,
} from "../../../../services/gemensam/motivering.mjs";

const GILTIG = {
  typ: "slutsats",
  motivering:
    "Uppmätt spänningsfall 2,1 V över reläets slutkontakt vid belastning, mot 0,2 V som är gränsen. " +
    "Det förklarar varför bränslepumpen inte får full matning och varför felet bara uppträder varm.",
  uteslutet:
    "Bränslepumpen själv uteslöts eftersom den drar rätt ström vid direktmatning. Kablaget mättes utan anmärkning.",
  kvarstaende: "Inget. Symptomet reproducerades och försvann efter bytet.",
  atgardsval:
    "Reläet byttes i stället för att rengöras eftersom kontaktytorna är eroderade och rengöring inte återställer dem.",
};

const ARBETE = [{ typ: "atgard_utford", beskrivning: "Bytte bränslepumpsrelä.", utford: true }];

describe("motiveringen måste vara ett skäl, inte en upprepning", () => {
  it("avvisar tomt fält", () => {
    expect(granskaFalt("Motivering", "")).toMatch(/saknas/);
    expect(granskaFalt("Motivering", "   ")).toMatch(/saknas/);
  });

  it.each([
    "klart",
    "OK",
    "åtgärdat",
    "fixat",
    "se ovan",
    "trasig",
    "defekt",
    "sliten",
    "behöver bytas",
    "enligt kund",
    "vet ej",
    "-",
    "n/a",
  ])("avvisar icke-svaret %s", (text) => {
    expect(granskaFalt("Motivering", text)).toMatch(/är inget skäl/);
  });

  it("avvisar text som är för kort för att gå att granska", () => {
    expect(granskaFalt("Motivering", "Reläet var dåligt", { minsta: MINSTA_MOTIVERING })).toMatch(/för kort/);
  });

  it("avvisar en omformulering av slutsatsen utan orsakssamband", () => {
    // Vad, men inte varför. Detta är den vanligaste bristen och den
    // svåraste att fånga — texten ser fullgod ut tills man frågar vad
    // den egentligen påstår.
    const fel = granskaFalt(
      "Motivering",
      "Reläet till bränslepumpen fungerade inte som det ska och byttes därmed ut mot ett nytt relä.",
      { minsta: MINSTA_MOTIVERING, kravOrsak: true },
    );
    expect(fel).toMatch(/anger vad, men inte varför/);
  });

  it("godtar ett resonemang med orsakssamband", () => {
    expect(granskaFalt("Motivering", GILTIG.motivering, { minsta: MINSTA_MOTIVERING, kravOrsak: true })).toBeNull();
  });

  it("godtar konkreta mätvärden som evidensreferens även utan orsaksord", () => {
    // Den som skriver "12,4 V vid stift 14" hänvisar till en mätning
    // utan att säga ordet mätning. Regeln får inte tvinga fram ett
    // språkbruk som inte är teknikerns.
    expect(
      granskaFalt("Motivering", "Stift 14 låg på 12,4 V med tändning på, stift 7 på 0,03 ohm mot jord.", {
        minsta: MINSTA_MOTIVERING,
        kravOrsak: true,
      }),
    ).toBeNull();
  });
});

describe("hela slutsatsen inför avslut", () => {
  it("saknad slutsats spärrar avslutet", () => {
    const brister = granskaSlutsats(undefined, []);
    expect(brister).toHaveLength(1);
    expect(brister[0].text).toMatch(/kan inte avslutas utan en slutsats/);
  });

  it("en fullständig slutsats passerar", () => {
    expect(granskaSlutsats(GILTIG, ARBETE)).toEqual([]);
  });

  it("kräver val av åtgärd när arbete utförts — men inte annars", () => {
    const utanVal = { ...GILTIG, atgardsval: undefined };
    expect(granskaSlutsats(utanVal, ARBETE).map((b) => b.falt)).toContain("atgardsval");
    // Utan utfört arbete finns inget åtgärdsval att motivera.
    expect(granskaSlutsats(utanVal, [{ typ: "atgard_utford", beskrivning: "Ingen åtgärd.", utford: false }])).toEqual([]);
  });

  it("kvarstående osäkerhet får vara inget — men måste sägas aktivt", () => {
    expect(granskaSlutsats({ ...GILTIG, kvarstaende: "Inget." }, ARBETE)).toEqual([]);
    expect(granskaSlutsats({ ...GILTIG, kvarstaende: "" }, ARBETE).map((b) => b.falt)).toContain("kvarstaende");
  });

  it("den ärliga vägen: orsaken kunde inte fastställas, men varför måste stå där", () => {
    const oklart = {
      typ: "slutsats",
      orsakFastställd: false,
      motivering:
        "Felet gick inte att reproducera under de förhållanden som rådde, eftersom det enligt kunden " +
        "bara uppträder vid längre körning i kyla. Ingen avvikelse kunde mätas fram vid undersökningen.",
      uteslutet: "Kablaget och kontaktdonen kontrollerades utan anmärkning vid genomgång.",
      kvarstaende: "Orsaken är inte fastställd. Fordonet bör återkomma vid symptom.",
    };
    expect(granskaSlutsats(oklart, [])).toEqual([]);

    // Men "vet ej" duger inte som skäl till att man inte vet.
    expect(granskaSlutsats({ ...oklart, motivering: "vet ej" }, []).map((b) => b.falt)).toContain("motivering");
  });
});

describe("dokumenterade hypoteser måste bemötas", () => {
  const HYPOTES = { typ: "hypotes", text: "Misstänkt glapp i hjullagret höger fram", niva: "medel" };

  it("en obemött hypotes spärrar avslutet", () => {
    const brister = granskaSlutsats(GILTIG, [...ARBETE, HYPOTES]);
    expect(brister.map((b) => b.text).join(" ")).toMatch(/finns i loggen men bemöts inte/);
  });

  it("hypotesen är bemött när uteslutandet nämner den", () => {
    const bemött = {
      ...GILTIG,
      uteslutet:
        "Hjullagret kontrollerades utan glapp och uteslöts därför. Bränslepumpen drar rätt ström vid direktmatning.",
    };
    expect(obemottaHypoteser([...ARBETE, HYPOTES], bemött)).toEqual([]);
    expect(granskaSlutsats(bemött, [...ARBETE, HYPOTES])).toEqual([]);
  });

  it("hypotesen är bemött när den blev den fastställda orsaken", () => {
    const logg = [
      ...ARBETE,
      HYPOTES,
      { typ: "felorsak", avvikelse: "Glapp i hjullagret höger fram, 1,2 mm axiellt.", orsaker: [], underlag: [] },
    ];
    expect(obemottaHypoteser(logg, GILTIG)).toEqual([]);
  });

  it("flera hypoteser rapporteras var för sig", () => {
    const logg = [
      ...ARBETE,
      HYPOTES,
      { typ: "hypotes", text: "Möjlig obalans i framhjulen", niva: "lag" },
    ];
    const brister = granskaSlutsats(GILTIG, logg).filter((b) => b.text.includes("bemöts inte"));
    expect(brister).toHaveLength(2);
  });

  it("ett ärende utan hypoteser kräver inget bemötande", () => {
    expect(obemottaHypoteser(ARBETE, GILTIG)).toEqual([]);
  });
});

describe("grinden spärrar avslutet utan slutsats", () => {
  it("saknad slutsats ger ett hinder med id slutsats_slutsats", async () => {
    const { grinda } = await import("../../../../services/gemensam/grind.mjs");
    const { ALLA_METODIKER } = await import("../../../../services/gemensam/metodiker.mjs");
    const hinder = grinda([], ALLA_METODIKER.at(-1)).map((h) => h.id);
    expect(hinder).toContain("slutsats_slutsats");
  });
});

// ---- Klient och grind måste ge samma svar --------------------------------
//
// Bakgrunden till det här testet är en riktig bugg: kvalitetsgrinden på
// servern krävde en slutsats, men klientens avslutsknapp gjorde inte det.
// Demoärendet gick därför att stänga på skärmen utan ett varför, och
// teknikern fick beskedet först vid synk — vilket är den sämsta tänkbara
// tidpunkten, eftersom bilen då har lämnat verkstaden.
//
// Testet jämför inte texter utan verdikt: samma logg ska ge samma svar på
// frågan "får detta ärende stängas?" i båda ändar.
describe("avslutsvillkoret är detsamma i klienten och i grinden", () => {
  const slutsatsHinder = async (handelser: unknown[]) => {
    const { grinda } = await import("../../../../services/gemensam/grind.mjs");
    const { ALLA_METODIKER } = await import("../../../../services/gemensam/metodiker.mjs");
    return grinda(handelser, ALLA_METODIKER.at(-1))
      .map((h) => h.id)
      .filter((id) => id.startsWith("slutsats_"));
  };

  // Precis det uttryck klienten använder i ArendeSida.kanAvslutas.
  const klientBrister = (handelser: Record<string, unknown>[]) =>
    granskaSlutsats([...handelser].reverse().find((h) => h.typ === "slutsats"), handelser);

  it("en logg utan slutsats spärras i båda ändar", async () => {
    expect(klientBrister(ARBETE).length).toBeGreaterThan(0);
    expect(await slutsatsHinder(ARBETE)).not.toHaveLength(0);
  });

  it("en logg med fullständig slutsats släpps igenom i båda ändar", async () => {
    const logg = [...ARBETE, GILTIG];
    expect(klientBrister(logg)).toEqual([]);
    expect(await slutsatsHinder(logg)).toEqual([]);
  });

  it("en slutsats med tunn motivering spärras i båda ändar", async () => {
    const logg = [...ARBETE, { ...GILTIG, motivering: "Klart." }];
    expect(klientBrister(logg).length).toBeGreaterThan(0);
    expect(await slutsatsHinder(logg)).not.toHaveLength(0);
  });

  it("en obemött hypotes spärras i båda ändar", async () => {
    const logg = [...ARBETE, { typ: "hypotes", text: "Misstänkt glapp i hjullagret höger fram", niva: "medel" }, GILTIG];
    expect(klientBrister(logg).length).toBeGreaterThan(0);
    expect(await slutsatsHinder(logg)).not.toHaveLength(0);
  });
});
