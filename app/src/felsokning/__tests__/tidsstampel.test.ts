// @vitest-environment node
// Extern tidsförankring (ALVA-SPEC-071 · RFC 3161).
//
// Fixturen rfc3161-token.der är en RIKTIG tidsstämpel, skapad av openssl
// ts över avtrycket b3…b3 och OBEROENDE verifierad med
// `openssl ts -verify` mot sin TSA-CA. Testet prövar att vår begäran är
// välformad (openssl kunde läsa den) och att vår parser läser ut samma
// avtryck och en giltig tid ur den riktiga token — inte en vi själva
// tillverkat och därför inte kan lita på.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { byggBegaran, hamtaTidsstampel, lasToken } from "../../../../services/gemensam/tidsstampel.mjs";

const AVTRYCK = "b3".repeat(32);
const TOKEN = readFileSync(new URL("./fixtures/rfc3161-token.der", import.meta.url));

describe("tidsstämpelbegäran är välformad RFC 3161", () => {
  it("kodar en SEQUENCE, kräver ett 32-byte SHA-256-avtryck", () => {
    const req = byggBegaran(AVTRYCK, { nonce: 1 });
    expect(req[0]).toBe(0x30);
    expect(() => byggBegaran("kort", {})).toThrow();
  });
});

describe("parsern läser en riktig openssl-token", () => {
  const läst = lasToken(TOKEN);

  it("hittar avtrycket TSA:n stämplade", () => {
    expect(läst?.avtryckHex).toBe(AVTRYCK);
  });

  it("hittar en giltig ISO-tid (TSA:ns genTime)", () => {
    expect(läst?.tid).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it("avvisar skräp i stället för att kasta", () => {
    expect(lasToken(Buffer.from([1, 2, 3]))).toBeNull();
  });
});

describe("hämtningen litar bara på en token som täcker vårt avtryck", () => {
  it("returnerar token och tid när TSA:n svarar med rätt avtryck", async () => {
    const stub = async () => ({ ok: true, arrayBuffer: async () => TOKEN });
    const svar = await hamtaTidsstampel("http://tsa", AVTRYCK, stub as never);
    expect(svar?.tid).toMatch(/^\d{4}-/);
    expect(svar?.token).toBe(TOKEN.toString("base64"));
  });

  it("avvisar en token över ETT ANNAT avtryck — en TSA får inte stämpla fel sak", async () => {
    const stub = async () => ({ ok: true, arrayBuffer: async () => TOKEN });
    // Vi ber om ett annat avtryck än det token faktiskt täcker.
    const svar = await hamtaTidsstampel("http://tsa", "c4".repeat(32), stub as never);
    expect(svar).toBeNull();
  });

  it("en TSA som inte svarar hindrar inte — förankring är tillägg, inte villkor", async () => {
    const stub = async () => {
      throw new Error("nätverksfel");
    };
    expect(await hamtaTidsstampel("http://tsa", AVTRYCK, stub as never)).toBeNull();
  });
});
