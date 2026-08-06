// @vitest-environment node
// ALVA-PROC-0002 · Abonnemang.
//
// Det som prövas hårdast här är LÅSNINGENS GRÄNS. Att stänga nya ärenden
// vid utebliven betalning är rimligt; att göra historiken oåtkomlig är
// det inte, eftersom den är verkstadens underlag i en tvist som gäller
// deras kund — en tredje part utan del i vår obetalda faktura.
//
// Det är en regel som är lätt att tumma på under press, och därför
// prövas den från flera håll.
import { describe, expect, it } from "vitest";
import {
  NIVAER,
  RESPITDAGAR,
  abonnemangstillstand,
  behorighet,
  besked,
  forfallenFakturering,
  nastaPeriod,
  nivaFor,
} from "../../../../services/gemensam/abonnemang.mjs";
import { fakturaPdf } from "../../../../services/gemensam/fakturapdf.mjs";
import { fakturera } from "../../../../services/gemensam/fakturering.mjs";

const NU = new Date("2026-08-06T12:00:00Z");
const dagarSedan = (n: number) => new Date(NU.getTime() - n * 86_400_000).toISOString().slice(0, 10);

describe("låsningen rör aldrig historiken", () => {
  it("läsning och export är sanna i ALLA tillstånd", () => {
    for (const t of ["aktiv", "varning", "last"]) {
      const b = behorighet(t);
      expect(b.lasa, t).toBe(true);
      expect(b.exportera, t).toBe(true);
    }
  });

  it("låst stoppar nya ärenden och dokumentation, men inget mer", () => {
    const b = behorighet("last");
    expect(b.nyttArende).toBe(false);
    expect(b.dokumentera).toBe(false);
    expect(b.avsluta).toBe(false);
    expect(b.lasa).toBe(true);
    expect(b.exportera).toBe(true);
  });

  it("beskedet säger uttryckligen att underlaget tillhör kundens kund", () => {
    const text = besked({ tillstand: "last", aldsta: "ALVA-INV-0007", dagarKvar: 0 });
    expect(text).toMatch(/belongs to your customer/i);
  });
});

describe("tillståndet härleds ur fakturorna", () => {
  it("inga förfallna fakturor är aktivt", () => {
    expect(abonnemangstillstand([], NU).tillstand).toBe("aktiv");
    expect(
      abonnemangstillstand([{ beteckning: "A", forfaller: dagarSedan(-5), totalt: 1000, status: "utfardad" }], NU)
        .tillstand,
    ).toBe("aktiv");
  });

  it("en betald faktura kan aldrig utlösa varning", () => {
    expect(
      abonnemangstillstand([{ beteckning: "A", forfaller: dagarSedan(60), totalt: 1000, status: "betald" }], NU)
        .tillstand,
    ).toBe("aktiv");
  });

  it("en NOLLFAKTURA låser aldrig någon", () => {
    // Free-nivån fakturerar noll. En obetald nollfaktura är inte en skuld
    // utan en bokföringspost, och att låsa någon för den vore absurt.
    expect(
      abonnemangstillstand([{ beteckning: "A", forfaller: dagarSedan(90), totalt: 0, status: "utfardad" }], NU)
        .tillstand,
    ).toBe("aktiv");
  });

  it("förfallen men inom respit ger varning med nedräkning", () => {
    const s = abonnemangstillstand(
      [{ beteckning: "ALVA-INV-0007", forfaller: dagarSedan(4), totalt: 5000, status: "utfardad" }],
      NU,
    );
    expect(s.tillstand).toBe("varning");
    expect(s.dagarKvar).toBe(RESPITDAGAR - 4);
    expect(besked(s)).toContain(String(RESPITDAGAR - 4));
  });

  it("efter respiten låses det", () => {
    const s = abonnemangstillstand(
      [{ beteckning: "A", forfaller: dagarSedan(RESPITDAGAR + 1), totalt: 5000, status: "utfardad" }],
      NU,
    );
    expect(s.tillstand).toBe("last");
    expect(s.dagarKvar).toBe(0);
  });

  it("den ÄLDSTA förfallna styr nedräkningen", () => {
    // Betalar kunden den senaste men inte den första har respiten ändå
    // löpt sedan den första — annars kunde man skjuta upp låsningen i
    // evighet genom att betala varannan faktura.
    const s = abonnemangstillstand(
      [
        { beteckning: "GAMMAL", forfaller: dagarSedan(30), totalt: 5000, status: "utfardad" },
        { beteckning: "NY", forfaller: dagarSedan(1), totalt: 5000, status: "utfardad" },
      ],
      NU,
    );
    expect(s.tillstand).toBe("last");
    expect(s.aldsta).toBe("GAMMAL");
    expect(s.belopp).toBe(10_000);
  });

  it("ett aktivt abonnemang får inget besked — tystnad är rätt svar", () => {
    expect(besked({ tillstand: "aktiv" })).toBeNull();
  });
});

