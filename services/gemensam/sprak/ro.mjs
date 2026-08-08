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
  "evidens.E3": "Înregistrare video cu sunet",
  "evidens.E4": "Măsurătoare, instrument etalonat",
  "evidens.E5": "Document",
  "evidens.ej_kalibrerad": "etalonare lipsă sau expirată",
  "evidens.ej_angivet": "instrument neindicat",
  "evidens.ej_fotograferad": "introdus, nefotografiat",

  // ---- Controlul de închidere ---------------------------------------------
  "grind.objekt": "Identificarea vehiculului sau a obiectului verificată",
  "grind.historik": "Istoricul vehiculului verificat, sau omiterea verificării justificată",
  "grind.historik.nekad": "O verificare refuzată a istoricului necesită un motiv declarat.",
  "grind.historik.saknas": "Nicio verificare a istoricului documentată.",
  "grind.matarstallning.ingaende": "Kilometrajul la primire fotografiat",
  "grind.matarstallning.utgaende": "Kilometrajul la predare fotografiat",
  "grind.matarstallning.saknas": "Niciun kilometraj documentat.",
  "grind.matarstallning.ej_foto":
    "Kilometrajul este introdus, dar nu este fotografiat. Fotografiază odometrul sau indică de ce acest lucru nu este posibil.",
  "grind.reproducering": "Verificarea simptomului: reprodus sau documentat ca nereproductibil",
  "grind.felorsak": "Analiza cauzei rădăcină documentată",
  "grind.atgard": "Acțiune corectivă documentată, sau absența ei justificată",
  "grind.atgard.saknas": "Nu este documentată nici o acțiune efectuată, nici un motiv pentru absența acesteia.",
  "grind.kundbeslut": "Decizia clientului cu privire la propunere, înregistrată",
  "grind.kundbeslut.avbojt": "Lucrare efectuată în pofida unei propuneri refuzate",
  "grind.kundbeslut.avbojt.detalj":
    "Clientul a refuzat propunerea, dar există lucrări documentate ca fiind efectuate.",
  "grind.kvalitetskontroll": "Control de calitate efectuat — simptom verificat ca rezolvat",
  "grind.kontroller": "Punctele de control ale metodologiei: dovadă sau o excepție documentată",
  "grind.foton": "Fotografii prezente pentru controalele care le impun",
  "grind.slutsats": "Concluzie finală (ALVA-RULE-200)",
  "grind.hogvolt.behorighet": "Autorizarea pentru înaltă tensiune confirmată",
  "grind.hogvolt.spanningslos": "Vehicul scos de sub tensiune conform procedurii producătorului, absența tensiunii verificată prin măsurare",
  "grind.regelpaket": "Semnătura pachetului de reguli nu corespunde — închiderea este blocată.",
  "grind.regelpaket.osignerat":
    "Se utilizează un pachet de reguli extern fără semnătură — închiderea este blocată.",
  "grind.evidens": "Nivel de dovadă peste E0",
  "grind.evidens.saknas": "În jurnal nu există nicio dovadă.",
  "grind.foton.detalj": "Controale care necesită fotografie: {kontroller}; fotografii în jurnal: {foton}.",
  "grind.sparr.ej_uppfyllt": "Cerința de siguranță nu este îndeplinită.",
  "grind.arendetyp.okant": "Cerință necunoscută în pachetul de reguli: {krav}",
  "grind.arendetyp.krav": "Cerință pentru acest tip de caz: {krav}",
  "grind.sakerhet": "Nivel de încredere în limitele a ceea ce susțin dovezile",
  "grind.sakerhet.detalj": "Încrederea indicată ({niva}) depășește ceea ce susțin dovezile ({tak}). Completează dovezile sau coboară nivelul — incertitudinea onestă este informație.",
  "grind.eskalering": "Escaladări tehnice cu răspuns",
  "grind.eskalering.detalj": "O escaladare este deschisă ({referens}). Așteaptă răspunsul și documentează-l înainte de închiderea cazului.",


  // ---- Concluzia finală (ALVA-RULE-200) -----------------------------------
  "slutsats.rubrik": "Concluzie finală",
  "slutsats.konstaterat": "Ce a fost stabilit",
  "slutsats.evidens": "Ce dovezi susțin acest lucru",
  "slutsats.avfardat": "Ce ipoteze au fost înlăturate și de ce",
  "slutsats.osakert": "Ce rămâne incert",
  "slutsats.ickesvar": "Acesta nu este un răspuns. Indică ce a fost stabilit și ce dovezi susțin acest lucru.",
  "slutsats.falt.motivering": "Justificare",
  "slutsats.falt.motivering_ej": "Motivul pentru care cauza nu a putut fi stabilită",
  "slutsats.falt.uteslutet": "Alternative înlăturate",
  "slutsats.falt.kvarstaende": "Incertitudine rămasă",
  "slutsats.falt.atgardsval": "Alegerea acțiunii",
  "slutsats.saknas": "Lipsește: {falt}.",
  "slutsats.ickesvar.falt": "{falt}: „{text}” nu este o justificare. Indică ce se aplică în realitate și de ce.",
  "slutsats.for_kort": "Câmpul {falt} este prea scurt pentru a putea fi verificat ulterior (caractere: {langd}, minim: {minsta}).",
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
  "pre.fotografera": "Fotografiază panoul de instrumente",
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
  "matning.matdon.okant": "Instrument necunoscut. Înregistrează-l înainte de salvarea măsurătorii.",
  "matning.kalibrerad_till": "Etalonat până la",

  // ---- Raport -------------------------------------------------------------
  "rapport.rubrik": "Raportul cazului",
  "rapport.sammanfattning": "Rezumat",
  "rapport.evidens": "Dovezi",
  "rapport.atgarder": "Acțiuni",
  "rapport.harledd":
    "Derivat din jurnalul cazului. Observațiile și măsurătorile sunt prezentate fără concluzii lipsite de temei.",

  // ---- Limbă --------------------------------------------------------------
  "sprak.valj": "Limbă",
  "sprak.granskat": "Revizuit",
  "sprak.ogranskat": "Nerevizuit",
  "sprak.tackning": "{procent} % din interfață",

  "metodik.ogranskad":
    "Textul procedurilor nu a fost verificat de un specialist tehnic în limba {sprak}. Pașii și punctele de control sunt afișate în engleză acolo unde nu există o traducere verificată — o traducere neverificată a unei instrucțiuni de siguranță este mai gravă decât una într-o limbă străină, pentru că nu arată ca fiind străină.",
  "metodik.pa_engelska": "Afișat în engleză — nicio traducere verificată în limba {sprak}",

  // ---- Site-ul public (webb.) --------------------------------------------
  "webb.nav.oversikt": "Prezentare generală",
  "webb.ansok": "Solicitați un cont",
  "webb.loggain": "Autentificare",
  "webb.fot.impressum": "Informații legale",
  "webb.fot.dataskydd": "Confidențialitate",
  "webb.fot.villkor": "Condiții",
  "webb.fot.tillganglighet": "Accesibilitate",
  "webb.fot.sprak": "Limbi",
  "webb.fot.utgavor": "Note de versiune",

  "webb.hero.position": "Platformă de diagnosticare ghidată",
  "webb.hero.definition": "Proceduri de diagnosticare standardizate pentru o depanare repetabilă și verificabilă.",

  "webb.metod.etikett": "Metodologie",
  "webb.metod.rubrik": "Modelul ALVA",
  "webb.metod.ingress":
    "ALVA este o metodă standardizată de analiză, localizare, verificare și acțiune sistematice. Fiecare decizie este trasabilă, fiecare concluzie verificabilă, fiecare acțiune reproductibilă.",
  "webb.fas.analysis.syfte": "Strânge dovezile.",
  "webb.fas.analysis.avgransning": "Doar fapte. În această fază nu se adună ipoteze.",
  "webb.fas.localization.syfte": "Izolează defectul.",
  "webb.fas.localization.avgransning": "Restrânge zona. Cauza nu este încă stabilită.",
  "webb.fas.verification.syfte": "Confirmă cauza rădăcină.",
  "webb.fas.verification.avgransning": "Se verifică cauza — nu simptomul.",
  "webb.fas.action.syfte": "Execută acțiunea corectivă.",
  "webb.fas.action.avgransning": "Rezultat verificat și documentat. Altfel faza este incompletă.",

  "webb.drift.etikett": "Funcționare",
  "webb.drift.rubrik": "Cum funcționează",
  "webb.drift.s1.rubrik": "Crearea organizației",
  "webb.drift.s1.text": "Înregistrarea este depusă și examinată.",
  "webb.drift.s2.rubrik": "Utilizatorii primesc conturi",
  "webb.drift.s2.text": "Rolurile sunt atribuite de administratorul organizației.",
  "webb.drift.s3.rubrik": "Proceduri de diagnosticare ghidate",
  "webb.drift.s3.text": "Fiecare caz urmează o procedură definită.",
  "webb.drift.s4.rubrik": "Verificare",
  "webb.drift.s4.text": "Cauza rădăcină este confirmată înaintea acțiunii corective.",
  "webb.drift.s5.rubrik": "Documentare",
  "webb.drift.s5.text": "Dosarul este generat din jurnalul cazului.",
  "webb.drift.s6.rubrik": "Îmbunătățire continuă",
  "webb.drift.s6.text": "Rezultatele verificate rafinează procedurile următoare.",

  "webb.larande.etikett": "Capacitate",
  "webb.larande.rubrik": "Învățarea organizației",
  "webb.larande.p1":
    "Platforma rafinează continuu procedurile de diagnosticare cu experiența operațională verificată a propriei organizații.",
  "webb.larande.p2":
    "Fiecare diagnostic încheiat alimentează ghidarea ulterioară. Se folosesc doar rezultate verificate — un caz închis fără cauză rădăcină confirmată nu contribuie cu nimic, în mod intenționat.",
  "webb.larande.p3":
    "Baza de cunoștințe aparține organizației. Este derivată din cazurile, procedurile și documentația dumneavoastră și nu este agregată între clienți.",
  "webb.larande.block": "Derivată din",
  "webb.larande.k1": "Cauze rădăcină verificate",
  "webb.larande.k2": "Acțiuni corective confirmate",
  "webb.larande.k3": "Categorii de defecte recurente",
  "webb.larande.k4": "Evidențe de finalizare a procedurilor",
  "webb.larande.k5": "Documentația organizației",

  "webb.rapport.etikett": "Raportare",
  "webb.rapport.rubrik": "Raport trimestrial de îmbunătățire",
  "webb.rapport.ingress":
    "O dată pe trimestru, platforma răspunde la șase întrebări despre munca atelierului însuși. Fiecare răspuns este derivat din jurnalul cazurilor — nimic nu se estimează și nimeni nu este întrebat nimic.",
  "webb.rapport.f1": "Ce defecte diagnosticăm acum corect din prima?",
  "webb.rapport.f2": "Cât de des o cauză bănuită se dovedește a fi cea reală?",
  "webb.rapport.f3": "Ce defecte revin mereu în flotă?",
  "webb.rapport.f4": "Ce pași de procedură sunt omiși, și de ce?",
  "webb.rapport.f5": "Ce știe atelierul acum și nu știa trimestrul trecut?",
  "webb.rapport.f6": "Cazurile sunt încheiate, verificate și documentate — sau doar încheiate?",

  "webb.pris.etikett": "Comercial",
  "webb.pris.rubrik": "Licențiere",
  "webb.pris.komponent": "Componentă",
  "webb.pris.grund": "Bază",
  "webb.pris.plattform": "Licență de platformă",
  "webb.pris.plattform.grund": "Per organizație, anual",
  "webb.pris.anvandare": "Licențe de utilizator",
  "webb.pris.anvandare.grund": "Per utilizator activ, lunar",
  "webb.pris.moduler": "Module pentru întreprinderi",
  "webb.pris.moduler.grund": "Opționale, per modul",
  "webb.pris.betalning": "Fără plată online. Fără înscriere la abonament. Facturarea urmează examinării cererii.",
  "webb.pris.aktivering": "Secvența de activare",
  "webb.pris.a1": "Organizația depune înregistrarea.",
  "webb.pris.a2": "Cererea este examinată.",
  "webb.pris.a3": "Se emite factura.",
  "webb.pris.a4": "Plata este înregistrată.",
  "webb.pris.a5": "Organizația este activată.",
  "webb.pris.a6": "Utilizatorii suplimentari sunt facturați lunar.",

  "webb.kallor.etikett": "Infrastructură",
  "webb.kallor.rubrik": "Infrastructură operațională de cunoștințe",
  "webb.kallor.p1":
    "ALVA folosește sursele de cunoștințe autorizate ale organizației. Arhitectura este neutră față de furnizor: fiecare sursă implementează aceeași interfață și niciun furnizor nu este presupus.",
  "webb.kallor.p2":
    "O instalare beta lucrează doar cu documentația internă. Furnizorii externi sunt activați mai târziu prin conectori separați, fără modificarea nucleului platformei.",
  "webb.kallor.block": "Ordinea de rezolvare a surselor",
  "webb.kallor.k1": "Proceduri interne ale firmei",
  "webb.kallor.k2": "Documentație OEM",
  "webb.kallor.k3": "Buletine tehnice",
  "webb.kallor.k4": "Informații de garanție",
  "webb.kallor.k5": "Manuale de atelier",
  "webb.kallor.k6": "Diagnostice istorice verificate",
  "webb.kallor.k7": "Bune practici ale organizației",

  "webb.login.etikett": "Acces",
  "webb.login.demo":
    "Această autentificare nu autentifică nimic. Scrieți orice în E-mail și Parolă și apăsați Conectare — nu este nevoie de cont, iar portalul din spate prezintă date de exemplu fixe. Conectată la o instanță a platformei, această pagină se autentifică față de ea, iar fără o sesiune validă portalul este închis.",
  "webb.login.losenord": "Parolă",
  "webb.login.ofullstandigt": "Autentificare incompletă. E-mailul și parola sunt obligatorii.",
  "webb.login.misslyckades": "Autentificarea a eșuat.",
  "webb.login.logga_in": "Conectare",
  "webb.login.loggar_in": "Se conectează",
  "webb.login.glomt": "Parolă uitată",

  "webb.ansokan.etikett": "Înregistrare",
  "webb.ansokan.demo":
    "Nu se trimite nimic. Trimiterea formularului nu salvează nimic, nu anunță pe nimeni și nu creează nicio cerere — în spate nu există încă niciun proces de preluare. Descrierea de mai jos arată cum ar urma să funcționeze înregistrarea, nu ce se întâmplă astăzi.",
  "webb.ansokan.avsikt": "Funcționare prevăzută: cererile sunt examinate manual și în această etapă nu se percepe nicio plată.",
  "webb.falt.foretag": "Firmă",
  "webb.falt.orgnummer": "Număr de înregistrare",
  "webb.falt.kontakt": "Persoană de contact",
  "webb.falt.epost": "E-mail",
  "webb.falt.telefon": "Telefon",
  "webb.falt.tekniker": "Număr de tehnicieni",
  "webb.falt.bransch": "Domeniu",
  "webb.falt.land": "Țară",
  "webb.falt.anvandare": "Număr estimat de utilizatori",
  "webb.falt.noteringar": "Observații",
  "webb.falt.kravs": "(obligatoriu)",
  "webb.ansokan.skicka": "Trimiteți cererea",
  "webb.ansokan.mottagen.etikett": "Cerere",
  "webb.ansokan.mottagen": "Depusă",
  "webb.ansokan.mottagen.demo":
    "Nimic nu a fost transmis și nimeni nu a fost anunțat. Referința de mai jos a fost calculată în browserul dumneavoastră din ce ați scris și nu există nicăieri altundeva — va dispărea la închiderea acestei pagini.",
  "webb.ansokan.status": "Stare",
  "webb.ansokan.referens": "Referință",
  "webb.ansokan.granskning":
    "Cererile sunt examinate manual. La aprobare se emite o factură. Organizația este activată după înregistrarea plății.",

  "webb.sprak.etikett": "Localizare",
  "webb.sprak.rubrik": "Limbi",
  "webb.sprak.ingress":
    "Engleza este limba implicită și limba sursă. Urmează nouă traduceri. Ce nu face platforma: nu pretinde că o interfață tradusă înseamnă o metodă tradusă.",
  "webb.sprak.princip.etikett": "Principiu",
  "webb.sprak.princip.rubrik": "Două feluri de text",
  "webb.sprak.granssnitt.rubrik": "Text de interfață",
  "webb.sprak.granssnitt.beteckning": "Revine în tăcere",
  "webb.sprak.granssnitt.text":
    "Etichete, butoane, stări. Finit, rar schimbat. Un șir englezesc care ajunge la un utilizator german este o iritare, nu un pericol — o traducere lipsă revine deci la engleză fără comentariu.",
  "webb.sprak.metodik.rubrik": "Text de procedură",
  "webb.sprak.metodik.beteckning": "Nu revine niciodată în tăcere",
  "webb.sprak.metodik.text":
    "Instrucțiuni pentru lucrul la un vehicul. Aici o traducere neverificată este mai rea decât una într-o limbă străină — pentru că engleza pare străină, în timp ce o traducere proastă pare o instrucțiune. Este afișat în engleză și marcat, cu indicarea limbii.",
  "webb.sprak.invariant":
    "Metoda în sine nu se traduce niciodată. Numele fazelor și cuvintele de stare sunt structura ALVA și se citesc identic în fiecare țară, astfel încât un auditor poate citi un dosar românesc și unul german fără să știe în ce limbă lucrează atelierul.",
  "webb.sprak.tackning.etikett": "Acoperire",
  "webb.sprak.tackning.rubrik": "Ce este tradus, și ce este verificat",
  "webb.sprak.kolumn.sprak": "Limbă",
  "webb.sprak.kolumn.granssnitt": "Interfață",
  "webb.sprak.kolumn.granskat": "Metodă revizuită de un specialist",
  "webb.sprak.granskat.ja": "Da",
  "webb.sprak.granskat.nej": "Nu — textul de procedură afișat în engleză",
  "webb.sprak.matt":
    "Acoperirea interfeței se măsoară, nu se estimează: un test oprește compilarea dacă vreo cheie lipsește din vreo limbă. Starea de verificare este o afirmație despre oameni, nu despre fișiere, și se stabilește manual.",
  "webb.sprak.kallsprak":
    "Textul de procedură în engleză este o traducere a sursei suedeze și nu a fost încă citit de un specialist care practică meseria. I se aplică același standard ca celorlalte nouă limbi, iar aici se face despre el aceeași declarație în loc să fie exceptat în tăcere pentru că este sursa.",
  "webb.sprak.bevis.etikett": "Verificare",
  "webb.sprak.bevis.rubrik": "Frazele care opresc un caz",
  "webb.sprak.bevis.ingress":
    "Acestea sunt frazele care refuză unui tehnician închiderea unui caz. Un refuz pe care nimeni nu îl înțelege este un refuz fără ieșire — deci sunt frazele potrivite pentru a judeca o traducere.",
  "webb.sprak.ej_granskad": "Nerevizuit",
  "webb.sprak.granskad": "Revizuit",
  "webb.sprak.granskad.text":
    "Textul de procedură în limba {sprak} a fost revizuit de un specialist care practică meseria. Pașii și punctele de control sunt afișate peste tot în limba {sprak}.",
  "webb.sprak.val.etikett": "Funcționare",
  "webb.sprak.val.rubrik": "Cum se alege limba",
  "webb.sprak.val.s1.rubrik": "Preferința utilizatorului",
  "webb.sprak.val.s1.text": "Ce a selectat persoana.",
  "webb.sprak.val.s2.rubrik": "Setarea organizației",
  "webb.sprak.val.s2.text": "Limba de documentare a atelierului.",
  "webb.sprak.val.s3.rubrik": "Limba browserului",
  "webb.sprak.val.s3.text": "Prima limbă pe care platforma o recunoaște.",
  "webb.sprak.val.s4.rubrik": "Engleza",
  "webb.sprak.val.s4.text": "Limba implicită — și limba sursă.",
  "webb.sprak.val.notering":
    "Organizația trece intenționat înaintea browserului. Un atelier din Germania cu un tehnician polonez are nevoie de o singură limbă de documentare — dosarul nu trebuie să schimbe limba în funcție de cine a scris rândul.",
};
