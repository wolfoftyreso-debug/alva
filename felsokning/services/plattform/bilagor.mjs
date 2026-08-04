// Bilagor — foton, videoklipp och instrumentbilder.
//
// Tidigare låg de som data-URL:er inne i händelserna. Det gjorde
// händelseloggen tung på ett sätt som drabbade allt som läser den:
// synken drog med hela bildmassan var femtonde sekund, kundvyn likaså,
// och en säkerhetskopia av loggen var i praktiken en kopia av alla foton.
//
// Nu ligger innehållet utanför händelsen och loggen bär en referens med
// SHA-256 av innehållet. Det är inte en försvagning av bevisvärdet utan
// en förstärkning: hashen står i den append-only-skyddade loggen, så en
// bild som bytts ut går att upptäcka. Tidigare låg bilden i loggen och
// måste helt enkelt tros på.
//
// Innehållsadressering ger dedup på köpet — samma foto som dokumenteras
// två gånger lagras en gång.
//
// Två lager, valda med BILAGE_LAGE:
//   databas  bytea i en egen tabell (standard, fungerar överallt)
//   s3       S3-kompatibel objektlagring — loggen och bilderna växer
//            då oberoende av varandra

import { createHash, createHmac } from "node:crypto";

export function innehallsHash(buffert) {
  return createHash("sha256").update(buffert).digest("hex");
}

// Vad som får laddas upp. Listan är avsiktligt kort: det här är
// dokumentation av ett fordon, inte en filserver.
export const TILLATNA_MEDIATYPER = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

export function mediatypGiltig(typ) {
  return TILLATNA_MEDIATYPER.includes((typ ?? "").split(";")[0].trim().toLowerCase());
}

// ---- AWS Signature Version 4 -------------------------------------------
//
// Egen implementation i stället för molnleverantörens SDK: tjänsten
// behöver två operationer (PUT och GET av ett objekt) och SDK:t hade
// dragit in tiotals megabyte beroenden i en bild som annars bara har
// pg-drivrutinen. Signeringen korsverifieras mot botocore i testerna.

const hmac = (nyckel, data) => createHmac("sha256", nyckel).update(data, "utf8").digest();

export function signeringsnyckel(hemlighet, datum, region, tjanst) {
  const d = hmac(`AWS4${hemlighet}`, datum);
  const r = hmac(d, region);
  const t = hmac(r, tjanst);
  return hmac(t, "aws4_request");
}

// Sökvägen kanoniseras INTE här, och det är ett medvetet val.
//
// S3 följer andra URL-kodningsregler än övriga AWS-tjänster, och en
// felgissad regel ger signaturer som ser rimliga ut men avvisas. I
// stället begränsas det som kan hamna i en nyckel (se namnGiltigt) till
// tecken som aldrig behöver kodas: hink och prefix är [a-z0-9.-/] och
// resten av nyckeln är hexadecimal ur innehållshashen. Då finns ingen
// kodningsfråga att gissa fel på.
export const NAMN_MONSTER = /^[a-z0-9][a-z0-9./-]*$/;

export function namnGiltigt(namn) {
  return typeof namn === "string" && namn.length <= 128 && NAMN_MONSTER.test(namn) && !namn.includes("..");
}

/**
 * Bygger Authorization-huvudet för en S3-förfrågan.
 *
 * @param metod      HTTP-metod, t.ex. "PUT"
 * @param url        fullständig URL till objektet
 * @param nyttolast  kroppen (Buffer) — tom Buffer för GET
 * @param uppgifter  { nyckelId, hemlighet, region }
 * @param tidsstampel ISO-basic, t.ex. "20260803T120000Z"
 */
