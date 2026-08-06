// ALVA-SPEC-060 · Nederlands.
//
// Knoppen staan in de infinitief («Opslaan», «Annuleren»), zoals de
// Nederlandse interfaceconventie voorschrijft. Instructies binnen een
// zin richten zich niet tot de gebruiker — ALVA-SPEC-001 §7: het systeem
// meldt een toestand.
//
// `granskat: false`: de interface is vertaald, de proceduretekst is niet
// door een vakspecialist gecontroleerd. Zie index.mjs.

export const NL = {
  // ---- Bewijsgraden -------------------------------------------------------
  "evidens.E1": "Waarneming",
  "evidens.E2": "Foto",
  "evidens.E3": "Video met geluid",
  "evidens.E4": "Meting, gekalibreerd meetmiddel",
  "evidens.E5": "Document",
  "evidens.ej_kalibrerad": "kalibratie ontbreekt of is verlopen",
  "evidens.ej_angivet": "meetmiddel niet opgegeven",
  "evidens.ej_fotograferad": "ingevoerd, niet gefotografeerd",

  // ---- De afsluitcontrole -------------------------------------------------
  "grind.objekt": "Identificatie van voertuig of object geverifieerd",
  "grind.historik": "Voertuighistorie gecontroleerd of gemotiveerd",
  "grind.historik.nekad": "Een geweigerde historiecontrole vereist een opgegeven reden.",
  "grind.historik.saknas": "Geen historiecontrole gedocumenteerd.",
  "grind.matarstallning.ingaende": "Kilometerstand bij inname gefotografeerd",
  "grind.matarstallning.utgaende": "Kilometerstand bij aflevering gefotografeerd",
  "grind.matarstallning.saknas": "Geen kilometerstand gedocumenteerd.",
  "grind.matarstallning.ej_foto":
    "De kilometerstand is ingevoerd maar niet gefotografeerd. Kilometerteller fotograferen, of aangeven waarom dat niet mogelijk is.",
  "grind.reproducering": "Symptoomverificatie: gereproduceerd, of gedocumenteerd als niet reproduceerbaar",
  "grind.felorsak": "Analyse van de grondoorzaak gedocumenteerd",
  "grind.atgard": "Corrigerende maatregel gedocumenteerd of gemotiveerd",
  "grind.atgard.saknas": "Noch een uitgevoerde maatregel noch een reden voor het uitblijven ervan is gedocumenteerd.",
  "grind.kundbeslut": "Klantbeslissing over het voorstel vastgelegd",
  "grind.kundbeslut.avbojt": "Werk uitgevoerd ondanks een afgewezen voorstel",
  "grind.kundbeslut.avbojt.detalj":
    "De klant heeft het voorstel afgewezen, maar er is werk gedocumenteerd als uitgevoerd.",
  "grind.kvalitetskontroll": "Kwaliteitscontrole uitgevoerd — symptoom geverifieerd",
  "grind.kontroller": "Controlepunten van de methodiek: bewijs, of een gedocumenteerde uitzondering",
  "grind.foton": "Foto's aanwezig bij de controles die dat vereisen",
  "grind.slutsats": "Eindconclusie (ALVA-RULE-200)",
  "grind.hogvolt.behorighet": "Hoogspanningsbevoegdheid bevestigd",
  "grind.hogvolt.spanningslos": "Voertuig spanningsloos gemaakt volgens de procedure van de fabrikant",
  "grind.regelpaket": "Handtekening van het regelpakket komt niet overeen — afsluiten geblokkeerd.",
  "grind.regelpaket.osignerat": "Er wordt een extern regelpakket zonder handtekening gebruikt — afsluiten geblokkeerd.",
  "grind.evidens": "Bewijsgraad boven E0",
  "grind.evidens.saknas": "Er is geen enkel bewijs in het logboek aanwezig.",
  "grind.foton.detalj": "{kontroller} controles vereisen een foto, {foton} foto's in het logboek.",
  "grind.sparr.ej_uppfyllt": "Aan de veiligheidseis is niet voldaan.",
  "grind.arendetyp.okant": "Onbekende eis in het regelpakket: {krav}",
  "grind.arendetyp.krav": "Eis voor dit zaaktype: {krav}",


  // ---- De eindconclusie (ALVA-RULE-200) -----------------------------------
  "slutsats.rubrik": "Eindconclusie",
  "slutsats.konstaterat": "Wat is vastgesteld",
  "slutsats.evidens": "Welk bewijs dat draagt",
  "slutsats.avfardat": "Welke hypothesen zijn verworpen, en waarom",
  "slutsats.osakert": "Wat onzeker blijft",
  "slutsats.ickesvar": "Dat is geen conclusie. Aangeven wat is vastgesteld en welk bewijs dat draagt.",

  // ---- Zaakverloop --------------------------------------------------------
  "arende.nytt": "Nieuwe zaak",
  "arende.oppna": "Openstaande zaken",
  "arende.avslutade": "Afgesloten zaken",
  "arende.avsluta": "Zaak afsluiten",
  "arende.avslutat": "Zaak afgesloten",
  "arende.kan_ej_avslutas": "De zaak kan nog niet worden afgesloten",
  "arende.hinder": "Openstaand vóór afsluiting",
  "arende.overlamna": "Overdragen",
  "arende.ansvarig": "Verantwoordelijke",

  // ---- Vooronderzoek ------------------------------------------------------
  "pre.rubrik": "Vooronderzoek — voordat het werk begint",
  "pre.historik.fraga":
    "Is de voertuighistorie gecontroleerd? (eerdere werkzaamheden, terugkerende storingen, TSB's, campagnes)",
  "pre.historik.ja": "Ja — gecontroleerd",
  "pre.historik.nej": "Nee",
  "pre.historik.skal": "Reden waarom de historie niet is gecontroleerd (verplicht)",
  "pre.historik.relevant": "Relevante eerdere werkzaamheden (optioneel — oorzakelijke keten)",
  "pre.matarstallning": "Kilometerstand",
  "pre.fotografera": "Instrumentenpaneel fotograferen",
  "pre.felbeskrivning": "Storingsbeschrijving van de klant geverifieerd",
  "pre.observationer": "Nog iets bij de inname?",

  // ---- Handelingen --------------------------------------------------------
  "handling.spara": "Opslaan",
  "handling.avbryt": "Annuleren",
  "handling.fortsatt": "Doorgaan",
  "handling.tillbaka": "Terug",
  "handling.dokumentera": "Documenteren",
  "handling.fotografera": "Fotograferen",
  "handling.spela_in": "Video opnemen",
  "handling.undantag": "Een uitzondering documenteren",
  "handling.undantag.skal": "Reden voor de uitzondering (verplicht)",
  "handling.exportera": "Exporteren",
  "handling.skriv_ut": "Afdrukken",

  // ---- Meting -------------------------------------------------------------
  "matning.varde": "Waarde",
  "matning.enhet": "Eenheid",
  "matning.matdon": "Meetmiddel",
  "matning.matdon.valj": "Meetmiddel kiezen",
  "matning.matdon.okant": "Onbekend meetmiddel. Registreren voordat de meting wordt opgeslagen.",
  "matning.kalibrerad_till": "Gekalibreerd tot",

  // ---- Rapport ------------------------------------------------------------
  "rapport.rubrik": "Zaakrapport",
  "rapport.sammanfattning": "Samenvatting",
  "rapport.evidens": "Bewijs",
  "rapport.atgarder": "Maatregelen",
  "rapport.harledd":
    "Afgeleid uit het zaaklogboek. Waarnemingen en metingen worden weergegeven zonder conclusies waarvoor de onderbouwing ontbreekt.",

  // ---- Taal ---------------------------------------------------------------
  "sprak.valj": "Taal",
  "sprak.granskat": "Gecontroleerd",
  "sprak.ogranskat": "Niet gecontroleerd",
  "sprak.tackning": "{procent} % van de interface",

  "metodik.ogranskad":
    "De proceduretekst is niet gecontroleerd door een technisch specialist in het {sprak}. Stappen en controlepunten worden in het Engels weergegeven waar geen gecontroleerde vertaling bestaat — een ongecontroleerde vertaling van een veiligheidsinstructie is slechter dan een anderstalige, omdat die er niet anderstalig uitziet.",
  "metodik.pa_engelska": "Weergegeven in het Engels — geen gecontroleerde vertaling in het {sprak}",
};
