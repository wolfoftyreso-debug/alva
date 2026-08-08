// @vitest-environment node
// Dataskydd, spårbara mätvärden och den egenskap som hittills hållit av
// en slump.
import { describe, expect, it } from "vitest";
import {
  GALLRING_MANADER,
  IDENTIFIERANDE,
  MASKERAT,
  gallringsdatum,
  skydda,
  skyddaHändelse,
  öppna,
  öppnaHändelse,
} from "../../../../services/gemensam/personuppgifter.mjs";
import { kalibreradVid } from "../ecm";

const NYCKEL = Buffer.alloc(32, 7);
const ANNAN = Buffer.alloc(32, 9);
const nycklar = (poster: [string, Buffer][]) => new Map(poster);

describe("C-3 · krypto-shredding gör append-only och radering förenliga", () => {
  it("skyddar och öppnar ett värde med rätt nyckel", () => {
    const skyddat = skydda("ABC123", "n1", NYCKEL);
    expect(skyddat).not.toContain("ABC123");
    expect(öppna(skyddat, nycklar([["n1", NYCKEL]]))).toBe("ABC123");
  });

  it("en förstörd nyckel maskerar värdet i stället för att kasta", () => {
    // Det normala utfallet efter en radering — inte ett fel. Ett kastat
    // undantag skulle göra hela ärendet oläsbart, vilket vore precis
    // fel: resten av bevisningen ska överleva.
    const skyddat = skydda("ABC123", "n1", NYCKEL);
    expect(öppna(skyddat, nycklar([]))).toBe(MASKERAT);
  });

  it("fel nyckel avslöjas av autentiseringstaggen", () => {
    const skyddat = skydda("ABC123", "n1", NYCKEL);
    expect(öppna(skyddat, nycklar([["n1", ANNAN]]))).toBe(MASKERAT);
  });

  it("manipulerad chiffertext maskeras — den öppnas aldrig delvis", () => {
    const skyddat = skydda("ABC123", "n1", NYCKEL);
    const manipulerat = `${skyddat.slice(0, -4)}AAAA`;
    expect(öppna(manipulerat, nycklar([["n1", NYCKEL]]))).toBe(MASKERAT);
  });

  it("registreringsnummer och VIN behandlas som personuppgift", () => {
    // Ett fordon pekar i praktiken ut en ägare, och här finns kopplingen.
    expect(IDENTIFIERANDE.arbetsorder_skannad).toContain("fordon_regnr");
    expect(IDENTIFIERANDE.arbetsorder_skannad).toContain("fordon_vin");
    expect(IDENTIFIERANDE.objekt_identifierat).toContain("identifierare");
  });

  it("skyddar arbetsorderns identifierande fält men lämnar resten", () => {
    const h = skyddaHändelse(
      {
        typ: "arbetsorder_skannad",
        falt: [
          { id: "kund_namn", varde: "Anders Svensson" },
          { id: "fordon_regnr", varde: "ABC123" },
          { id: "felbeskrivning", varde: "Vibrerar vid 88 km/h" },
        ],
      },
      "n1",
      NYCKEL,
    );
    const värden = Object.fromEntries(h.falt.map((f: { id: string; varde: string }) => [f.id, f.varde]));
    expect(värden.kund_namn).not.toContain("Anders");
    expect(värden.fordon_regnr).not.toContain("ABC123");
    // Felbeskrivningen är verksamhetsdata — den ska överleva raderingen,
    // annars raderas beviset tillsammans med personuppgiften.
    expect(värden.felbeskrivning).toBe("Vibrerar vid 88 km/h");
  });

  it("bevisningen överlever raderingen — bara identifieringen försvinner", () => {
    const skyddad = skyddaHändelse(
      { typ: "objekt_identifierat", objekt: { identifierare: "ABC123", beskrivning: "Volvo XC60" } },
      "n1",
      NYCKEL,
    );
    const efterRadering = öppnaHändelse(skyddad, nycklar([]));
    expect(efterRadering.objekt.identifierare).toBe(MASKERAT);
    expect(efterRadering.objekt.beskrivning).toBe("Volvo XC60");
  });

  it("händelser utan identifierande fält passerar orörda", () => {
    const h = { typ: "matvarde", beskrivning: "Lufttryck", varde: "2,4" };
    expect(skyddaHändelse(h, "n1", NYCKEL)).toEqual(h);
  });

  it("gallringstiden följer ärendetypen, och okänd typ får standardtiden", () => {
    const avslut = "2026-01-15T10:00:00.000Z";
    expect(gallringsdatum("Warranty", avslut).getFullYear()).toBe(2036);
    expect(gallringsdatum("Hittepå", avslut).getFullYear()).toBe(2029);
    // Complaint följer konsumentköplagens reklamationsrätt.
    expect(GALLRING_MANADER.Complaint).toBe(36);
  });

  it("ett ärende som öppnades på svenska gallras inte sju år för tidigt", () => {
    // Den farligaste följden av att ärendetyperna bytte språk. Ett
    // garantiärende vars logg säger "Garanti" hade fallit ur tabellen och
    // tagit standardtiden 36 månader i stället för 120 — alltså raderat
    // garantiunderlaget sju år i förtid, tyst och oåterkalleligt.
    //
    // Ett uppslag som missar ska ge det FÖRSIKTIGASTE utfallet. Här gav
    // det det farligaste, och det syns inte förrän underlaget behövs.
    const avslut = "2026-01-15T10:00:00.000Z";
    expect(gallringsdatum("Garanti", avslut).getTime()).toBe(gallringsdatum("Warranty", avslut).getTime());
    expect(gallringsdatum("Försäkring", avslut).getFullYear()).toBe(2036);
    expect(gallringsdatum("Begagnatgaranti", avslut).getFullYear()).toBe(2031);
  });
});

describe("M-1 · mätvärden är spårbara eller nedgraderade", () => {
  it("kalibreringen bedöms vid mättillfället, inte i dag", () => {
    // Ett instrument vars kalibrering gått ut i efterhand gör inte en
    // gammal mätning ogiltig.
    expect(kalibreradVid("2026-06-30", "2026-01-15T10:00:00.000Z")).toBe(true);
    // Och ett nyligen kalibrerat instrument räddar inte en mätning som
    // gjordes när kalibreringen var utgången.
    expect(kalibreradVid("2026-06-30", "2026-08-15T10:00:00.000Z")).toBe(false);
    expect(kalibreradVid(undefined, "2026-01-15T10:00:00.000Z")).toBe(false);
    expect(kalibreradVid("inte-ett-datum", "2026-01-15T10:00:00.000Z")).toBe(false);
  });
});
