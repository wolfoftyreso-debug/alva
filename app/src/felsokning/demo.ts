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
    ctx.fillStyle = "#1B1E22";
    ctx.fillRect(0, 0, 480, 360);
    ctx.strokeStyle = "#4D5662";
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.arc(240, 170, 110, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#4D5662";
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
    ctx.fillStyle = "#8A5A00";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, 240, 330);
    ctx.fillStyle = "#4D5662";
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
  matdonBeteckning: "Tyre pressure gauge PCL DPG7",
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
    post(2, { typ: "felbeskrivning", text: "The car vibrates at around 88 km/h. The symptom appears only while driving." }),
    // Pre-diagnostiken: historik, ingående mätarställning, verifierad
    // felbeskrivning och tidiga observationer — innan metodiken börjar.
    post(3, { typ: "historik_kontrollerad", kontrollerad: true, kommentar: "Tyres rotated at a service two months ago" }),
    post(3, { typ: "matarstallning", lage: "ingaende", varde: "84 320 km", dataUrl: demoFoto("Instrumentpanel 84 320 km") }),
    post(4, { typ: "kommentar", text: "Customer's fault description verified on receipt." }),
    post(4, { typ: "kommentar", text: "No further observations on receipt." }),
    post(4, { typ: "fraga_besvarad", stegId: "symptom", frageId: "hastighetsberoende", fraga: "Is the vibration speed-dependent?", svar: "Ja" }),
    post(5, { typ: "fraga_besvarad", stegId: "symptom", frageId: "var", fraga: "Where is the vibration felt?", svar: "I ratten" }),
    post(6, { typ: "fraga_besvarad", stegId: "symptom", frageId: "nar", fraga: "When does the vibration occur?", svar: "At steady speed" }),
    post(8, { typ: "fraga_besvarad", stegId: "symptom", frageId: "intervall", fraga: "Does it disappear above or below a certain speed range?", svar: "Most noticeable at 85–95 km/h, disappears below 80" }),
    post(12, { typ: "foto", beskrivning: "Photograph the left front wheel", dataUrl: demoFoto("Left front wheel") }),
    post(12, { typ: "kontroll_utford", stegId: "visuell", kontrollId: "foto_vf", text: "Photograph the left front wheel" }),
    post(14, { typ: "foto", beskrivning: "Photograph the right front wheel", dataUrl: demoFoto("Right front wheel") }),
    post(14, { typ: "kontroll_utford", stegId: "visuell", kontrollId: "foto_hf", text: "Photograph the right front wheel" }),
    post(16, { typ: "foto", beskrivning: "Photograph the left rear wheel", dataUrl: demoFoto("Left rear wheel") }),
    post(16, { typ: "kontroll_utford", stegId: "visuell", kontrollId: "foto_vb", text: "Photograph the left rear wheel" }),
    post(18, { typ: "foto", beskrivning: "Photograph the right rear wheel", dataUrl: demoFoto("Right rear wheel") }),
    post(18, { typ: "kontroll_utford", stegId: "visuell", kontrollId: "foto_hb", text: "Photograph the right rear wheel" }),
    post(22, { typ: "kontroll_utford", stegId: "visuell", kontrollId: "dot", text: "Document DOT/manufacturing date", resultat: "Front: DOT 2318, rear: DOT 2318 — all from week 23 of 2018" }),
    post(26, { typ: "observation", text: "The right front tyre shows uneven wear on the inner edge" }),
    post(26, { typ: "kontroll_utford", stegId: "visuell", kontrollId: "slitage", text: "Check tyre wear", resultat: "Uneven wear right front, the others in order" }),
    post(31, { typ: "matvarde", beskrivning: "Tyre pressure left front", varde: "2,4", enhet: "bar", ...DACKTRYCKSMATARE }),
    post(32, { typ: "matvarde", beskrivning: "Tyre pressure right front", varde: "2,1", enhet: "bar", ...DACKTRYCKSMATARE }),
    post(33, { typ: "kontroll_utford", stegId: "kontroller", kontrollId: "lufttryck", text: "Check tyre pressure", resultat: "LF 2.4 / RF 2.1 / LR 2.4 / RR 2.4 bar — adjusted to 2.4 all round" }),
    post(38, { typ: "kontroll_utford", stegId: "kontroller", kontrollId: "hjulmoment", text: "Check wheel torque", resultat: "140 Nm all wheels, ok" }),
    post(40, { typ: "hypotes", text: "Imbalance or runout in the right front wheel", niva: "lag" }),
    post(41, { typ: "kategori_byte", kategori: "provkorning" }),
    post(55, { typ: "kontroll_utford", stegId: "provkorning", kontrollId: "pk_hastighet", text: "Speed at which the vibration occurs", resultat: "Clear vibration at 85–95 km/h, worst at 88" }),
    post(56, { typ: "kontroll_utford", stegId: "provkorning", kontrollId: "pk_acc", text: "Change under acceleration", resultat: "No change under acceleration" }),
    post(57, { typ: "kontroll_utford", stegId: "provkorning", kontrollId: "pk_motorbroms", text: "Change under engine braking", resultat: "No change under engine braking" }),
    post(58, { typ: "kontroll_utford", stegId: "provkorning", kontrollId: "pk_var", text: "Whether the vibration is felt in the steering wheel or the body", resultat: "Only in the steering wheel" }),
    post(60, { typ: "kategori_byte", kategori: "aktiv_felsokning" }),
    post(75, { typ: "inaktivitet_forklarad", text: "Lifted the car and removed the right front wheel for checking on the balancing machine.", minuter: 15 }),
    post(82, { typ: "matvarde", beskrivning: "Imbalance in the right front wheel", varde: "38", enhet: "g", ...BALANSMASKIN }),
    post(83, { typ: "kontroll_utford", stegId: "kontroller", kontrollId: "balansering", text: "Check wheel balancing", resultat: "38 g imbalance right front — a balance weight is missing. The other wheels within 5 g." }),
    post(85, { typ: "observation", text: "Traces of a detached adhesive weight on the inner face of the right front rim" }),
    post(85, {
      typ: "reproducering",
      status: "ja",
      beskrivning: "Reproduced on a road test on level road: the vibration was recreated three times between 92 and 108 km/h, most clearly in the steering wheel.",
    }),
    post(86, {
      typ: "felorsak",
      avvikelse: "The front wheels show imbalance (38 g right front). No deformation of rims or tyres could be established.",
      orsaker: ["External influence"],
      underlag: ["Measurement result", "Foto", "Direkt observation"],
      sakerhet: "medel",
      atgard: "Balance the front wheels and perform a new road test at 80–100 km/h.",
      ytterligareKontroller: "A new road test after balancing confirms the symptom is resolved.",
    }),
    // Exempel på AI-handledning, märkt "demo" — riktiga svar kräver API-nyckel.
    post(86, {
      typ: "ai_svar",
      rader: [
        { typ: "verifierat", text: "Imbalance measured: 38 g right front wheel. The other wheels within tolerance." },
        { typ: "observation", text: "Traces of a detached adhesive weight explain where the weight sat — the cause of the imbalance is not verified, however." },
        { typ: "rekommendation", text: "Rebalance the wheel and verify that the symptom disappears before the case is closed." },
      ],
      nastaSteg: "Rebalance the right front wheel and perform a new road test at 80–100 km/h.",
      modell: "demo",
    }),
    post(86, {
      typ: "atgardsforslag",
      beskrivning: "Rebalance the right front wheel and perform a new road test at 80–100 km/h.",
      uppskattadKostnad: "890 kr incl. VAT",
    }),
    post(87, { typ: "kategori_byte", kategori: "kundkontakt" }),
    post(87, {
      typ: "kundbeslut",
      beslut: "godkant",
      kanal: "Phone",
      kommentar: "The customer approved the rebalancing.",
    }),
    post(87, { typ: "kategori_byte", kategori: "aktiv_felsokning" }),
    post(87, {
      typ: "atgard_utford",
      beskrivning: "Rebalanced the right front wheel and fitted a new weight on the inner face of the rim.",
      delar: "Balance weights 40 g",
      utford: true,
    }),
    post(88, {
      typ: "kvalitetskontroll",
      resultat: "symptomet_borta",
      beskrivning: "New road test at 80–110 km/h on the same stretch — no vibration in the steering wheel.",
    }),
    post(90, { typ: "overlamning", fran: anvandare, till: "Johan" }),
    post(92, { typ: "kategori_byte", kategori: "administration" }, "Johan"),
    post(95, { typ: "kommentar", text: "Rebalanced the right front wheel, a new road test is planned." }, "Johan"),
  ];

  return {
    id: `arende-demo-${start.toString(36)}`,
    nummer,
    skapad: vid(0),
    delningskod: `demo-${start.toString(36)}`,
    // Märkt som demonstration: synken skickar aldrig upp det, så
    // fejkbilen hamnar inte i organisationens statistik eller underlag.
    demo: true,
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
    { id: "fordon_marke", etikett: "Make", grupp: "Vehicle", varde: "Volvo", konfidens: 0.99 },
    { id: "fordon_modell", etikett: "Modell", grupp: "Vehicle", varde: "XC60 D4", konfidens: 0.97 },
    { id: "fordon_arsmodell", etikett: "Model year", grupp: "Vehicle", varde: "2019", konfidens: 0.96 },
    { id: "fordon_matarstallning", etikett: "Odometer", grupp: "Vehicle", varde: "8 432 mil", konfidens: 0.87, omrade: { x: 0.62, y: 0.27, bredd: 0.18, hojd: 0.04 } },
    { id: "ao_nummer", etikett: "Arbetsordernr", grupp: "Workshop", varde: "AO-2496", konfidens: 0.99 },
    { id: "ao_serviceradgivare", etikett: "Service advisor", grupp: "Workshop", varde: "M. Lindqvist", konfidens: 0.82 },
    { id: "felbeskrivning", etikett: "Felbeskrivning", grupp: "Case", varde: "The customer experiences vibration in the steering wheel at about 90 km/h", konfidens: 0.97, omrade: { x: 0.08, y: 0.45, bredd: 0.84, hojd: 0.07 } },
  ];
}

// Demo-avläsning av ett instrument — används i lokalt läge där
// bildtolkningen inte kan nås. Märks alltid som demo i UI:t.
export function byggDemoInstrument(): InstrumentTolkning {
  return {
    instrumenttyp: "multimeter",
    varden: [
      { beskrivning: "Battery voltage (at rest)", varde: "12,4", enhet: "V", konfidens: 0.97 },
      { beskrivning: "Voltage during cranking", varde: "9,8", enhet: "V", konfidens: 0.84 },
    ],
  };
}
