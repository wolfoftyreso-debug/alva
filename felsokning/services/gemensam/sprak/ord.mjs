// ALVA-SPEC-060 · Ordlistorna bakom ALVA-RULE-200.
//
// ---- Varför den här filen finns -----------------------------------------
//
// motivering.mjs granskar teknikerns slutsats med två ordlistor: fraser
// som ser ut som svar men inte är det ("klart", "trasig"), och ord som
// visar att en text faktiskt innehåller ett resonemang ("eftersom",
// "beror på"). Båda listorna var enbart svenska.
//
// Det var inte en översättningsbrist utan ett hål i regeln. En tysk
// tekniker som skrev "erledigt" i motiveringsfältet passerade filtret
// för icke-svar, därför att filtret bara kände igen "klart". Grinden
// släppte igenom avslutet och rapporten såg fullständig ut. Regeln som
// är hela produktens värde gällde i praktiken bara på svenska.
//
// ---- Union, inte uppslag per språk --------------------------------------
//
// Listorna slås ihop över alla språk i stället för att väljas efter
// användarens språkinställning. Två skäl:
//
//   Ett icke-svar är ett icke-svar oavsett språk. Jämförelsen görs mot
//   HELA det normaliserade fältet, inte mot delsträngar, så "ok" fångas
//   likadant vare sig verkstaden står i Kraków eller Köln — och en
//   tekniker som skriver på ett annat språk än organisationens
//   inställning ska inte kunna passera på den vägen.
//
//   Orsaksorden går åt andra hållet: unionen gör kontrollen mer
//   tillåtande, aldrig strängare. Ett felaktigt träffat orsaksord
//   släpper igenom en text, det blockerar aldrig en riktig. Det är rätt
//   riktning för ett fel att luta åt när alternativet är att neka en
//   tekniker avslut på ett korrekt skrivet underlag.
//
// ---- Vad som medvetet INTE står i listorna -------------------------------
//
// "inget", "keine", "none". Att ingenting kvarstår osäkert är ett giltigt
// och ofta korrekt svar (se motivering.mjs). Att göra det till ett
// icke-svar hade tvingat fram utfyllnad, och utfyllnad är sämre än ett
// kort sant svar.
//
// Orsaksord kortare än fyra tecken. De jämförs som delsträngar och skulle
// träffa inuti orelaterade ord på andra språk.
//
// ---- Granskningsstatus ---------------------------------------------------
//
// Svenska och engelska är genomgångna. Övriga språk är en första
// uppsättning och ska läsas av någon som arbetar i verkstad på språket
// innan de räknas som granskade — det är samma gräns som `granskat` i
// SPRAK, och den gäller här därför att listorna är metodik, inte
// gränssnitt.

