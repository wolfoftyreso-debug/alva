// @vitest-environment node
// Guidningen måste alltid peka någonstans.
//
// Ett verktyg som leder en tekniker genom ett ärende får aldrig hamna i
// ett läge där det inte går vidare och inget säger hur man tar sig ur.
// Testerna nedan låser de dödlägen som fanns, och det som var värst av
// dem: högvoltsfrågan "är fordonet spänningslöst?" ställdes FÖRE de tre
// kontroller som gör fordonet spänningslöst. Ett sanningsenligt "nej"
// låste ärendet permanent, och den enda vägen vidare var att svara ja
// innan det var sant — i den metodik där ett falskt påstående är
// farligast. Ett gränssnitt får aldrig göra lögnen till den bekväma
// vägen.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HOGVOLT } from "@/felsokning/metodiker";
import { metodikForArende } from "@/felsokning/store";
import { granskaHändelse } from "../../../../services/gemensam/handelser.mjs";
import { ENDAST_INTERNT } from "@/felsokning/delningsniva";
import { nastaSteg } from "@/felsokning/metodik";
import type { Arende, Handelse } from "@/felsokning/domain";

const SIDAN = readFileSync("src/pages/felsokning/ArendeSida.tsx", "utf8");

function arendeMed(handelser: Handelse[]): Arende {
  return {
    id: "a1",
    nummer: 1,
    skapad: "2026-01-01T08:00:00Z",
    metodikId: "hogvolt",
    handelser: handelser.map((handelse, i) => ({
      id: `h${i}`,
      tidpunkt: `2026-01-01T08:${String(i).padStart(2, "0")}:00Z`,
      anvandare: "anna",
      handelse,
    })),
  };
}

const svar = (frageId: string, svar: string): Handelse =>
  ({ typ: "fraga_besvarad", stegId: "sakerhet", frageId, fraga: "?", svar }) as Handelse;
const utford = (kontrollId: string): Handelse =>
  ({ typ: "kontroll_utford", stegId: "sakerhet", kontrollId, text: "t" }) as Handelse;

describe("spänningsfrihetsfrågan ställs efter arbetet som gör den sann", () => {
  it("frågan är märkt att komma efter stegets kontroller", () => {
    const fraga = HOGVOLT.steg[0].fragor?.find((f) => f.id === "avstangt");
    expect(fraga?.efterKontroller).toBe(true);
  });

  it("efter behörighetsfrågan kommer KONTROLLERNA, inte spänningsfrihetsfrågan", () => {
    const steg = nastaSteg(arendeMed([svar("behorighet", "Yes")]), HOGVOLT);
    expect(steg.kontroll?.id).toBe("skyddsutrustning");
    expect(steg.fraga).toBeUndefined();
  });

  it("frågan ställs först när alla kontroller i steget är utförda", () => {
    const steg = nastaSteg(
      arendeMed([
        svar("behorighet", "Yes"),
        utford("skyddsutrustning"),
        utford("service_disconnect"),
        utford("vantetid"),
        utford("spanningsfrihet"),
      ]),
      HOGVOLT,
    );
    expect(steg.fraga?.id).toBe("avstangt");
  });

  it("spärren gäller fortfarande — ett nekande svar stoppar metodiken", () => {
    const steg = nastaSteg(
      arendeMed([
        svar("behorighet", "Yes"),
        utford("skyddsutrustning"),
        utford("service_disconnect"),
        utford("vantetid"),
        utford("spanningsfrihet"),
        svar("avstangt", "No"),
      ]),
      HOGVOLT,
    );
    expect(steg.sparr).toBeTruthy();
    expect(steg.sparr?.atgard).toContain("De-energise");
  });

  it("ett senare jakande svar öppnar metodiken igen — loggen är append-only", () => {
    const steg = nastaSteg(
      arendeMed([
        svar("behorighet", "Yes"),
        utford("skyddsutrustning"),
        utford("service_disconnect"),
        utford("vantetid"),
        utford("spanningsfrihet"),
        svar("avstangt", "No"),
        svar("avstangt", "Yes"),
      ]),
      HOGVOLT,
    );
    expect(steg.sparr).toBeUndefined();
    expect(steg.steg.id).not.toBe("sakerhet");
  });
});

