// ALVA-SPEC-060 · Română.
//
// Imperativul persoanei a II-a singular este folosit consecvent, atât
// pe butoane («Salvează») cât și în instrucțiuni («Fotografiază
// kilometrajul»). Amestecul dintre singular și plural este cea mai
// frecventă inconsecvență din interfețele traduse în română, iar aici
// este evitat deliberat.
//
// Diacriticele sunt cele corecte — ș și ț cu virgulă (U+0219, U+021B),
// nu cu sedilă. Un raport tipărit cu sedile arată ca un document
// netradus.
//
// `granskat: false`: interfața este tradusă, textul procedurilor nu este
// verificat de un specialist. A se vedea index.mjs.

export const RO = {
  // ---- Grade de dovadă ----------------------------------------------------
  "evidens.E1": "Observație",
  "evidens.E2": "Fotografie",
  "evidens.E3": "Videoclip cu sunet",
  "evidens.E4": "Măsurare, instrument etalonat",
  "evidens.E5": "Document",
  "evidens.ej_kalibrerad": "etalonare lipsă sau expirată",
  "evidens.ej_angivet": "instrument neindicat",
  "evidens.ej_fotograferad": "introdus, nefotografiat",

  // ---- Controlul de închidere ---------------------------------------------
  "grind.objekt": "Identificarea vehiculului sau a obiectului verificată",
  "grind.historik": "Istoricul vehiculului verificat sau justificat",
  "grind.historik.nekad": "O verificare a istoricului refuzată necesită un motiv indicat.",
  "grind.historik.saknas": "Nicio verificare a istoricului documentată.",
  "grind.matarstallning.ingaende": "Kilometrajul la primire fotografiat",
  "grind.matarstallning.utgaende": "Kilometrajul la predare fotografiat",
  "grind.matarstallning.saknas": "Niciun kilometraj documentat.",
  "grind.matarstallning.ej_foto":
    "Kilometrajul este introdus, dar nu este fotografiat. Fotografiază contorul de kilometraj sau indică de ce acest lucru nu este posibil.",
  "grind.reproducering": "Verificarea simptomului: reprodus sau documentat ca nereproductibil",
  "grind.felorsak": "Analiza cauzei-rădăcină documentată",
  "grind.atgard": "Acțiune corectivă documentată sau justificată",
  "grind.atgard.saknas": "Nu este documentată nici o acțiune efectuată, nici un motiv pentru absența acesteia.",
  "grind.kundbeslut": "Decizia clientului privind propunerea înregistrată",
  "grind.kundbeslut.avbojt": "Lucrare efectuată în pofida unei propuneri refuzate",
  "grind.kundbeslut.avbojt.detalj":
    "Clientul a refuzat propunerea, dar există lucrări documentate ca fiind efectuate.",
  "grind.kvalitetskontroll": "Control de calitate efectuat — simptom verificat",
  "grind.kontroller": "Punctele de control ale metodologiei: dovadă sau o excepție documentată",
  "grind.foton": "Fotografii prezente pentru controalele care le impun",
  "grind.slutsats": "Concluzie finală (ALVA-RULE-200)",
  "grind.hogvolt.behorighet": "Autorizarea pentru înaltă tensiune confirmată",
  "grind.hogvolt.spanningslos": "Vehicul scos de sub tensiune conform procedurii producătorului",
  "grind.regelpaket": "Semnătura pachetului de reguli nu corespunde — închiderea este blocată.",
  "grind.regelpaket.osignerat":
    "Se utilizează un pachet de reguli extern fără semnătură — închiderea este blocată.",
  "grind.evidens": "Nivel de dovadă peste E0",
  "grind.evidens.saknas": "În jurnal nu există nicio dovadă.",
  "grind.foton.detalj": "{kontroller} controale necesită o fotografie, {foton} fotografii în jurnal.",
  "grind.sparr.ej_uppfyllt": "Cerința de siguranță nu este îndeplinită.",
  "grind.arendetyp.okant": "Cerință necunoscută în pachetul de reguli: {krav}",
  "grind.arendetyp.krav": "Cerință pentru acest tip de caz: {krav}",
  "grind.sakerhet": "Nivel de încredere în limitele a ceea ce susțin dovezile",
  "grind.sakerhet.detalj": "Încrederea indicată ({niva}) depășește ceea ce susțin dovezile ({tak}). Completează dovezile sau coboară nivelul — incertitudinea onestă este informație.",


  // ---- Concluzia finală (ALVA-RULE-200) -----------------------------------
  "slutsats.rubrik": "Concluzie finală",
  "slutsats.konstaterat": "Ce a fost stabilit",
  "slutsats.evidens": "Ce dovezi susțin acest lucru",
  "slutsats.avfardat": "Ce ipoteze au fost înlăturate și de ce",
  "slutsats.osakert": "Ce rămâne incert",
  "slutsats.ickesvar": "Aceasta nu este o concluzie. Indică ce a fost stabilit și ce dovezi susțin acest lucru.",
  "slutsats.falt.motivering": "Justificare",
  "slutsats.falt.motivering_ej": "Motivul pentru care cauza nu a putut fi stabilită",
  "slutsats.falt.uteslutet": "Alternative înlăturate",
  "slutsats.falt.kvarstaende": "Incertitudine rămasă",
  "slutsats.falt.atgardsval": "Alegerea acțiunii",
  "slutsats.saknas": "Lipsește: {falt}.",
  "slutsats.ickesvar.falt": "{falt}: „{text}” nu este o justificare. Indică ce se aplică în realitate și de ce.",
  "slutsats.for_kort": "{falt} este prea scurt ({langd} din cel puțin {minsta} caractere) pentru a putea fi verificat ulterior.",
  "slutsats.utan_varfor": "{falt} spune ce, dar nu de ce. Leagă concluzia de dovezi — ce anume din ele face ca aceasta să decurgă?",
  "slutsats.utan_slutsats": "Cazul nu poate fi închis fără o concluzie finală. Indică de ce concluzia decurge din dovezi.",
  "slutsats.hypotes_obemott": "Ipoteza „{text}” se află în jurnal, dar nu este tratată. Indică de ce a fost înlăturată sau de ce rămâne deschisă.",


  // ---- Parcursul cazului --------------------------------------------------
  "arende.nytt": "Caz nou",
  "arende.oppna": "Cazuri deschise",
  "arende.avslutade": "Cazuri închise",
  "arende.avsluta": "Închide cazul",
  "arende.avslutat": "Caz închis",
  "arende.kan_ej_avslutas": "Cazul nu poate fi încă închis",
  "arende.hinder": "Rămâne de rezolvat înainte de închidere",
  "arende.overlamna": "Predă",
  "arende.ansvarig": "Responsabil",

  // ---- Verificare prealabilă ----------------------------------------------
  "pre.rubrik": "Verificare prealabilă — înainte de începerea lucrării",
  "pre.historik.fraga":
    "A fost verificat istoricul vehiculului? (lucrări anterioare, defecte recurente, TSB, campanii)",
  "pre.historik.ja": "Da — verificat",
  "pre.historik.nej": "Nu",
  "pre.historik.skal": "Motivul pentru care istoricul nu a fost verificat (obligatoriu)",
  "pre.historik.relevant": "Lucrări anterioare relevante (opțional — lanț cauzal)",
  "pre.matarstallning": "Kilometraj",
  "pre.fotografera": "Fotografiază panoul de bord",
  "pre.felbeskrivning": "Descrierea defectului de către client verificată",
  "pre.observationer": "Altceva la primire?",

  // ---- Acțiuni ------------------------------------------------------------
  "handling.spara": "Salvează",
  "handling.avbryt": "Anulează",
  "handling.fortsatt": "Continuă",
  "handling.tillbaka": "Înapoi",
  "handling.dokumentera": "Documentează",
  "handling.fotografera": "Fotografiază",
  "handling.spela_in": "Înregistrează video",
  "handling.undantag": "Documentează o excepție",
  "handling.undantag.skal": "Motivul excepției (obligatoriu)",
  "handling.exportera": "Exportă",
  "handling.skriv_ut": "Tipărește",

  // ---- Măsurare -----------------------------------------------------------
  "matning.varde": "Valoare",
  "matning.enhet": "Unitate",
  "matning.matdon": "Instrument",
  "matning.matdon.valj": "Selectează instrumentul",
  "matning.matdon.okant": "Instrument necunoscut. Înregistrează-l înainte de salvarea măsurării.",
  "matning.kalibrerad_till": "Etalonat până la",

  // ---- Raport -------------------------------------------------------------
  "rapport.rubrik": "Raportul cazului",
  "rapport.sammanfattning": "Rezumat",
  "rapport.evidens": "Dovezi",
  "rapport.atgarder": "Acțiuni",
  "rapport.harledd":
    "Derivat din jurnalul cazului. Observațiile și măsurările sunt prezentate fără concluzii lipsite de temei.",

  // ---- Limbă --------------------------------------------------------------
  "sprak.valj": "Limbă",
  "sprak.granskat": "Verificat",
  "sprak.ogranskat": "Neverificat",
  "sprak.tackning": "{procent} % din interfață",

  "metodik.ogranskad":
    "Textul procedurilor nu a fost verificat de un specialist tehnic în limba {sprak}. Pașii și punctele de control sunt afișate în engleză acolo unde nu există o traducere verificată — o traducere neverificată a unei instrucțiuni de siguranță este mai gravă decât una într-o limbă străină, pentru că nu arată ca fiind străină.",
  "metodik.pa_engelska": "Afișat în engleză — nicio traducere verificată în limba {sprak}",
};
