// ALVA-SPEC-060 · Italiano.
//
// I pulsanti usano l’imperativo breve («Salva», «Annulla»), come vuole
// la convenzione delle interfacce italiane; le istruzioni all’interno
// delle frasi restano all’infinito («Fotografare il contachilometri»),
// senza rivolgersi all’operatore — ALVA-SPEC-001 §7.
//
// `granskat: false`: l’interfaccia è tradotta, il testo delle procedure
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
  "grind.objekt": "Identificazione del veicolo o dell’oggetto verificata",
  "grind.historik": "Storico del veicolo verificato, o l’omissione motivata",
  "grind.historik.nekad": "Un controllo dello storico rifiutato richiede l’indicazione di un motivo.",
  "grind.historik.saknas": "Nessun controllo dello storico documentato.",
  "grind.matarstallning.ingaende": "Chilometraggio in accettazione fotografato",
  "grind.matarstallning.utgaende": "Chilometraggio alla riconsegna fotografato",
  "grind.matarstallning.saknas": "Nessun chilometraggio documentato.",
  "grind.matarstallning.ej_foto":
    "Il chilometraggio è inserito ma non fotografato. Fotografare il contachilometri, oppure indicare perché non è possibile.",
  "grind.reproducering": "Verifica del sintomo: riprodotto, oppure documentato come non riproducibile",
  "grind.felorsak": "Analisi della causa radice documentata",
  "grind.atgard": "Intervento correttivo documentato, o la sua assenza motivata",
  "grind.atgard.saknas": "Non è documentato né un intervento eseguito né un motivo della sua assenza.",
  "grind.kundbeslut": "Decisione del cliente sulla proposta registrata",
  "grind.kundbeslut.avbojt": "Lavoro eseguito nonostante una proposta rifiutata",
  "grind.kundbeslut.avbojt.detalj":
    "Il cliente ha rifiutato la proposta, ma risulta documentato lavoro eseguito.",
  "grind.kvalitetskontroll": "Controllo qualità eseguito — sintomo verificato come risolto",
  "grind.kontroller": "Punti di controllo della metodologia: evidenza, oppure deroga documentata",
  "grind.foton": "Fotografie presenti per i punti di controllo che le richiedono",
  "grind.slutsats": "Conclusione (ALVA-RULE-200)",
  "grind.hogvolt.behorighet": "Abilitazione alta tensione confermata",
  "grind.hogvolt.spanningslos": "Veicolo messo fuori tensione secondo la procedura del costruttore, assenza di tensione verificata mediante misurazione",
  "grind.regelpaket": "La firma del pacchetto di regole non corrisponde — chiusura bloccata.",
  "grind.regelpaket.osignerat": "È in uso un pacchetto di regole esterno privo di firma — chiusura bloccata.",
  "grind.evidens": "Livello di evidenza superiore a E0",
  "grind.evidens.saknas": "Nel registro non è presente alcuna evidenza.",
  "grind.foton.detalj": "{kontroller} punti di controllo richiedono una fotografia, {foton} fotografie nel registro.",
  "grind.sparr.ej_uppfyllt": "Il requisito di sicurezza non è soddisfatto.",
  "grind.arendetyp.okant": "Requisito sconosciuto nel pacchetto di regole: {krav}",
  "grind.arendetyp.krav": "Requisito per questo tipo di pratica: {krav}",
  "grind.sakerhet": "Livello di confidenza entro quanto sostiene l’evidenza",
  "grind.sakerhet.detalj": "La confidenza indicata ({niva}) supera quanto sostiene l’evidenza ({tak}). Integrare l’evidenza, oppure abbassare il livello — l’incertezza onesta è informazione.",
  "grind.eskalering": "Escalation tecniche risolte",
  "grind.eskalering.detalj": "Un’escalation è aperta ({referens}). Attendere la risposta e documentarla prima di chiudere la pratica.",


  // ---- La conclusione (ALVA-RULE-200) -------------------------------------
  "slutsats.rubrik": "Conclusione",
  "slutsats.konstaterat": "Che cosa è stato accertato",
  "slutsats.evidens": "Quale evidenza lo sostiene",
  "slutsats.avfardat": "Quali ipotesi sono state escluse, e perché",
  "slutsats.osakert": "Che cosa resta incerto",
  "slutsats.ickesvar":
    "Questa non è una risposta. Indicare che cosa è stato accertato e quale evidenza lo sostiene.",
  "slutsats.falt.motivering": "Motivazione",
  "slutsats.falt.motivering_ej": "Motivo per cui la causa non è stata accertata",
  "slutsats.falt.uteslutet": "Alternative escluse",
  "slutsats.falt.kvarstaende": "Incertezza residua",
  "slutsats.falt.atgardsval": "Scelta dell’intervento",
  "slutsats.saknas": "{falt} manca.",
  "slutsats.ickesvar.falt": "{falt}: «{text}» non è una motivazione. Indicare che cosa vale realmente, e perché.",
  "slutsats.for_kort": "{falt} è troppo breve ({langd} su almeno {minsta} caratteri) per consentirne la verifica in seguito.",
  "slutsats.utan_varfor": "{falt} indica che cosa, non perché. Collegare la conclusione all’evidenza — che cosa in essa la sostiene?",
  "slutsats.utan_slutsats": "La pratica non può essere chiusa senza una conclusione. Indicare perché la conclusione discende dall’evidenza.",
  "slutsats.hypotes_obemott": "L’ipotesi «{text}» è presente nel registro ma non viene trattata. Indicare perché è stata esclusa, o perché resta aperta.",


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
  "pre.rubrik": "Controllo preliminare — prima dell’inizio del lavoro",
  "pre.historik.fraga":
    "Lo storico del veicolo è stato verificato? (lavori precedenti, guasti ricorrenti, TSB, campagne)",
  "pre.historik.ja": "Sì — verificato",
  "pre.historik.nej": "No",
  "pre.historik.skal": "Motivo per cui lo storico non è stato verificato (obbligatorio)",
  "pre.historik.relevant": "Lavori precedenti rilevanti (facoltativo — catena causale)",
  "pre.matarstallning": "Chilometraggio",
  "pre.fotografera": "Fotografare il quadro strumenti",
  "pre.felbeskrivning": "Descrizione del guasto fornita dal cliente verificata",
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
  "sprak.tackning": "{procent} % dell’interfaccia",

  "metodik.ogranskad":
    "Il testo delle procedure non è stato revisionato da uno specialista tecnico in {sprak}. I passaggi e i punti di controllo sono mostrati in inglese dove non esiste una traduzione revisionata — una traduzione non revisionata di un’istruzione di sicurezza è peggiore di una in lingua straniera, perché non sembra straniera.",
  "metodik.pa_engelska": "Mostrato in inglese — nessuna traduzione revisionata in {sprak}",

  // ---- Sito pubblico (webb.) ---------------------------------------------
  "webb.nav.oversikt": "Panoramica",
  "webb.ansok": "Richiedi un account",
  "webb.loggain": "Accedi",
  "webb.fot.impressum": "Note legali",
  "webb.fot.dataskydd": "Privacy",
  "webb.fot.villkor": "Condizioni",
  "webb.fot.tillganglighet": "Accessibilità",
  "webb.fot.sprak": "Lingue",
  "webb.fot.utgavor": "Note di rilascio",

  "webb.hero.position": "Piattaforma di diagnosi guidata",
  "webb.hero.definition": "Procedure diagnostiche standardizzate per una ricerca guasti ripetibile e verificabile.",

  "webb.metod.etikett": "Metodologia",
  "webb.metod.rubrik": "Il modello ALVA",
  "webb.metod.ingress":
    "ALVA è un metodo standardizzato di analisi, localizzazione, verifica e azione sistematiche. Ogni decisione è tracciabile, ogni conclusione verificabile, ogni azione riproducibile.",
  "webb.fas.analysis.syfte": "Raccogliere le evidenze.",
  "webb.fas.analysis.avgransning": "Solo fatti. In questa fase non si raccolgono ipotesi.",
  "webb.fas.localization.syfte": "Circoscrivere il guasto.",
  "webb.fas.localization.avgransning": "Restringere l’area. La causa non è ancora stabilita.",
  "webb.fas.verification.syfte": "Confermare la causa radice.",
  "webb.fas.verification.avgransning": "Si verifica la causa — non il sintomo.",
  "webb.fas.action.syfte": "Eseguire l’azione correttiva.",
  "webb.fas.action.avgransning": "Risultato verificato e documentato. Altrimenti la fase è incompleta.",

  "webb.drift.etikett": "Funzionamento",
  "webb.drift.rubrik": "Come funziona",
  "webb.drift.s1.rubrik": "Creare l’organizzazione",
  "webb.drift.s1.text": "La registrazione viene inviata ed esaminata.",
  "webb.drift.s2.rubrik": "Gli utenti ricevono gli account",
  "webb.drift.s2.text": "I ruoli sono assegnati dall’amministratore dell’organizzazione.",
  "webb.drift.s3.rubrik": "Procedure diagnostiche guidate",
  "webb.drift.s3.text": "Ogni pratica segue una procedura definita.",
  "webb.drift.s4.rubrik": "Verifica",
  "webb.drift.s4.text": "La causa radice viene confermata prima dell’azione correttiva.",
  "webb.drift.s5.rubrik": "Documentazione",
  "webb.drift.s5.text": "Il rapporto è generato dal registro della pratica.",
  "webb.drift.s6.rubrik": "Miglioramento continuo",
  "webb.drift.s6.text": "Gli esiti verificati affinano le procedure successive.",

  "webb.larande.etikett": "Capacità",
  "webb.larande.rubrik": "Apprendimento dell’organizzazione",
  "webb.larande.p1":
    "La piattaforma affina di continuo le procedure diagnostiche con l’esperienza operativa verificata della vostra stessa organizzazione.",
  "webb.larande.p2":
    "Ogni diagnosi completata alimenta la guida successiva. Si usano solo esiti verificati — una pratica chiusa senza causa radice confermata non apporta nulla, per costruzione.",
  "webb.larande.p3":
    "La base di conoscenza appartiene all’organizzazione. È derivata dalle vostre pratiche, dalle vostre procedure e dalla vostra documentazione, e non viene aggregata tra clienti.",
  "webb.larande.block": "Derivata da",
  "webb.larande.k1": "Cause radice verificate",
  "webb.larande.k2": "Azioni correttive confermate",
  "webb.larande.k3": "Categorie di guasti ricorrenti",
  "webb.larande.k4": "Procedure portate a termine",
  "webb.larande.k5": "Documentazione dell’organizzazione",

  "webb.rapport.etikett": "Rendicontazione",
  "webb.rapport.rubrik": "Rapporto trimestrale di miglioramento",
  "webb.rapport.ingress":
    "Una volta a trimestre la piattaforma risponde a sei domande sul lavoro dell’officina stessa. Ogni risposta è derivata dal registro delle pratiche — nulla è stimato, e a nessuno viene chiesto nulla.",
  "webb.rapport.f1": "Quali guasti diagnostichiamo ora correttamente al primo tentativo?",
  "webb.rapport.f2": "Quanto spesso una causa sospetta si rivela quella reale?",
  "webb.rapport.f3": "Quali guasti continuano a ripresentarsi nella flotta?",
  "webb.rapport.f4": "Quali passaggi della procedura vengono saltati, e perché?",
  "webb.rapport.f5": "Cosa sa oggi l’officina che non sapeva il trimestre scorso?",
  "webb.rapport.f6": "Le pratiche vengono chiuse, verificate e documentate — o soltanto chiuse?",

  "webb.pris.etikett": "Commerciale",
  "webb.pris.rubrik": "Licenze",
  "webb.pris.komponent": "Componente",
  "webb.pris.grund": "Base",
  "webb.pris.plattform": "Licenza di piattaforma",
  "webb.pris.plattform.grund": "Per organizzazione, annuale",
  "webb.pris.anvandare": "Licenze utente",
  "webb.pris.anvandare.grund": "Per utente attivo, mensile",
  "webb.pris.moduler": "Moduli enterprise",
  "webb.pris.moduler.grund": "Facoltativi, per modulo",
  "webb.pris.betalning": "Nessun pagamento online. Nessuna sottoscrizione di abbonamento. La fatturazione segue l’esame della richiesta.",
  "webb.pris.aktivering": "Sequenza di attivazione",
  "webb.pris.a1": "L’organizzazione invia la registrazione.",
  "webb.pris.a2": "La richiesta viene esaminata.",
  "webb.pris.a3": "Viene emessa la fattura.",
  "webb.pris.a4": "Il pagamento viene registrato.",
  "webb.pris.a5": "L’organizzazione viene attivata.",
  "webb.pris.a6": "Gli utenti aggiuntivi sono fatturati mensilmente.",

  "webb.kallor.etikett": "Infrastruttura",
  "webb.kallor.rubrik": "Infrastruttura operativa della conoscenza",
  "webb.kallor.p1":
    "ALVA usa le fonti di conoscenza autorizzate proprie dell’organizzazione. L’architettura è neutrale rispetto al fornitore: ogni fonte implementa la stessa interfaccia, e nessun fornitore è presupposto.",
  "webb.kallor.p2":
    "Un’installazione beta lavora sulla sola documentazione interna. I fornitori esterni si abilitano in seguito tramite connettori separati, senza modifiche al nucleo della piattaforma.",
  "webb.kallor.block": "Ordine di risoluzione delle fonti",
  "webb.kallor.k1": "Procedure interne dell’azienda",
  "webb.kallor.k2": "Documentazione OEM",
  "webb.kallor.k3": "Bollettini tecnici",
  "webb.kallor.k4": "Informazioni di garanzia",
  "webb.kallor.k5": "Manuali di officina",
  "webb.kallor.k6": "Storico delle diagnosi verificate",
  "webb.kallor.k7": "Buone pratiche dell’organizzazione",

  "webb.login.etikett": "Accesso",
  "webb.login.demo":
    "Questo accesso non autentica nulla. Scrivete qualsiasi cosa in E-mail e Password e premete Accedi — non serve alcun account, e il portale dietro presenta dati di esempio fissi. Collegata a un’istanza della piattaforma, questa pagina si autentica presso di essa, e senza una sessione valida il portale è chiuso.",
  "webb.login.losenord": "Password",
  "webb.login.ofullstandigt": "Autenticazione incompleta. E-mail e password sono richieste.",
  "webb.login.misslyckades": "Autenticazione non riuscita.",
  "webb.login.logga_in": "Accedi",
  "webb.login.loggar_in": "Accesso in corso",
  "webb.login.glomt": "Password dimenticata",

  "webb.ansokan.etikett": "Registrazione",
  "webb.ansokan.demo":
    "Non viene inviato nulla. Inviare questo modulo non salva nulla, non avvisa nessuno e non crea alcuna richiesta — dietro non c’è ancora alcun sistema che la riceva. La descrizione qui sotto dice come la registrazione è pensata per funzionare, non cosa accade oggi.",
  "webb.ansokan.avsikt": "Funzionamento previsto: le richieste sono esaminate manualmente e in questa fase non viene riscosso alcun pagamento.",
  "webb.falt.foretag": "Azienda",
  "webb.falt.orgnummer": "Numero di iscrizione al Registro delle Imprese",
  "webb.falt.kontakt": "Referente",
  "webb.falt.epost": "E-mail",
  "webb.falt.telefon": "Telefono",
  "webb.falt.tekniker": "Numero di tecnici",
  "webb.falt.bransch": "Settore",
  "webb.falt.land": "Paese",
  "webb.falt.anvandare": "Numero previsto di utenti",
  "webb.falt.noteringar": "Note",
  "webb.falt.kravs": "(obbligatorio)",
  "webb.ansokan.skicka": "Invia la richiesta",
  "webb.ansokan.mottagen.etikett": "Richiesta",
  "webb.ansokan.mottagen": "Inviata",
  "webb.ansokan.mottagen.demo":
    "Nulla è stato trasmesso e nessuno è stato avvisato. Il riferimento qui sotto è stato calcolato nel vostro browser da ciò che avete digitato e non esiste altrove — sparirà alla chiusura di questa pagina.",
  "webb.ansokan.status": "Stato",
  "webb.ansokan.referens": "Riferimento",
  "webb.ansokan.granskning":
    "Le richieste sono esaminate manualmente. All’approvazione viene emessa una fattura. L’organizzazione viene attivata alla registrazione del pagamento.",

  "webb.sprak.etikett": "Localizzazione",
  "webb.sprak.rubrik": "Lingue",
  "webb.sprak.ingress":
    "L’inglese è la lingua predefinita e la lingua di origine. Seguono nove traduzioni. Ciò che la piattaforma non fa è affermare che un’interfaccia tradotta significhi un metodo tradotto.",
  "webb.sprak.princip.etikett": "Principio",
  "webb.sprak.princip.rubrik": "Due tipi di testo",
  "webb.sprak.granssnitt.rubrik": "Testo d’interfaccia",
  "webb.sprak.granssnitt.beteckning": "Ripiega in silenzio",
  "webb.sprak.granssnitt.text":
    "Etichette, pulsanti, stati. Un insieme finito, che cambia di rado. Una stringa inglese che raggiunge un utente tedesco è un fastidio, non un pericolo — una traduzione mancante ripiega quindi sull’inglese senza commento.",
  "webb.sprak.metodik.rubrik": "Testo di procedura",
  "webb.sprak.metodik.beteckning": "Non ripiega mai in silenzio",
  "webb.sprak.metodik.text":
    "Istruzioni per lavorare su un veicolo. Qui una traduzione non revisionata è peggiore di una in lingua straniera — perché l’inglese sembra straniero, mentre una cattiva traduzione sembra un’istruzione. Viene mostrata in inglese e contrassegnata, con la lingua nominata.",
  "webb.sprak.invariant":
    "Il metodo in sé non viene mai tradotto. I nomi delle fasi e le parole di stato sono la struttura di ALVA e si leggono identici in ogni paese, così un revisore può leggere un fascicolo rumeno e uno tedesco senza sapere in quale lingua lavora l’officina.",
  "webb.sprak.tackning.etikett": "Copertura",
  "webb.sprak.tackning.rubrik": "Cosa è tradotto, e cosa è revisionato",
  "webb.sprak.kolumn.sprak": "Lingua",
  "webb.sprak.kolumn.granssnitt": "Interfaccia",
  "webb.sprak.kolumn.granskat": "Metodo revisionato da uno specialista",
  "webb.sprak.granskat.ja": "Sì",
  "webb.sprak.granskat.nej": "No — testo di procedura in inglese",
  "webb.sprak.matt":
    "La copertura dell’interfaccia è misurata, non stimata: un test fa fallire la build se una chiave manca in una lingua. Lo stato di revisione è un’affermazione su persone, non su file, e si imposta a mano.",
  "webb.sprak.kallsprak":
    "Il testo di procedura inglese è una traduzione della fonte svedese e non è ancora stato letto da uno specialista che esercita il mestiere. È tenuto allo stesso standard delle altre nove lingue, e qui se ne fa la stessa dichiarazione invece di esentarlo in silenzio perché è la fonte.",
  "webb.sprak.bevis.etikett": "Verifica",
  "webb.sprak.bevis.rubrik": "Le frasi che fermano una pratica",
  "webb.sprak.bevis.ingress":
    "Queste sono le frasi che negano a un tecnico la chiusura di una pratica. Un rifiuto che nessuno capisce è un rifiuto senza via d’uscita — sono quindi le frasi giuste per giudicare una traduzione.",
  "webb.sprak.ej_granskad": "Non revisionato",
  "webb.sprak.granskad": "Revisionato",
  "webb.sprak.granskad.text":
    "Il testo di procedura in {sprak} è stato letto da uno specialista che esercita il mestiere. Passaggi e punti di controllo sono mostrati in {sprak} ovunque.",
  "webb.sprak.val.etikett": "Funzionamento",
  "webb.sprak.val.rubrik": "Come viene scelta la lingua",
  "webb.sprak.val.s1.rubrik": "Preferenza dell’utente",
  "webb.sprak.val.s1.text": "Ciò che la singola persona ha selezionato.",
  "webb.sprak.val.s2.rubrik": "Impostazione dell’organizzazione",
  "webb.sprak.val.s2.text": "La lingua di documentazione dell’officina.",
  "webb.sprak.val.s3.rubrik": "Lingua del browser",
  "webb.sprak.val.s3.text": "La prima lingua che la piattaforma riconosce.",
  "webb.sprak.val.s4.rubrik": "Inglese",
  "webb.sprak.val.s4.text": "La predefinita, e la fonte.",
  "webb.sprak.val.notering":
    "L’organizzazione precede deliberatamente il browser. Un’officina in Germania con un tecnico polacco ha bisogno di un’unica lingua di documentazione — il fascicolo non deve cambiare lingua a seconda di chi ha scritto la riga.",
};
