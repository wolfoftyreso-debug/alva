import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { byggAnvandarPrompt, byggGranskningsPrompt, normaliseraArbetsorder, tolkaAiSvar, ARBETSORDER_FALT } from "../ai";
import { VIBRATION_METODIK } from "../metodik";
import { brief } from "../projektioner";
import { byggDemoArende } from "../demo";

const ENDPOINT = readFileSync("supabase/functions/felsokning-ai/index.ts", "utf8");

describe("AI-orkestern", () => {
  it("plattformens endpoint routar uppgifter till olika modeller", () => {
    // Servern äger orkestern: modellval, effort, systemprompt och schema.
    for (const uppgift of ["handledning:", "granskning:", "sammanfattning:", "metodikval:", "dokumenttolkning:"]) {
      expect(ENDPOINT).toContain(uppgift);
    }
    expect(ENDPOINT).toContain('"claude-sonnet-5"');
    expect(ENDPOINT).toContain('"claude-opus-5"');
    expect(ENDPOINT).toContain('"claude-haiku-4-5"');
    expect(ENDPOINT).toContain("ANTHROPIC_API_KEY");
  });

  it("K8s-tjänsten (services/ai-orkester) kör samma orkester som edge-funktionen", () => {
    const tjanst = readFileSync("services/ai-orkester/server.mjs", "utf8");
    for (const bit of [
      '"claude-sonnet-5"',
      '"claude-opus-5"',
      '"claude-haiku-4-5"',
      "handledning:",
      "granskning:",
      "sammanfattning:",
      "metodikval:",
      "dokumenttolkning:",
      "Hitta aldrig på fakta",
      "SUPABASE_JWT_SECRET",
    ]) {
      expect(tjanst).toContain(bit);
    }
  });

  it("självhostade stacken: plattformstjänst + append-only i databasen", () => {
    const plattform = readFileSync("services/plattform/server.mjs", "utf8");
    for (const bit of [
      "/api/auth/logga-in",
      "/api/auth/registrera",
      "/api/arenden",
      String.raw`\/api\/delad\/`,
      "gen_salt('bf')",
      "JWT_SECRET",
    ]) {
      expect(plattform).toContain(bit);
    }
    // API:t exponerar medvetet inga update/delete-operationer.
    expect(plattform).not.toMatch(/\b(update|delete)\s+felsokning_handelser/i);
    // Multi-tenant: all ärendedata är organisationsknuten.
    expect(plattform).toContain("organisation_id");
    expect(plattform).toContain("arendeIOrg");

    const schema = readFileSync("infra/k8s/postgres-init.sql", "utf8");
    expect(schema).toContain("before update or delete on felsokning_handelser");
    expect(schema).toContain("before update or delete on felsokning_arenden");
    expect(schema).toContain("create table if not exists organisationer");
    expect(schema).toContain("check (roll in ('tekniker', 'arbetsledare', 'admin'))");
  });

  it("OpenAPI-specen och plattformsservern täcker samma endpoints", () => {
    const spec = readFileSync("services/plattform/openapi.yaml", "utf8");
    const server = readFileSync("services/plattform/server.mjs", "utf8");
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

  it("endpointen kodar AI-reglerna i grundprompten", () => {
    expect(ENDPOINT).toContain("Hitta aldrig på fakta");
    expect(ENDPOINT).toContain("aldrig en hypotes som ett konstaterat fel");
    expect(ENDPOINT).toContain("KRÄVER verifiering");
    expect(ENDPOINT).toContain('"json_schema"');
  });

  it("användarprompten byggs ur ärendebriefen och den nya inmatningen", () => {
    const arende = byggDemoArende(1);
    const prompt = byggAnvandarPrompt(
      brief(arende, VIBRATION_METODIK),
      VIBRATION_METODIK.namn,
      "Reläet klickar inte.",
    );
    expect(prompt).toContain("Volvo XC60 D4 2019");
    expect(prompt).toContain("Felbeskrivning:");
    expect(prompt).toContain("Kontrollera lufttryck");
    expect(prompt).toContain("Ej kontrollerat enligt metodiken:");
    expect(prompt).toContain("Teknikerns nya inmatning: Reläet klickar inte.");
  });

  it("granskningsprompten innehåller hela arbetsloggen men ingen ny inmatning", () => {
    const arende = byggDemoArende(1);
    const prompt = byggGranskningsPrompt(arende, VIBRATION_METODIK);
    expect(prompt).toContain("Fullständig arbetslogg:");
    expect(prompt).toContain("Arbete överlämnat från Anna till Johan");
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
    expect(falt[0].grupp).toBe("Personbil");
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
    const server = readFileSync("services/plattform/server.mjs", "utf8");
    const migration = readFileSync("supabase/migrations/20260802230000_guidad_felsokning.sql", "utf8");
    const delatVy = readFileSync("src/felsokning/DelatArendeVy.tsx", "utf8");
    for (const innehall of [server, migration, delatVy]) {
      expect(innehall).toContain("arbetsorder_skannad");
    }
  });
});
