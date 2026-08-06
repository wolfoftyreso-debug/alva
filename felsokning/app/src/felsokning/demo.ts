// Demoärende: vibrationsexemplet ur visionen, komplett med besvarade
// symptomfrågor, verifierade kontroller, mätvärden, foton, kategoribyten
// och en hypotes — så att brief, tidrapport, kundrapport och Live Share
// har verkligt innehåll direkt.

import type { Arende, Handelse, LoggPost } from "./domain";
import type { InstrumentTolkning, TolkatFalt } from "./ai";
import { nyLoggPost } from "./domain";

// Enkla platshållarbilder ritade i canvas — ersätts av riktiga foton så
// fort en kamera används. Fallback (1×1) när canvas saknas (t.ex. tester).
function demoFoto(text: string): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas saknas");
    ctx.fillStyle = "#27272a";
    ctx.fillRect(0, 0, 480, 360);
    ctx.strokeStyle = "#52525b";
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.arc(240, 170, 110, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#a1a1aa";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(240, 170, 58, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const v = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(240, 170);
      ctx.lineTo(240 + Math.cos(v) * 58, 170 + Math.sin(v) * 58);
      ctx.stroke();
    }
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, 240, 330);
    ctx.fillStyle = "#71717a";
    ctx.font = "14px sans-serif";
    ctx.fillText("Demobild", 240, 26);
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
  }
}

// Mätdon i demot. Ett mätvärde är E4 bara när det går att visa vad som
// mätte och att instrumentet var kalibrerat vid mättillfället — annars är
// det teknikerns observation av en siffra (QUALITY-AUDIT M-1). Demot ska
// visa den praxis produkten kräver, inte den som fanns innan.
const DACKTRYCKSMATARE = {
  matdonId: "demo-tryck-01",
  matdonBeteckning: "Däcktrycksmätare PCL DPG7",
  matdonKalibreradTill: "2027-03-31",
};
const BALANSMASKIN = {
  matdonId: "demo-balans-01",
  matdonBeteckning: "Balanseringsmaskin Hunter Road Force",
  matdonKalibreradTill: "2027-01-15",
};