describe("nivåerna", () => {
  it("Free är gratis och begränsad till två konton", () => {
    const f = nivaFor("free");
    expect(f.basavgift).toBe(0);
    expect(f.anvandaravgift).toBe(0);
    expect(f.maxAnvandare).toBe(2);
  });

  it("Free har hela metoden — begränsningen ligger i skalan, inte i kvaliteten", () => {
    // En gratisnivå som ger en sämre METOD vore en annan produkt.
    const f = nivaFor("free");
    expect(f.ingar.join(" ")).toMatch(/complete ALVA methodology/i);
    expect(f.ingar.join(" ")).toMatch(/evidence report/i);
  });

  it("Enterprise har inget listpris i stället för ett påhittat", () => {
    const e = nivaFor("enterprise");
    expect(e.basavgift).toBeNull();
    expect(e.anvandaravgift).toBeNull();
  });

  it("okänd nivå faller tillbaka på Free, aldrig på en betald", () => {
    expect(nivaFor("hittepa").id).toBe("free");
    expect(nivaFor(undefined).id).toBe("free");
  });

  it("varje nivå säger både vad som ingår och vad som inte gör det", () => {
    for (const n of NIVAER as { id: string; ingar: string[]; saknas: string[] }[]) {
      expect(n.ingar.length, n.id).toBeGreaterThan(0);
      if (n.id !== "enterprise") expect(n.saknas.length, n.id).toBeGreaterThan(0);
    }
  });
});

describe("perioden räknas från registreringsdagen", () => {
  it("första perioden börjar den dag man registrerade sig", () => {
    // En organisation som registrerar sig den 20:e ska inte få en faktura
    // på elva dagar som sin första upplevelse av produkten.
    const p = nastaPeriod("2026-03-20T09:00:00Z");
    expect(p.fran).toBe("2026-03-20");
    expect(p.till).toBe("2026-04-19");
  });

  it("nästa period börjar en månad efter den förra", () => {
    const p = nastaPeriod("2026-03-20T09:00:00Z", "2026-03-20");
    expect(p.fran).toBe("2026-04-20");
  });

  it("en period som inte börjat faktureras inte", () => {
    expect(forfallenFakturering("2026-03-20", "2026-08-20", NU)).toBeNull();
  });

  it("en period som börjat faktureras", () => {
    expect(forfallenFakturering("2026-03-20", "2026-06-20", NU)).not.toBeNull();
  });

  it("ett trasigt datum ger null i stället för en påhittad period", () => {
    expect(nastaPeriod("inte ett datum")).toBeNull();
  });
});

describe("fakturan som PDF, utan beroenden", () => {
  const faktura = fakturera({
    nummer: 1,
    org: { namn: "Verkstad Nord AB", moduler: [] },
    aktiva: 3,
    period: { fran: "2026-01-01", till: "2026-01-31" },
    utfardad: "2026-01-15",
  });

  it("är en giltig PDF med korsreferenstabell", () => {
    const pdf = fakturaPdf(faktura);
    const text = pdf.toString("latin1");
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("startxref");
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
  });

  it("byteoffsetarna i xref pekar på objekten", () => {
    // Den enda delen av formatet som inte förlåter slarv: en läsare som
    // inte hittar objektet visar ingenting alls, inte en trasig sida.
    const text = fakturaPdf(faktura).toString("latin1");
    const offsetar = [...text.matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    expect(offsetar.length).toBe(6);
    offsetar.forEach((o, i) => {
      expect(text.slice(o).startsWith(`${i + 1} 0 obj`), `objekt ${i + 1}`).toBe(true);
    });
  });

  it("bär beteckningen och totalen", () => {
    const text = fakturaPdf(faktura).toString("latin1");
    expect(text).toContain("ALVA-INV-0001");
    expect(text).toContain("Verkstad Nord AB");
  });

  it("svenska tecken överlever, och det som inte ryms ersätts hellre än blir kråkfötter", () => {
    const med = fakturaPdf({ ...faktura, organisation: "Verkstad Öst — Ängelholm 中文" });
    const text = med.toString("latin1");
    expect(text).toContain("Verkstad Öst - Ängelholm ..");
  });

  it("tomma avsändaruppgifter utelämnas i stället för att skrivas som osatta", () => {
    // En faktura med "— ej satt" i adressfältet är sämre än en utan
    // adressfält: den påstår att någon fyllt i det.
    const text = fakturaPdf(faktura, { foretagsnamn: "", adress: undefined }).toString("latin1");
    expect(text).not.toMatch(/ej satt|not set|undefined/);
  });
});
