// ALVA-PROC-0002 · Månatlig fakturering.
//
// Kör som eget jobb, inte i webbtjänstens process — av samma skäl som
// gallringen: en körning som avbryts mitt i ska kunna köras om, och den
// ska synas som en egen körning i driften.
//
// Jobbet är idempotent på perioden. Kör det två gånger samma dygn och den
// andra körningen fakturerar ingenting, eftersom `senast_fakturerad`
// redan flyttats. Det är viktigare än det låter: ett fakturajobb som
// dubbelfakturerar vid en omstart är värre än ett som inte kör alls.
//
//   node manadsfakturering.mjs            verkställer
//   node manadsfakturering.mjs --torrkor  räknar bara

import pg from "pg";
import { fakturera } from "./fakturering.mjs";
import { forfallenFakturering, nivaFor } from "./abonnemang.mjs";

/**
 * Fakturerar alla organisationer vars period löpt ut.
 *
 * Nivån hämtas ur abonnemangshändelserna — inte ur en kolumn — så att en
 * faktura alltid speglar den nivå som gällde när den utfärdades.
 */
export async function fakturerManaden(pool, { nu = new Date(), torrkor = false } = {}) {
  const organisationer = await pool.query(
    `select a.organisation_id, a.registrerad, a.senast_fakturerad, o.namn, o.installningar,
            (select varde from abonnemangshandelser
              where organisation_id = a.organisation_id and typ = 'niva'
              order by skapad desc limit 1) as niva
     from abonnemang a join organisationer o on o.id = a.organisation_id`,
  );

  const utfardade = [];
  const hoppade = [];
  for (const rad of organisationer.rows) {
    const period = forfallenFakturering(rad.registrerad, rad.senast_fakturerad, nu);
    if (!period) continue;

    const niva = nivaFor(rad.niva ?? "free");
    // Enterprise prissätts per avtal och faktureras inte av jobbet — ett
    // påhittat belopp vore värre än ingen faktura.
    if (niva.basavgift === null) continue;

    const aktiva = await pool.query(
      `select count(*)::int as antal from anvandare where organisation_id = $1 and aktiv`,
      [rad.organisation_id],
    );

    // Prislistan byggs ur NIVÅN, inte ur den globala listan: det är
    // abonnemanget kunden valt som avgör vad en användare kostar.
    const prislista = {
      valuta: "SEK",
      plattform_ar: niva.basavgift * 12,
      anvandare_manad: niva.anvandaravgift,
      moduler: {},
      momssats: 0.25,
      betalningsvillkor: 30,
    };

    if (torrkor) {
      utfardade.push({ organisation: rad.namn, period, niva: niva.id, torrkor: true });
      continue;
    }

    const klient = await pool.connect();
    try {
      await klient.query("begin");
      await klient.query("lock table fakturor in exclusive mode");
      const nasta = await klient.query(`select coalesce(max(nummer), 0) + 1 as n from fakturor`);
      const nummer = Number(nasta.rows[0].n);
      const dokument = fakturera({
        nummer,
        org: { namn: rad.namn, moduler: [] },
        aktiva: aktiva.rows[0].antal,
        period,
        utfardad: nu.toISOString().slice(0, 10),
        prislista,
      });
      await klient.query(
        `insert into fakturor (organisation_id, nummer, beteckning, utfardad, forfaller, valuta, totalt, dokument)
         values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          rad.organisation_id,
          nummer,
          dokument.beteckning,
          dokument.utfardad,
          dokument.forfaller,
          dokument.valuta,
          dokument.totalt,
          JSON.stringify(dokument),
        ],
      );
      await klient.query(`update abonnemang set senast_fakturerad = $2 where organisation_id = $1`, [
        rad.organisation_id,
        period.fran,
      ]);
      await klient.query("commit");
      utfardade.push({ organisation: rad.namn, beteckning: dokument.beteckning, totalt: dokument.totalt, niva: niva.id });
    } catch (fel) {
      await klient.query("rollback").catch(() => {});
      // 23505 = unik nyckel. Perioden är redan fakturerad av en parallell
      // körning; det är själva poängen med villkoret, inte ett fel att
      // avbryta hela jobbet för. Övriga organisationer ska faktureras.
      if (fel?.code === "23505") {
        hoppade.push({ organisation: rad.namn, period, skal: "redan fakturerad" });
        continue;
      }
      throw fel;
    } finally {
      klient.release();
    }
  }

  return { antal: utfardade.length, utfardade, hoppade, torrkor };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  try {
    const utfall = await fakturerManaden(pool, { torrkor: process.argv.includes("--torrkor") });
    console.log(JSON.stringify({ nivå: "info", meddelande: "månadsfakturering", tid: new Date().toISOString(), ...utfall }));
  } finally {
    await pool.end();
  }
}
