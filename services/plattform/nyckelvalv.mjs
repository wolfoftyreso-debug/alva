// Nyckelvalv — förvaringen av personnycklarna, bakom ett gränssnitt.
//
// TÜV T-3. Krypto-shredding raderar en registrerad genom att förstöra den
// nyckel som skyddar hens identifierande fält. Det håller bara så länge
// nyckeln VERKLIGEN går att förstöra. Idag kuverteras varje subjekts
// nyckel under en lokal huvudnyckel (PERSONNYCKEL_HUVUD): en återställd
// databasdump går inte att öppna utan huvudnyckeln, men en backup tagen
// FÖRE raderingen plus huvudnyckeln återställer ändå uppgiften. Fönstret
// står öppet tills backupen rullar av.
//
// Det stängs bara av en förstörelse som är oåterkallelig och som gäller
// PER SUBJEKT — annars raderar man antingen ingen eller alla. Det kräver
// att nyckelmaterialet lever utanför databasen, i en KMS, där en enskild
// nyckel kan schemaläggas för radering.
//
// Den här modulen gör förvaringen till ett utbytbart valv med ett litet
// gränssnitt, så att raderingslöftets styrka blir ett driftval och inte
// en egenskap inbakad i servern:
//
//   omslut(subjekt, klartext) -> omslutna byte
//   oppna(subjekt, omslutet)  -> klartext, eller null om den är förstörd
//   forstor(subjekt)          -> true om förstörelsen är slutgiltig
//   durabel                   -> stänger en förstörelse backupfönstret?
//
// - lokaltValv: dagens kuvertering, oförändrad på tråden (samma v1-format,
//   samma genomsläpp av rå nyckel lagrad före kuverteringen). durabel=false,
//   och forstor är ärligt en nej — lokalt går fönstret inte att stänga.
// - kmsValv: per-subjektsnyckel i AWS KMS. omslut/oppna krypterar mot
//   subjektets egen nyckel (alias), forstor schemalägger den för radering.
//   durabel=true. Signeringen är SigV4, bitidentisk mot AWS egen (prövad
//   mot botocore-referens), och anropen går genom en injicerad hämtare så
//   de kan provas utan ett nät. Det enda som inte kan bevisas här är en
//   riktig KMS i andra änden.

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { signeringsnyckel } from "./bilagor.mjs";

// ---- Lokalt valv (dagens kuvertering) ---------------------------------

/**
 * @param {Buffer|null} huvudnyckel  32 byte, eller null (då lagras rå nyckel).
 */
export function lokaltValv(huvudnyckel) {
  return {
    durabel: false,
    async omslut(_subjekt, klartext) {
      if (!huvudnyckel) return Buffer.from(klartext);
      const iv = randomBytes(12);
      const c = createCipheriv("aes-256-gcm", huvudnyckel, iv);
      const ut = Buffer.concat([c.update(klartext), c.final()]);
      return Buffer.from(
        `v1.${iv.toString("base64url")}.${c.getAuthTag().toString("base64url")}.${ut.toString("base64url")}`,
        "utf8",
      );
    },
    async oppna(_subjekt, omslutet) {
      const text = Buffer.from(omslutet).toString("utf8");
      // En nyckel lagrad före kuverteringen är råa byte — läses som förut,
      // annars hade uppgraderingen gjort all befintlig historik oläsbar.
      if (!text.startsWith("v1.")) return Buffer.from(omslutet);
      if (!huvudnyckel) throw new Error("Personnycklarna är kuverterade men huvudnyckel saknas.");
      const [, iv, tagg, data] = text.split(".");
      const d = createDecipheriv("aes-256-gcm", huvudnyckel, Buffer.from(iv, "base64url"));
      d.setAuthTag(Buffer.from(tagg, "base64url"));
      return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]);
    },
    async forstor(_subjekt) {
      // Lokalt kan en enskild nyckel inte förstöras oåterkalleligt över
      // backuper — raderingen är radraderingen i databasen, som förut.
      return false;
    },
  };
}

// ---- KMS-signering (SigV4, JSON-POST mot TrentService) -----------------

