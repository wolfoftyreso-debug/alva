// @vitest-environment node
// Bildanalysen (ALVA-SPEC-072). Kommentaren under en bevisbild är ett andra
// par ögon — aldrig evidens. Det som måste hålla:
//
//   1. Bilden skickas som den är, med rätt mediatyp, och SVG/vektor avvisas
//      innan ett anrop görs: det är inte ett fotografi.
//   2. Ett uteblivet eller trasigt svar ger null — ALDRIG ett kastat fel.
//      Bilden är underlaget; kommentaren är ett tillägg, och ett tillägg
//      får inte kunna stoppa en felsökning.
//   3. Kommentaren bär alltid modellnamnet, så läsaren vet vem som talar.
import { describe, expect, it } from "vitest";
import {
  BILDANALYS_REGLER,
  MAX_KOMMENTAR,
  analyseraBild,
  byggBegaran,
  delaDataUrl,
  lasSvar,
} from "../../../../services/ai-orkester/gemini.mjs";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
const svarMed = (obj: unknown) => ({
  ok: true,
  json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }),
});

describe("data-URL:en delas rätt", () => {
  it("tar emot de format en telefonkamera ger", () => {
    for (const t of ["jpeg", "png", "webp", "heic"]) {
      expect(delaDataUrl(`data:image/${t};base64,AAAA`)?.mediatyp, t).toBe(`image/${t}`);
    }
    expect(delaDataUrl("data:image/jpg;base64,AAAA")?.mediatyp).toBe("image/jpeg");
  });

  it("avvisar vektor och skräp — en ritning är inte ett fotografi", () => {
    for (const d of [
      "data:image/svg+xml;base64,AAAA",
      "data:application/pdf;base64,AAAA",
      "inte en data-url",
      "",
      null,
    ]) {
      expect(delaDataUrl(d as string), String(d)).toBeNull();
    }
  });
});

describe("begäran", () => {
  it("lägger bilden före frågan och bär systemreglerna", () => {
    const b = byggBegaran({ mediatyp: "image/png", data: "AAAA", prompt: "Check the disc" });
    expect(b.system_instruction.parts[0].text).toBe(BILDANALYS_REGLER);
    expect(b.contents[0].parts[0].inline_data).toEqual({ mime_type: "image/png", data: "AAAA" });
    expect(b.contents[0].parts[1].text).toBe("Check the disc");
    // Återgivande, inte kreativ.
    expect(b.generationConfig.temperature).toBeLessThanOrEqual(0.3);
    expect(b.generationConfig.responseMimeType).toBe("application/json");
  });

  it("reglerna förbjuder diagnos och tillåter 'går inte att bedöma'", () => {
    expect(BILDANALYS_REGLER).toMatch(/Ställ ingen diagnos/i);
    expect(BILDANALYS_REGLER).toMatch(/Går inte att bedöma/i);
    expect(BILDANALYS_REGLER).toMatch(/högst två meningar/i);
  });
});

describe("svaret", () => {
  it("plockar ut kommentaren och konfidensen", () => {
    const r = lasSvar({
      candidates: [{ content: { parts: [{ text: '{"kommentar":"Repor syns.","konfidens":0.7}' }] } }],
    });
    expect(r).toEqual({ kommentar: "Repor syns.", konfidens: 0.7 });
  });

  it("klarar klartext trots schemat — texten duger som kommentar", () => {
    const r = lasSvar({ candidates: [{ content: { parts: [{ text: "Bilden är oskarp." }] } }] });
    expect(r?.kommentar).toBe("Bilden är oskarp.");
  });

  it("kapar en för lång kommentar — en rad under en bild, inte en uppsats", () => {
    const lang = "x".repeat(MAX_KOMMENTAR + 200);
    const r = lasSvar({ candidates: [{ content: { parts: [{ text: JSON.stringify({ kommentar: lang }) }] } }] });
    expect(r!.kommentar.length).toBe(MAX_KOMMENTAR);
    expect(r!.kommentar.endsWith("…")).toBe(true);
  });

  it("tomt eller obegripligt svar ger null", () => {
    expect(lasSvar({})).toBeNull();
    expect(lasSvar({ candidates: [] })).toBeNull();
    expect(lasSvar({ candidates: [{ content: { parts: [{ text: "   " }] } }] })).toBeNull();
    expect(lasSvar({ candidates: [{ content: { parts: [{ text: '{"kommentar":"  "}' }] } }] })).toBeNull();
  });

  it("klämmer konfidensen till 0–1", () => {
    const r = (k: number) =>
      lasSvar({ candidates: [{ content: { parts: [{ text: JSON.stringify({ kommentar: "a", konfidens: k }) }] } }] });
    expect(r(9)!.konfidens).toBe(1);
    expect(r(-4)!.konfidens).toBe(0);
  });
});

describe("analyseraBild kastar aldrig", () => {
  it("returnerar kommentaren med modellnamnet", async () => {
    const r = await analyseraBild("nyckel", { bild: PNG, prompt: "p" }, (async () =>
      svarMed({ kommentar: "Ojämnt slitage på inre kanten." })) as unknown as typeof fetch);
    expect(r?.kommentar).toBe("Ojämnt slitage på inre kanten.");
    expect(r?.modell).toBeTruthy();
  });

  it("utan nyckel görs inget anrop alls", async () => {
    let anropat = false;
    const r = await analyseraBild("", { bild: PNG, prompt: "p" }, (async () => {
      anropat = true;
      return svarMed({ kommentar: "x" });
    }) as unknown as typeof fetch);
    expect(r).toBeNull();
    expect(anropat).toBe(false);
  });

  it("HTTP-fel, nätfel och skräpsvar ger null i stället för undantag", async () => {
    const fall: (() => Promise<unknown>)[] = [
      async () => ({ ok: false, status: 429, json: async () => ({}) }),
      async () => {
        throw new Error("nätet nere");
      },
      async () => ({ ok: true, json: async () => { throw new Error("ogiltig json"); } }),
      async () => ({ ok: true, json: async () => ({ candidates: [] }) }),
    ];
    for (const f of fall) {
      await expect(analyseraBild("n", { bild: PNG, prompt: "p" }, f as unknown as typeof fetch)).resolves.toBeNull();
    }
  });

  it("en vektorbild avvisas utan att nå nätet", async () => {
    let anropat = false;
    const r = await analyseraBild("n", { bild: "data:image/svg+xml;base64,AAAA", prompt: "p" }, (async () => {
      anropat = true;
      return svarMed({ kommentar: "x" });
    }) as unknown as typeof fetch);
    expect(r).toBeNull();
    expect(anropat).toBe(false);
  });

  it("nyckeln går i huvudet, aldrig i adressen — den hamnar annars i varje logg", async () => {
    let url = "";
    let headers: Record<string, string> = {};
    await analyseraBild("HEMLIG", { bild: PNG, prompt: "p" }, (async (u: string, init: { headers: Record<string, string> }) => {
      url = u;
      headers = init.headers;
      return svarMed({ kommentar: "x" });
    }) as unknown as typeof fetch);
    expect(url).not.toContain("HEMLIG");
    expect(headers["x-goog-api-key"]).toBe("HEMLIG");
  });
});
