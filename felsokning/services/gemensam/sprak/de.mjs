// ALVA-SPEC-060 · Deutsch.
//
// Anweisungen stehen im Infinitiv, nicht in der Anrede: "Kilometerzähler
// fotografieren", nicht "Fotografieren Sie den Kilometerzähler". Das ist
// der Registerton technischer Anweisungen im deutschen Sprachraum und
// entspricht ALVA-SPEC-001 §7 — das System meldet einen Zustand, es
// wendet sich nicht an den Benutzer.
//
// `granskat: false`: die Oberfläche ist übersetzt, der Verfahrenstext
// ist nicht von einer Fachkraft geprüft. Siehe index.mjs.

export const DE = {
  // ---- Evidenzgrade -------------------------------------------------------
  "evidens.E1": "Beobachtung",
  "evidens.E2": "Fotografie",
  "evidens.E3": "Video mit Ton",
  "evidens.E4": "Messung, kalibriertes Messmittel",
  "evidens.E5": "Dokument",
  "evidens.ej_kalibrerad": "Kalibrierung fehlt oder ist abgelaufen",
  "evidens.ej_angivet": "Messmittel nicht angegeben",
  "evidens.ej_fotograferad": "eingetragen, nicht fotografiert",

  // ---- Qualitätsschranke --------------------------------------------------
  "grind.objekt": "Identität des Fahrzeugs oder Objekts verifiziert",
  "grind.historik": "Fahrzeughistorie geprüft, oder das Unterlassen begründet",
  "grind.historik.nekad": "Eine abgelehnte Historienprüfung erfordert eine Begründung.",
  "grind.historik.saknas": "Keine Historienprüfung dokumentiert.",
  "grind.matarstallning.ingaende": "Kilometerstand bei Annahme fotografiert",
  "grind.matarstallning.utgaende": "Kilometerstand bei Rückgabe fotografiert",
  "grind.matarstallning.saknas": "Kein Kilometerstand dokumentiert.",
  "grind.matarstallning.ej_foto":
    "Der Kilometerstand ist eingetragen, aber nicht fotografiert. Kilometerzähler fotografieren, oder angeben, warum dies nicht möglich ist.",
  "grind.reproducering": "Symptomverifizierung: reproduziert oder als nicht reproduzierbar dokumentiert",
  "grind.felorsak": "Grundursachenanalyse dokumentiert",
  "grind.atgard": "Korrekturmaßnahme dokumentiert, oder ihr Ausbleiben begründet",
  "grind.atgard.saknas": "Weder eine durchgeführte Maßnahme noch ein Grund für deren Ausbleiben ist dokumentiert.",
  "grind.kundbeslut": "Kundenentscheidung zum Vorschlag erfasst",
  "grind.kundbeslut.avbojt": "Arbeit trotz abgelehntem Vorschlag durchgeführt",
  "grind.kundbeslut.avbojt.detalj":
    "Der Kunde hat den Vorschlag abgelehnt, es ist jedoch durchgeführte Arbeit dokumentiert.",
  "grind.kvalitetskontroll": "Qualitätsprüfung durchgeführt — Symptom nachweislich behoben",
  "grind.kontroller": "Prüfpunkte der Methodik: Evidenz oder dokumentierte Ausnahme",
  "grind.foton": "Fotos für die Prüfpunkte vorhanden, die sie erfordern",
  "grind.slutsats": "Abschlussfeststellung (ALVA-RULE-200)",
  "grind.hogvolt.behorighet": "Hochvolt-Qualifikation bestätigt",
  "grind.hogvolt.spanningslos": "Fahrzeug nach Herstellerverfahren spannungsfrei geschaltet",
  "grind.regelpaket": "Signatur des Regelpakets stimmt nicht — Abschluss gesperrt.",
  "grind.regelpaket.osignerat": "Ein externes Regelpaket wird ohne Signatur verwendet — Abschluss gesperrt.",
  "grind.evidens": "Evidenzgrad über E0",
  "grind.evidens.saknas": "Es liegt keinerlei Evidenz im Protokoll vor.",
  "grind.foton.detalj": "{kontroller} Prüfpunkte erfordern ein Foto, {foton} Fotos im Protokoll.",
  "grind.sparr.ej_uppfyllt": "Die Sicherheitsanforderung ist nicht erfüllt.",
  "grind.arendetyp.okant": "Unbekannte Anforderung im Regelpaket: {krav}",
  "grind.arendetyp.krav": "Anforderung für diese Vorgangsart: {krav}",
  "grind.sakerhet": "Konfidenzniveau innerhalb dessen, was die Evidenz trägt",
  "grind.sakerhet.detalj": "Die angegebene Konfidenz ({niva}) übersteigt, was die Evidenz trägt ({tak}). Evidenz ergänzen oder das Niveau senken — ehrliche Unsicherheit ist Information.",


  // ---- Abschlussfeststellung (ALVA-RULE-200) ------------------------------
  "slutsats.rubrik": "Abschlussfeststellung",
  "slutsats.konstaterat": "Was festgestellt wurde",
  "slutsats.evidens": "Welche Evidenz dies trägt",
  "slutsats.avfardat": "Welche Hypothesen verworfen wurden, und warum",
  "slutsats.osakert": "Was unsicher bleibt",
  "slutsats.ickesvar":
    "Das ist keine Antwort. Angeben, was festgestellt wurde und welche Evidenz dies trägt.",
  "slutsats.falt.motivering": "Begründung",
  "slutsats.falt.motivering_ej": "Grund, warum die Ursache nicht festgestellt werden konnte",
  "slutsats.falt.uteslutet": "Verworfene Alternativen",
  "slutsats.falt.kvarstaende": "Verbleibende Unsicherheit",
  "slutsats.falt.atgardsval": "Wahl der Maßnahme",
  "slutsats.saknas": "{falt} fehlt.",
  "slutsats.ickesvar.falt": "{falt}: „{text}“ ist keine Begründung. Angeben, was tatsächlich gilt, und warum.",
  "slutsats.for_kort": "{falt} ist zu kurz ({langd} von mindestens {minsta} Zeichen), um im Nachhinein prüfbar zu sein.",
  "slutsats.utan_varfor": "{falt} nennt das Was, nicht das Warum. Die Feststellung an die Evidenz binden — was darin begründet diese Folgerung?",
  "slutsats.utan_slutsats": "Der Vorgang kann ohne Abschlussfeststellung nicht abgeschlossen werden. Angeben, warum die Feststellung aus der Evidenz folgt.",
  "slutsats.hypotes_obemott": "Die Hypothese „{text}“ steht im Protokoll, wird aber nicht behandelt. Angeben, warum sie verworfen wurde oder warum sie offen bleibt.",


  // ---- Vorgangsablauf -----------------------------------------------------
  "arende.nytt": "Neuer Vorgang",
  "arende.oppna": "Offene Vorgänge",
  "arende.avslutade": "Abgeschlossene Vorgänge",
  "arende.avsluta": "Vorgang abschließen",
  "arende.avslutat": "Vorgang abgeschlossen",
  "arende.kan_ej_avslutas": "Der Vorgang kann noch nicht abgeschlossen werden",
  "arende.hinder": "Vor dem Abschluss offen",
  "arende.overlamna": "Übergeben",
  "arende.ansvarig": "Verantwortlich",

  // ---- Vorprüfung ---------------------------------------------------------
  "pre.rubrik": "Vorprüfung — vor Arbeitsbeginn",
  "pre.historik.fraga":
    "Ist die Fahrzeughistorie geprüft? (frühere Arbeiten, wiederkehrende Fehler, TSB, Rückruf- und Serviceaktionen)",
  "pre.historik.ja": "Ja — geprüft",
  "pre.historik.nej": "Nein",
  "pre.historik.skal": "Grund, warum die Historie nicht geprüft wurde (erforderlich)",
  "pre.historik.relevant": "Relevante frühere Arbeiten (optional — Ursachenkette)",
  "pre.matarstallning": "Kilometerstand",
  "pre.fotografera": "Kombiinstrument fotografieren",
  "pre.felbeskrivning": "Fehlerbeschreibung des Kunden verifiziert",
  "pre.observationer": "Sonstiges bei der Annahme?",

  // ---- Handlungen ---------------------------------------------------------
  "handling.spara": "Speichern",
  "handling.avbryt": "Abbrechen",
  "handling.fortsatt": "Weiter",
  "handling.tillbaka": "Zurück",
  "handling.dokumentera": "Dokumentieren",
  "handling.fotografera": "Fotografieren",
  "handling.spela_in": "Video aufnehmen",
  "handling.undantag": "Ausnahme dokumentieren",
  "handling.undantag.skal": "Begründung der Ausnahme (erforderlich)",
  "handling.exportera": "Exportieren",
  "handling.skriv_ut": "Drucken",

  // ---- Messung ------------------------------------------------------------
  "matning.varde": "Wert",
  "matning.enhet": "Einheit",
  "matning.matdon": "Messmittel",
  "matning.matdon.valj": "Messmittel wählen",
  "matning.matdon.okant": "Unbekanntes Messmittel. Das Messmittel vor dem Speichern der Messung registrieren.",
  "matning.kalibrerad_till": "Kalibriert bis",

  // ---- Bericht ------------------------------------------------------------
  "rapport.rubrik": "Vorgangsbericht",
  "rapport.sammanfattning": "Zusammenfassung",
  "rapport.evidens": "Evidenz",
  "rapport.atgarder": "Maßnahmen",
  "rapport.harledd":
    "Aus dem Vorgangsprotokoll abgeleitet. Beobachtungen und Messungen werden ohne Schlussfolgerungen wiedergegeben, denen die Grundlage fehlt.",

  // ---- Sprache ------------------------------------------------------------
  "sprak.valj": "Sprache",
  "sprak.granskat": "Geprüft",
  "sprak.ogranskat": "Nicht geprüft",
  "sprak.tackning": "{procent} % der Oberfläche",

  "metodik.ogranskad":
    "Der Verfahrenstext wurde nicht von einer Fachkraft auf {sprak} geprüft. Schritte und Prüfpunkte werden auf Englisch angezeigt, wo keine geprüfte Übersetzung vorliegt — eine ungeprüfte Übersetzung einer Sicherheitsanweisung ist schlechter als eine fremdsprachige, weil sie nicht fremd aussieht.",
  "metodik.pa_engelska": "Auf Englisch angezeigt — keine geprüfte Übersetzung auf {sprak}",

  // ---- Öffentliche Website (webb.) ---------------------------------------
  "webb.nav.oversikt": "Überblick",
  "webb.ansok": "Konto beantragen",
  "webb.loggain": "Anmeldung",
  "webb.fot.impressum": "Impressum",
  "webb.fot.dataskydd": "Datenschutz",
  "webb.fot.villkor": "Nutzungsbedingungen",
  "webb.fot.tillganglighet": "Barrierefreiheit",
  "webb.fot.sprak": "Sprachen",
  "webb.fot.utgavor": "Versionshinweise",

  "webb.hero.position": "Geführte Diagnoseplattform",
  "webb.hero.definition": "Standardisierte Diagnoseprozeduren für wiederholbare und verifizierbare Fehlersuche.",

  "webb.metod.etikett": "Methodik",
  "webb.metod.rubrik": "Das ALVA-Modell",
  "webb.metod.ingress":
    "ALVA ist eine standardisierte Methode für systematische Analyse, Lokalisierung, Verifikation und Maßnahme. Jede Entscheidung ist nachvollziehbar, jede Schlussfolgerung verifizierbar, jede Maßnahme reproduzierbar.",
  "webb.fas.analysis.syfte": "Evidenz sammeln.",
  "webb.fas.analysis.avgransning": "Nur Fakten. Hypothesen werden in dieser Phase nicht erfasst.",
  "webb.fas.localization.syfte": "Den Fehler isolieren.",
  "webb.fas.localization.avgransning": "Den Bereich eingrenzen. Die Ursache ist noch nicht festgestellt.",
  "webb.fas.verification.syfte": "Grundursache bestätigen.",
  "webb.fas.verification.avgransning": "Verifiziert wird die Ursache — nicht das Symptom.",
  "webb.fas.action.syfte": "Korrekturmaßnahme durchführen.",
  "webb.fas.action.avgransning": "Ergebnis verifiziert und dokumentiert. Andernfalls ist die Phase unvollständig.",

  "webb.drift.etikett": "Betrieb",
  "webb.drift.rubrik": "So funktioniert es",
  "webb.drift.s1.rubrik": "Organisation anlegen",
  "webb.drift.s1.text": "Die Registrierung wird eingereicht und geprüft.",
  "webb.drift.s2.rubrik": "Benutzer erhalten Konten",
  "webb.drift.s2.text": "Rollen werden vom Administrator der Organisation vergeben.",
  "webb.drift.s3.rubrik": "Geführte Diagnoseprozeduren",
  "webb.drift.s3.text": "Jeder Vorgang folgt einer definierten Prozedur.",
  "webb.drift.s4.rubrik": "Verifikation",
  "webb.drift.s4.text": "Die Grundursache wird vor der Korrekturmaßnahme bestätigt.",
  "webb.drift.s5.rubrik": "Dokumentation",
  "webb.drift.s5.text": "Der Bericht wird aus dem Vorgangsprotokoll erzeugt.",
  "webb.drift.s6.rubrik": "Kontinuierliche Verbesserung",
  "webb.drift.s6.text": "Verifizierte Ergebnisse verfeinern nachfolgende Prozeduren.",

  "webb.larande.etikett": "Fähigkeit",
  "webb.larande.rubrik": "Lernende Organisation",
  "webb.larande.p1":
    "Die Plattform verfeinert Diagnoseprozeduren fortlaufend mit verifizierter Betriebserfahrung aus der eigenen Organisation.",
  "webb.larande.p2":
    "Jede abgeschlossene Diagnose fließt in die nachfolgende Anleitung ein. Nur verifizierte Ergebnisse werden verwendet — ein Vorgang, der ohne bestätigte Grundursache geschlossen wurde, trägt bewusst nichts bei.",
  "webb.larande.p3":
    "Die Wissensbasis gehört der Organisation. Sie wird aus Ihren Vorgängen, Ihren Prozeduren und Ihrer Dokumentation abgeleitet und nicht über Kunden hinweg zusammengeführt.",
  "webb.larande.block": "Abgeleitet aus",
  "webb.larande.k1": "Verifizierte Grundursachen",
  "webb.larande.k2": "Bestätigte Korrekturmaßnahmen",
  "webb.larande.k3": "Wiederkehrende Fehlerkategorien",
  "webb.larande.k4": "Nachweise abgeschlossener Prozeduren",
  "webb.larande.k5": "Dokumentation der Organisation",

  "webb.rapport.etikett": "Berichtswesen",
  "webb.rapport.rubrik": "Vierteljährlicher Verbesserungsbericht",
  "webb.rapport.ingress":
    "Einmal im Quartal beantwortet die Plattform sechs Fragen zur eigenen Arbeit des Betriebs. Jede Antwort wird aus dem Vorgangsprotokoll abgeleitet — nichts wird geschätzt, und niemand wird befragt.",
  "webb.rapport.f1": "Welche Fehler diagnostizieren wir jetzt beim ersten Mal richtig?",
  "webb.rapport.f2": "Wie oft erweist sich eine vermutete Ursache als die tatsächliche?",
  "webb.rapport.f3": "Welche Fehler kehren in der Flotte immer wieder?",
  "webb.rapport.f4": "Welche Prozedurschritte werden übersprungen, und warum?",
  "webb.rapport.f5": "Was weiß der Betrieb jetzt, was er im letzten Quartal nicht wusste?",
  "webb.rapport.f6": "Werden Vorgänge abgeschlossen, verifiziert und dokumentiert — oder nur abgeschlossen?",

  "webb.pris.etikett": "Kommerzielles",
  "webb.pris.rubrik": "Lizenzierung",
  "webb.pris.komponent": "Komponente",
  "webb.pris.grund": "Grundlage",
  "webb.pris.plattform": "Plattformlizenz",
  "webb.pris.plattform.grund": "Je Organisation, jährlich",
  "webb.pris.anvandare": "Benutzerlizenzen",
  "webb.pris.anvandare.grund": "Pro aktivem Benutzer, monatlich",
  "webb.pris.moduler": "Unternehmensmodule",
  "webb.pris.moduler.grund": "Optional, je Modul",
  "webb.pris.betalning": "Keine Online-Zahlung. Keine Abo-Anmeldung. Die Rechnungsstellung folgt auf die Prüfung des Antrags.",
  "webb.pris.aktivering": "Aktivierungsablauf",
  "webb.pris.a1": "Die Organisation reicht die Registrierung ein.",
  "webb.pris.a2": "Der Antrag wird geprüft.",
  "webb.pris.a3": "Die Rechnung wird gestellt.",
  "webb.pris.a4": "Die Zahlung wird verbucht.",
  "webb.pris.a5": "Die Organisation wird aktiviert.",
  "webb.pris.a6": "Weitere Benutzer werden monatlich abgerechnet.",

  "webb.kallor.etikett": "Infrastruktur",
  "webb.kallor.rubrik": "Operative Wissensinfrastruktur",
  "webb.kallor.p1":
    "ALVA nutzt die eigenen autorisierten Wissensquellen der Organisation. Die Architektur ist anbieterneutral: Jede Quelle implementiert dieselbe Schnittstelle, und kein Anbieter wird vorausgesetzt.",
  "webb.kallor.p2":
    "Eine Beta-Installation arbeitet allein mit interner Dokumentation. Externe Anbieter werden später über separate Konnektoren angebunden, ohne Änderung am Plattformkern.",
  "webb.kallor.block": "Auflösungsreihenfolge der Quellen",
  "webb.kallor.k1": "Interne Unternehmensprozeduren",
  "webb.kallor.k2": "OEM-Dokumentation",
  "webb.kallor.k3": "Technische Bulletins",
  "webb.kallor.k4": "Garantieinformationen",
  "webb.kallor.k5": "Werkstatthandbücher",
  "webb.kallor.k6": "Historische verifizierte Diagnosen",
  "webb.kallor.k7": "Bewährte Praxis der Organisation",

  "webb.login.etikett": "Zugang",
  "webb.login.demo":
    "Diese Anmeldung authentifiziert nichts. Geben Sie Beliebiges in E-Mail und Passwort ein und drücken Sie Anmelden — kein Konto ist nötig, und das Portal dahinter zeigt feste Beispieldaten. Mit einer Plattforminstanz verbunden authentifiziert sich diese Seite gegen sie, und ohne gültige Sitzung ist das Portal geschlossen.",
  "webb.login.losenord": "Passwort",
  "webb.login.ofullstandigt": "Authentifizierung unvollständig. E-Mail und Passwort erforderlich.",
  "webb.login.misslyckades": "Authentifizierung fehlgeschlagen.",
  "webb.login.logga_in": "Anmelden",
  "webb.login.loggar_in": "Anmeldung läuft",
  "webb.login.glomt": "Passwort vergessen",

  "webb.ansokan.etikett": "Registrierung",
  "webb.ansokan.demo":
    "Nichts wird gesendet. Das Absenden dieses Formulars speichert nichts, benachrichtigt niemanden und erzeugt keinen Antrag — dahinter steht noch keine Antragsentgegennahme. Die Beschreibung unten sagt, wie die Registrierung funktionieren soll, nicht was heute geschieht.",
  "webb.ansokan.avsikt": "Vorgesehener Betrieb: Anträge werden manuell geprüft, und in diesem Schritt wird keine Zahlung erhoben.",
  "webb.falt.foretag": "Unternehmen",
  "webb.falt.orgnummer": "Handelsregisternummer",
  "webb.falt.kontakt": "Ansprechpartner",
  "webb.falt.epost": "E-Mail",
  "webb.falt.telefon": "Telefon",
  "webb.falt.tekniker": "Anzahl Techniker",
  "webb.falt.bransch": "Branche",
  "webb.falt.land": "Land",
  "webb.falt.anvandare": "Erwartete Benutzerzahl",
  "webb.falt.noteringar": "Anmerkungen",
  "webb.falt.kravs": "(erforderlich)",
  "webb.ansokan.skicka": "Antrag absenden",
  "webb.ansokan.mottagen.etikett": "Antrag",
  "webb.ansokan.mottagen": "Eingereicht",
  "webb.ansokan.mottagen.demo":
    "Nichts wurde übermittelt, und niemand wurde benachrichtigt. Die Referenz unten wurde in Ihrem Browser aus Ihren Eingaben berechnet und existiert nirgendwo sonst — sie ist weg, wenn Sie diese Seite schließen.",
  "webb.ansokan.status": "Status",
  "webb.ansokan.referens": "Referenz",
  "webb.ansokan.granskning":
    "Anträge werden manuell geprüft. Bei Genehmigung wird eine Rechnung gestellt. Die Organisation wird aktiviert, sobald die Zahlung verbucht ist.",

  "webb.sprak.etikett": "Lokalisierung",
  "webb.sprak.rubrik": "Sprachen",
  "webb.sprak.ingress":
    "Englisch ist Standard- und Quellsprache. Neun Übersetzungen folgen. Was die Plattform nicht tut: behaupten, dass eine übersetzte Oberfläche eine übersetzte Methode bedeutet.",
  "webb.sprak.princip.etikett": "Prinzip",
  "webb.sprak.princip.rubrik": "Zwei Arten von Text",
  "webb.sprak.granssnitt.rubrik": "Oberflächentext",
  "webb.sprak.granssnitt.beteckning": "Fällt still zurück",
  "webb.sprak.granssnitt.text":
    "Beschriftungen, Schaltflächen, Status. Begrenzter Bestand, selten geändert. Eine englische Zeichenkette bei einem deutschen Benutzer ist ein Ärgernis, keine Gefahr — eine fehlende Übersetzung fällt daher kommentarlos auf Englisch zurück.",
  "webb.sprak.metodik.rubrik": "Verfahrenstext",
  "webb.sprak.metodik.beteckning": "Fällt nie still zurück",
  "webb.sprak.metodik.text":
    "Anweisungen für Arbeiten an einem Fahrzeug. Hier ist eine ungeprüfte Übersetzung schlimmer als eine fremdsprachige — denn Englisch sieht fremd aus, während eine schlechte Übersetzung wie eine Anweisung aussieht. Sie wird auf Englisch gezeigt und gekennzeichnet, mit benannter Sprache.",
  "webb.sprak.invariant":
    "Die Methode selbst wird nie übersetzt. Phasennamen und Statuswörter sind ALVAs Struktur und lesen sich in jedem Land gleich, sodass ein Prüfer eine rumänische und eine deutsche Vorgangsakte lesen kann, ohne zu wissen, in welcher Sprache der Betrieb arbeitet.",
  "webb.sprak.tackning.etikett": "Abdeckung",
  "webb.sprak.tackning.rubrik": "Was übersetzt ist, und was geprüft ist",
  "webb.sprak.kolumn.sprak": "Sprache",
  "webb.sprak.kolumn.granssnitt": "Oberfläche",
  "webb.sprak.kolumn.granskat": "Methodik von einer Fachkraft geprüft",
  "webb.sprak.granskat.ja": "Ja",
  "webb.sprak.granskat.nej": "Nein — Verfahrenstext auf Englisch",
  "webb.sprak.matt":
    "Die Abdeckung der Oberfläche wird gemessen, nicht geschätzt: Ein Test lässt den Build scheitern, wenn irgendein Schlüssel in irgendeiner Sprache fehlt. Der Prüfstatus ist eine Aussage über Menschen, nicht über Dateien, und wird von Hand gesetzt.",
  "webb.sprak.kallsprak":
    "Der englische Verfahrenstext ist eine Übersetzung der schwedischen Quelle und wurde noch nicht von einer im Handwerk tätigen Fachkraft gelesen. Er wird am selben Maßstab gemessen wie die anderen neun Sprachen, und dieselbe Aussage steht hier über ihn, statt ihn still auszunehmen, weil er die Quelle ist.",
  "webb.sprak.bevis.etikett": "Verifikation",
  "webb.sprak.bevis.rubrik": "Die Sätze, die einen Vorgang stoppen",
  "webb.sprak.bevis.ingress":
    "Dies sind die Sätze, die einem Techniker den Abschluss eines Vorgangs verweigern. Eine Verweigerung, die niemand versteht, ist eine Verweigerung ohne Ausweg — also sind es die richtigen Sätze, um eine Übersetzung zu beurteilen.",
  "webb.sprak.ej_granskad": "Nicht geprüft",
  "webb.sprak.granskad": "Geprüft",
  "webb.sprak.granskad.text":
    "Der Verfahrenstext auf {sprak} wurde von einer im Handwerk tätigen Fachkraft gelesen. Schritte und Prüfpunkte werden durchgehend auf {sprak} angezeigt.",
  "webb.sprak.val.etikett": "Betrieb",
  "webb.sprak.val.rubrik": "Wie die Sprache gewählt wird",
  "webb.sprak.val.s1.rubrik": "Wahl des Benutzers",
  "webb.sprak.val.s1.text": "Was die einzelne Person gewählt hat.",
  "webb.sprak.val.s2.rubrik": "Einstellung der Organisation",
  "webb.sprak.val.s2.text": "Die Dokumentationssprache des Betriebs.",
  "webb.sprak.val.s3.rubrik": "Browsersprache",
  "webb.sprak.val.s3.text": "Die erste Sprache, die die Plattform erkennt.",
  "webb.sprak.val.s4.rubrik": "Englisch",
  "webb.sprak.val.s4.text": "Der Standard, und die Quelle.",
  "webb.sprak.val.notering":
    "Die Organisation steht bewusst über dem Browser. Ein Betrieb in Deutschland mit einem polnischen Techniker braucht eine gemeinsame Dokumentationssprache — die Sprache der Vorgangsakte darf nicht davon abhängen, wer die Zeile gerade geschrieben hat.",
};