export function signera(metod, url, nyttolast, uppgifter, tidsstampel) {
  // host, inte hostname: vid en icke-standardport måste porten med i
  // huvudet, annars avvisar självhostad S3 (MinIO, Ceph) signaturen.
  const { host, pathname, search } = new URL(url);
  const datum = tidsstampel.slice(0, 8);
  const nyttolastHash = innehallsHash(nyttolast);

  const huvuden = {
    host,
    "x-amz-content-sha256": nyttolastHash,
    "x-amz-date": tidsstampel,
  };
  const signerade = Object.keys(huvuden).sort();
  const kanoniskaHuvuden = signerade.map((n) => `${n}:${huvuden[n].trim()}\n`).join("");
  const signeradeNamn = signerade.join(";");

  // Frågesträngen ska vara sorterad och kodad. Vi använder inga
  // parametrar i dag, men kanoniseringen måste ändå vara rätt.
  const parametrar = [...new URLSearchParams(search).entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([n, v]) => `${encodeURIComponent(n)}=${encodeURIComponent(v)}`)
    .join("&");

  const kanoniskForfragan = [
    metod,
    pathname,
    parametrar,
    kanoniskaHuvuden,
    signeradeNamn,
    nyttolastHash,
  ].join("\n");

  const omfang = `${datum}/${uppgifter.region}/s3/aws4_request`;
  const attSignera = [
    "AWS4-HMAC-SHA256",
    tidsstampel,
    omfang,
    innehallsHash(Buffer.from(kanoniskForfragan, "utf8")),
  ].join("\n");

  const signatur = createHmac("sha256", signeringsnyckel(uppgifter.hemlighet, datum, uppgifter.region, "s3"))
    .update(attSignera, "utf8")
    .digest("hex");

  return {
    ...huvuden,
    Authorization:
      `AWS4-HMAC-SHA256 Credential=${uppgifter.nyckelId}/${omfang}, ` +
      `SignedHeaders=${signeradeNamn}, Signature=${signatur}`,
  };
}

// ---- Lager --------------------------------------------------------------

// Innehållsadresserat: nyckeln ÄR hashen. Två identiska filer blir en.
function objektnyckel(prefix, hash) {
  const rent = prefix.replace(/^\/+|\/+$/g, "");
  return `${rent ? `${rent}/` : ""}${hash.slice(0, 2)}/${hash}`;
}

export function skapaS3Lager(konfig, hamtare = fetch, nu = () => new Date()) {
  const prefix = (konfig.prefix ?? "").replace(/^\/+|\/+$/g, "");
  if (!namnGiltigt(konfig.hink) || (prefix !== "" && !namnGiltigt(prefix))) {
    throw new Error(
      "S3_HINK och S3_PREFIX får bara innehålla a-z, 0-9, punkt, bindestreck och snedstreck.",
    );
  }
  const bas = konfig.endpoint.replace(/\/$/, "");

  const url = (hash) => `${bas}/${konfig.hink}/${objektnyckel(prefix, hash)}`;
  const stampel = () => nu().toISOString().replace(/[-:]|\.\d{3}/g, "");

  return {
    namn: "s3",

    async spara(hash, data) {
      const mal = url(hash);
      const svar = await hamtare(mal, {
        method: "PUT",
        headers: signera("PUT", mal, data, konfig, stampel()),
        body: data,
      });
      if (!svar.ok) throw new Error(`Objektlagringen svarade ${svar.status} vid skrivning.`);
    },

    async hamta(hash) {
      const mal = url(hash);
      const svar = await hamtare(mal, {
        method: "GET",
        headers: signera("GET", mal, Buffer.alloc(0), konfig, stampel()),
      });
      if (svar.status === 404) return null;
      if (!svar.ok) throw new Error(`Objektlagringen svarade ${svar.status} vid läsning.`);
      return Buffer.from(await svar.arrayBuffer());
    },
  };
}

export function skapaDatabasLager(pool) {
  return {
    namn: "databas",

    async spara(hash, data) {
      // Innehållsadresserat: finns hashen redan är filen redan sparad.
      await pool.query(
        `insert into bilage_innehall (hash, data) values ($1, $2) on conflict (hash) do nothing`,
        [hash, data],
      );
    },

    async hamta(hash) {
      const rad = await pool.query(`select data from bilage_innehall where hash = $1`, [hash]);
      return rad.rowCount === 0 ? null : rad.rows[0].data;
    },
  };
}

// Väljer lager ur miljön. Saknas något som s3-läget kräver failar vi
// hellre vid start än vid första uppladdningen.
export function valjLager(env, pool, hamtare = fetch) {
  if ((env.BILAGE_LAGE ?? "databas") !== "s3") return skapaDatabasLager(pool);

  const saknas = ["S3_ENDPOINT", "S3_HINK", "S3_REGION", "S3_NYCKEL_ID", "S3_NYCKEL"].filter((n) => !env[n]);
  if (saknas.length > 0) {
    throw new Error(`BILAGE_LAGE=s3 kräver ${saknas.join(", ")}.`);
  }

  return skapaS3Lager(
    {
      endpoint: env.S3_ENDPOINT,
      hink: env.S3_HINK,
      region: env.S3_REGION,
      prefix: env.S3_PREFIX ?? "bilagor",
      nyckelId: env.S3_NYCKEL_ID,
      hemlighet: env.S3_NYCKEL,
    },
    hamtare,
  );
}