const sha256hex = (buf) => createHash("sha256").update(buf).digest("hex");

/**
 * Bygger ett signerat KMS-anrop. Tjänsten är "kms", värden
 * kms.<region>.amazonaws.com, operationen styrs av X-Amz-Target.
 * Signeringen är bitidentisk mot AWS egen (se kms-sigv4-referens).
 *
 * @param {string} operation  t.ex. "Encrypt", "Decrypt", "ScheduleKeyDeletion"
 * @param {object} kropp       anropets JSON-argument
 * @param {{region:string, nyckelId:string, hemlighet:string}} uppgifter
 * @param {string} tidsstampel  ISO-basic UTC, "YYYYMMDDTHHMMSSZ"
 * @returns {{url:string, headers:object, body:string}}
 */
export function kmsBegaran(operation, kropp, uppgifter, tidsstampel) {
  const region = uppgifter.region;
  const host = `kms.${region}.amazonaws.com`;
  const target = `TrentService.${operation}`;
  const contentType = "application/x-amz-json-1.1";
  const body = JSON.stringify(kropp);
  const datum = tidsstampel.slice(0, 8);

  // Kanonisk begäran. KMS signerar content-type, host, x-amz-date och
  // x-amz-target — i den ordningen (namnen sorterade, gemener, trimmade).
  const huvuden = {
    "content-type": contentType,
    host,
    "x-amz-date": tidsstampel,
    "x-amz-target": target,
  };
  const signerade = Object.keys(huvuden).sort();
  const kanoniskaHuvuden = signerade.map((n) => `${n}:${huvuden[n].trim()}\n`).join("");
  const signeradeNamn = signerade.join(";");

  const kanoniskForfragan = [
    "POST",
    "/",
    "",
    kanoniskaHuvuden,
    signeradeNamn,
    sha256hex(Buffer.from(body, "utf8")),
  ].join("\n");

  const omfang = `${datum}/${region}/kms/aws4_request`;
  const attSignera = [
    "AWS4-HMAC-SHA256",
    tidsstampel,
    omfang,
    sha256hex(Buffer.from(kanoniskForfragan, "utf8")),
  ].join("\n");

  const signatur = createHmac("sha256", signeringsnyckel(uppgifter.hemlighet, datum, region, "kms"))
    .update(attSignera, "utf8")
    .digest("hex");

  return {
    url: `https://${host}/`,
    body,
    headers: {
      "Content-Type": contentType,
      "X-Amz-Date": tidsstampel,
      "X-Amz-Target": target,
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${uppgifter.nyckelId}/${omfang}, ` +
        `SignedHeaders=${signeradeNamn}, Signature=${signatur}`,
    },
  };
}

// ---- KMS-valv (per-subjektsnyckel) ------------------------------------

const AWS_TID = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/**
 * Ett valv med en KMS-nyckel per subjekt, adresserad via alias. Nyckeln
 * provisioneras i drift (Terraform eller lat skapelse — sista integrations-
 * steget som kräver en riktig KMS). forstor schemalägger subjektets nyckel
 * för radering; efter det går varken den levande databasen eller någon
 * backup att öppna. Det är så backupfönstret stängs per subjekt.
 *
 * @param {object} k
 * @param {string} k.region
 * @param {string} k.nyckelId    AWS-åtkomstnyckelns id
 * @param {string} k.hemlighet   AWS-hemlighet
 * @param {string} [k.aliasPrefix="alias/alva-subjekt"]
 * @param {number} [k.raderingsdagar=7]  KMS väntefönster (7–30)
 * @param {function} [k.hamtare=fetch]   injiceras i test
 * @param {function} [k.tid=AWS_TID]     injiceras i test
 */
export function kmsValv(k) {
  const aliasPrefix = k.aliasPrefix ?? "alias/alva-subjekt";
  const raderingsdagar = k.raderingsdagar ?? 7;
  const hamtare = k.hamtare ?? fetch;
  const tid = k.tid ?? AWS_TID;
  const uppgifter = { region: k.region, nyckelId: k.nyckelId, hemlighet: k.hemlighet };

  // Subjektets alias — hashat så en identifierare aldrig hamnar i ett
  // KMS-nyckelnamn i klartext.
  const alias = (subjekt) =>
    `${aliasPrefix}-${createHash("sha256").update(String(subjekt)).digest("hex").slice(0, 32)}`;

  async function anropa(operation, kropp) {
    const b = kmsBegaran(operation, kropp, uppgifter, tid());
    const res = await hamtare(b.url, { method: "POST", headers: b.headers, body: b.body });
    return res;
  }

  return {
    durabel: true,
    async omslut(subjekt, klartext) {
      const res = await anropa("Encrypt", {
        KeyId: alias(subjekt),
        Plaintext: Buffer.from(klartext).toString("base64"),
        EncryptionContext: { subjekt: String(subjekt) },
      });
      if (!res.ok) throw new Error(`KMS Encrypt ${res.status}`);
      const svar = await res.json();
      return Buffer.from(`k1.${svar.CiphertextBlob}`, "utf8");
    },
    async oppna(subjekt, omslutet) {
      const text = Buffer.from(omslutet).toString("utf8");
      if (!text.startsWith("k1.")) {
        throw new Error("Omslaget hör inte till KMS-valvet (fel valv för denna post).");
      }
      const res = await anropa("Decrypt", {
        CiphertextBlob: text.slice(3),
        EncryptionContext: { subjekt: String(subjekt) },
      });
      // En förstörd (schemalagd) nyckel ger ett fel — då är posten raderad,
      // och det är rätt utfall, inte ett undantag att kasta vidare.
      if (!res.ok) return null;
      const svar = await res.json();
      return Buffer.from(svar.Plaintext, "base64");
    },
    async forstor(subjekt) {
      const res = await anropa("ScheduleKeyDeletion", {
        KeyId: alias(subjekt),
        PendingWindowInDays: raderingsdagar,
      });
      // Idempotent: en nyckel som redan är schemalagd (eller borta) räknas
      // som förstörd — raderingen ska inte gå att "ångra" genom att fela.
      return res.ok || res.status === 400 || res.status === 404;
    },
  };
}

/**
 * Tolkar PERSONNYCKEL_HUVUD: 32 byte som hex (64 tecken) eller base64.
 * Tom sträng ger null (då lagras rå nyckel — samma som förut).
 * @param {string} rå
 * @returns {Buffer|null}
 */
export function tolkaHuvudnyckel(rå) {
  if (!rå) return null;
  const b = /^[0-9a-fA-F]{64}$/.test(rå) ? Buffer.from(rå, "hex") : Buffer.from(rå, "base64");
  if (b.length !== 32) throw new Error("PERSONNYCKEL_HUVUD måste vara 32 byte (hex eller base64).");
  return b;
}

/**
 * Väljer valv ur miljön. Standard är det lokala valvet (oförändrat), så
 * ingen befintlig drift ändras utan ett uttryckligt val. KMS-valvet väljs
 * bara när hela dess konfiguration finns — annars faller vi tillbaka på
 * lokalt, aldrig halvvägs.
 *
 * @param {object} env  process.env
 */
export function valjValv(env) {
  if (env.PERSONNYCKEL_KMS_REGION && env.PERSONNYCKEL_KMS_NYCKEL_ID && env.PERSONNYCKEL_KMS_HEMLIGHET) {
    return kmsValv({
      region: env.PERSONNYCKEL_KMS_REGION,
      nyckelId: env.PERSONNYCKEL_KMS_NYCKEL_ID,
      hemlighet: env.PERSONNYCKEL_KMS_HEMLIGHET,
      aliasPrefix: env.PERSONNYCKEL_KMS_ALIAS,
      raderingsdagar: env.PERSONNYCKEL_KMS_DAGAR ? Number(env.PERSONNYCKEL_KMS_DAGAR) : undefined,
    });
  }
  return lokaltValv(tolkaHuvudnyckel(env.PERSONNYCKEL_HUVUD ?? ""));
}
