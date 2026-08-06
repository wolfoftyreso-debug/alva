// ALVA-SPEC-060 · Polski.
//
// ---- Odmiana nazwy języka ------------------------------------------------
//
// {sprak} wstawia własną nazwę języka — «Polski» — w mianowniku. Po
// polsku «w języku Polski» jest błędem, a odmienić wstawianego wyrazu
// nie sposób bez tablicy przypadków dla dziesięciu języków. Dlatego
// zdania są tak sformułowane, by nazwa stała w nawiasie jako etykieta:
// «w tym języku ({sprak})». To wybór świadomy, nie niedopatrzenie.
//
// `granskat: false`: interfejs jest przetłumaczony, tekst procedur nie
// został sprawdzony przez specjalistę. Zob. index.mjs.

export const PL = {
  // ---- Stopnie dowodu -----------------------------------------------------
  "evidens.E1": "Obserwacja",
  "evidens.E2": "Fotografia",
  "evidens.E3": "Wideo z dźwiękiem",
  "evidens.E4": "Pomiar, przyrząd wzorcowany",
  "evidens.E5": "Dokument",
  "evidens.ej_kalibrerad": "brak wzorcowania lub wzorcowanie wygasło",
  "evidens.ej_angivet": "nie podano przyrządu",
  "evidens.ej_fotograferad": "wprowadzono, nie sfotografowano",

  // ---- Kontrola zamknięcia ------------------------------------------------
  "grind.objekt": "Identyfikacja pojazdu lub obiektu zweryfikowana",
  "grind.historik": "Historia pojazdu sprawdzona lub uzasadniona",
  "grind.historik.nekad": "Odmowa sprawdzenia historii wymaga podania powodu.",
  "grind.historik.saknas": "Nie udokumentowano sprawdzenia historii.",
  "grind.matarstallning.ingaende": "Stan licznika przy przyjęciu sfotografowany",
  "grind.matarstallning.utgaende": "Stan licznika przy wydaniu sfotografowany",
  "grind.matarstallning.saknas": "Nie udokumentowano stanu licznika.",
  "grind.matarstallning.ej_foto":
    "Stan licznika został wprowadzony, ale nie sfotografowany. Sfotografować licznik lub podać, dlaczego nie jest to możliwe.",
  "grind.reproducering": "Weryfikacja objawu: odtworzony lub udokumentowany jako nieodtwarzalny",
  "grind.felorsak": "Analiza przyczyny źródłowej udokumentowana",
  "grind.atgard": "Działanie naprawcze udokumentowane lub uzasadnione",
  "grind.atgard.saknas": "Nie udokumentowano ani wykonanego działania, ani powodu jego braku.",
  "grind.kundbeslut": "Decyzja klienta w sprawie propozycji zarejestrowana",
  "grind.kundbeslut.avbojt": "Praca wykonana mimo odrzuconej propozycji",
  "grind.kundbeslut.avbojt.detalj": "Klient odrzucił propozycję, ale praca jest udokumentowana jako wykonana.",
  "grind.kvalitetskontroll": "Kontrola jakości wykonana — objaw zweryfikowany",
  "grind.kontroller": "Punkty kontrolne metodyki: dowód lub udokumentowane odstępstwo",
  "grind.foton": "Fotografie obecne przy kontrolach, które ich wymagają",
  "grind.slutsats": "Wniosek końcowy (ALVA-RULE-200)",
  "grind.hogvolt.behorighet": "Uprawnienia wysokonapięciowe potwierdzone",
  "grind.hogvolt.spanningslos": "Pojazd odłączony od napięcia zgodnie z procedurą producenta",
  "grind.regelpaket": "Podpis pakietu reguł nie zgadza się — zamknięcie zablokowane.",
  "grind.regelpaket.osignerat": "Używany jest zewnętrzny pakiet reguł bez podpisu — zamknięcie zablokowane.",
  "grind.evidens": "Poziom dowodu powyżej E0",
  "grind.evidens.saknas": "W dzienniku nie ma żadnego dowodu.",
  "grind.foton.detalj": "{kontroller} kontroli wymaga fotografii, {foton} fotografii w dzienniku.",
  "grind.sparr.ej_uppfyllt": "Wymóg bezpieczeństwa nie jest spełniony.",
  "grind.arendetyp.okant": "Nieznany wymóg w pakiecie reguł: {krav}",
  "grind.arendetyp.krav": "Wymóg dla tego rodzaju sprawy: {krav}",


  // ---- Wniosek końcowy (ALVA-RULE-200) ------------------------------------
  "slutsats.rubrik": "Wniosek końcowy",
  "slutsats.konstaterat": "Co zostało ustalone",
  "slutsats.evidens": "Jakie dowody to potwierdzają",
  "slutsats.avfardat": "Które hipotezy odrzucono i dlaczego",
  "slutsats.osakert": "Co pozostaje niepewne",
  "slutsats.ickesvar": "To nie jest wniosek. Podać, co zostało ustalone i jakie dowody to potwierdzają.",
  "slutsats.falt.motivering": "Uzasadnienie",
  "slutsats.falt.motivering_ej": "Powód, dla którego nie ustalono przyczyny",
  "slutsats.falt.uteslutet": "Odrzucone alternatywy",
  "slutsats.falt.kvarstaende": "Pozostała niepewność",
  "slutsats.falt.atgardsval": "Wybór działania",
  "slutsats.saknas": "Brakuje: {falt}.",
  "slutsats.ickesvar.falt": "{falt}: „{text}” nie jest uzasadnieniem. Podać, co faktycznie obowiązuje i dlaczego.",
  "slutsats.for_kort": "{falt} jest za krótkie ({langd} z co najmniej {minsta} znaków), aby dało się je później zweryfikować.",
  "slutsats.utan_varfor": "{falt} podaje co, ale nie dlaczego. Powiązać wniosek z dowodami — co w nich sprawia, że to wynika?",
  "slutsats.utan_slutsats": "Sprawy nie można zamknąć bez wniosku końcowego. Podać, dlaczego wniosek wynika z dowodów.",
  "slutsats.hypotes_obemott": "Hipoteza „{text}” znajduje się w dzienniku, ale nie została omówiona. Podać, dlaczego ją odrzucono lub dlaczego pozostaje otwarta.",


  // ---- Przebieg sprawy ----------------------------------------------------
  "arende.nytt": "Nowa sprawa",
  "arende.oppna": "Sprawy otwarte",
  "arende.avslutade": "Sprawy zamknięte",
  "arende.avsluta": "Zamknij sprawę",
  "arende.avslutat": "Sprawa zamknięta",
  "arende.kan_ej_avslutas": "Sprawy nie można jeszcze zamknąć",
  "arende.hinder": "Do wykonania przed zamknięciem",
  "arende.overlamna": "Przekaż",
  "arende.ansvarig": "Odpowiedzialny",

  // ---- Kontrola wstępna ---------------------------------------------------
  "pre.rubrik": "Kontrola wstępna — przed rozpoczęciem pracy",
  "pre.historik.fraga":
    "Czy historia pojazdu została sprawdzona? (wcześniejsze naprawy, powtarzające się usterki, TSB, akcje serwisowe)",
  "pre.historik.ja": "Tak — sprawdzona",
  "pre.historik.nej": "Nie",
  "pre.historik.skal": "Powód niesprawdzenia historii (wymagane)",
  "pre.historik.relevant": "Istotne wcześniejsze naprawy (opcjonalnie — łańcuch przyczynowy)",
  "pre.matarstallning": "Stan licznika",
  "pre.fotografera": "Sfotografuj zestaw wskaźników",
  "pre.felbeskrivning": "Opis usterki podany przez klienta zweryfikowany",
  "pre.observationer": "Coś jeszcze przy przyjęciu?",

  // ---- Czynności ----------------------------------------------------------
  "handling.spara": "Zapisz",
  "handling.avbryt": "Anuluj",
  "handling.fortsatt": "Dalej",
  "handling.tillbaka": "Wstecz",
  "handling.dokumentera": "Udokumentuj",
  "handling.fotografera": "Sfotografuj",
  "handling.spela_in": "Nagraj wideo",
  "handling.undantag": "Udokumentuj odstępstwo",
  "handling.undantag.skal": "Powód odstępstwa (wymagane)",
  "handling.exportera": "Eksportuj",
  "handling.skriv_ut": "Drukuj",

  // ---- Pomiar -------------------------------------------------------------
  "matning.varde": "Wartość",
  "matning.enhet": "Jednostka",
  "matning.matdon": "Przyrząd",
  "matning.matdon.valj": "Wybierz przyrząd",
  "matning.matdon.okant": "Nieznany przyrząd. Zarejestrować go przed zapisaniem pomiaru.",
  "matning.kalibrerad_till": "Wzorcowany do",

  // ---- Raport -------------------------------------------------------------
  "rapport.rubrik": "Raport sprawy",
  "rapport.sammanfattning": "Podsumowanie",
  "rapport.evidens": "Dowody",
  "rapport.atgarder": "Działania",
  "rapport.harledd":
    "Wyprowadzony z dziennika sprawy. Obserwacje i pomiary są przedstawiane bez wniosków pozbawionych podstaw.",

  // ---- Język --------------------------------------------------------------
  "sprak.valj": "Język",
  "sprak.granskat": "Sprawdzony",
  "sprak.ogranskat": "Niesprawdzony",
  "sprak.tackning": "{procent} % interfejsu",

  "metodik.ogranskad":
    "Tekst procedur nie został sprawdzony przez specjalistę technicznego w tym języku ({sprak}). Kroki i punkty kontrolne są wyświetlane po angielsku tam, gdzie nie ma sprawdzonego tłumaczenia — niesprawdzone tłumaczenie instrukcji bezpieczeństwa jest gorsze niż instrukcja w obcym języku, ponieważ nie wygląda obco.",
  "metodik.pa_engelska": "Wyświetlane po angielsku — brak sprawdzonego tłumaczenia w tym języku ({sprak})",
};
