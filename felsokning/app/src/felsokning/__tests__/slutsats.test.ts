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
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MINSTA_MOTIVERING,
  granskaFalt,
  granskaSlutsats,
  obemottaHypoteser,
} from "../../../../services/gemensam/motivering.mjs";
import { ICKESVAR_PER_SPRAK } from "../../../../services/gemensam/sprak/ord.mjs";

// Fältet anges numera med sin katalognyckel, inte med en svensk etikett.
// Testerna prövar därför mönster som gäller på engelska — standardspråket
// — och språkberoendet prövas för sig längst ned.
const MOT = "slutsats.falt.motivering";

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
    expect(granskaFalt(MOT, "")).toMatch(/is missing/);
    expect(granskaFalt(MOT, "   ")).toMatch(/is missing/);
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
    expect(granskaFalt(MOT, text)).toMatch(/is not a reason/);
  });

  it("avvisar text som är för kort för att gå att granska", () => {
    expect(granskaFalt(MOT, "Reläet var dåligt", { minsta: MINSTA_MOTIVERING })).toMatch(/too short/);
  });

  it("avvisar en omformulering av slutsatsen utan orsakssamband", () => {
    // Vad, men inte varför. Detta är den vanligaste bristen och den
    // svåraste att fånga — texten ser fullgod ut tills man frågar vad
    // den egentligen påstår.
    const fel = granskaFalt(
      MOT,
      "Reläet till bränslepumpen fungerade inte som det ska och byttes därmed ut mot ett nytt relä.",
      { minsta: MINSTA_MOTIVERING, kravOrsak: true },
    );
    expect(fel).toMatch(/states what, but not why/);
  });

  it("godtar ett resonemang med orsakssamband", () => {
    expect(granskaFalt(MOT, GILTIG.motivering, { minsta: MINSTA_MOTIVERING, kravOrsak: true })).toBeNull();
  });

  it("godtar konkreta mätvärden som evidensreferens även utan orsaksord", () => {
    // Den som skriver "12,4 V vid stift 14" hänvisar till en mätning
    // utan att säga ordet mätning. Regeln får inte tvinga fram ett
    // språkbruk som inte är teknikerns.
    expect(
      granskaFalt(MOT, "Stift 14 låg på 12,4 V med tändning på, stift 7 på 0,03 ohm mot jord.", {
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
    expect(brister[0].nyckel).toBe("slutsats.utan_slutsats");
    expect(brister[0].text).toMatch(/cannot be closed without a closing statement/);
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
    expect(brister.map((b) => b.text).join(" ")).toMatch(/is in the log but is not addressed/);
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
    const brister = granskaSlutsats(GILTIG, logg).filter((b) => b.nyckel === "slutsats.hypotes_obemott");
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

// ---- Hela avslutskedjan, inte bara slutsatsen ---------------------------
//
// Hittat genom att köra tio ärenden av olika karaktär hela vägen genom
// gränssnittet: samtliga gick att stänga på skärmen med utfört arbete och
// utan kundbesked — men grinden på servern kräver beskedet. Samma glapp
// som slutsatsen hade, på ett annat villkor.
//
// Testet speglar klientens kanAvslutas mot grinden för hela kedjan, så
// att nästa villkor som läggs till i grinden inte kan glömmas i klienten.
describe("klientens avslutsvillkor täcker hela grindens åtgärdskedja", () => {
  const KEDJA = [
    { typ: "reproducering", status: "ja", beskrivning: "Reproducerad vid provkörning i 90 km/h på plan väg." },
    {
      typ: "felorsak",
      avvikelse: "Höger framhjul har 38 g obalans mot gränsen 10 g.",
      orsaker: ["Normalt slitage"],
      underlag: ["Mätresultat"],
      sakerhet: "hog",
      atgard: "Balansera om höger framhjul.",
    },
    { typ: "atgard_utford", beskrivning: "Balanserade om höger framhjul.", utford: true },
    { typ: "kvalitetskontroll", resultat: "symptomet_borta", beskrivning: "Ny provkörning — ingen vibration." },
  ];

  const gateHinder = async (handelser: unknown[]) => {
    const { grinda } = await import("../../../../services/gemensam/grind.mjs");
    const { ALLA_METODIKER } = await import("../../../../services/gemensam/metodiker.mjs");
    return grinda(handelser, ALLA_METODIKER.at(-1)).map((h) => h.id);
  };

  it("utfört arbete utan kundbesked spärras av grinden", async () => {
    expect(await gateHinder(KEDJA)).toContain("kundbeslut");
  });

  it("med kundbesked försvinner det hindret", async () => {
    const med = [...KEDJA, { typ: "kundbeslut", beslut: "godkant", kanal: "telefon" }];
    expect(await gateHinder(med)).not.toContain("kundbeslut");
  });

  // QUALITY-AUDIT-2 · M-7. Testet krävde tidigare att klienten räknade
  // upp grindens villkor. Det var fel sorts skydd: det låser bara fast
  // de villkor någon råkade tänka på, och nästa villkor som läggs till i
  // grinden glider isär precis som de två föregående gjorde.
  //
  // Nu krävs i stället att klienten inte har någon egen mening. Ett
  // uttryck kan inte glida från sig självt.
  it("klienten frågar grinden i stället för att upprepa den", () => {
    const kod = readFileSync("src/pages/felsokning/ArendeSida.tsx", "utf8");
    expect(kod).toContain('from "../../../../services/gemensam/grind.mjs"');

    const rad = kod.match(/const kanAvslutas =[\s\S]{0,200}?;/)?.[0] ?? "";
    expect(rad).toContain("hinder.length === 0");

    // Ingen egen uppräkning av grindens villkor får finnas kvar.
    const uppraknat = kod.match(/const underlagKlart =[\s\S]{0,300}?;/)?.[0] ?? "";
    for (const villkor of ["reproducering(arende)", "felorsaker(arende)", "kvalitetskontroll(arende)", "kundbeslut(arende)"]) {
      expect(uppraknat, `klienten upprepar grindens villkor: ${villkor}`).not.toContain(villkor);
    }
  });

  it("hindren som visas är grindens egna, med id och rubrik", () => {
    const kod = readFileSync("src/pages/felsokning/ArendeSida.tsx", "utf8");
    expect(kod).toMatch(/function Avslutshinder\(\{ hinder \}/);
    expect(kod).toContain("h.rubrik");
  });
});

// ---- Vägen ut måste alltid finnas ---------------------------------------
//
// När kundbeskedet blev ett avslutsvillkor i klienten uppstod en fälla:
// knappen "Lämna åtgärdsförslag till kund" visades bara när ingen åtgärd
// var dokumenterad, och beskedsrutan bara när ett förslag fanns. En
// tekniker som skrev åtgärden först hade därmed inget sätt att registrera
// beskedet — och ärendet gick inte att stänga, utan att gränssnittet
// kunde tala om varför.
//
// Grinden avvisade redan sådana ärenden vid synk; villkoret i klienten
// flyttade bara upptäckten. Ett spärrvillkor utan väg ut är ett fel även
// när spärren i sig är riktig.
describe("kundbeskedet går att registrera även när åtgärden skrevs först", () => {
  const kod = readFileSync("src/pages/felsokning/ArendeSida.tsx", "utf8");

  it("förslagsknappen döljs inte av att en åtgärd redan är dokumenterad", () => {
    expect(kod).toContain("{forslag.length === 0 && !forslagsLage && (");
    expect(kod).not.toContain("forslag.length === 0 && !forslagsLage && poster.length === 0");
  });

  it("beskedsrutan öppnas av att ett förslag finns", () => {
    expect(kod).toContain("{forslag.length > 0 && !beslut && (");
  });
});

// ---- Regeln gällde bara på svenska (ALVA-SPEC-060) ----------------------
//
// Icke-svarslistan var enbart svensk. En tysk tekniker som skrev
// "erledigt" i motiveringsfältet passerade filtret — inte därför att
// texten dög, utan därför att filtret bara kände igen "klart". Grinden
// släppte igenom avslutet och rapporten såg fullständig ut.
//
// Det var alltså inte en översättningsbrist utan ett hål i den regel som
// är hela produktens värde, och det gällde varje marknad utom en.
describe("icke-svar fångas oavsett språk", () => {
  const SPRAKPROV: [string, string][] = [
    ["de", "erledigt"],
    ["en", "done"],
    ["fr", "réparé"],
    ["es", "hecho"],
    ["it", "fatto"],
    ["pl", "zrobione"],
    ["nl", "klaar"],
    ["pt", "feito"],
    ["ro", "gata"],
    ["sv", "klart"],
  ];

  it.each(SPRAKPROV)("%s: %s är inget skäl", (_kod, text) => {
    expect(granskaFalt(MOT, text)).toMatch(/is not a reason/);
  });

  it("varje språk har en egen lista, inte en kopia av svenskan", () => {
    // Motvikt mot provet ovan: det hade också passerat om alla listor
    // vore samma svenska lista och proven råkade stå i den.
    const per = ICKESVAR_PER_SPRAK as Record<string, string[]>;
    for (const [kod, lista] of Object.entries(per)) {
      expect(lista.length, kod).toBeGreaterThan(15);
      if (kod === "sv") continue;
      const egna = lista.filter((o) => !per.sv.includes(o));
      expect(egna.length, kod).toBeGreaterThan(10);
    }
  });

  it("ett giltigt kort svar är fortfarande giltigt", () => {
    // "Inget kvarstår" får inte fångas som icke-svar. Att tvinga fram
    // utfyllnad är sämre än ett kort sant svar — se sprak/ord.mjs.
    expect(granskaFalt("slutsats.falt.kvarstaende", "Inget", { minsta: 5 })).toBeNull();
    expect(granskaFalt("slutsats.falt.kvarstaende", "Nothing", { minsta: 5 })).toBeNull();
    expect(granskaFalt("slutsats.falt.kvarstaende", "Keine", { minsta: 5 })).toBeNull();
  });

  it("orsakssamband känns igen på andra språk än svenska", () => {
    // Utan det här nekas en tysk eller polsk tekniker avslut på ett
    // korrekt skrivet underlag — vilket är värre än att släppa igenom
    // ett dåligt, eftersom det gör spärren till något man kringgår.
    const prov = [
      "Der Relaiskontakt war eingebrannt, was den Startaussetzer erklärt und im Foto zu sehen ist.",
      "The relay contact was pitted, which explains the intermittent no-start; the photo shows the arcing.",
      "Styk przekaźnika był wypalony, dlatego rozrusznik nie zawsze działał, co widać na zdjęciu.",
    ];
    for (const text of prov) {
      expect(granskaFalt(MOT, text, { minsta: MINSTA_MOTIVERING, kravOrsak: true }), text).toBeNull();
    }
  });
});

describe("slutsatsen talar organisationens språk", () => {
  it("samma brist, olika språk, samma nyckel", () => {
    const en = granskaSlutsats(undefined, [])[0];
    const de = granskaSlutsats(undefined, [], "de")[0];
    expect(de.nyckel).toBe(en.nyckel);
    expect(de.text).not.toBe(en.text);
    expect(de.text).toMatch(/Abschlussfeststellung/);
  });

  it("fältnamnet översätts med resten av meningen", () => {
    expect(granskaFalt(MOT, "", { sprak: "de" })).toBe("Begründung fehlt.");
    expect(granskaFalt(MOT, "", { sprak: "sv" })).toBe("Motivering saknas.");
  });
});
