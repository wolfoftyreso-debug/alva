// @vitest-environment node
// Nyckelvalvet (TÜV T-3). Tre saker måste hålla:
//
//   1. Det lokala valvet är dagens kuvertering, oförändrad — samma format,
//      samma genomsläpp av rå nyckel lagrad före kuverteringen, och en
//      manipulerad post öppnas inte.
//   2. KMS-signeringen är BITIDENTISK mot AWS egen (botocore-referens). En
//      signatur är antingen exakt rätt eller värdelös — KMS avvisar allt
//      annat, och då raderas ingenting och inget skyddas.
//   3. KMS-valvet bygger rätt anrop och tolkar svaren rätt: en förstörd
//      nyckel ger raderad post (null), inte ett kastat undantag.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { kmsBegaran, kmsValv, lokaltValv, valjValv } from "../../../../services/plattform/nyckelvalv.mjs";

const UPPGIFTER = {
  nyckelId: "AKIDEXAMPLE",
  hemlighet: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
};

describe("lokalt valv — dagens kuvertering, oförändrad", () => {
  const nyckel = randomBytes(32);
  const valv = lokaltValv(nyckel);

  it("omsluter och öppnar tillbaka samma klartext", async () => {
    const hemlig = randomBytes(32);
    const omslutet = await valv.omslut("arende-1", hemlig);
    expect(omslutet.toString("utf8").startsWith("v1.")).toBe(true);
    expect(Buffer.compare(await valv.oppna("arende-1", omslutet), hemlig)).toBe(0);
  });

  it("släpper igenom en rå nyckel lagrad före kuverteringen", async () => {
    const rå = randomBytes(32); // inget v1-prefix
    expect(Buffer.compare(await valv.oppna("arende-1", rå), rå)).toBe(0);
  });

  it("en manipulerad post öppnas inte", async () => {
    const omslutet = await valv.omslut("arende-1", randomBytes(32));
    const trasig = Buffer.from(omslutet.toString("utf8").slice(0, -2) + "xx", "utf8");
    await expect(valv.oppna("arende-1", trasig)).rejects.toThrow();
  });

  it("utan huvudnyckel lagras rå — och forstor kan inte lova något durabelt", async () => {
    const utan = lokaltValv(null);
    const hemlig = randomBytes(8);
    const omslutet = await utan.omslut("a", hemlig);
    expect(Buffer.compare(omslutet, hemlig)).toBe(0);
    expect(await utan.forstor("a")).toBe(false);
    expect(utan.durabel).toBe(false);
  });
});

describe("KMS-signering — bitidentisk mot AWS egen (botocore)", () => {
  const REFERENS = JSON.parse(
    readFileSync("src/felsokning/__tests__/kms-sigv4-referens.json", "utf8"),
  ) as { namn: string; target: string; kropp_json: string; region: string; tid: string; authorization: string }[];

  it("ger exakt samma Authorization för varje operation", () => {
    expect(REFERENS.length).toBeGreaterThanOrEqual(3);
    for (const fall of REFERENS) {
      const kropp = JSON.parse(fall.kropp_json);
      // Kroppen måste serialiseras byte-identiskt, annars skiljer sig
      // nyttolastens hash och därmed signaturen.
      expect(JSON.stringify(kropp)).toBe(fall.kropp_json);
      const b = kmsBegaran(fall.namn, kropp, { ...UPPGIFTER, region: fall.region }, fall.tid);
      expect(b.headers.Authorization, fall.namn).toBe(fall.authorization);
      expect(b.headers["X-Amz-Target"]).toBe(fall.target);
      expect(b.url).toBe(`https://kms.${fall.region}.amazonaws.com/`);
    }
  });

  it("en ändrad byte i kroppen ger en annan signatur", () => {
    const bas = { ...UPPGIFTER, region: "eu-north-1" };
    const a = kmsBegaran("Encrypt", { KeyId: "k", Plaintext: "aA==" }, bas, "20260803T120000Z");
    const b = kmsBegaran("Encrypt", { KeyId: "k", Plaintext: "aB==" }, bas, "20260803T120000Z");
    expect(a.headers.Authorization).not.toBe(b.headers.Authorization);
  });
});

