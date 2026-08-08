// @vitest-environment node
// Servermodulen körs bara i Node — jsdom saknar bland annat
// AbortSignal.timeout, som uppslaget använder.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dekryptera, gorUppslag, kryptera, maskera } from "../../../../services/plattform/server.mjs";

const REGISTER = JSON.parse(readFileSync("../services/plattform/integrationer.json", "utf8"));

describe("integrationsuppgifter i vila", () => {
  it("krypterar och dekrypterar med AES-256-GCM", () => {
    const nyckel = randomBytes(32);
    const hemlighet = JSON.stringify({ api_nyckel: "sk-verkstad-123", bas_url: "https://api.exempel.se/{vin}" });
    const paket = kryptera(hemlighet, nyckel);
    // Chiffertexten avslöjar ingenting.
    expect(paket).not.toContain("sk-verkstad-123");
    expect(paket.split(".")).toHaveLength(3);
    expect(dekryptera(paket, nyckel)).toBe(hemlighet);
  });

  it("manipulerad chiffertext avvisas av autentiseringstaggen", () => {
    const nyckel = randomBytes(32);
    const paket = kryptera("hemligt", nyckel);
    const [iv, tagg, data] = paket.split(".");
    const trasig = `${iv}.${tagg}.${Buffer.from("annat innehåll").toString("base64")}`;
    expect(() => dekryptera(trasig, nyckel)).toThrow();
    // Fel nyckel går inte heller.
    expect(() => dekryptera(paket, randomBytes(32))).toThrow();
  });

  it("maskerar hemligheter så bara de sista tecknen syns", () => {
    expect(maskera("sk-verkstad-9821")).toBe("••••9821");
    expect(maskera("abc")).toBe("••••");
    expect(maskera("")).toBe("");
    expect(maskera(undefined)).toBe("");
  });
});

describe("leverantörsregistret är data, inte kod", () => {
  it("varje leverantör har fält och en komplett uppslagsdefinition", () => {
    expect(REGISTER.leverantorer.length).toBeGreaterThan(0);
    for (const lev of REGISTER.leverantorer) {
      expect(lev.id, lev.namn).toMatch(/^[a-z0-9_]+$/);
      expect(lev.falt.length, lev.namn).toBeGreaterThan(0);
      for (const falt of lev.falt) {
        expect(typeof falt.hemlig, `${lev.id}/${falt.nyckel}`).toBe("boolean");
      }
      // Varje leverantör måste ha minst ett hemligt fält (annars behövs
      // ingen kryptering) och en URL-mall att slå upp mot.
      expect(lev.falt.some((f: { hemlig: boolean }) => f.hemlig), lev.id).toBe(true);
      expect(Object.keys(lev.uppslag.svarsfalt).length, lev.id).toBeGreaterThan(0);
    }
  });
});

describe("uppslag mot leverantör", () => {
  const def = REGISTER.leverantorer.find((l: { id: string }) => l.id === "generisk_vin");

  it("bygger URL ur mallen och mappar svaret till våra fält", async () => {
    let anropadUrl = "";
    let anropadeHeaders: Record<string, string> = {};
    const resultat = await gorUppslag(
      def,
      { bas_url: "https://api.exempel.se/vin/{vin}", api_nyckel: "hemlig-nyckel" },
      "YV1DZ8256F2123456",
      async (url: string, init: { headers: Record<string, string> }) => {
        anropadUrl = url;
        anropadeHeaders = init.headers;
        return { ok: true, json: async () => ({ make: "Volvo", model: "XC60", year: 2019, okant: "x" }) };
      },
    );
    expect(anropadUrl).toBe("https://api.exempel.se/vin/YV1DZ8256F2123456");
    expect(anropadeHeaders.Authorization).toBe("Bearer hemlig-nyckel");
    expect(resultat.ok).toBe(true);
    expect(resultat.fordon).toEqual({ marke: "Volvo", modell: "XC60", arsmodell: "2019" });
  });

  it("avvisar ogiltig bas-URL och rapporterar leverantörens fel ärligt", async () => {
    const utanUrl = await gorUppslag(def, { bas_url: "inte-en-url", api_nyckel: "x" }, "ABC123");
    expect(utanUrl.ok).toBe(false);
    expect(utanUrl.fel).toContain("Bas-URL");

    const felsvar = await gorUppslag(
      def,
      { bas_url: "https://api.exempel.se/{vin}", api_nyckel: "x" },
      "ABC123",
      async () => ({ ok: false, status: 401, json: async () => ({}) }),
    );
    expect(felsvar.ok).toBe(false);
    expect(felsvar.fel).toContain("401");

    const tomtSvar = await gorUppslag(
      def,
      { bas_url: "https://api.exempel.se/{vin}", api_nyckel: "x" },
      "ABC123",
      async () => ({ ok: true, json: async () => ({ helt: "andra falt" }) }),
    );
    expect(tomtSvar.ok).toBe(false);
    expect(tomtSvar.fel).toContain("inga kända fält");
  });

  it("stödjer basic och query-autentisering utan leverantörsspecifik kod", async () => {
    const basicDef = REGISTER.leverantorer.find((l: { id: string }) => l.id === "vag_erwin");
    let headers: Record<string, string> = {};
    await gorUppslag(
      basicDef,
      { bas_url: "https://erwin.exempel.se/{vin}", anvandarnamn: "verkstad", losenord: "hemligt" },
      "YV1DZ8256F2123456",
      async (_url: string, init: { headers: Record<string, string> }) => {
        headers = init.headers;
        return { ok: true, json: async () => ({ brand: "VW" }) };
      },
    );
    expect(headers.Authorization).toBe(`Basic ${Buffer.from("verkstad:hemligt").toString("base64")}`);

    const queryDef = REGISTER.leverantorer.find((l: { id: string }) => l.id === "fordonsregister");
    let url = "";
    await gorUppslag(
      queryDef,
      { bas_url: "https://fordon.exempel.se/{regnr}", api_nyckel: "n1" },
      "ABC123",
      async (u: string) => {
        url = u;
        return { ok: true, json: async () => ({ make: "Volvo" }) };
      },
    );
    expect(url).toBe("https://fordon.exempel.se/ABC123?key=n1");
  });
});
