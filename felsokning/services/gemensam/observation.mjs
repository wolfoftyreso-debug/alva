// Observation — spårning och mätvärden utan nya beroenden.
//
// Tjänsterna har medvetet nästan inga beroenden: plattformen har
// pg-drivrutinen, orkestern har Claude-klienten. Att dra in ett
// OpenTelemetry-SDK med trettio paket för att mäta fyra saker vore fel
// avvägning.
//
// I stället två standarder som båda bara är text på stdout:
//
//   W3C Trace Context   traceparent-huvudet följer med genom hela
//                       kedjan, så en teknikers anrop går att följa
//                       från klienten via plattformen till orkestern.
//
//   CloudWatch EMF      strukturerad JSON som CloudWatch själv plockar
//                       mätvärden ur. Ingen agent, ingen SDK, inget
//                       som kan sluta fungera tyst.
//
// Det som mäts är valt efter en fråga: vad vill man veta klockan tre på
// natten när något är långsamt? Svaret är var tiden gick — inte hur
// många anrop som skett.

import { randomBytes } from "node:crypto";

export const NAMNRYMD = "GuidadFelsokning";

const TRACEPARENT = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

/**
 * Läser inkommande traceparent eller startar ett nytt spår.
 * Ett anrop utan huvud är inte ett fel — de flesta kommer utifrån.
 */
export function spårFrån(huvud) {
  const träff = typeof huvud === "string" ? huvud.trim().match(TRACEPARENT) : null;
  return {
    spårId: träff ? träff[1] : randomBytes(16).toString("hex"),
    förälder: träff ? träff[2] : null,
    spanId: randomBytes(8).toString("hex"),
  };
}

// Skickas vidare till nästa tjänst i kedjan.
export function traceparent(spår) {
  return `00-${spår.spårId}-${spår.spanId}-01`;
}

/**
 * Ett spann. Mäter tid och samlar barn, så att en logg-rad kan svara på
 * "var tog tiden vägen" utan att någon behöver korrelera flera rader.
 */
export function starta(namn, spår) {
  const början = process.hrtime.bigint();
  const barn = [];

  return {
    namn,
    spår,

    // Tidtagning på det som faktiskt kan vara långsamt: databasen,
    // modellanropet, objektlagringen, kundens leverantör.
    async mät(delnamn, arbete) {
      const start = process.hrtime.bigint();
      try {
        return await arbete();
      } finally {
        barn.push({ namn: delnamn, ms: Number(process.hrtime.bigint() - start) / 1e6 });
      }
    },

    ms() {
      return Number(process.hrtime.bigint() - början) / 1e6;
    },

    delar() {
      // Samma delnamn flera gånger (t.ex. tre databasfrågor) slås ihop:
      // antalet och summan säger mer än en lista.
      const summa = {};
      for (const d of barn) {
        summa[d.namn] ??= { antal: 0, ms: 0 };
        summa[d.namn].antal += 1;
        summa[d.namn].ms += d.ms;
      }
      for (const d of Object.values(summa)) d.ms = Math.round(d.ms * 100) / 100;
      return summa;
    },
  };
}

// En rad JSON per händelse. CloudWatch Logs Insights kan fråga på
// vilket fält som helst utan att någon behöver skriva ett regex.
export function logga(nivå, meddelande, fält = {}) {
  process.stdout.write(
    `${JSON.stringify({
      nivå,
      meddelande,
      tid: new Date().toISOString(),
      ...fält,
    })}\n`,
  );
}

/**
 * Mätvärden i CloudWatch Embedded Metric Format.
 *
 * Formatet är en logg-rad som CloudWatch känner igen och extraherar
 * mätvärden ur. Poängen är att mätvärdet och sammanhanget står i samma
 * rad: när latensen är hög går det att gå direkt till anropen som
 * orsakade den, i stället för att gissa utifrån en graf.
 *
 * Dimensioner hålls medvetet få. Varje unik kombination är en egen
 * tidsserie som kostar, så organisation eller ärende-id får aldrig bli
 * en dimension — de ligger som vanliga fält.
 */
export function mätvärde(namn, värde, enhet, dimensioner = {}, extra = {}) {
  const nycklar = Object.keys(dimensioner);

  process.stdout.write(
    `${JSON.stringify({
      _aws: {
        Timestamp: Date.now(),
        CloudWatchMetrics: [
          {
            Namespace: NAMNRYMD,
            Dimensions: nycklar.length > 0 ? [nycklar] : [[]],
            Metrics: [{ Name: namn, Unit: enhet }],
          },
        ],
      },
      ...dimensioner,
      [namn]: värde,
      ...extra,
    })}\n`,
  );
}

/**
 * Avslutar ett spann: en strukturerad logg-rad med hela nedbrytningen,
 * och ett mätvärde för latensen.
 *
 * Fel loggas som fel men mäts på samma ställe — annars syns inte att
 * felen är snabba och de lyckade anropen långsamma, vilket är precis
 * den sortens sak som förvirrar en felsökning.
 */
export function avsluta(spann, { status, väg, extra = {} }) {
  const ms = spann.ms();
  const delar = spann.delar();

  logga(status >= 500 ? "fel" : "info", spann.namn, {
    spårId: spann.spår.spårId,
    spanId: spann.spår.spanId,
    väg,
    status,
    ms: Math.round(ms * 100) / 100,
    delar,
    ...extra,
  });

  mätvärde("Svarstid", ms, "Milliseconds", { Tjänst: spann.namn, Väg: väg }, { status });

  // En egen serie för fel gör larmet enkelt: larma på summan, inte på
  // ett förhållande som måste räknas ut.
  if (status >= 500) {
    mätvärde("Fel", 1, "Count", { Tjänst: spann.namn, Väg: väg }, { spårId: spann.spår.spårId });
  }

  return ms;
}
