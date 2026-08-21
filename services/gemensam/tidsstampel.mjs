// ALVA-SPEC-071 · Extern tidsförankring (RFC 3161).
//
// ---- Vad förseglingen INTE bevisar --------------------------------------
//
// Hashkedjan bevisar att loggen inte ändrats sedan den skrevs. Förseglingen
// (HMAC över roten) bevisar att kedjan inte räknats om av någon med
// databasåtkomst. Men BÅDA vilar på serverns egen klocka: tidpunkten i
// förseglingen är serverns påstående. En part som bestrider när något
// hände — "ni backdaterade avslutet" — kan inte vederläggas av ett bevis
// vars enda tidsvittne är den anklagade.
//
// En RFC 3161-tidsstämpel flyttar tidsvittnet UT. En oberoende
// tidsstämplingsmyndighet (TSA) signerar ett kvitto på att den vid en viss
// tid SÅG ett visst hashavtryck — här kedjans rot. Kvittot (token) är en
// CMS-signatur som vem som helst kan verifiera mot TSA:ns certifikat med
// standardverktyg (openssl ts -verify). Vår uppgift är smalare och den vi
// måste göra rätt: att BEGÄRA stämpeln över rätt avtryck, och att inte
// lagra en token som inte täcker just vår rot.
//
// ---- Vad den här modulen gör och inte gör -------------------------------
//
// Gör: kodar en korrekt TimeStampReq (DER), och läser ur svaret det TVÅ
// saker vi måste kunna lita på innan vi lagrar det — att avtrycket är VÅRT,
// och vilken tid TSA:n stämplade (genTime). Gör inte: verifierar TSA:ns
// signaturkedja. Det är CMS-arbete som varje oberoende part gör bäst själv
// med sina egna betrodda rötter; att bygga om det här vore att be läsaren
// lita på vår verifiering av det bevis vår egen server hämtade.

// ---- DER-kodning (bara det TimeStampReq behöver) ------------------------

function langd(n) {
  if (n < 0x80) return Buffer.from([n]);
  const byte = [];
  while (n > 0) {
    byte.unshift(n & 0xff);
    n >>= 8;
  }
  return Buffer.from([0x80 | byte.length, ...byte]);
}

function tlv(tag, innehall) {
  const v = Buffer.isBuffer(innehall) ? innehall : Buffer.from(innehall);
  return Buffer.concat([Buffer.from([tag]), langd(v.length), v]);
}

const SEKVENS = (...delar) => tlv(0x30, Buffer.concat(delar));
const HELTAL = (n) => {
  // Bara små ickenegativa heltal behövs (version 1, nonce).
  let b = Buffer.isBuffer(n) ? n : Buffer.from([n]);
  if (b.length === 0) b = Buffer.from([0]);
  if (b[0] & 0x80) b = Buffer.concat([Buffer.from([0]), b]); // aldrig negativ
  return tlv(0x02, b);
};
const OKTETT = (b) => tlv(0x04, b);
const BOOLEAN = (v) => tlv(0x01, Buffer.from([v ? 0xff : 0x00]));
const NOLL = () => tlv(0x05, Buffer.alloc(0));
// OID 2.16.840.1.101.3.4.2.1 = SHA-256.
const OID_SHA256 = tlv(0x06, Buffer.from([0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01]));

/**
 * Bygger en RFC 3161 TimeStampReq över ett hexkodat SHA-256-avtryck.
 *
 * certReq=true ber TSA:n bifoga sitt certifikat i svaret, så att den som
 * verifierar inte behöver skaffa det separat. nonce binder svaret till
 * just den här begäran (ett replay-skydd).
 */
export function byggBegaran(avtryckHex, { nonce, certReq = true } = {}) {
  const avtryck = Buffer.from(avtryckHex, "hex");
  if (avtryck.length !== 32) throw new Error("Avtrycket måste vara SHA-256 (32 byte).");
  const messageImprint = SEKVENS(SEKVENS(OID_SHA256, NOLL()), OKTETT(avtryck));
  const delar = [HELTAL(1), messageImprint];
  if (nonce != null) delar.push(HELTAL(Buffer.isBuffer(nonce) ? nonce : Buffer.from(String(nonce))));
  delar.push(BOOLEAN(certReq));
  return SEKVENS(...delar);
}

// ---- DER-läsning (generisk TLV-navigering) ------------------------------

function las(buf, offset) {
  const tag = buf[offset];
  let i = offset + 1;
  let len = buf[i++];
  if (len & 0x80) {
    const antal = len & 0x7f;
    len = 0;
    for (let k = 0; k < antal; k++) len = (len << 8) | buf[i++];
  }
  return { tag, huvud: i - offset, start: i, slut: i + len };
}

function barn(buf, start, slut) {
  const ut = [];
  let i = start;
  while (i < slut) {
    const t = las(buf, i);
    ut.push(t);
    i = t.slut;
  }
  return ut;
}

