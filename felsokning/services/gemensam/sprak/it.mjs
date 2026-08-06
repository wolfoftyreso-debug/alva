// ALVA-SPEC-060 · Italiano.
//
// I pulsanti usano l'imperativo breve («Salva», «Annulla»), come vuole
// la convenzione delle interfacce italiane; le istruzioni all'interno
// delle frasi restano all'infinito («Fotografare il contachilometri»),
// senza rivolgersi all'operatore — ALVA-SPEC-001 §7.
//
// `granskat: false`: l'interfaccia è tradotta, il testo delle procedure
// non è revisionato da uno specialista. Vedi index.mjs.

export const IT = {
  // ---- Gradi di evidenza --------------------------------------------------
  "evidens.E1": "Osservazione",
  "evidens.E2": "Fotografia",
  "evidens.E3": "Video con audio",
  "evidens.E4": "Misurazione, strumento tarato",
  "evidens.E5": "Documento",
  "evidens.ej_kalibrerad": "taratura mancante o scaduta",
  "evidens.ej_angivet": "strumento non indicato",
  "evidens.ej_fotograferad": "inserito, non fotografato",

  // ---- Il controllo di chiusura -------------------------------------------
  "grind.objekt": "Identificazione del veicolo o dell'oggetto verificata",
  "grind.historik": "Storico del veicolo verificato o motivato",
  "grind.historik.nekad": "Un controllo dello storico rifiutato richiede un motivo indicato.",
  "grind.historik.saknas": "Nessun controllo dello storico documentato.",
  "grind.matarstallning.ingaende": "Chilometraggio in accettazione fotografato",
  "grind.matarstallning.utgaende": "Chilometraggio alla riconsegna fotografato",
  "grind.matarstallning.saknas": "Nessun chilometraggio documentato.",
  "grind.matarstallning.ej_foto":
    "Il chilometraggio è inserito ma non fotografato. Fotografare il contachilometri, oppure indicare perché non è possibile.",
  "grind.reproducering": "Verifica del sintomo: riprodotto, oppure documentato come non riproducibile",
  "grind.felorsak": "Analisi della causa radice documentata",
  "grind.atgard": "Intervento documentato o motivato",
  "grind.atgard.saknas": "Non è documentato né un intervento eseguito né un motivo della sua assenza.",
  "grind.kundbeslut": "Decisione del cliente sulla proposta registrata",
  "grind.kundbeslut.avbojt": "Lavoro eseguito nonostante una proposta rifiutata",
  "grind.kundbeslut.avbojt.detalj":
    "Il cliente ha rifiutato la proposta, ma risulta documentato del lavoro come eseguito.",
  "grind.kvalitetskontroll": "Controllo qualità eseguito — sintomo verificato",
  "grind.kontroller": "Punti di controllo della metodologia: evidenza, oppure deroga documentata",
  "grind.foton": "Fotografie presenti per i controlli che le richiedono",
  "grind.slutsats": "Conclusione (ALVA-RULE-200)",
  "grind.hogvolt.behorighet": "Abilitazione alta tensione confermata",
  "grind.hogvolt.spanningslos": "Veicolo messo fuori tensione secondo la procedura del costruttore",
  "grind.regelpaket": "La firma del pacchetto di regole non corrisponde — chiusura bloccata.",
  "grind.regelpaket.osignerat": "È in uso un pacchetto di regole esterno privo di firma — chiusura bloccata.",

  // ---- La conclusione (ALVA-RULE-200) -------------------------------------
  "slutsats.rubrik": "Conclusione",
  "slutsats.konstaterat": "Che cosa è stato accertato",
  "slutsats.evidens": "Quale evidenza lo sostiene",
  "slutsats.avfardat": "Quali ipotesi sono state escluse, e perché",
  "slutsats.osakert": "Che cosa resta incerto",
  "slutsats.ickesvar":
    "Questa non è una conclusione. Indicare che cosa è stato accertato e quale evidenza lo sostiene.",

  // ---- Flusso della pratica -----------------------------------------------
  "arende.nytt": "Nuova pratica",
  "arende.oppna": "Pratiche aperte",
  "arende.avslutade": "Pratiche chiuse",
  "arende.avsluta": "Chiudi la pratica",
  "arende.avslutat": "Pratica chiusa",
  "arende.kan_ej_avslutas": "La pratica non può ancora essere chiusa",
  "arende.hinder": "Da completare prima della chiusura",
  "arende.overlamna": "Trasferisci",
  "arende.ansvarig": "Responsabile",

  // ---- Controllo preliminare ----------------------------------------------
  "pre.rubrik": "Controllo preliminare — prima dell'inizio del lavoro",
  "pre.historik.fraga":
    "Lo storico del veicolo è stato verificato? (lavori precedenti, guasti ricorrenti, TSB, campagne)",
  "pre.historik.ja": "Sì — verificato",
  "pre.historik.nej": "No",
  "pre.historik.skal": "Motivo per cui lo storico non è stato verificato (obbligatorio)",
  "pre.historik.relevant": "Lavori precedenti rilevanti (facoltativo — catena causale)",
  "pre.matarstallning": "Chilometraggio",
  "pre.fotografera": "Fotografa il quadro strumenti",
  "pre.felbeskrivning": "Descrizione del guasto del cliente verificata",
  "pre.observationer": "Altro in fase di accettazione?",

  // ---- Azioni -------------------------------------------------------------
  "handling.spara": "Salva",
  "handling.avbryt": "Annulla",
  "handling.fortsatt": "Continua",
  "handling.tillbaka": "Indietro",
  "handling.dokumentera": "Documenta",
  "handling.fotografera": "Fotografa",
  "handling.spela_in": "Registra video",
  "handling.undantag": "Documenta una deroga",
  "handling.undantag.skal": "Motivo della deroga (obbligatorio)",
  "handling.exportera": "Esporta",
  "handling.skriv_ut": "Stampa",

  // ---- Misurazione --------------------------------------------------------
  "matning.varde": "Valore",
  "matning.enhet": "Unità",
  "matning.matdon": "Strumento",
  "matning.matdon.valj": "Seleziona strumento",
  "matning.matdon.okant": "Strumento sconosciuto. Registrarlo prima di salvare la misurazione.",
  "matning.kalibrerad_till": "Tarato fino al",

  // ---- Rapporto -----------------------------------------------------------
  "rapport.rubrik": "Rapporto della pratica",
  "rapport.sammanfattning": "Sintesi",
  "rapport.evidens": "Evidenze",
  "rapport.atgarder": "Interventi",
  "rapport.harledd":
    "Derivato dal registro della pratica. Le osservazioni e le misurazioni sono riportate senza conclusioni prive di fondamento.",

  // ---- Lingua -------------------------------------------------------------
  "sprak.valj": "Lingua",
  "sprak.granskat": "Revisionato",
  "sprak.ogranskat": "Non revisionato",
  "sprak.tackning": "{procent} % dell'interfaccia",

  "metodik.ogranskad":
    "Il testo delle procedure non è stato revisionato da uno specialista tecnico in {sprak}. I passaggi e i punti di controllo sono mostrati in inglese dove non esiste una traduzione revisionata — una traduzione non revisionata di un'istruzione di sicurezza è peggiore di una in lingua straniera, perché non sembra straniera.",
  "metodik.pa_engelska": "Mostrato in inglese — nessuna traduzione revisionata in {sprak}",
};
