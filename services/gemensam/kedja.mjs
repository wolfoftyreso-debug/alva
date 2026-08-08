// ALVA-SPEC-070 · Hashkedjan.
//
// ---- Varför triggrar inte räcker ----------------------------------------
//
// Loggen är append-only, genomdrivet av databastriggrar. Panelgranskningen
// (docs/PANELGRANSKNING-2026-08.md, datasäkerhetssätet) satte fingret på
// gränsen för det skyddet: en trigger skyddar mot APPLIKATIONEN, inte mot
// den som äger databasen. Den som har superuser släpper triggern, ändrar
// raden och återskapar triggern, och ingenting syns.
//
// För ett system vars hela värde är bevisvärde är det fel viloläge. En
// hashkedja flyttar skyddet från behörighet till matematik: varje händelse
// bär en hash av sitt eget innehåll OCH föregående händelses hash. Den som
// ändrar en rad i efterhand bryter varje efterföljande länk, och brottet
// går att peka ut — inte bara konstatera.
//
// ---- Vad kedjan bevisar, och inte ---------------------------------------
//
// Kedjan bevisar att loggen inte ändrats SEDAN DEN SKREVS, i den ordning
// den skrevs. Den bevisar inte att det som skrevs var sant — det är
// grindens och evidensmodellens uppgift — och den bevisar ingenting om
// tiden FÖRE serverns mottagande. Rapporten ska säga just det och inte
// mer: "innehållet är oförändrat sedan mottagandet".
//
// Förseglingen vid avslut (HMAC över roten med en nyckel utanför
// databasen) skyddar mot nästa angrepp i ordningen: den som äger databasen
// och räknar OM hela kedjan efter sin ändring. Utan nyckeln kan en
// omräknad kedja inte förseglas om, och en försegling som inte stämmer
// mot roten är beviset.
//
// ---- Konstruktion --------------------------------------------------------
//
//   länk_n = SHA256(länk_{n-1} · id · tidpunkt · anvandare · digest)
//
// `digest` är innehållshashen av den kanoniska händelsen — samma
// `klientdigest` som kollisionsprövningen redan använder, så kedjan och
// dubblettskyddet kan aldrig ha olika uppfattning om vad en händelse
// "är". Fälten skiljs med radbrytning: utan avskiljare vore
// ("ab","c") och ("a","bc") samma länk.
//
// Första länken utgår från ärende-id:t i stället för en tom sträng, så
// att två ärenden med identisk första händelse ändå får olika kedjor —
// en kedja ska inte gå att lyfta från ett ärende till ett annat.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** Kedjans startvärde för ett ärende. */
export const grund = (arendeId) =>
  createHash("sha256").update(`alva-kedja\n${arendeId}`).digest("hex");

/** Nästa länk. Alla fält är strängar; digest är händelsens innehållshash. */
export function lank(foregaende, { id, tidpunkt, anvandare, digest }) {
  return createHash("sha256")
    .update(`${foregaende}\n${id}\n${tidpunkt}\n${anvandare}\n${digest ?? ""}`)
    .digest("hex");
}

/**
 * Verifierar en hel kedja mot lagrade länkar.
 *
 * @param arendeId ärendet kedjan tillhör
 * @param rader    [{id, tidpunkt, anvandare, digest, kedjehash}] i kedjeordning
 * @returns {ok, rot, brott} — brott pekar ut FÖRSTA raden som inte
 *          stämmer. Allt efter den är följdfel och räknas inte upp:
 *          den som läser ska laga ett brott i taget, inte skrämmas av
 *          hundra.
 *
 * Rader utan lagrad kedjehash (skrivna innan kolumnen fanns) bryter inte
 * kedjan men märks som `okedjade` — tystnad hade låtit gammal data se
 * starkare ut än den är, och det är precis den sortens övertro kedjan
 * finns för att förhindra.
 */
export function verifiera(arendeId, rader) {
  let h = grund(arendeId);
  let okedjade = 0;
  for (let i = 0; i < rader.length; i++) {
    const rad = rader[i];
    h = lank(h, rad);
    if (rad.kedjehash == null) {
      okedjade++;
      continue;
    }
    if (rad.kedjehash !== h) {
      return { ok: false, rot: null, okedjade, brott: { index: i, id: rad.id } };
    }
  }
  return { ok: true, rot: rader.length > 0 ? h : grund(arendeId), okedjade };
}

/**
 * Förseglar en kedjerot med en nyckel som hålls utanför databasen.
 *
 * HMAC, inte hash: poängen är att den som äger databasen inte kan räkna
 * om förseglingen efter en ändring. Nyckeln är serverns, inte
 * teknikerns — förseglingen intygar att PLATTFORMEN såg denna rot vid
 * denna tid, ingenting om vem som tryckte på knappen. Det intyget står
 * händelsens serverägda `anvandare`-fält för.
 */
export function forsegla(nyckel, arendeId, rot, tidpunkt) {
  return createHmac("sha256", nyckel).update(`${arendeId}\n${rot}\n${tidpunkt}`).digest("hex");
}

/** Prövar en försegling. Konstanttid — en försegling är en hemlighet. */
export function provaForsegling(nyckel, arendeId, rot, tidpunkt, forsegling) {
  const ratt = Buffer.from(forsegla(nyckel, arendeId, rot, tidpunkt), "hex");
  const given = Buffer.from(String(forsegling ?? ""), "hex");
  return ratt.length === given.length && given.length > 0 && timingSafeEqual(ratt, given);
}
