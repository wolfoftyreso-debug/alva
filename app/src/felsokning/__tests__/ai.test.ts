import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { byggAnvandarPrompt, byggGranskningsPrompt, normaliseraArbetsorder, tolkaAiSvar, ARBETSORDER_FALT } from "../ai";
import { VIBRATION_METODIK } from "../metodik";
import { brief } from "../projektioner";
import { byggDemoArende } from "../demo";

const ORKESTER = readFileSync("../services/ai-orkester/server.mjs", "utf8");

describe("AI-orkestern", () => {
  it("orkestertjänsten (services/ai-orkester) routar uppgifter till modeller", () => {
    // Servern äger orkestern: modellval, effort, systemprompt och schema.
    // Efter att Supabase-vägen avvecklats finns bara EN orkester kvar —
    // den här tjänsten — och det är den som provas.
    for (const uppgift of ["handledning:", "granskning:", "sammanfattning:", "metodikval:", "dokumenttolkning:"]) {
      expect(ORKESTER).toContain(uppgift);
    }
    expect(ORKESTER).toContain('"claude-sonnet-5"');
    expect(ORKESTER).toContain('"claude-opus-5"');
    expect(ORKESTER).toContain('"claude-haiku-4-5"');
    expect(ORKESTER).toContain("ANTHROPIC_API_KEY");
    expect(ORKESTER).toContain("Hitta aldrig på fakta");
  });

  it("självhostade stacken: plattformstjänst + append-only i databasen", () => {
    const plattform = readFileSync("../services/plattform/server.mjs", "utf8");
    for (const bit of [
      "/api/auth/logga-in",
      "/api/auth/registrera",
      "/api/arenden",
      String.raw`\/api\/delad\/`,
      "JWT_SECRET",
    ]) {
      expect(plattform).toContain(bit);
    }

    // Lösenordshashens KOSTNAD, inte bara att bcrypt används (TÜV T-6).
    // pgcryptos gen_salt('bf') utan argument ger kostnad 6 — 2^6 = 64
    // varv, mot dagens golv på 2^10. Testet var tidigare skrivet på
    // anropet och hade därför godkänt den svaga varianten för alltid.
    const kostnader = [...plattform.matchAll(/gen_salt\('bf'(?:,\s*(\d+))?\)/g)].map((m) =>
      Number(m[1] ?? 6),
    );
    expect(kostnader.length).toBeGreaterThan(0);
    for (const k of kostnader) expect(k).toBeGreaterThanOrEqual(12);
    // API:t exponerar medvetet inga update/delete-operationer.
    expect(plattform).not.toMatch(/\b(update|delete)\s+felsokning_handelser/i);
    // Multi-tenant: all ärendedata är organisationsknuten.
    expect(plattform).toContain("organisation_id");
    expect(plattform).toContain("arendeIOrg");

    // Kontospärr och återkallelse: en giltig signatur räcker inte.
    expect(plattform).toContain("kontoGiltigt");
    expect(plattform).toContain("token_version");
    expect(plattform).toContain("inloggningSparrad");

    const schema = readFileSync("../infra/postgres-init.sql", "utf8");
    expect(schema).toContain("create table if not exists inloggningsforsok");
    expect(schema).toContain("create table if not exists bilagor");
    expect(schema).toContain("create table if not exists bilage_innehall");
    expect(schema).toContain("token_version integer not null default 0");
    expect(schema).toContain("before update or delete on felsokning_handelser");
    expect(schema).toContain("before update or delete on felsokning_arenden");
    expect(schema).toContain("create table if not exists organisationer");
    expect(schema).toContain("check (roll in ('tekniker', 'arbetsledare', 'admin'))");
  });

  it("OpenAPI-specen och plattformsservern täcker samma endpoints", () => {
    const spec = readFileSync("../services/plattform/openapi.yaml", "utf8");
    const server = readFileSync("../services/plattform/server.mjs", "utf8");
    // Varje dokumenterad väg finns i servern …
    const vagar: [string, string][] = [
      ["/halsa", "/halsa"],
      ["/api/openapi.yaml", "/api/openapi.yaml"],
      ["/api/auth/registrera", "/api/auth/registrera"],
      ["/api/auth/logga-in", "/api/auth/logga-in"],
      ["/api/anvandare", "/api/anvandare"],
      ["/api/ecm/regler", "/api/ecm/regler"],
      ["/api/organisation", "/api/organisation"],
      ["/api/organisation/installningar", "/api/organisation/installningar"],
      ["/api/arenden", "/api/arenden"],
      ["/api/arenden/{arendeId}/handelser", "handelser"],
      ["/api/fordon/{identifierare}/historik", "historik"],
      ["/api/statistik/felorsaker", "/api/statistik/felorsaker"],
      ["/api/oversikt", "/api/oversikt"],
      ["/api/delad/{delningskod}", "delad"],
      ["/api/delad/{delningskod}/beslut", "beslut"],
      ["/api/integrationer", "/api/integrationer"],
      ["/api/integrationer/leverantorer", "/api/integrationer/leverantorer"],
      ["/api/integrationer/{leverantor}", "integrationVag"],
      ["/api/integrationer/{leverantor}/uppslag", "uppslagVag"],
      ["/api/anvandare/{anvandarId}/avaktivera", "kontoVag"],
      ["/api/anvandare/{anvandarId}/aktivera", "aktivera"],
      ["/api/auth/logga-ut-alla", "/api/auth/logga-ut-alla"],
      ["/api/arenden/{arendeId}/bilagor", "laddaUppVag"],
      ["/api/bilagor/{bilagaId}", "bilagaVag"],
      ["/api/delad/{delningskod}/bilagor/{bilagaId}", "delatBilaga"],
      // ALVA: nya vägar. Ett API som inte är dokumenterat är inte ett API
      // någon kan koppla in sig mot.
      ["/api/arenden/{arendeId}/sammanfattning", "sammanfattningVag"],
      ["/api/arenden/{arendeId}/protokoll", "protokollVag"],
      ["/api/statistik/oversikt", "/api/statistik/oversikt"],
      ["/api/integration/kategorier", "/api/integration/kategorier"],
      ["/api/integration/prenumerationer", "/api/integration/prenumerationer"],
      ["/api/radering", "/api/radering"],
      ["/api/matdon", "/api/matdon"],
    ];
    for (const [iSpec, iServer] of vagar) {
      expect(spec).toContain(`${iSpec}:`);
      expect(server).toContain(iServer);
    }
    // … och AI-endpointen + händelsetyperna är dokumenterade.
    expect(spec).toContain("/api/ai:");
    expect(spec).toContain("append-only");
    for (const typ of ["objekt_identifierat", "kontroll_utford", "ai_svar", "ansvarig_satt", "arbetsorder_skannad", "arende_avslutat"]) {
      expect(spec).toContain(typ);
    }
  });

  it("orkestern kodar AI-reglerna i grundprompten", () => {
    expect(ORKESTER).toContain("Hitta aldrig på fakta");
    expect(ORKESTER).toContain("aldrig en hypotes som ett konstaterat fel");
    expect(ORKESTER).toContain("KRÄVER verifiering");
    expect(ORKESTER).toContain('"json_schema"');
  });

  it("användarprompten byggs ur ärendebriefen och den nya inmatningen", () => {
    const arende = byggDemoArende(1);
    const prompt = byggAnvandarPrompt(
      brief(arende, VIBRATION_METODIK),
      VIBRATION_METODIK.namn,
      "Reläet klickar inte.",
    );
    expect(prompt).toContain("Volvo XC60 D4 2019");
    expect(prompt).toContain("Fault description:");
    expect(prompt).toContain("Check tyre pressure");
    expect(prompt).toContain("Ej kontrollerat enligt metodiken:");
    expect(prompt).toContain("Teknikerns nya inmatning: Reläet klickar inte.");
  });

  it("granskningsprompten innehåller hela arbetsloggen men ingen ny inmatning", () => {
    const arende = byggDemoArende(1);
    const prompt = byggGranskningsPrompt(arende, VIBRATION_METODIK);
    expect(prompt).toContain("Full work log:");
    expect(prompt).toContain("Work handed over from Anna to Johan");
    expect(prompt).not.toContain("Teknikerns nya inmatning");
  });

  it("tolkar giltiga svar och kastar på ogiltiga", () => {
    const svar = tolkaAiSvar({
      rader: [
        { typ: "verifierat", text: "Matningsspänning finns på stift 14." },
        { typ: "okand_typ", text: "ska filtreras bort" },
      ],
      nastaSteg: "Kontrollera jordanslutningen på stift 7.",
    });
    expect(svar.rader).toHaveLength(1);
    expect(svar.rader[0].typ).toBe("verifierat");
    expect(svar.nastaSteg).toContain("stift 7");

    expect(() => tolkaAiSvar({ rader: "inte en lista", nastaSteg: "x" })).toThrow();
    expect(() => tolkaAiSvar(null)).toThrow();
  });
});

