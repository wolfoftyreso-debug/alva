// ALVA-PROC-0001 · Fakturan som PDF.
//
// ---- Varför den är skriven för hand -------------------------------------
//
// Kravet var inga beroenden. En PDF-generator drar in ett bibliotek som
// drar in fem till, och varje sådant är en försörjningskedja vi inte
// granskar — för att rita text i två spalter.
//
// PDF är ett textformat. En ensidig faktura med inbyggda typsnitt är
// omkring tvåhundra rader, och de raderna går att läsa och förstå av den
// som ska lita på dem. Det är samma resonemang som gjorde
// plattformstjänsten ramverkslös.
//
// ---- Vad som INTE görs ---------------------------------------------------
//
// Inga bilder, ingen egen typografi, ingen radbrytning av godtycklig
// bredd. De 14 basfonterna finns i varje PDF-läsare och behöver inte
// bäddas in; Helvetica räcker för en faktura, och en faktura som ser
// tråkig ut är fortfarande en faktura.
//
// WinAnsi täcker svenska tecken. Det som ligger utanför ersätts hellre än
// att ge en trasig glyf — en faktura med kråkfötter ser förfalskad ut.

/** Sidmått i punkter. A4. */
const BREDD = 595.28;
const HOJD = 841.89;
const MARGINAL = 56;

/** Tecken PDF:ens strängsyntax måste få undantagna. */
const flykta = (s) => String(s).replace(/([\\()])/g, "\\$1");

/**
 * WinAnsi-kodning av det vi faktiskt använder.
 *
 * Latin-1 räcker till 0xFF och täcker åäöÅÄÖ. Utanför det ersätts
 * tecknet — hellre en punkt än en trasig glyf.
 */
function winansi(text) {
  let ut = "";
  for (const tecken of String(text)) {
    const k = tecken.codePointAt(0);
    if (k === 0x2013 || k === 0x2014) ut += "-"; // tankstreck
    else if (k === 0x00a0) ut += " "; // hårt mellanslag
    else if (k === 0x2212) ut += "-"; // minustecken
    else if (k <= 0xff) ut += tecken;
    else ut += ".";
  }
  return ut;
}

/** En textinstruktion i innehållsströmmen. */
function text(x, y, storlek, innehall, font = "F1") {
  return `BT /${font} ${storlek} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${flykta(winansi(innehall))}) Tj ET\n`;
}

function linje(x1, y1, x2, y2, tjocklek = 0.5) {
  return `${tjocklek} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S\n`;
}

/**
 * Bygger fakturans PDF.
 *
 * @param faktura   dokumentet ur fakturering.mjs
 * @param avsandare valfria uppgifter om utfärdaren (ALVA-SPEC-050)
 * @returns Buffer
 */