export function byggDemoArende(nummer: number, anvandare = "Anna"): Arende {
  const start = Date.now() - 97 * 60000; // 1 tim 37 min sedan
  const vid = (minuter: number) => new Date(start + minuter * 60000).toISOString();
  const post = (minuter: number, handelse: Handelse, vem = anvandare): LoggPost =>
    nyLoggPost(vem, handelse, vid(minuter));

  const handelser: LoggPost[] = [
    post(0, {
      typ: "objekt_identifierat",
      objekt: {
        typ: "Personbil",
        identifierare: "ABC123",
        identifieringsmetod: "Regnr",
        beskrivning: "Volvo XC60 D4 2019",
        kund: "Anders Svensson",
        vin: "YV1DZ8256F2123456",
        miltal: "8 432 mil",
        arbetsorder: "AO-2496",
      },
    }),
    post(2, { typ: "felbeskrivning", text: "Bilen vibrerar runt 88 km/h. Symptomet uppträder endast under körning." }),
    // Pre-diagnostiken: historik, ingående mätarställning, verifierad
    // felbeskrivning och tidiga observationer — innan metodiken börjar.
    post(3, { typ: "historik_kontrollerad", kontrollerad: true, kommentar: "Däck roterade vid service för 2 månader sedan" }),
    post(3, { typ: "matarstallning", lage: "ingaende", varde: "84 320 km", dataUrl: demoFoto("Instrumentpanel 84 320 km") }),
    post(4, { typ: "kommentar", text: "Kundens felbeskrivning verifierad vid mottagandet." }),
    post(4, { typ: "kommentar", text: "Inga ytterligare observationer vid mottagandet." }),
    post(4, { typ: "fraga_besvarad", stegId: "symptom", frageId: "hastighetsberoende", fraga: "Är vibrationen hastighetsberoende?", svar: "Ja" }),
    post(5, { typ: "fraga_besvarad", stegId: "symptom", frageId: "var", fraga: "Var känns vibrationen?", svar: "I ratten" }),
    post(6, { typ: "fraga_besvarad", stegId: "symptom", frageId: "nar", fraga: "När uppstår vibrationen?", svar: "Vid jämn fart" }),
    post(8, { typ: "fraga_besvarad", stegId: "symptom", frageId: "intervall", fraga: "Försvinner den över eller under ett visst hastighetsintervall?", svar: "Märks tydligast 85–95 km/h, försvinner under 80" }),
    post(12, { typ: "foto", beskrivning: "Fotografera vänster framhjul", dataUrl: demoFoto("Vänster framhjul") }),
    post(12, { typ: "kontroll_utford", stegId: "visuell", kontrollId: "foto_vf", text: "Fotografera vänster framhjul" }),
    post(14, { typ: "foto", beskrivning: "Fotografera höger framhjul", dataUrl: demoFoto("Höger framhjul") }),
    post(14, { typ: "kontroll_utford", stegId: "visuell", kontrollId: "foto_hf", text: "Fotografera höger framhjul" }),
    post(16, { typ: "foto", beskrivning: "Fotografera vänster bakhjul", dataUrl: demoFoto("Vänster bakhjul") }),
    post(16, { typ: "kontroll_utford", stegId: "visuell", kontrollId: "foto_vb", text: "Fotografera vänster bakhjul" }),
    post(18, { typ: "foto", beskrivning: "Fotografera höger bakhjul", dataUrl: demoFoto("Höger bakhjul") }),
    post(18, { typ: "kontroll_utford", stegId: "visuell", kontrollId: "foto_hb", text: "Fotografera höger bakhjul" }),
    post(22, { typ: "kontroll_utford", stegId: "visuell", kontrollId: "dot", text: "Dokumentera DOT-/tillverkningsdatum", resultat: "Fram: DOT 2318, bak: DOT 2318 — samtliga från vecka 23 2018" }),
    post(26, { typ: "observation", text: "Höger framdäck visar ojämnt slitage på innerkanten" }),
    post(26, { typ: "kontroll_utford", stegId: "visuell", kontrollId: "slitage", text: "Kontrollera däckslitage", resultat: "Ojämnt slitage höger fram, övriga ok" }),
    post(31, { typ: "matvarde", beskrivning: "Lufttryck vänster fram", varde: "2,4", enhet: "bar", ...DACKTRYCKSMATARE }),
    post(32, { typ: "matvarde", beskrivning: "Lufttryck höger fram", varde: "2,1", enhet: "bar", ...DACKTRYCKSMATARE }),
    post(33, { typ: "kontroll_utford", stegId: "kontroller", kontrollId: "lufttryck", text: "Kontrollera lufttryck", resultat: "VF 2,4 / HF 2,1 / VB 2,4 / HB 2,4 bar — justerat till 2,4 runtom" }),
    post(38, { typ: "kontroll_utford", stegId: "kontroller", kontrollId: "hjulmoment", text: "Kontrollera hjulmoment", resultat: "140 Nm samtliga hjul, ok" }),
    post(40, { typ: "hypotes", text: "Obalans eller kast i höger framhjul", niva: "lag" }),
    post(41, { typ: "kategori_byte", kategori: "provkorning" }),
    post(55, { typ: "kontroll_utford", stegId: "provkorning", kontrollId: "pk_hastighet", text: "Hastighet där vibration uppstår", resultat: "Tydlig vibration 85–95 km/h, max vid 88" }),
    post(56, { typ: "kontroll_utford", stegId: "provkorning", kontrollId: "pk_acc", text: "Förändring vid acceleration", resultat: "Ingen förändring vid acceleration" }),
    post(57, { typ: "kontroll_utford", stegId: "provkorning", kontrollId: "pk_motorbroms", text: "Förändring vid motorbroms", resultat: "Ingen förändring vid motorbroms" }),
    post(58, { typ: "kontroll_utford", stegId: "provkorning", kontrollId: "pk_var", text: "Om vibration känns i ratt eller kaross", resultat: "Endast i ratten" }),
    post(60, { typ: "kategori_byte", kategori: "aktiv_felsokning" }),
    post(75, { typ: "inaktivitet_forklarad", text: "Lyfte bilen och demonterade höger framhjul för kontroll i balanseringsmaskin.", minuter: 15 }),
    post(82, { typ: "matvarde", beskrivning: "Obalans höger framhjul", varde: "38", enhet: "g", ...BALANSMASKIN }),
    post(83, { typ: "kontroll_utford", stegId: "kontroller", kontrollId: "balansering", text: "Kontrollera hjulbalansering", resultat: "38 g obalans höger fram — en balansvikt saknas. Övriga hjul inom 5 g." }),
    post(85, { typ: "observation", text: "Spår efter lossnad klistervikt på höger framfälgs insida" }),
    post(85, {
      typ: "reproducering",
      status: "ja",
      beskrivning: "Reproducerad vid provkörning på plan väg: vibrationen återskapades tre gånger mellan 92 och 108 km/h, tydligast i ratten.",
    }),
    post(86, {
      typ: "felorsak",
      avvikelse: "Framhjulen uppvisar obalans (38 g höger fram). Ingen deformation av fälgar eller däck kunde konstateras.",
      orsaker: ["Yttre påverkan"],
      underlag: ["Mätresultat", "Foto", "Direkt observation"],
      sakerhet: "medel",
      atgard: "Balansera framhjulen och genomför ny provkörning i 80–100 km/h.",
      ytterligareKontroller: "Ny provkörning efter balansering bekräftar att symptomet är åtgärdat.",
    }),
    // Exempel på AI-handledning, märkt "demo" — riktiga svar kräver API-nyckel.
    post(86, {
      typ: "ai_svar",
      rader: [
        { typ: "verifierat", text: "Obalans uppmätt: 38 g höger framhjul. Övriga hjul inom tolerans." },
        { typ: "observation", text: "Spår efter lossnad klistervikt förklarar var vikten suttit — orsaken till obalansen är dock inte verifierad." },
        { typ: "rekommendation", text: "Balansera om hjulet och verifiera att symptomet försvinner innan ärendet avslutas." },
      ],
      nastaSteg: "Balansera om höger framhjul och genomför ny provkörning i 80–100 km/h.",
      modell: "demo",
    }),
    post(86, {
      typ: "atgardsforslag",
      beskrivning: "Balansera om höger framhjul och genomför ny provkörning i 80–100 km/h.",
      uppskattadKostnad: "890 kr inkl. moms",
    }),
    post(87, { typ: "kategori_byte", kategori: "kundkontakt" }),
    post(87, {
      typ: "kundbeslut",
      beslut: "godkant",
      kanal: "Telefon",
      kommentar: "Kunden godkände ombalansering.",
    }),
    post(87, { typ: "kategori_byte", kategori: "aktiv_felsokning" }),
    post(87, {
      typ: "atgard_utford",
      beskrivning: "Balanserade om höger framhjul och monterade ny balansvikt på fälgens insida.",
      delar: "Balansvikter 40 g",
      utford: true,
    }),
    post(88, {
      typ: "kvalitetskontroll",
      resultat: "symptomet_borta",
      beskrivning: "Ny provkörning 80–110 km/h på samma vägsträcka — ingen vibration i ratten.",
    }),
    post(90, { typ: "overlamning", fran: anvandare, till: "Johan" }),
    post(92, { typ: "kategori_byte", kategori: "administration" }, "Johan"),
    post(95, { typ: "kommentar", text: "Balanserat om höger framhjul, ny provkörning planerad." }, "Johan"),
  ];

  return {
    id: `arende-demo-${start.toString(36)}`,
    nummer,
    skapad: vid(0),
    delningskod: `demo-${start.toString(36)}`,
    handelser,
  };
}

