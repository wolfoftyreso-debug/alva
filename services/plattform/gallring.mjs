// Gallring (ALVA · TÜV T-4).
//
// ---- Varför den här filen finns ---------------------------------------
//
// `gallras_efter` räknades fram vid avslut, utifrån ärendetypen, och
// skrevs till ärenderaden. Sedan hände ingenting. En sökning genom hela
// repot visade att INGENTING läste kolumnen — ingen körning, inget
// schemalagt jobb, ingen fråga, inget CI-steg. Lagringsbegränsningen var
// en nedskriven avsikt, inte en verkställd kontroll.
//
// Det gjorde också att ett annat fel fick leva: triggern som förbjöd all
// update gjorde det omöjligt att ens SKRIVA kolumnen, och ingen märkte
// det, därför att ingenting längre ned konsumerade värdet.
//
// ---- Vad gallring är här ----------------------------------------------
//
// Inte radering av ärenden. Loggen är append-only och ska förbli det —
// protokollet över vad som kontrollerades har ett värde långt efter att
// identifieringen har det. Gallring är att förstöra personnyckeln, precis
// som en raderingsbegäran gör. Kvar blir ett ärende som fortfarande kan
// visa att lufttrycket mättes till 2,4 bar klockan 08:42, bara inte
// längre vems bil det gällde.
//
// ---- Försiktighetsregeln ----------------------------------------------
//
// En nyckel förstörs bara när SAMTLIGA ärenden som delar den har passerat
// sitt gallringsdatum. Ett fordon som varit inne fem gånger har fem
// ärenden och en nyckel; att gallra på det äldsta hade gjort de fyra
// senaste oläsbara i förtid. Ett ärende utan gallringsdatum — öppet, eller
// avslutat innan datum sattes — räknas som ännu inte passerat, eftersom
// för tidig gallring inte går att ångra.

import pg from "pg";
import { createHash } from "node:crypto";
import { valjValv } from "./nyckelvalv.mjs";

/**
 * Hittar och förstör nycklar vars samtliga ärenden har passerat sin tid.
 *
 * @param pool    pg.Pool
 * @param nu      tidpunkt att jämföra mot; injicerad för testbarhet
 * @param torrkor när true räknas allt fram men ingenting förstörs
 */
export async function gallra(pool, { nu = new Date(), torrkor = false } = {}) {
  // Ett subjekt i personnycklar är ett ärende-id (se personnyckel() i
  // server.mjs). Nyckeln kan delas av flera ärenden på samma fordon via
  // det blindade indexet, så gruppen måste bildas på indexet — inte på
  // subjektet — annars gallras en delad nyckel för tidigt.
  const kandidater = await pool.query(
    `with nyckelns_arenden as (
       select n.id as nyckel_id,
              n.subjekt,
              n.organisation_id,
              a.gallras_efter,
              coalesce(a.identifierare_index, a.id) as grupp
       from personnycklar n
       join felsokning_arenden a
         on a.organisation_id = n.organisation_id and a.id = n.subjekt
     ),
     samma_fordon as (
       select k.nyckel_id, k.subjekt, k.organisation_id, b.gallras_efter
       from nyckelns_arenden k
       join felsokning_arenden b
         on b.organisation_id = k.organisation_id
        and coalesce(b.identifierare_index, b.id) = k.grupp
     )
     select nyckel_id, min(subjekt) as subjekt, organisation_id, count(*)::int as antal_arenden
     from samma_fordon
     group by nyckel_id, organisation_id
     having bool_and(gallras_efter is not null and gallras_efter <= $1)`,
    [nu],
  );

  if (kandidater.rowCount === 0 || torrkor) {
    return { forstorda: 0, arenden: 0, kandidater: kandidater.rowCount, torrkor };
  }

  // Valvet avgör vad förstörelse betyder. Lokalt är radraderingen nedan
  // hela förstörelsen (durabel=false, forstor är en nej). Med KMS-valvet
  // måste subjektets nyckel schemaläggas för radering FÖRST — annars är
  // radraderingen bara en borttagen pekare medan nyckeln lever kvar och en
  // backup fortfarande går att öppna. Går den durabla förstörelsen inte
  // igenom lämnas nyckeln orörd till nästa körning i stället för att en
  // pekare tas bort utan att nyckeln faktiskt förstördes.
  const valv = valjValv(process.env);

  let forstorda = 0;
  let arenden = 0;
  for (const rad of kandidater.rows) {
    if (valv.durabel) {
      try {
        await valv.forstor(rad.subjekt);
      } catch {
        continue;
      }
    }
    const klient = await pool.connect();
    try {
      await klient.query("begin");
      const bort = await klient.query(`delete from personnycklar where id = $1 returning id`, [rad.nyckel_id]);
      if (bort.rowCount > 0) {
        // Gallringen skrivs i samma register som en begärd radering, med
        // ett hashat subjekt: registret får inte självt bära uppgiften
        // det bevisar att någon gjort oåtkomlig.
        await klient.query(
          `insert into raderingar (organisation_id, subjekt_hash, begard, begard_av, antal_arenden)
           values ($1, $2, $3, $4, $5)`,
          [
            rad.organisation_id,
            createHash("sha256").update(`gallring:${rad.nyckel_id}`).digest("hex"),
            nu,
            "Gallring (ALVA-PROC-0040)",
            rad.antal_arenden,
          ],
        );
        forstorda += 1;
        arenden += rad.antal_arenden;
      }
      await klient.query("commit");
    } catch (fel) {
      await klient.query("rollback").catch(() => {});
      throw fel;
    } finally {
      klient.release();
    }
  }

  return { forstorda, arenden, kandidater: kandidater.rowCount, torrkor };
}

// Körs som eget jobb (CronJob i klustret), inte i webbtjänstens process:
// en gallring som avbryts av en omstart mitt i ska kunna köras om, och
// den ska synas som en egen körning i driften.
//
//   node gallring.mjs            verkställer
//   node gallring.mjs --torrkor  räknar bara
if (import.meta.url === `file://${process.argv[1]}`) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  try {
    const utfall = await gallra(pool, { torrkor: process.argv.includes("--torrkor") });
    console.log(
      JSON.stringify({
        nivå: "info",
        meddelande: "gallring",
        tid: new Date().toISOString(),
        ...utfall,
      }),
    );
  } finally {
    await pool.end();
  }
}