describe("arbetsorderskanning", () => {
  it("normaliserar tolkningen: okända fält bort, konfidens klipps, tomma värden bort", () => {
    const falt = normaliseraArbetsorder({
      falt: [
        { id: "fordon_regnr", varde: " abc123 ", konfidens: 1.7 },
        { id: "pahittat_falt", varde: "x", konfidens: 0.9 },
        { id: "kund_namn", varde: "   ", konfidens: 0.9 },
        { id: "fordon_vin", varde: "YV1DZ8256F2123456", konfidens: 0.74, omrade: { x: 0.5, y: 0.2, bredd: 0.4, hojd: 0.05 } },
        { id: "fordon_vin", varde: "DUBBLETT", konfidens: 0.5 },
      ],
    });
    expect(falt.map((f) => f.id)).toEqual(["fordon_regnr", "fordon_vin"]);
    expect(falt[0].konfidens).toBe(1);
    expect(falt[0].varde).toBe("abc123");
    expect(falt[0].grupp).toBe("Vehicle");
    expect(falt[1].omrade?.x).toBe(0.5);
    expect(() => normaliseraArbetsorder({})).toThrow();
  });

  it("demo-tolkningen använder bara kända fält och alla konfidensnivåer", async () => {
    const { byggDemoTolkning } = await import("../demo");
    const falt = byggDemoTolkning();
    for (const f of falt) {
      expect(ARBETSORDER_FALT.some((def) => def.id === f.id), f.id).toBe(true);
    }
    // Flödet ska kunna demonstrera alla tre nivåerna: auto-godkänd,
    // granska och kräver bekräftelse.
    expect(falt.some((f) => f.konfidens >= 0.95)).toBe(true);
    expect(falt.some((f) => f.konfidens >= 0.8 && f.konfidens < 0.95)).toBe(true);
    expect(falt.some((f) => f.konfidens < 0.8)).toBe(true);
  });

  it("händelsetypen arbetsorder_skannad är organisationsintern i alla delningsvägar", () => {
    const server = readFileSync("../services/plattform/server.mjs", "utf8");
    // Klientens lista bor numera i delningsniva.ts — ETT uttryck delat av
    // vyn och paritetstestat mot serverns ENDAST_INTERNT.
    const klientlista = readFileSync("src/felsokning/delningsniva.ts", "utf8");
    for (const innehall of [server, klientlista]) {
      expect(innehall).toContain("arbetsorder_skannad");
    }
    expect(readFileSync("src/felsokning/DelatArendeVy.tsx", "utf8")).toContain("ENDAST_INTERNT");
  });
});

