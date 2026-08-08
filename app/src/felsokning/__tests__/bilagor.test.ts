// @vitest-environment node
// Bilagornas två egenskaper som måste hålla: signeringen mot
// objektlagringen är korrekt (annars fungerar inget alls), och
// innehållsadresseringen är verkligen innehållsadresserad — hashen är
// det som binder bilden till händelseloggen.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  innehallsHash,
  mediatypGiltig,
  signera,
  signeringsnyckel,
  skapaS3Lager,
  valjLager,
} from "../../../../services/plattform/bilagor.mjs";

// Referenssignaturer framtagna med botocore (AWS egen implementation) —
// se scratchpad/sigv4-referens.py. Att vår signering ger exakt samma
// resultat är den enda meningsfulla kontrollen: en signatur är antingen
// bitidentisk eller värdelös.
const REFERENS = JSON.parse(readFileSync("src/felsokning/__tests__/sigv4-referens.json", "utf8")) as {
  namn: string;
  metod: string;
  url: string;
  kropp_base64: string;
  region: string;
  tid: string;
  authorization: string;
}[];

const UPPGIFTER = {
  nyckelId: "AKIDEXAMPLE",
  hemlighet: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
};

describe("signering mot objektlagringen", () => {
  it("ger bitidentiska signaturer med botocore", () => {
    expect(REFERENS.length).toBeGreaterThanOrEqual(3);
    for (const fall of REFERENS) {
      const huvuden = signera(
        fall.metod,
        fall.url,
        Buffer.from(fall.kropp_base64, "base64"),
        { ...UPPGIFTER, region: fall.region },
        fall.tid,
      );
      expect(huvuden.Authorization, fall.namn).toBe(fall.authorization);
    }
  });

  it("härleder signeringsnyckeln enligt AWS testvektor", () => {
    // Publicerad vektor ur AWS dokumentation för nyckelhärledning.
    const nyckel = signeringsnyckel("wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY", "20150830", "us-east-1", "iam");
    expect(nyckel.toString("hex")).toBe(
      "c4afb1cc5771d871763a393e44b703571b55cc28424d1a5e86da6ed3c154a4b9",
    );
  });

  it("en ändrad byte i kroppen ger en annan signatur", () => {
    const bas = { ...UPPGIFTER, region: "eu-north-1" };
    const a = signera("PUT", "https://s3.exempel.se/hink/x", Buffer.from("hej"), bas, "20260803T120000Z");
    const b = signera("PUT", "https://s3.exempel.se/hink/x", Buffer.from("hej!"), bas, "20260803T120000Z");
    expect(a.Authorization).not.toBe(b.Authorization);
    expect(a["x-amz-content-sha256"]).not.toBe(b["x-amz-content-sha256"]);
  });
});

describe("innehållsadressering", () => {
  it("samma innehåll ger samma nyckel, olika innehåll olika", () => {
    expect(innehallsHash(Buffer.from("samma"))).toBe(innehallsHash(Buffer.from("samma")));
    expect(innehallsHash(Buffer.from("a"))).not.toBe(innehallsHash(Buffer.from("b")));
    expect(innehallsHash(Buffer.from(""))).toHaveLength(64);
  });

  it("objektet läggs under sin egen hash — identiska filer lagras en gång", async () => {
    const skrivna: string[] = [];
    const lager = skapaS3Lager(
      { endpoint: "https://s3.exempel.se", hink: "hink", region: "eu-north-1", prefix: "bilagor", ...UPPGIFTER },
      async (url: string, init: { method: string }) => {
        if (init.method === "PUT") skrivna.push(url);
        return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(0) };
      },
    );

    const data = Buffer.from("ett foto");
    const hash = innehallsHash(data);
    await lager.spara(hash, data);
    await lager.spara(hash, data);

    // Båda skrivningarna pekar på samma nyckel: lagringen skriver över
    // sig själv i stället för att lägga till en dubblett.
    expect(new Set(skrivna).size).toBe(1);
    expect(skrivna[0]).toBe(`https://s3.exempel.se/hink/bilagor/${hash.slice(0, 2)}/${hash}`);
  });

  it("saknat objekt ger null, fel från lagringen kastas vidare", async () => {
    const svar = { status: 404, ok: false };
    const lager = skapaS3Lager(
      { endpoint: "https://s3.exempel.se", hink: "h", region: "eu-north-1", ...UPPGIFTER },
      async () => svar,
    );
    expect(await lager.hamta("a".repeat(64))).toBeNull();

    svar.status = 500;
    await expect(lager.hamta("a".repeat(64))).rejects.toThrow("500");
  });
});

describe("val av lager", () => {
  it("standard är databasen — fungerar utan konfiguration", () => {
    expect(valjLager({}, null).namn).toBe("databas");
    expect(valjLager({ BILAGE_LAGE: "databas" }, null).namn).toBe("databas");
  });

  it("s3 utan fullständig konfiguration failar direkt, inte vid första uppladdningen", () => {
    expect(() => valjLager({ BILAGE_LAGE: "s3" }, null)).toThrow(/S3_ENDPOINT/);
    expect(() =>
      valjLager({ BILAGE_LAGE: "s3", S3_ENDPOINT: "https://s3.exempel.se", S3_HINK: "h" }, null),
    ).toThrow(/S3_REGION/);
    expect(
      valjLager(
        {
          BILAGE_LAGE: "s3",
          S3_ENDPOINT: "https://s3.exempel.se",
          S3_HINK: "h",
          S3_REGION: "eu-north-1",
          S3_NYCKEL_ID: "a",
          S3_NYCKEL: "b",
        },
        null,
      ).namn,
    ).toBe("s3");
  });
});

describe("vad som får laddas upp", () => {
  it("bilder och video, inget annat", () => {
    for (const typ of ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "IMAGE/JPEG"]) {
      expect(mediatypGiltig(typ), typ).toBe(true);
    }
    expect(mediatypGiltig("image/jpeg; charset=binary")).toBe(true);
    for (const typ of ["application/pdf", "text/html", "application/octet-stream", "", undefined]) {
      expect(mediatypGiltig(typ as string), String(typ)).toBe(false);
    }
  });
});