// Går en TLV att stiga ner i? Konstruerade taggar (0x20-biten) alltid;
// en OCTET STRING (0x04) när dess innehåll självt är giltig DER — det är
// så CMS bär TSTInfo (eContent), och navigeringen missade den annars.
function nedstigbar(buf, t) {
  if (t.tag & 0x20) return true;
  if (t.tag !== 0x04 || t.slut <= t.start) return false;
  try {
    const inre = las(buf, t.start);
    return inre.slut === t.slut && inre.slut > inre.start;
  } catch {
    return false;
  }
}

// Djupsök första förekomsten av en tagg och returnera dess värdeområde.
function forsta(buf, start, slut, tag) {
  for (const t of barn(buf, start, slut)) {
    if (t.tag === tag) return t;
    if (nedstigbar(buf, t)) {
      const träff = forsta(buf, t.start, t.slut, tag);
      if (träff) return träff;
    }
  }
  return null;
}

function tolkaGeneralizedTime(s) {
  // ÅÅÅÅMMDDHHMMSS[.fff]Z
  const m = s.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\.\d+)?Z$/);
  if (!m) return null;
  const [, år, mån, dag, tim, min, sek] = m;
  return `${år}-${mån}-${dag}T${tim}:${min}:${sek}Z`;
}

/**
 * Läser ur en TimeStampResp (eller en bar TimeStampToken) det vi måste
 * kunna lita på: avtrycket TSA:n stämplade och tidpunkten.
 *
 * @returns { avtryckHex, tid } eller null om något inte går att läsa.
 */
export function lasToken(der) {
  const buf = Buffer.isBuffer(der) ? der : Buffer.from(der);
  try {
    const topp = las(buf, 0); // yttersta SEQUENCE
    // TSTInfo ligger i en OCTET STRING (eContent) någonstans i CMS-strukturen.
    // Vi letar upp den genom att hitta den innersta messageImprint: en
    // SEQUENCE som innehåller vår hashalgoritm-OID följd av en OCTET STRING.
    // Enklare och robustare: hitta genTime (GeneralizedTime, tag 0x18) inne
    // i TSTInfo, och avtrycket (OCTET STRING på 32 byte efter SHA-256-OID).
    const gt = forsta(buf, topp.start, topp.slut, 0x18);
    const tid = gt ? tolkaGeneralizedTime(buf.slice(gt.start, gt.slut).toString("latin1")) : null;

    // Avtrycket: den OCTET STRING på exakt 32 byte som följer en
    // SHA-256-algoritmidentifierare i en messageImprint.
    let avtryckHex = null;
    const sök = (start, slut) => {
      for (const t of barn(buf, start, slut)) {
        if (t.tag === 0x30) {
          const inre = barn(buf, t.start, t.slut);
          // messageImprint = SEQUENCE { AlgorithmIdentifier, OCTET STRING }
          if (
            inre.length === 2 &&
            inre[0].tag === 0x30 &&
            inre[1].tag === 0x04 &&
            inre[1].slut - inre[1].start === 32
          ) {
            const alg = buf.slice(inre[0].start, inre[0].slut);
            if (alg.includes(Buffer.from([0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01]))) {
              avtryckHex = buf.slice(inre[1].start, inre[1].slut).toString("hex");
              return true;
            }
          }
          if (sök(t.start, t.slut)) return true;
        } else if (nedstigbar(buf, t)) {
          if (sök(t.start, t.slut)) return true;
        }
      }
      return false;
    };
    sök(topp.start, topp.slut);

    if (!tid || !avtryckHex) return null;
    return { avtryckHex, tid };
  } catch {
    return null;
  }
}

/**
 * Hämtar en tidsstämpel över ett avtryck från en TSA.
 *
 * Kastar aldrig utåt: en TSA som inte svarar får inte hindra ett avslut —
 * förankringen är ett tillägg till förseglingen, inte ett villkor för den.
 * Verifierar att den returnerade tokenen täcker VÅRT avtryck innan den
 * anses giltig; en TSA (eller en mellanhand) som svarar med en token över
 * något annat avvisas.
 *
 * @returns { token: base64, tid } eller null.
 */
export async function hamtaTidsstampel(url, avtryckHex, hamtare = fetch) {
  try {
    const nonce = Buffer.from(
      Array.from({ length: 8 }, (_, i) => (Number.parseInt(avtryckHex.slice(i * 2, i * 2 + 2), 16) ^ (i + 1)) & 0xff),
    );
    const begaran = byggBegaran(avtryckHex, { nonce, certReq: true });
    const svar = await hamtare(url, {
      method: "POST",
      headers: { "Content-Type": "application/timestamp-query" },
      body: begaran,
      signal: AbortSignal.timeout(10_000),
    });
    if (!svar.ok) return null;
    const der = Buffer.from(await svar.arrayBuffer());
    const läst = lasToken(der);
    if (!läst || läst.avtryckHex.toLowerCase() !== avtryckHex.toLowerCase()) return null;
    return { token: der.toString("base64"), tid: läst.tid };
  } catch {
    return null;
  }
}