// Demo-tolkning av en arbetsorder — används i lokalt läge där plattformens
// dokumenttolkning inte kan nås, så att flödet (skanna → granska osäkra
// fält → starta diagnos) kan provas ändå. Märks alltid som demo i UI:t.
export function byggDemoTolkning(): TolkatFalt[] {
  return [
    { id: "kund_namn", etikett: "Namn", grupp: "Customer", varde: "Anders Svensson", konfidens: 0.98 },
    { id: "kund_telefon", etikett: "Telefon", grupp: "Customer", varde: "070-123 45 67", konfidens: 0.91, omrade: { x: 0.08, y: 0.22, bredd: 0.3, hojd: 0.04 } },
    { id: "fordon_regnr", etikett: "Regnr", grupp: "Vehicle", varde: "ABC123", konfidens: 0.99, omrade: { x: 0.62, y: 0.12, bredd: 0.2, hojd: 0.05 } },
    { id: "fordon_vin", etikett: "VIN", grupp: "Vehicle", varde: "YV1DZ8256F2123456", konfidens: 0.74, omrade: { x: 0.55, y: 0.19, bredd: 0.38, hojd: 0.04 } },
    { id: "fordon_marke", etikett: "Märke", grupp: "Vehicle", varde: "Volvo", konfidens: 0.99 },
    { id: "fordon_modell", etikett: "Modell", grupp: "Vehicle", varde: "XC60 D4", konfidens: 0.97 },
    { id: "fordon_arsmodell", etikett: "Årsmodell", grupp: "Vehicle", varde: "2019", konfidens: 0.96 },
    { id: "fordon_matarstallning", etikett: "Mätarställning", grupp: "Vehicle", varde: "8 432 mil", konfidens: 0.87, omrade: { x: 0.62, y: 0.27, bredd: 0.18, hojd: 0.04 } },
    { id: "ao_nummer", etikett: "Arbetsordernr", grupp: "Workshop", varde: "AO-2496", konfidens: 0.99 },
    { id: "ao_serviceradgivare", etikett: "Servicerådgivare", grupp: "Workshop", varde: "M. Lindqvist", konfidens: 0.82 },
    { id: "felbeskrivning", etikett: "Felbeskrivning", grupp: "Case", varde: "Kunden upplever vibrationer i ratten vid ca 90 km/h", konfidens: 0.97, omrade: { x: 0.08, y: 0.45, bredd: 0.84, hojd: 0.07 } },
  ];
}

// Demo-avläsning av ett instrument — används i lokalt läge där
// bildtolkningen inte kan nås. Märks alltid som demo i UI:t.
export function byggDemoInstrument(): InstrumentTolkning {
  return {
    instrumenttyp: "multimeter",
    varden: [
      { beskrivning: "Batterispänning (vila)", varde: "12,4", enhet: "V", konfidens: 0.97 },
      { beskrivning: "Spänning vid start", varde: "9,8", enhet: "V", konfidens: 0.84 },
    ],
  };
}
