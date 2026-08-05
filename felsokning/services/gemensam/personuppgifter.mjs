// Personuppgifter i en append-only-logg.
//
// Revisionen (docs/QUALITY-AUDIT.md, C-3) fann att systemet inte kunde
// uppfylla artikel 17: databastriggern hindrar aktivt radering, och
// kundens namn, telefonnummer, e-post, registreringsnummer och VIN
// ligger i klartext i loggen.
//
// "Append-only" och "radering på begäran" är inte oförenliga, men de
// måste förenas medvetet. Lösningen här är krypto-shredding:
//
//   Identifierande fält lagras krypterade med en nyckel som är unik per
//   registrerad person. Radering sker genom att nyckeln förstörs. Loggen
//   förblir intakt och hashverifierbar — det som blir oåtkomligt är
//   identifieringen, inte protokollet över vad som kontrollerades.
//
// Det är den enda konstruktion jag känner till där bevisvärdet överlever
// en raderingsbegäran. Ett ärende där kunden begärt radering kan
// fortfarande visa att lufttrycket mättes till 2,4 bar av en behörig
// tekniker klockan 08:42 — bara inte längre vem bilen tillhörde.
//
// Vad som INTE krypteras: mätvärden, observationer, kontrollresultat,
// tidsstämplar, teknikerns roll. De är verksamhetsdata och bär inget
// personvärde i sig. Att kryptera allt vore enklare att beskriva och
// sämre i praktiken — då raderas beviset tillsammans med personuppgiften.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Fält som räknas som identifierande och därför krypteras.
 *
 * Registreringsnummer och VIN står med avsikt med. De pekar ut ett
 * fordon, men ett fordon pekar i praktiken ut en ägare — EDPB behandlar
 * VIN som personuppgift när kopplingen finns, och här finns den.
 */
export const IDENTIFIERANDE = {
  objekt_identifierat: ["identifierare", "vin", "agare", "kund"],
  arbetsorder_skannad: [
    "kund_namn",
    "kund_foretag",
    "kund_telefon",
    "kund_epost",
    "fordon_regnr",
    "fordon_vin",
  ],
  kundbeslut: ["kontaktperson"],
};

export const MASKERAT = "[raderat på begäran]";

/**
 * Krypterar ett värde med den registrerades nyckel.
 * Formatet bär nyckelns id, så att en post går att koppla till rätt
 * nyckel utan att nyckeln behöver finnas.
 */
export function skydda(värde, nyckelId, nyckel) {
  const iv = randomBytes(12);
  const chiffer = createCipheriv("aes-256-gcm", nyckel, iv);
  const ut = Buffer.concat([chiffer.update(String(värde), "utf8"), chiffer.final()]);
  return `pd1:${nyckelId}:${iv.toString("base64url")}:${chiffer.getAuthTag().toString("base64url")}:${ut.toString("base64url")}`;
}

/**
 * Öppnar ett skyddat värde.
 *
 * Saknas nyckeln returneras MASKERAT — det är det normala utfallet efter
 * en radering, inte ett fel. Ett kastat undantag här skulle göra hela
 * ärendet oläsbart, vilket vore precis fel: resten av bevisningen ska
 * överleva.
 */
export function öppna(skyddat, nycklar) {
  if (typeof skyddat !== "string" || !skyddat.startsWith("pd1:")) return skyddat;
  const [, nyckelId, iv, tagg, data] = skyddat.split(":");
  const nyckel = nycklar.get(nyckelId);
  if (!nyckel) return MASKERAT;
  try {
    const chiffer = createDecipheriv("aes-256-gcm", nyckel, Buffer.from(iv, "base64url"));
    chiffer.setAuthTag(Buffer.from(tagg, "base64url"));
    return chiffer.update(Buffer.from(data, "base64url"), undefined, "utf8") + chiffer.final("utf8");
  } catch {
    // Fel nyckel eller manipulerad chiffertext. Att skilja de två fallen
    // åt i ett felmeddelande vore ett orakel; behandla dem lika.
    return MASKERAT;
  }
}

/** Krypterar de identifierande fälten i en händelse. */
export function skyddaHändelse(handelse, nyckelId, nyckel) {
  const fält = IDENTIFIERANDE[handelse.typ];
  if (!fält) return handelse;

  if (handelse.typ === "arbetsorder_skannad") {
    return {
      ...handelse,
      falt: (handelse.falt ?? []).map((f) =>
        fält.includes(f.id) && f.varde ? { ...f, varde: skydda(f.varde, nyckelId, nyckel) } : f,
      ),
    };
  }
  if (handelse.typ === "objekt_identifierat") {
    const objekt = { ...handelse.objekt };
    for (const n of fält) if (objekt[n]) objekt[n] = skydda(objekt[n], nyckelId, nyckel);
    return { ...handelse, objekt };
  }
  const ut = { ...handelse };
  for (const n of fält) if (ut[n]) ut[n] = skydda(ut[n], nyckelId, nyckel);
  return ut;
}

/** Öppnar de identifierande fälten igen för visning. */
export function öppnaHändelse(handelse, nycklar) {
  const fält = IDENTIFIERANDE[handelse?.typ];
  if (!fält) return handelse;

  if (handelse.typ === "arbetsorder_skannad") {
    return { ...handelse, falt: (handelse.falt ?? []).map((f) => ({ ...f, varde: öppna(f.varde, nycklar) })) };
  }
  if (handelse.typ === "objekt_identifierat") {
    const objekt = { ...handelse.objekt };
    for (const n of fält) if (objekt[n]) objekt[n] = öppna(objekt[n], nycklar);
    return { ...handelse, objekt };
  }
  const ut = { ...handelse };
  for (const n of fält) if (ut[n]) ut[n] = öppna(ut[n], nycklar);
  return ut;
}

/**
 * Gallringsbeslut.
 *
 * Retention är inte en teknisk detalj utan ett juridiskt ställningstagande,
 * och det skiljer sig mellan ärendetyper: ett garantiärende måste kunna
 * visas upp under garantitiden, ett kontantärende inte. Standardvärdena
 * nedan är utgångspunkter — varje organisation ska sätta sina egna, och
 * den som inte gör ett aktivt val får det försiktigaste.
 */
export const GALLRING_MANADER = {
  Garanti: 120, // Följer den längsta rimliga garantitiden på en drivlina.
  Goodwill: 120,
  Försäkring: 120, // Preskription för försäkringskrav.
  Reklamation: 36, // Konsumentköplagens reklamationsrätt.
  Begagnatgaranti: 60,
  standard: 36,
};

export function gallringsdatum(arendetyp, avslutat, manader = GALLRING_MANADER) {
  const antal = manader[arendetyp] ?? manader.standard;
  const d = new Date(avslutat);
  d.setMonth(d.getMonth() + antal);
  return d;
}