// Tidigare fanns två orkesterkopior (edge-funktionen och tjänsten) som
// paritetstestades mot varandra. Supabase-vägen är avvecklad — det finns
// bara EN orkester kvar. Testet låser nu tjänstens egna invarianter i
// stället: att katalogen har alla metodiker och att varje uppgift har ett
// modellval. En regression syns här även utan en andra kopia att jämföra
// mot.
describe("AI-orkesterns katalog och modellval", () => {
  const tjanst = ORKESTER;

  /** Plockar ut ett block mellan två markörer och normaliserar blanksteg. */
  const block = (kalla: string, start: string, slut: string) => {
    const i = kalla.indexOf(start);
    if (i < 0) return null;
    const j = kalla.indexOf(slut, i + start.length);
    return kalla.slice(i, j < 0 ? undefined : j).replace(/\s+/g, " ").trim();
  };

  it("grundreglerna finns och är avgränsade", () => {
    const regler = block(tjanst, "Absoluta regler:", "`;");
    expect(regler).not.toBeNull();
    expect(regler).toContain("Hitta aldrig på fakta");
  });

  it("metodikkatalogen har alla sexton metodiker", () => {
    const k = block(tjanst, "const METODIK_KATALOG", "];");
    const idn = [...(k ?? "").matchAll(/\["([a-z_]+)",/g)].map((m) => m[1]);
    expect(idn.length).toBe(16);
  });

  it("varje uppgift har ett modellval", () => {
    const routing = [...tjanst.matchAll(/^\s{2}(\w+): \{\n\s+modell: "([^"]+)"/gm)].map(
      (m) => `${m[1]}=${m[2]}`,
    );
    expect(routing.length).toBeGreaterThanOrEqual(6);
  });
});
