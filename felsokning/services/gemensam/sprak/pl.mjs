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
  "grind.sakerhet": "Poziom pewności w granicach tego, co potwierdzają dowody",
  "grind.sakerhet.detalj": "Podany poziom pewności ({niva}) przekracza to, co potwierdzają dowody ({tak}). Uzupełnić dowody lub obniżyć poziom — uczciwa niepewność to informacja.",


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

  // ---- Publiczna witryna (webb.) -----------------------------------------
  "webb.nav.oversikt": "Przegląd",
  "webb.ansok": "Wniosek o konto",
  "webb.loggain": "Logowanie",
  "webb.fot.impressum": "Nota prawna",
  "webb.fot.dataskydd": "Prywatność",
  "webb.fot.villkor": "Warunki",
  "webb.fot.tillganglighet": "Dostępność",
  "webb.fot.sprak": "Języki",
  "webb.fot.utgavor": "Informacje o wydaniach",

  "webb.hero.position": "Platforma diagnostyki prowadzonej",
  "webb.hero.definition": "Znormalizowane procedury diagnostyczne dla powtarzalnego i weryfikowalnego wykrywania usterek.",

  "webb.metod.etikett": "Metodyka",
  "webb.metod.rubrik": "Model ALVA",
  "webb.metod.ingress":
    "ALVA to znormalizowana metoda systematycznej analizy, lokalizacji, weryfikacji i działania. Każda decyzja jest identyfikowalna, każdy wniosek weryfikowalny, każde działanie powtarzalne.",
  "webb.fas.analysis.syfte": "Zebrać dowody.",
  "webb.fas.analysis.avgransning": "Wyłącznie fakty. W tej fazie nie zbiera się hipotez.",
  "webb.fas.localization.syfte": "Zawęzić usterkę.",
  "webb.fas.localization.avgransning": "Ograniczyć obszar. Przyczyna nie jest jeszcze ustalona.",
  "webb.fas.verification.syfte": "Potwierdzić przyczynę źródłową.",
  "webb.fas.verification.avgransning": "Weryfikowana jest przyczyna — nie objaw.",
  "webb.fas.action.syfte": "Wykonać działanie naprawcze.",
  "webb.fas.action.avgransning": "Wynik zweryfikowany i udokumentowany. Inaczej faza jest niezakończona.",

  "webb.drift.etikett": "Działanie",
  "webb.drift.rubrik": "Jak to działa",
  "webb.drift.s1.rubrik": "Utworzenie organizacji",
  "webb.drift.s1.text": "Rejestracja zostaje złożona i rozpatrzona.",
  "webb.drift.s2.rubrik": "Użytkownicy otrzymują konta",
  "webb.drift.s2.text": "Role przydziela administrator organizacji.",
  "webb.drift.s3.rubrik": "Prowadzone procedury diagnostyczne",
  "webb.drift.s3.text": "Każda sprawa przebiega według zdefiniowanej procedury.",
  "webb.drift.s4.rubrik": "Weryfikacja",
  "webb.drift.s4.text": "Przyczyna źródłowa jest potwierdzana przed działaniem naprawczym.",
  "webb.drift.s5.rubrik": "Dokumentacja",
  "webb.drift.s5.text": "Raport powstaje z dziennika sprawy.",
  "webb.drift.s6.rubrik": "Ciągłe doskonalenie",
  "webb.drift.s6.text": "Zweryfikowane wyniki udoskonalają kolejne procedury.",

  "webb.larande.etikett": "Zdolność",
  "webb.larande.rubrik": "Uczenie się organizacji",
  "webb.larande.p1":
    "Platforma stale udoskonala procedury diagnostyczne na podstawie zweryfikowanego doświadczenia operacyjnego własnej organizacji.",
  "webb.larande.p2":
    "Każda ukończona diagnoza zasila kolejne wskazówki. Używane są wyłącznie zweryfikowane wyniki — sprawa zamknięta bez potwierdzonej przyczyny źródłowej celowo nie wnosi nic.",
  "webb.larande.p3":
    "Baza wiedzy należy do organizacji. Powstaje z waszych spraw, waszych procedur i waszej dokumentacji i nie jest agregowana między klientami.",
  "webb.larande.block": "Pochodzi z",
  "webb.larande.k1": "Zweryfikowane przyczyny źródłowe",
  "webb.larande.k2": "Potwierdzone działania naprawcze",
  "webb.larande.k3": "Powtarzające się kategorie usterek",
  "webb.larande.k4": "Zapisy ukończonych procedur",
  "webb.larande.k5": "Dokumentacja organizacji",

  "webb.rapport.etikett": "Raportowanie",
  "webb.rapport.rubrik": "Kwartalny raport doskonalenia",
  "webb.rapport.ingress":
    "Raz na kwartał platforma odpowiada na sześć pytań o pracę samego warsztatu. Każda odpowiedź pochodzi z dziennika spraw — niczego się nie szacuje i nikogo o nic nie pyta.",
  "webb.rapport.f1": "Które usterki diagnozujemy teraz poprawnie za pierwszym razem?",
  "webb.rapport.f2": "Jak często podejrzewana przyczyna okazuje się rzeczywistą?",
  "webb.rapport.f3": "Które usterki wciąż wracają we flocie?",
  "webb.rapport.f4": "Które kroki procedury są pomijane i dlaczego?",
  "webb.rapport.f5": "Co warsztat wie teraz, czego nie wiedział w zeszłym kwartale?",
  "webb.rapport.f6": "Czy sprawy są zamykane, weryfikowane i dokumentowane — czy tylko zamykane?",

  "webb.pris.etikett": "Warunki handlowe",
  "webb.pris.rubrik": "Licencjonowanie",
  "webb.pris.komponent": "Składnik",
  "webb.pris.grund": "Podstawa",
  "webb.pris.plattform": "Licencja platformy",
  "webb.pris.plattform.grund": "Na organizację, rocznie",
  "webb.pris.anvandare": "Licencje użytkowników",
  "webb.pris.anvandare.grund": "Na aktywnego użytkownika, miesięcznie",
  "webb.pris.moduler": "Moduły korporacyjne",
  "webb.pris.moduler.grund": "Opcjonalne, na moduł",
  "webb.pris.betalning": "Bez płatności online. Bez samodzielnej subskrypcji. Fakturowanie następuje po rozpatrzeniu wniosku.",
  "webb.pris.aktivering": "Kolejność aktywacji",
  "webb.pris.a1": "Organizacja składa rejestrację.",
  "webb.pris.a2": "Wniosek jest rozpatrywany.",
  "webb.pris.a3": "Wystawiana jest faktura.",
  "webb.pris.a4": "Płatność zostaje zaksięgowana.",
  "webb.pris.a5": "Organizacja zostaje aktywowana.",
  "webb.pris.a6": "Kolejni użytkownicy są rozliczani miesięcznie.",

  "webb.kallor.etikett": "Infrastruktura",
  "webb.kallor.rubrik": "Operacyjna infrastruktura wiedzy",
  "webb.kallor.p1":
    "ALVA korzysta z własnych, autoryzowanych źródeł wiedzy organizacji. Architektura jest neutralna wobec dostawców: każde źródło implementuje ten sam interfejs i żaden dostawca nie jest zakładany.",
  "webb.kallor.p2":
    "Instalacja beta pracuje wyłącznie na dokumentacji wewnętrznej. Zewnętrzni dostawcy są włączani później przez osobne łączniki, bez zmian w rdzeniu platformy.",
  "webb.kallor.block": "Kolejność rozstrzygania źródeł",
  "webb.kallor.k1": "Wewnętrzne procedury firmy",
  "webb.kallor.k2": "Dokumentacja OEM",
  "webb.kallor.k3": "Biuletyny techniczne",
  "webb.kallor.k4": "Informacje gwarancyjne",
  "webb.kallor.k5": "Podręczniki serwisowe",
  "webb.kallor.k6": "Historyczne zweryfikowane diagnozy",
  "webb.kallor.k7": "Dobre praktyki organizacji",

  "webb.login.etikett": "Dostęp",
  "webb.login.demo":
    "To logowanie niczego nie uwierzytelnia. Wpisz cokolwiek w polach E-mail i Hasło i naciśnij Zaloguj — konto nie jest potrzebne, a portal za nim pokazuje stałe dane przykładowe. Połączona z instancją platformy strona uwierzytelnia się wobec niej, a bez ważnej sesji portal jest zamknięty.",
  "webb.login.losenord": "Hasło",
  "webb.login.ofullstandigt": "Uwierzytelnianie niekompletne. Wymagane są e-mail i hasło.",
  "webb.login.misslyckades": "Uwierzytelnianie nie powiodło się.",
  "webb.login.logga_in": "Zaloguj",
  "webb.login.loggar_in": "Logowanie w toku",
  "webb.login.glomt": "Nie pamiętam hasła",

  "webb.ansokan.etikett": "Rejestracja",
  "webb.ansokan.demo":
    "Nic nie jest wysyłane. Wysłanie formularza niczego nie zapisuje, nikogo nie powiadamia i nie tworzy wniosku — nie ma za nim jeszcze punktu przyjęć. Opis poniżej mówi, jak rejestracja ma działać, a nie co dzieje się dziś.",
  "webb.ansokan.avsikt": "Zamierzone działanie: wnioski są rozpatrywane ręcznie i na tym etapie nie jest pobierana żadna płatność.",
  "webb.falt.foretag": "Firma",
  "webb.falt.orgnummer": "Numer rejestrowy",
  "webb.falt.kontakt": "Osoba kontaktowa",
  "webb.falt.epost": "E-mail",
  "webb.falt.telefon": "Telefon",
  "webb.falt.tekniker": "Liczba techników",
  "webb.falt.bransch": "Branża",
  "webb.falt.land": "Kraj",
  "webb.falt.anvandare": "Przewidywana liczba użytkowników",
  "webb.falt.noteringar": "Uwagi",
  "webb.falt.kravs": "(wymagane)",
  "webb.ansokan.skicka": "Wyślij wniosek",
  "webb.ansokan.mottagen.etikett": "Wniosek",
  "webb.ansokan.mottagen": "Złożono",
  "webb.ansokan.mottagen.demo":
    "Nic nie zostało przekazane i nikt nie został powiadomiony. Poniższy numer referencyjny obliczono w twojej przeglądarce z tego, co wpisano, i nie istnieje nigdzie indziej — zniknie po zamknięciu tej strony.",
  "webb.ansokan.status": "Status",
  "webb.ansokan.referens": "Numer referencyjny",
  "webb.ansokan.granskning":
    "Wnioski są rozpatrywane ręcznie. Po zatwierdzeniu wystawiana jest faktura. Organizacja zostaje aktywowana po zaksięgowaniu płatności.",

  "webb.sprak.etikett": "Lokalizacja",
  "webb.sprak.rubrik": "Języki",
  "webb.sprak.ingress":
    "Angielski jest językiem domyślnym i źródłowym. Po nim następuje dziewięć tłumaczeń. Czego platforma nie robi: nie twierdzi, że przetłumaczony interfejs oznacza przetłumaczoną metodę.",
  "webb.sprak.princip.etikett": "Zasada",
  "webb.sprak.princip.rubrik": "Dwa rodzaje tekstu",
  "webb.sprak.granssnitt.rubrik": "Tekst interfejsu",
  "webb.sprak.granssnitt.beteckning": "Cofa się po cichu",
  "webb.sprak.granssnitt.text":
    "Etykiety, przyciski, statusy. Skończony, rzadko zmieniany. Angielski napis, który trafi do niemieckiego użytkownika, to irytacja, nie zagrożenie — brakujące tłumaczenie cofa się więc do angielskiego bez komentarza.",
  "webb.sprak.metodik.rubrik": "Tekst procedur",
  "webb.sprak.metodik.beteckning": "Nigdy nie cofa się po cichu",
  "webb.sprak.metodik.text":
    "Instrukcje pracy przy pojeździe. Tu niesprawdzone tłumaczenie jest gorsze niż tekst w obcym języku — bo angielski wygląda obco, a złe tłumaczenie wygląda jak instrukcja. Jest pokazywany po angielsku i oznaczany, z nazwanym językiem.",
  "webb.sprak.invariant":
    "Sama metoda nigdy nie jest tłumaczona. Nazwy faz i słowa statusów to struktura ALVA i czyta się je identycznie w każdym kraju, więc audytor może przeczytać rumuńskie i niemieckie akta sprawy, nie wiedząc, w jakim języku pracuje warsztat.",
  "webb.sprak.tackning.etikett": "Pokrycie",
  "webb.sprak.tackning.rubrik": "Co jest przetłumaczone, a co sprawdzone",
  "webb.sprak.kolumn.sprak": "Język",
  "webb.sprak.kolumn.granssnitt": "Interfejs",
  "webb.sprak.kolumn.granskat": "Metodyka sprawdzona przez specjalistę",
  "webb.sprak.granskat.ja": "Tak",
  "webb.sprak.granskat.nej": "Nie — tekst procedur po angielsku",
  "webb.sprak.matt":
    "Pokrycie interfejsu jest mierzone, nie szacowane: test wywraca kompilację, jeśli jakikolwiek klucz brakuje w jakimkolwiek języku. Status sprawdzenia to stwierdzenie o ludziach, nie o plikach, i ustawia się go ręcznie.",
  "webb.sprak.kallsprak":
    "Angielski tekst procedur jest tłumaczeniem szwedzkiego źródła i nie został jeszcze przeczytany przez specjalistę pracującego w zawodzie. Obowiązuje go ten sam standard co pozostałe dziewięć języków i tutaj pada o nim to samo stwierdzenie, zamiast po cichu robić wyjątek dlatego, że jest źródłem.",
  "webb.sprak.bevis.etikett": "Weryfikacja",
  "webb.sprak.bevis.rubrik": "Zdania, które zatrzymują sprawę",
  "webb.sprak.bevis.ingress":
    "To zdania, które odmawiają technikowi zamknięcia sprawy. Odmowa, której nikt nie rozumie, to odmowa bez wyjścia — dlatego to właściwe zdania do oceny tłumaczenia.",
  "webb.sprak.ej_granskad": "Niesprawdzone",
  "webb.sprak.granskad": "Sprawdzone",
  "webb.sprak.granskad.text":
    "Tekst procedur w języku {sprak} został przeczytany przez specjalistę pracującego w zawodzie. Kroki i punkty kontrolne są wszędzie pokazywane w języku {sprak}.",
  "webb.sprak.val.etikett": "Działanie",
  "webb.sprak.val.rubrik": "Jak wybierany jest język",
  "webb.sprak.val.s1.rubrik": "Wybór użytkownika",
  "webb.sprak.val.s1.text": "To, co wybrała dana osoba.",
  "webb.sprak.val.s2.rubrik": "Ustawienie organizacji",
  "webb.sprak.val.s2.text": "Język dokumentacji warsztatu.",
  "webb.sprak.val.s3.rubrik": "Język przeglądarki",
  "webb.sprak.val.s3.text": "Pierwszy język, który platforma rozpoznaje.",
  "webb.sprak.val.s4.rubrik": "Angielski",
  "webb.sprak.val.s4.text": "Domyślny, i źródłowy.",
  "webb.sprak.val.notering":
    "Organizacja celowo stoi wyżej niż przeglądarka. Warsztat w Niemczech z polskim technikiem potrzebuje jednego języka dokumentacji — akta sprawy nie mogą zmieniać języka w zależności od tego, kto akurat napisał wiersz.",
};
