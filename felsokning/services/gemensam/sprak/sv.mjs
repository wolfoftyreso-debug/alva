// ALVA-SPEC-060 · Svenska.
//
// Hemmamarknadens språk och det enda utöver engelska där metodik-
// innehållet är läst av någon som kan yrket. Därför `granskat: true` i
// SPRAK — inte för att svenskan är bättre skriven än tyskan här, utan
// för att den är kontrollerad av en fackman och tyskan inte är det.
//
// Fas- och statusord saknas medvetet. De är ALVA:s struktur och skrivs
// likadant på varje språk (ALVA-SPEC-001 §2). Se index.mjs.

export const SV = {
  // ---- Evidensgrader ------------------------------------------------------
  "evidens.E1": "Observation",
  "evidens.E2": "Fotografi",
  "evidens.E3": "Video med ljud",
  "evidens.E4": "Mätning, kalibrerat mätdon",
  "evidens.E5": "Dokument",
  "evidens.ej_kalibrerad": "kalibrering saknas eller har gått ut",
  "evidens.ej_angivet": "mätdon ej angivet",
  "evidens.ej_fotograferad": "inmatad, ej fotograferad",

  // ---- Kvalitetsgrinden ---------------------------------------------------
  "grind.objekt": "Fordonets eller objektets identitet verifierad",
  "grind.historik": "Fordonets historik kontrollerad eller motiverad",
  "grind.historik.nekad": "En nekad historikkontroll kräver ett angivet skäl.",
  "grind.historik.saknas": "Ingen historikkontroll dokumenterad.",
  "grind.matarstallning.ingaende": "Ingående mätarställning fotograferad",
  "grind.matarstallning.utgaende": "Utgående mätarställning fotograferad",
  "grind.matarstallning.saknas": "Ingen mätarställning dokumenterad.",
  "grind.matarstallning.ej_foto":
    "Mätarställningen är inmatad men inte fotograferad. Fotografera mätaren, eller ange varför det inte är möjligt.",
  "grind.reproducering": "Symtomverifiering: reproducerat, eller dokumenterat som ej reproducerbart",
  "grind.felorsak": "Felorsaksanalys dokumenterad",
  "grind.atgard": "Åtgärd dokumenterad eller motiverad",
  "grind.atgard.saknas": "Varken utförd åtgärd eller skäl till att den uteblivit är dokumenterat.",
  "grind.kundbeslut": "Kundens beslut om förslaget registrerat",
  "grind.kundbeslut.avbojt": "Arbete utfört trots avböjt förslag",
  "grind.kundbeslut.avbojt.detalj": "Kunden avböjde förslaget, men arbete är dokumenterat som utfört.",
  "grind.kvalitetskontroll": "Kvalitetskontroll utförd — symtomet verifierat",
  "grind.kontroller": "Metodikens kontrollpunkter: evidens, eller dokumenterat undantag",
  "grind.foton": "Foton finns för de kontroller som kräver det",
  "grind.slutsats": "Slutsats (ALVA-RULE-200)",
  "grind.hogvolt.behorighet": "Högvoltsbehörighet bekräftad",
  "grind.hogvolt.spanningslos": "Fordonet spänningslöst enligt tillverkarens metod",
  "grind.regelpaket": "Regelpaketets signatur stämmer inte — avslut spärrat.",
  "grind.regelpaket.osignerat": "Ett externt regelpaket används utan signatur — avslut spärrat.",
  "grind.evidens": "Evidensnivå över E0",
  "grind.evidens.saknas": "Ingen evidens av något slag finns i loggen.",
  "grind.foton.detalj": "{kontroller} kontroller kräver foto, {foton} foton i loggen.",
  "grind.sparr.ej_uppfyllt": "Säkerhetskravet är inte uppfyllt.",
  "grind.arendetyp.okant": "Okänt krav i regelpaketet: {krav}",
  "grind.arendetyp.krav": "Krav för ärendetypen: {krav}",


  // ---- Slutsatsen (ALVA-RULE-200) -----------------------------------------
  "slutsats.rubrik": "Slutsats",
  "slutsats.konstaterat": "Vad som är konstaterat",
  "slutsats.evidens": "Vilken evidens som bär det",
  "slutsats.avfardat": "Vilka hypoteser som avfärdats, och varför",
  "slutsats.osakert": "Vad som fortfarande är osäkert",
  "slutsats.ickesvar": "Det är inte ett svar. Ange vad som är konstaterat och vilken evidens som bär det.",
  "slutsats.falt.motivering": "Motivering",
  "slutsats.falt.motivering_ej": "Skäl till att orsaken inte fastställts",
  "slutsats.falt.uteslutet": "Uteslutna alternativ",
  "slutsats.falt.kvarstaende": "Kvarstående osäkerhet",
  "slutsats.falt.atgardsval": "Val av åtgärd",
  "slutsats.saknas": "{falt} saknas.",
  "slutsats.ickesvar.falt": "{falt}: ”{text}” är inget skäl. Beskriv vad som faktiskt gäller och varför.",
  "slutsats.for_kort": "{falt} är för kort ({langd} av minst {minsta} tecken) för att gå att granska i efterhand.",
  "slutsats.utan_varfor": "{falt} anger vad, men inte varför. Knyt slutsatsen till underlaget — vad i evidensen gör att det här följer?",
  "slutsats.utan_slutsats": "Ärendet kan inte avslutas utan en slutsats. Motivera varför slutsatsen följer av underlaget.",
  "slutsats.hypotes_obemott": "Hypotesen ”{text}” finns i loggen men bemöts inte. Ange varför den uteslöts, eller varför den kvarstår.",


  // ---- Ärendeflödet -------------------------------------------------------
  "arende.nytt": "Nytt ärende",
  "arende.oppna": "Öppna ärenden",
  "arende.avslutade": "Avslutade ärenden",
  "arende.avsluta": "Avsluta ärendet",
  "arende.avslutat": "Ärendet avslutat",
  "arende.kan_ej_avslutas": "Ärendet kan inte avslutas än",
  "arende.hinder": "Kvarstår före avslut",
  "arende.overlamna": "Lämna över",
  "arende.ansvarig": "Ansvarig",

  // ---- Förkontroll --------------------------------------------------------
  "pre.rubrik": "Förkontroll — innan arbetet börjar",
  "pre.historik.fraga": "Är fordonets historik kontrollerad? (tidigare arbeten, återkommande fel, TSB:er, kampanjer)",
  "pre.historik.ja": "Ja — kontrollerad",
  "pre.historik.nej": "Nej",
  "pre.historik.skal": "Skäl till att historiken inte kontrollerats (obligatoriskt)",
  "pre.historik.relevant": "Relevanta tidigare arbeten (valfritt — orsakskedja)",
  "pre.matarstallning": "Mätarställning",
  "pre.fotografera": "Fotografera instrumentpanelen",
  "pre.felbeskrivning": "Kundens felbeskrivning verifierad",
  "pre.observationer": "Något annat vid mottagandet?",

  // ---- Handlingar ---------------------------------------------------------
  "handling.spara": "Spara",
  "handling.avbryt": "Avbryt",
  "handling.fortsatt": "Fortsätt",
  "handling.tillbaka": "Tillbaka",
  "handling.dokumentera": "Dokumentera",
  "handling.fotografera": "Fotografera",
  "handling.spela_in": "Spela in video",
  "handling.undantag": "Dokumentera ett undantag",
  "handling.undantag.skal": "Skäl till undantaget (obligatoriskt)",
  "handling.exportera": "Exportera",
  "handling.skriv_ut": "Skriv ut",

  // ---- Mätning ------------------------------------------------------------
  "matning.varde": "Värde",
  "matning.enhet": "Enhet",
  "matning.matdon": "Mätdon",
  "matning.matdon.valj": "Välj mätdon",
  "matning.matdon.okant": "Okänt mätdon. Registrera det innan mätningen sparas.",
  "matning.kalibrerad_till": "Kalibrerad till",

  // ---- Rapport ------------------------------------------------------------
  "rapport.rubrik": "Ärenderapport",
  "rapport.sammanfattning": "Sammanfattning",
  "rapport.evidens": "Evidens",
  "rapport.atgarder": "Åtgärder",
  "rapport.harledd":
    "Härledd ur ärendeloggen. Observationer och mätningar redovisas utan slutsatser som saknar stöd.",

  // ---- Språk --------------------------------------------------------------
  "sprak.valj": "Språk",
  "sprak.granskat": "Granskat",
  "sprak.ogranskat": "Ej granskat",
  "sprak.tackning": "{procent} % av gränssnittet",

  "metodik.ogranskad":
    "Metodiktexten är inte granskad av en fackman på {sprak}. Steg och kontrollpunkter visas på engelska där ingen granskad översättning finns — en ogranskad översättning av en säkerhetsinstruktion är sämre än en på främmande språk, därför att den inte ser främmande ut.",
  "metodik.pa_engelska": "Visas på engelska — ingen granskad översättning på {sprak}",
};
