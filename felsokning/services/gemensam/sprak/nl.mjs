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
  "grind.sakerhet": "Betrouwbaarheidsniveau binnen wat het bewijs draagt",
  "grind.sakerhet.detalj": "De opgegeven betrouwbaarheid ({niva}) overstijgt wat het bewijs draagt ({tak}). Vul het bewijs aan, of verlaag het niveau — eerlijke onzekerheid is informatie.",


  // ---- De eindconclusie (ALVA-RULE-200) -----------------------------------
  "slutsats.rubrik": "Eindconclusie",
  "slutsats.konstaterat": "Wat is vastgesteld",
  "slutsats.evidens": "Welk bewijs dat draagt",
  "slutsats.avfardat": "Welke hypothesen zijn verworpen, en waarom",
  "slutsats.osakert": "Wat onzeker blijft",
  "slutsats.ickesvar": "Dat is geen conclusie. Aangeven wat is vastgesteld en welk bewijs dat draagt.",
  "slutsats.falt.motivering": "Onderbouwing",
  "slutsats.falt.motivering_ej": "Reden waarom de oorzaak niet kon worden vastgesteld",
  "slutsats.falt.uteslutet": "Verworpen alternatieven",
  "slutsats.falt.kvarstaende": "Resterende onzekerheid",
  "slutsats.falt.atgardsval": "Keuze van de maatregel",
  "slutsats.saknas": "{falt} ontbreekt.",
  "slutsats.ickesvar.falt": "{falt}: „{text}” is geen onderbouwing. Aangeven wat er werkelijk geldt, en waarom.",
  "slutsats.for_kort": "{falt} is te kort ({langd} van minstens {minsta} tekens) om achteraf toetsbaar te zijn.",
  "slutsats.utan_varfor": "{falt} geeft het wat aan, niet het waarom. Verbind de conclusie met het bewijs — wat daarin maakt dat dit volgt?",
  "slutsats.utan_slutsats": "De zaak kan niet worden afgesloten zonder eindconclusie. Aangeven waarom de conclusie uit het bewijs volgt.",
  "slutsats.hypotes_obemott": "De hypothese „{text}” staat in het logboek maar wordt niet behandeld. Aangeven waarom zij is verworpen, of waarom zij open blijft.",


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

  // ---- Publieke website (webb.) ------------------------------------------
  "webb.nav.oversikt": "Overzicht",
  "webb.ansok": "Account aanvragen",
  "webb.loggain": "Inloggen",
  "webb.fot.impressum": "Colofon",
  "webb.fot.dataskydd": "Privacybeleid",
  "webb.fot.villkor": "Voorwaarden",
  "webb.fot.tillganglighet": "Toegankelijkheid",
  "webb.fot.sprak": "Talen",
  "webb.fot.utgavor": "Release-informatie",

  "webb.hero.position": "Geleid diagnoseplatform",
  "webb.hero.definition": "Gestandaardiseerde diagnoseprocedures voor herhaalbaar en verifieerbaar storingzoeken.",

  "webb.metod.etikett": "Methodiek",
  "webb.metod.rubrik": "Het ALVA-model",
  "webb.metod.ingress":
    "ALVA is een gestandaardiseerde methode voor systematische analyse, lokalisatie, verificatie en actie. Elke beslissing is traceerbaar, elke conclusie verifieerbaar, elke actie reproduceerbaar.",
  "webb.fas.analysis.syfte": "Bewijs verzamelen.",
  "webb.fas.analysis.avgransning": "Alleen feiten. Hypothesen worden in deze fase niet verzameld.",
  "webb.fas.localization.syfte": "De storing insluiten.",
  "webb.fas.localization.avgransning": "Het gebied verkleinen. De oorzaak staat nog niet vast.",
  "webb.fas.verification.syfte": "De grondoorzaak bevestigen.",
  "webb.fas.verification.avgransning": "De oorzaak wordt geverifieerd — niet het symptoom.",
  "webb.fas.action.syfte": "De corrigerende actie uitvoeren.",
  "webb.fas.action.avgransning": "Resultaat geverifieerd en gedocumenteerd. Anders is de fase onvolledig.",

  "webb.drift.etikett": "Werking",
  "webb.drift.rubrik": "Zo werkt het",
  "webb.drift.s1.rubrik": "Organisatie aanmaken",
  "webb.drift.s1.text": "De registratie wordt ingediend en beoordeeld.",
  "webb.drift.s2.rubrik": "Gebruikers krijgen accounts",
  "webb.drift.s2.text": "Rollen worden toegekend door de beheerder van de organisatie.",
  "webb.drift.s3.rubrik": "Geleide diagnoseprocedures",
  "webb.drift.s3.text": "Elke zaak volgt een gedefinieerde procedure.",
  "webb.drift.s4.rubrik": "Verificatie",
  "webb.drift.s4.text": "De grondoorzaak wordt bevestigd vóór de corrigerende actie.",
  "webb.drift.s5.rubrik": "Documentatie",
  "webb.drift.s5.text": "Het rapport wordt gegenereerd uit het zaaklogboek.",
  "webb.drift.s6.rubrik": "Continue verbetering",
  "webb.drift.s6.text": "Geverifieerde uitkomsten verfijnen volgende procedures.",

  "webb.larande.etikett": "Vermogen",
  "webb.larande.rubrik": "Lerende organisatie",
  "webb.larande.p1":
    "Het platform verfijnt diagnoseprocedures voortdurend met geverifieerde praktijkervaring uit de eigen organisatie.",
  "webb.larande.p2":
    "Elke afgeronde diagnose voedt de volgende begeleiding. Alleen geverifieerde uitkomsten worden gebruikt — een zaak die zonder bevestigde grondoorzaak is gesloten draagt bewust niets bij.",
  "webb.larande.p3":
    "De kennisbank is van de organisatie. Ze wordt afgeleid uit uw zaken, uw procedures en uw documentatie, en wordt niet over klanten heen samengevoegd.",
  "webb.larande.block": "Afgeleid uit",
  "webb.larande.k1": "Geverifieerde grondoorzaken",
  "webb.larande.k2": "Bevestigde corrigerende acties",
  "webb.larande.k3": "Terugkerende storingscategorieën",
  "webb.larande.k4": "Afgeronde procedures",
  "webb.larande.k5": "Documentatie van de organisatie",

  "webb.rapport.etikett": "Rapportage",
  "webb.rapport.rubrik": "Kwartaalrapport verbetering",
  "webb.rapport.ingress":
    "Eén keer per kwartaal beantwoordt het platform zes vragen over het eigen werk van de werkplaats. Elk antwoord wordt afgeleid uit het zaaklogboek — niets wordt geschat, en niemand wordt iets gevraagd.",
  "webb.rapport.f1": "Welke storingen stellen we nu in één keer goed vast?",
  "webb.rapport.f2": "Hoe vaak blijkt een vermoede oorzaak de werkelijke te zijn?",
  "webb.rapport.f3": "Welke storingen blijven in het wagenpark terugkomen?",
  "webb.rapport.f4": "Welke procedurestappen worden overgeslagen, en waarom?",
  "webb.rapport.f5": "Wat weet de werkplaats nu dat ze vorig kwartaal niet wist?",
  "webb.rapport.f6": "Worden zaken afgerond, geverifieerd en gedocumenteerd — of alleen afgerond?",

  "webb.pris.etikett": "Commercieel",
  "webb.pris.rubrik": "Licenties",
  "webb.pris.komponent": "Onderdeel",
  "webb.pris.grund": "Grondslag",
  "webb.pris.plattform": "Platformlicentie",
  "webb.pris.plattform.grund": "Per organisatie, jaarlijks",
  "webb.pris.anvandare": "Gebruikerslicenties",
  "webb.pris.anvandare.grund": "Per actieve gebruiker, maandelijks",
  "webb.pris.moduler": "Bedrijfsmodules",
  "webb.pris.moduler.grund": "Optioneel, per module",
  "webb.pris.betalning": "Geen onlinebetaling. Geen abonnementsregistratie. Facturering volgt op beoordeling van de aanvraag.",
  "webb.pris.aktivering": "Activeringsvolgorde",
  "webb.pris.a1": "De organisatie dient de registratie in.",
  "webb.pris.a2": "De aanvraag wordt beoordeeld.",
  "webb.pris.a3": "De factuur wordt opgesteld.",
  "webb.pris.a4": "De betaling wordt geregistreerd.",
  "webb.pris.a5": "De organisatie wordt geactiveerd.",
  "webb.pris.a6": "Extra gebruikers worden maandelijks gefactureerd.",

  "webb.kallor.etikett": "Infrastructuur",
  "webb.kallor.rubrik": "Operationele kennisinfrastructuur",
  "webb.kallor.p1":
    "ALVA gebruikt de eigen geautoriseerde kennisbronnen van de organisatie. De architectuur is leveranciersneutraal: elke bron implementeert dezelfde interface, en geen leverancier wordt verondersteld.",
  "webb.kallor.p2":
    "Een bèta-installatie werkt uitsluitend met interne documentatie. Externe leveranciers worden later via aparte koppelingen ingeschakeld, zonder wijziging aan de platformkern.",
  "webb.kallor.block": "Volgorde van bronraadpleging",
  "webb.kallor.k1": "Interne bedrijfsprocedures",
  "webb.kallor.k2": "OEM-documentatie",
  "webb.kallor.k3": "Technische bulletins",
  "webb.kallor.k4": "Garantie-informatie",
  "webb.kallor.k5": "Werkplaatshandboeken",
  "webb.kallor.k6": "Historische geverifieerde diagnoses",
  "webb.kallor.k7": "Beste praktijken van de organisatie",

  "webb.login.etikett": "Toegang",
  "webb.login.demo":
    "Deze aanmelding authenticeert niets. Typ wat dan ook in E-mail en Wachtwoord en druk op Aanmelden — er is geen account nodig, en het portaal erachter toont vaste voorbeeldgegevens. Verbonden met een platforminstantie authenticeert deze pagina zich daartegen, en zonder geldige sessie is het portaal gesloten.",
  "webb.login.losenord": "Wachtwoord",
  "webb.login.ofullstandigt": "Authenticatie onvolledig. E-mail en wachtwoord vereist.",
  "webb.login.misslyckades": "Authenticatie mislukt.",
  "webb.login.logga_in": "Aanmelden",
  "webb.login.loggar_in": "Bezig met aanmelden",
  "webb.login.glomt": "Wachtwoord vergeten",

  "webb.ansokan.etikett": "Registratie",
  "webb.ansokan.demo":
    "Er wordt niets verzonden. Dit formulier indienen slaat niets op, meldt niemand iets en maakt geen aanvraag aan — er zit nog geen ontvangst achter. De beschrijving hieronder zegt hoe de registratie bedoeld is te werken, niet wat er vandaag gebeurt.",
  "webb.ansokan.avsikt": "Beoogde werking: aanvragen worden handmatig beoordeeld en in dit stadium wordt geen betaling geïnd.",
  "webb.falt.foretag": "Bedrijf",
  "webb.falt.orgnummer": "Registratienummer",
  "webb.falt.kontakt": "Contactpersoon",
  "webb.falt.epost": "E-mail",
  "webb.falt.telefon": "Telefoon",
  "webb.falt.tekniker": "Aantal technici",
  "webb.falt.bransch": "Branche",
  "webb.falt.land": "Land",
  "webb.falt.anvandare": "Verwacht aantal gebruikers",
  "webb.falt.noteringar": "Opmerkingen",
  "webb.falt.kravs": "(verplicht)",
  "webb.ansokan.skicka": "Aanvraag indienen",
  "webb.ansokan.mottagen.etikett": "Aanvraag",
  "webb.ansokan.mottagen": "Ingediend",
  "webb.ansokan.mottagen.demo":
    "Er is niets verzonden en niemand is op de hoogte gebracht. De referentie hieronder is in uw browser berekend uit wat u typte en bestaat nergens anders — ze is weg zodra u deze pagina sluit.",
  "webb.ansokan.status": "Status",
  "webb.ansokan.referens": "Referentie",
  "webb.ansokan.granskning":
    "Aanvragen worden handmatig beoordeeld. Bij goedkeuring wordt een factuur opgesteld. De organisatie wordt geactiveerd zodra de betaling is geregistreerd.",

  "webb.sprak.etikett": "Lokalisatie",
  "webb.sprak.rubrik": "Talen",
  "webb.sprak.ingress":
    "Engels is de standaard en de brontaal. Negen vertalingen volgen. Wat het platform niet doet, is beweren dat een vertaalde interface een vertaalde methode betekent.",
  "webb.sprak.princip.etikett": "Principe",
  "webb.sprak.princip.rubrik": "Twee soorten tekst",
  "webb.sprak.granssnitt.rubrik": "Interfacetekst",
  "webb.sprak.granssnitt.beteckning": "Valt stil terug",
  "webb.sprak.granssnitt.text":
    "Labels, knoppen, statussen. Eindig, zelden gewijzigd. Een Engelse tekst die een Duitse gebruiker bereikt is een ergernis, geen gevaar — een ontbrekende vertaling valt dus zonder commentaar terug op het Engels.",
  "webb.sprak.metodik.rubrik": "Proceduretekst",
  "webb.sprak.metodik.beteckning": "Valt nooit stil terug",
  "webb.sprak.metodik.text":
    "Instructies voor werk aan een voertuig. Hier is een ongecontroleerde vertaling erger dan een anderstalige — want Engels ziet er vreemd uit, terwijl een slechte vertaling eruitziet als een instructie. Ze wordt in het Engels getoond en gemarkeerd, met de taal benoemd.",
  "webb.sprak.invariant":
    "De methode zelf wordt nooit vertaald. Fasenamen en statuswoorden zijn de structuur van ALVA en lezen in elk land hetzelfde, zodat een auditor een Roemeens en een Duits dossier kan lezen zonder te weten in welke taal de werkplaats werkt.",
  "webb.sprak.tackning.etikett": "Dekking",
  "webb.sprak.tackning.rubrik": "Wat vertaald is, en wat gecontroleerd is",
  "webb.sprak.kolumn.sprak": "Taal",
  "webb.sprak.kolumn.granssnitt": "Interface",
  "webb.sprak.kolumn.granskat": "Methode gecontroleerd door een specialist",
  "webb.sprak.granskat.ja": "Ja",
  "webb.sprak.granskat.nej": "Nee — proceduretekst in het Engels",
  "webb.sprak.matt":
    "De dekking van de interface wordt gemeten, niet geschat: een test laat de build falen als een sleutel in een taal ontbreekt. De controlestatus is een uitspraak over mensen, niet over bestanden, en wordt met de hand gezet.",
  "webb.sprak.kallsprak":
    "De Engelse proceduretekst is een vertaling van de Zweedse bron en is nog niet gelezen door een specialist die het vak uitoefent. Hij wordt aan dezelfde maatstaf gehouden als de andere negen talen, en hier wordt over hem dezelfde uitspraak gedaan in plaats van hem stilletjes uit te zonderen omdat hij de bron is.",
  "webb.sprak.bevis.etikett": "Verificatie",
  "webb.sprak.bevis.rubrik": "De zinnen die een zaak stoppen",
  "webb.sprak.bevis.ingress":
    "Dit zijn de zinnen die een technicus weigeren een zaak te sluiten. Een weigering die niemand begrijpt is een weigering zonder uitweg — dus zijn dit de juiste zinnen om een vertaling op te beoordelen.",
  "webb.sprak.ej_granskad": "Niet gecontroleerd",
  "webb.sprak.granskad": "Gecontroleerd",
  "webb.sprak.granskad.text":
    "De proceduretekst in het {sprak} is gelezen door een specialist die het vak uitoefent. Stappen en controlepunten worden overal in het {sprak} getoond.",
  "webb.sprak.val.etikett": "Werking",
  "webb.sprak.val.rubrik": "Hoe de taal wordt gekozen",
  "webb.sprak.val.s1.rubrik": "Voorkeur van de gebruiker",
  "webb.sprak.val.s1.text": "Wat de persoon zelf heeft geselecteerd.",
  "webb.sprak.val.s2.rubrik": "Instelling van de organisatie",
  "webb.sprak.val.s2.text": "De documentatietaal van de werkplaats.",
  "webb.sprak.val.s3.rubrik": "Browsertaal",
  "webb.sprak.val.s3.text": "De eerste taal die het platform herkent.",
  "webb.sprak.val.s4.rubrik": "Engels",
  "webb.sprak.val.s4.text": "De standaard, en de bron.",
  "webb.sprak.val.notering":
    "De organisatie gaat bewust vóór de browser. Een werkplaats in Duitsland met een Poolse technicus heeft één documentatietaal nodig — het dossier mag niet van taal wisselen afhankelijk van wie de regel toevallig schreef.",
};
