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
  "grind.historik": "Fahrzeughistorie geprüft oder begründet",
  "grind.historik.nekad": "Eine abgelehnte Historienprüfung erfordert eine angegebene Begründung.",
  "grind.historik.saknas": "Keine Historienprüfung dokumentiert.",
  "grind.matarstallning.ingaende": "Kilometerstand bei Annahme fotografiert",
  "grind.matarstallning.utgaende": "Kilometerstand bei Ausgabe fotografiert",
  "grind.matarstallning.saknas": "Kein Kilometerstand dokumentiert.",
  "grind.matarstallning.ej_foto":
    "Der Kilometerstand ist eingetragen, aber nicht fotografiert. Kilometerzähler fotografieren, oder angeben, warum dies nicht möglich ist.",
  "grind.reproducering": "Symptomverifizierung: reproduziert oder als nicht reproduzierbar dokumentiert",
  "grind.felorsak": "Fehlerursachenanalyse dokumentiert",
  "grind.atgard": "Maßnahme dokumentiert oder begründet",
  "grind.atgard.saknas": "Weder eine durchgeführte Maßnahme noch ein Grund für deren Ausbleiben ist dokumentiert.",
  "grind.kundbeslut": "Kundenentscheidung zum Vorschlag erfasst",
  "grind.kundbeslut.avbojt": "Arbeit trotz abgelehntem Vorschlag durchgeführt",
  "grind.kundbeslut.avbojt.detalj":
    "Der Kunde hat den Vorschlag abgelehnt, es ist jedoch durchgeführte Arbeit dokumentiert.",
  "grind.kvalitetskontroll": "Qualitätskontrolle durchgeführt — Symptom verifiziert",
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
    "Das ist keine Feststellung. Angeben, was festgestellt wurde und welche Evidenz dies trägt.",
  "slutsats.falt.motivering": "Begründung",
  "slutsats.falt.motivering_ej": "Grund, warum die Ursache nicht festgestellt wurde",
  "slutsats.falt.uteslutet": "Verworfene Alternativen",
  "slutsats.falt.kvarstaende": "Verbleibende Unsicherheit",
  "slutsats.falt.atgardsval": "Wahl der Maßnahme",
  "slutsats.saknas": "{falt} fehlt.",
  "slutsats.ickesvar.falt": "{falt}: „{text}“ ist keine Begründung. Angeben, was tatsächlich gilt, und warum.",
  "slutsats.for_kort": "{falt} ist zu kurz ({langd} von mindestens {minsta} Zeichen), um im Nachhinein prüfbar zu sein.",
  "slutsats.utan_varfor": "{falt} nennt das Was, nicht das Warum. Die Feststellung an die Evidenz binden — was darin lässt dies folgen?",
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
    "Ist die Fahrzeughistorie geprüft? (frühere Arbeiten, wiederkehrende Fehler, TSB, Rückrufaktionen)",
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
  "matning.matdon.okant": "Unbekanntes Messmittel. Vor dem Speichern der Messung registrieren.",
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
};