export function fakturaPdf(faktura, avsandare = {}) {
  const rader = [];
  let y = HOJD - MARGINAL;

  const skriv = (storlek, innehall, font = "F1", hopp = null) => {
    rader.push(text(MARGINAL, y, storlek, innehall, font));
    y -= hopp ?? storlek + 6;
  };

  // ---- Huvud ------------------------------------------------------------
  skriv(20, "ALVA", "F2", 28);
  skriv(9, "GUIDED DIAGNOSTIC PLATFORM", "F1", 24);

  skriv(15, `Invoice ${faktura.beteckning}`, "F2", 22);

  // ---- Parter och datum -------------------------------------------------
  const uppgifter = [
    ["Organization", faktura.organisation],
    ["Period", `${faktura.period.fran} - ${faktura.period.till}`],
    ["Issued", faktura.utfardad],
    ["Due", faktura.forfaller],
  ];
  for (const [etikett, varde] of uppgifter) {
    rader.push(text(MARGINAL, y, 9, etikett, "F1"));
    rader.push(text(MARGINAL + 120, y, 9, String(varde), "F2"));
    y -= 14;
  }
  y -= 10;

  // ---- Rader ------------------------------------------------------------
  rader.push(linje(MARGINAL, y, BREDD - MARGINAL, y, 1));
  y -= 16;
  for (const [x, etikett] of [
    [MARGINAL, "ITEM"],
    [MARGINAL + 250, "QTY"],
    [MARGINAL + 330, "UNIT PRICE"],
    [BREDD - MARGINAL - 80, "AMOUNT"],
  ]) {
    rader.push(text(x, y, 8, etikett, "F2"));
  }
  y -= 6;
  rader.push(linje(MARGINAL, y, BREDD - MARGINAL, y));
  y -= 18;

  const belopp = (ore) => `${(Math.abs(ore) / 100).toFixed(2)}${ore < 0 ? "-" : ""} ${faktura.valuta}`;

  for (const r of faktura.rader) {
    rader.push(text(MARGINAL, y, 10, r.benamning, "F2"));
    rader.push(text(MARGINAL + 250, y, 10, `${r.antal}`));
    rader.push(text(MARGINAL + 330, y, 10, belopp(r.apris)));
    rader.push(text(BREDD - MARGINAL - 80, y, 10, belopp(r.belopp)));
    y -= 13;
    // Underlaget under raden: varje rad ska bära var antalet kommer ifrån,
    // och det gäller på papper lika mycket som på skärm.
    rader.push(text(MARGINAL + 8, y, 8, r.underlag));
    y -= 18;
  }

  rader.push(linje(MARGINAL, y, BREDD - MARGINAL, y));
  y -= 18;

  // ---- Summering --------------------------------------------------------
  for (const [etikett, varde, fet] of [
    ["Net", belopp(faktura.netto), false],
    [`VAT ${Math.round(faktura.momssats * 100)} %`, belopp(faktura.moms), false],
    ["Total", belopp(faktura.totalt), true],
  ]) {
    rader.push(text(MARGINAL + 330, y, fet ? 11 : 10, etikett, fet ? "F2" : "F1"));
    rader.push(text(BREDD - MARGINAL - 80, y, fet ? 11 : 10, varde, fet ? "F2" : "F1"));
    y -= fet ? 20 : 15;
  }

  // ---- Betalning --------------------------------------------------------
  y -= 10;
  rader.push(linje(MARGINAL, y, BREDD - MARGINAL, y));
  y -= 18;
  skriv(9, faktura.betalningssatt, "F2", 14);
  skriv(8, "Payment is registered by an administrator when the funds arrive.", "F1", 20);

  if (faktura.krediterar) {
    skriv(9, `Credit note for ${faktura.krediterar}`, "F2", 14);
    if (faktura.orsak) skriv(8, faktura.orsak, "F1", 20);
  }

  // ---- Utfärdarens uppgifter -------------------------------------------
  //
  // Tomma fält utelämnas. En faktura med "— ej satt" i adressfältet är
  // sämre än en utan adressfält: den påstår att någon fyllt i det.
  const fot = [avsandare.foretagsnamn, avsandare.adress, avsandare.momsnummer, avsandare.epost].filter(Boolean);
  let fy = MARGINAL + 40;
  for (const rad of fot.reverse()) {
    rader.push(text(MARGINAL, fy, 8, rad));
    fy += 11;
  }
  rader.push(text(BREDD - MARGINAL - 120, MARGINAL, 8, faktura.version ?? "ALVA-PROC-0001"));

  return montera(rader.join(""));
}

/**
 * Sätter ihop PDF-filen med korrekt korsreferenstabell.
 *
 * Byteoffsetarna i xref måste stämma på byten. Det är den enda delen av
 * formatet som inte förlåter slarv — en läsare som inte hittar objektet
 * visar ingenting alls, inte en trasig sida.
 */
function montera(innehall) {
  const objekt = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${BREDD.toFixed(2)} ${HOJD.toFixed(2)}] ` +
      "/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    null, // 4: innehållsströmmen, sätts nedan
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  ];

  const strom = Buffer.from(innehall, "latin1");
  objekt[3] = `<< /Length ${strom.length} >>\nstream\n${innehall}endstream`;

  let pdf = "%PDF-1.4\n";
  const offsetar = [];
  objekt.forEach((kropp, i) => {
    offsetar.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${kropp}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objekt.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsetar) pdf += `${String(o).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objekt.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}