/** Fraser som ser ut som svar men inte är det. Jämförs mot hela fältet. */
export const ICKESVAR_PER_SPRAK = {
  sv: ["klart", "klar", "färdig", "fardig", "färdigt", "fardigt", "ok", "okej", "åtgärdat", "atgardat", "åtgärdad", "atgardad",
       "fixat", "utfört", "utfort", "lagad", "lagat", "se ovan", "se logg", "enligt ovan", "som vanligt",
       "trasig", "trasigt", "defekt", "sliten", "slitet", "utsliten", "behöver bytas", "behover bytas", "byttes", "bytt", "utbytt",
       "enligt kund", "kunden sa", "vet ej", "ingen aning", "diverse", "allmänt slitage", "-", "n/a", "na"],
  en: ["done", "ok", "okay", "fixed", "repaired", "see above", "see log", "as above", "as usual",
       "broken", "defective", "faulty", "worn", "worn out", "needs replacing", "needs replacement", "replaced",
       "per customer", "as per customer", "customer said", "don't know", "dont know", "no idea", "unknown",
       "not sure", "dunno", "no clue", "various", "general wear"],
  de: ["erledigt", "behoben", "repariert", "siehe oben", "siehe protokoll", "wie oben", "wie üblich", "wie ublich",
       "kaputt", "verschlissen", "abgenutzt", "muss getauscht werden", "getauscht", "gewechselt",
       "defekt", "fertig", "in ordnung", "i.o.", "erneuert", "ersetzt",
       "laut kunde", "kunde sagte", "weiß nicht", "weiss nicht", "keine ahnung", "diverses",
       "allgemeiner verschleiß", "allgemeiner verschleiss", "k.a."],
  fr: ["fait", "terminé", "termine", "réparé", "repare", "voir ci-dessus", "voir journal", "comme ci-dessus",
       "comme d'habitude", "cassé", "casse", "défectueux", "defectueux", "usé", "usagé", "usage",
       "à remplacer", "a remplacer", "remplacé", "remplace", "selon le client", "le client a dit",
       "use", "hors service", "hs", "en panne", "changé", "change", "comme d’habitude",
       "je ne sais pas", "aucune idée", "aucune idee", "divers", "usure générale", "usure generale"],
  es: ["hecho", "listo", "reparado", "ver arriba", "ver registro", "como arriba", "como siempre",
       "roto", "defectuoso", "desgastado", "hay que cambiarlo", "cambiado", "sustituido",
       "arreglado", "solucionado", "averiado", "ya está", "ya esta",
       "según el cliente", "segun el cliente", "el cliente dijo", "no sé", "no se", "ni idea",
       "varios", "desgaste general"],
  it: ["fatto", "risolto", "riparato", "vedi sopra", "vedi registro", "come sopra", "come al solito",
       "rotto", "difettoso", "usurato", "da sostituire", "sostituito", "cambiato",
       "sistemato", "a posto", "guasto", "tutto ok", "boh", "non ne ho idea",
       "secondo il cliente", "il cliente ha detto", "non so", "nessuna idea", "vari", "usura generale", "n/d"],
  pl: ["zrobione", "gotowe", "naprawione", "patrz wyżej", "patrz wyzej", "patrz dziennik", "jak wyżej", "jak wyzej",
       "jak zwykle", "zepsute", "uszkodzone", "zużyte", "zuzyte", "do wymiany", "wymienione",
       "według klienta", "wedlug klienta", "klient powiedział", "klient powiedzial",
       "jw", "jw.", "naprawiono", "wymieniono", "zrobiono", "usunięto", "usunieto", "bez uwag",
       "uszkodzony", "zepsuty", "zużyty", "zuzyty", "wg klienta",
       "nie wiem", "nie mam pojęcia", "nie mam pojecia", "różne", "rozne", "ogólne zużycie", "ogolne zuzycie"],
  nl: ["klaar", "oké", "oke", "gedaan", "gerepareerd", "verholpen", "opgelost", "in orde", "zie boven", "zie logboek", "zoals boven",
       "zoals gewoonlijk", "kapot", "defect", "stuk", "versleten", "moet vervangen worden", "vervangen",
       "volgens klant", "klant zei", "weet niet", "geen idee", "diversen", "algemene slijtage", "n.v.t.", "nvt"],
  pt: ["feito", "pronto", "reparado", "ver acima", "ver registo", "como acima", "como habitual",
       "partido", "avariado", "defeituoso", "desgastado", "a substituir", "substituído", "substituido",
       "resolvido", "arranjado", "concluído", "concluido",
       "segundo o cliente", "o cliente disse", "não sei", "nao sei", "nenhuma ideia", "não faço ideia", "nao faco ideia",
       "diversos", "desgaste geral"],
  ro: ["gata", "rezolvat", "reparat", "vezi mai sus", "vezi jurnal", "ca mai sus", "ca de obicei",
       "stricat", "stricată", "stricata", "defect", "defectă", "defecta", "uzat", "uzată", "uzata",
       "de înlocuit", "de inlocuit", "înlocuit", "inlocuit", "schimbat",
       "conform clientului", "clientul a spus", "nu știu", "nu stiu", "habar n-am", "habar nu am", "diverse",
       "uzură generală", "uzura generala"],
};

/**
 * Ord som visar att texten innehåller ett orsakssamband.
 *
 * Jämförs som delsträngar, därför minst fyra tecken — se filhuvudet.
 */