describe("KMS-valv — rätt anrop, rätt tolkning", () => {
  const KONFIG = {
    region: "eu-north-1",
    nyckelId: "AKIDEXAMPLE",
    hemlighet: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
    tid: () => "20260803T120000Z",
  };

  type MockSvar = { ok: boolean; status?: number; json: () => Promise<Record<string, unknown>> };
  const tomtSvar = async (): Promise<MockSvar> => ({ ok: true, json: async () => ({}) });

  function fångare(svar: (target: string, kropp: Record<string, unknown>) => MockSvar) {
    const anrop: { target: string; kropp: Record<string, unknown> }[] = [];
    const hamtare = async (_url: string, init: { headers: Record<string, string>; body: string }) => {
      const target = init.headers["X-Amz-Target"].replace("TrentService.", "");
      const kropp = JSON.parse(init.body) as Record<string, unknown>;
      anrop.push({ target, kropp });
      return svar(target, kropp);
    };
    return { anrop, hamtare };
  }

  it("durabel — det är hela poängen med valvet", () => {
    expect(kmsValv({ ...KONFIG, hamtare: tomtSvar }).durabel).toBe(true);
  });

  it("omslut krypterar mot subjektets alias med subjektet som kontext", async () => {
    const { anrop, hamtare } = fångare(() => ({
      ok: true,
      json: async () => ({ CiphertextBlob: "QkxPQg==" }),
    }));
    const valv = kmsValv({ ...KONFIG, hamtare });
    const omslutet = await valv.omslut("arende-9", Buffer.from("hemlig nyckel"));

    expect(omslutet.toString("utf8")).toBe("k1.QkxPQg==");
    expect(anrop[0].target).toBe("Encrypt");
    expect((anrop[0].kropp.EncryptionContext as { subjekt: string }).subjekt).toBe("arende-9");
    // Aliaset bär subjektet hashat — aldrig i klartext i ett nyckelnamn.
    expect(anrop[0].kropp.KeyId).toMatch(/^alias\/alva-subjekt-[0-9a-f]{32}$/);
    expect(anrop[0].kropp.KeyId).not.toContain("arende-9");
    // Klartexten skickas base64-kodad.
    expect(Buffer.from(String(anrop[0].kropp.Plaintext), "base64").toString()).toBe("hemlig nyckel");
  });

  it("oppna avkodar Plaintext tillbaka", async () => {
    const { anrop, hamtare } = fångare(() => ({
      ok: true,
      json: async () => ({ Plaintext: Buffer.from("hemlig nyckel").toString("base64") }),
    }));
    const valv = kmsValv({ ...KONFIG, hamtare });
    const ut = await valv.oppna("arende-9", Buffer.from("k1.QkxPQg==", "utf8"));
    expect(ut?.toString()).toBe("hemlig nyckel");
    expect(anrop[0].target).toBe("Decrypt");
    expect(anrop[0].kropp.CiphertextBlob).toBe("QkxPQg==");
  });

  it("en förstörd nyckel ger raderad post (null), inte ett undantag", async () => {
    const { hamtare } = fångare(() => ({ ok: false, status: 400, json: async () => ({}) }));
    const valv = kmsValv({ ...KONFIG, hamtare });
    expect(await valv.oppna("arende-9", Buffer.from("k1.QkxPQg==", "utf8"))).toBeNull();
  });

  it("ett omslag från ett annat valv öppnas inte tyst", async () => {
    const valv = kmsValv({ ...KONFIG, hamtare: tomtSvar });
    await expect(valv.oppna("a", Buffer.from("v1.aaa.bbb.ccc", "utf8"))).rejects.toThrow();
  });

  it("forstor schemalägger subjektets nyckel för radering", async () => {
    const { anrop, hamtare } = fångare(() => ({ ok: true, json: async () => ({ KeyId: "x" }) }));
    const valv = kmsValv({ ...KONFIG, hamtare, raderingsdagar: 7 });
    expect(await valv.forstor("arende-9")).toBe(true);
    expect(anrop[0].target).toBe("ScheduleKeyDeletion");
    expect(anrop[0].kropp.PendingWindowInDays).toBe(7);
    expect(anrop[0].kropp.KeyId).toMatch(/^alias\/alva-subjekt-[0-9a-f]{32}$/);
  });

  it("forstor är idempotent — en redan borta nyckel räknas som förstörd", async () => {
    const { hamtare } = fångare(() => ({ ok: false, status: 404, json: async () => ({}) }));
    const valv = kmsValv({ ...KONFIG, hamtare });
    expect(await valv.forstor("arende-9")).toBe(true);
  });
});

describe("valet av valv", () => {
  it("standard är det lokala valvet — ingen drift ändras utan uttryckligt val", () => {
    expect(valjValv({ PERSONNYCKEL_HUVUD: randomBytes(32).toString("hex") }).durabel).toBe(false);
    expect(valjValv({}).durabel).toBe(false);
  });

  it("KMS-valvet väljs bara när hela konfigurationen finns", () => {
    const env = {
      PERSONNYCKEL_KMS_REGION: "eu-north-1",
      PERSONNYCKEL_KMS_NYCKEL_ID: "AKID",
      PERSONNYCKEL_KMS_HEMLIGHET: "hemlig",
    };
    expect(valjValv(env).durabel).toBe(true);
    // Ofullständig konfiguration faller tillbaka på lokalt, inte halvvägs.
    expect(valjValv({ PERSONNYCKEL_KMS_REGION: "eu-north-1" }).durabel).toBe(false);
  });
});