describe("varje spärr har en väg ut i gränssnittet", () => {
  it("spärrpanelen renderar frågan så svaret kan ges om igen", () => {
    // Panelen lovade att metodiken öppnas när förutsättningen uppfyllts,
    // men frågegrenen låg efter spärrgrenen — svaret gick aldrig att ge.
    expect(SIDAN).toContain("When the precondition is met");
    expect(SIDAN).toContain("-om`} steg={steg} skicka={skicka} />");
  });

  it("frågekortet visar stegets förklaring — den behövs mest vid säkerhetsfrågor", () => {
    expect(SIDAN).toContain("{steg.steg.beskrivning && (");
  });
});

describe("guidningen pekar på det som faktiskt hindrar", () => {
  it("briefen läser grindens hinder när metodiken är klar", () => {
    const proj = readFileSync("src/felsokning/projektioner.ts", "utf8");
    expect(proj).toContain("grinda(arende.handelser.map((post) => post.handelse)");
  });

  it("ärendekortet visar nästa steg — värdet beräknades redan", () => {
    expect(readFileSync("src/pages/felsokning/Arendelista.tsx", "utf8")).toContain(
      "b.rekommenderatNastaSteg[0]",
    );
  });

  it("nästa steg syns även på telefon, där sidopanelerna är dolda", () => {
    expect(SIDAN).toContain('xl:hidden">');
  });

  it("hinderlistan renderas en gång, inte två", () => {
    expect(SIDAN.match(/<Avslutshinder hinder=\{hinder\} \/>/g) ?? []).toHaveLength(1);
  });
});

describe("öppna eskaleringar går att svara på", () => {
  it("referensen förifylls från den öppna eskaleringen", () => {
    // Referensen matchas tecken för tecken mot grinden, och fältet var
    // fritext utan förifyllning: "DISS-2231" mot "DISS 2231" stängde
    // ingenting, och append-only-loggen gick inte att rätta.
    expect(SIDAN).toContain("Use this reference for the answer");
    expect(SIDAN).toContain("setReferens(r);");
  });
});

describe("fel metodik går att byta", () => {
  it("bytet är en händelse som kräver ett varför", () => {
    // Metodiken avgör vilka krav grinden ställer, så ett byte är ingen
    // inställning utan ett beslut som ska gå att läsa i efterhand.
    expect(granskaHändelse({ typ: "metodik_byte", metodikId: "bromsar", motivering: "Vibration only under braking" })).toBeNull();
    expect(granskaHändelse({ typ: "metodik_byte", metodikId: "bromsar" })).toContain("motivering");
  });

  it("metodiken följer det senaste bytet, inte valet vid ärendestart", () => {
    // "Vibrerar när jag bromsar" träffar vibrationsmetodiken före
    // bromsmetodiken — och vibrationsmetodikens egen text säger att
    // bromsvibration ska köras som bromsärende. Rådet fanns, vägen inte.
    const arende = {
      ...arendeMed([{ typ: "metodik_byte", metodikId: "bromsar", motivering: "Brake judder, not wheel imbalance" } as Handelse]),
      metodikId: "vibration",
    };
    expect(metodikForArende(arende).id).toBe("bromsar");
  });

  it("bytet är internt — kunden ser arbetsledning, inte procedurval", () => {
    expect(ENDAST_INTERNT).toContain("metodik_byte");
  });

  it("väljaren finns i ärendevyn och kräver en motivering", () => {
    expect(SIDAN).toContain("Wrong methodology? Change it");
    expect(SIDAN).toContain("motivering.trim().length < 10");
  });
});