export const ORSAKSORD_PER_SPRAK = {
  sv: ["eftersom", "därför", "darfor", "beror", "orsakas", "orsakade", "medför", "medfor", "leder till",
       "ledde till", "vilket", "på grund av", "pga", "resulterar", "resulterade", "innebär", "innebar",
       "orsakar", "orsakat", "pa grund av", "till foljd av", "tyder på", "tyder pa", "indikerar",
       "följaktligen", "foljaktligen", "till följd av", "förklarar", "forklarar", "stämmer överens",
       "stammer overens", "bekräftas av", "bekraftas av", "visar att", "utesluter"],
  en: ["because", "since", "due to", "caused", "causes", "results in", "resulted in", "leads to", "led to",
       "therefore", "hence", "consequently", "explain", "confirmed by", "confirms", "shows that", "rules out",
       "consistent with", "indicat", "points to", "which means"],
  de: ["weil", "aufgrund", "verursacht", "führt zu", "fuhrt zu", "führte zu", "fuhrte zu", "folglich",
       "daher", "deshalb", "wegen", "zurückzuführen", "zuruckzufuhren", "bedingt durch", "dadurch", "somit",
       "erklärt", "erklart", "bestätigt", "bestatigt", "zeigt, dass",
       "zeigt dass", "schließt aus", "schliesst aus", "ausgeschlossen", "stimmt überein", "stimmt uberein", "deutet auf"],
  fr: ["parce que", "puisque", "en raison de", "à cause de", "a cause de", "provoqué", "provoque",
       "entraîne", "entraine", "entraîné", "conduit à", "conduit a", "par conséquent", "par consequent",
       "donc", "prouve", "explique", "confirmé par", "confirme par", "montre que", "exclut", "correspond à", "correspond a",
       "indique"],
  es: ["porque", "ya que", "puesto que", "dado que", "debido a", "a causa de", "se debe a", "causado",
       "provoca", "provocó", "provoco", "conduce a",
       "por lo tanto", "por consiguiente", "explica", "confirmado por", "muestra que", "descarta",
       "coincide con", "indica"],
  it: ["perché", "perche", "poiché", "poiche", "dato che", "in quanto", "a causa di", "dovuto a", "causato",
       "provoca", "comporta", "porta a", "deriva da",
       "quindi", "pertanto", "di conseguenza", "spiega", "confermato da", "mostra che", "esclude",
       "coincide con", "compatibile con", "coerente con", "indica"],
  pl: ["ponieważ", "poniewaz", "gdyż", "gdyz", "dlatego", "z powodu", "spowodowa", "powoduj", "prowadzi do",
       "w związku", "w zwiazku", "zatem", "wynika", "wskutek", "na skutek", "skutkuje",
       "świadczy", "swiadczy", "wyjaśni", "wyjasni", "potwierdz",
       "pokazuje, że", "pokazuje że", "pokazuje ze", "wyklucza", "zgodne z", "wskazuj"],
  nl: ["omdat", "aangezien", "doordat", "vanwege", "waardoor", "als gevolg van", "te wijten aan",
       "veroorzaakt", "leidt tot", "leidde tot", "daarom",
       "bijgevolg", "verklaart", "bevestigd door", "blijkt uit", "toont aan", "wijst op", "sluit uit", "komt overeen", "duidt op"],
  pt: ["porque", "dado que", "uma vez que", "visto que", "devido a", "deve-se a", "causad", "provoc",
       "leva a", "resulta", "origina", "portanto", "por conseguinte",
       "explica", "confirmado por", "mostra que", "exclui", "coincide com", "indica"],
  ro: ["deoarece", "pentru că", "pentru ca", "fiindcă", "fiindca", "întrucât", "intrucat", "din cauza",
       "se datorează", "se datoreaza", "cauzat", "provoacă", "provoaca", "duce la", "rezultă", "rezulta", "determinat",
       "prin urmare", "așadar", "asadar", "explică", "explica", "confirmat de", "confirmată de", "confirmata de",
       "arată că", "arata ca", "exclude", "corespunde cu", "indică", "indica"],
};

/**
 * Ord som visar att texten hänvisar till dokumenterad evidens.
 *
 * Samma delsträngsjämförelse och samma unionsresonemang som ovan. Här
 * är det extra tydligt varför unionen är rätt: engelskans "photo"
 * innehåller inte "foto", så en engelsk tekniker som skrev "photo shows
 * corrosion at pin 14" hänvisade till evidens som filtret inte såg.
 */
export const EVIDENSORD_PER_SPRAK = {
  sv: ["mät", "matning", "matvarde", "uppmatt", "foto", "bild", "video", "felkod", "avläs", "avlas", "prov", "test", "dokument", "historik", "kontroll"],
  en: ["measur", "photo", "image", "picture", "video", "fault code", "trouble code", "dtc", "reading", "voltage", "resistance", "inspect", "test", "document", "history", "check", "scan"],
  de: ["mess", "foto", "bild", "video", "fehlercode", "fehlerspeicher", "ausles", "ablesung", "prüf", "pruf", "dokument", "historie", "kontrolle"],
  fr: ["mesur", "photo", "image", "vidéo", "video", "code défaut", "code defaut", "relevé", "releve", "essai", "diag", "valise", "document", "historique", "contrôle", "controle"],
  es: ["medici", "medida", "foto", "imagen", "vídeo", "video", "código de avería", "codigo de averia", "código de error", "codigo de error", "lectura", "prueba", "comprob", "diagnosis", "escáner", "escaner", "documento", "historial", "control"],
  it: ["misur", "foto", "immagine", "video", "codice errore", "codice di errore", "codice guasto", "lettura", "prova", "documento", "storico", "controllo"],
  pl: ["pomiar", "zmierzon", "zdjęci", "zdjeci", "foto", "obraz", "wideo", "film", "kod błędu", "kod bledu", "odczyt", "test", "prób", "skan", "dokument", "histori", "kontrol"],
  nl: ["meting", "gemeten", "meetwaarde", "foto", "afbeelding", "video", "foutcode", "storingscode", "uitlezing", "uitgelezen", "test", "proef", "document", "historie", "controle"],
  pt: ["medi", "foto", "imagem", "vídeo", "video", "código de avaria", "codigo de avaria", "código de erro", "codigo de erro", "leitura", "ensaio", "documento", "histórico", "historico", "controlo"],
  ro: ["măsur", "masur", "foto", "poză", "poza", "imagine", "video", "cod de eroare", "cod eroare", "citire", "verific", "test", "document", "istoric", "control"],
};

const union = (per) => [...new Set(Object.values(per).flat())];

export const ICKESVAR = union(ICKESVAR_PER_SPRAK);
export const ORSAKSORD = union(ORSAKSORD_PER_SPRAK);
export const EVIDENSORD = union(EVIDENSORD_PER_SPRAK);

/** Kortaste orsaksord som får jämföras som delsträng. Se filhuvudet. */
export const MINSTA_ORSAKSORD = 4;
