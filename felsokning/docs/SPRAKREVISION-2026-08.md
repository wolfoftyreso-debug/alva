# Språkrevision · Tio språk

**ALVA 3.4 · 2026-08-06 · ALVA-DOC-0008**

Revisionens föremål är **språket självt**: de tio katalogerna i
`services/gemensam/sprak/`, ordlistorna i `ord.mjs` som bär
ALVA-RULE-200, och den engelska källtext som de nio översättningarna
utgår ifrån. Skälet att revidera nu är detsamma som i revision 3: det
farligaste ögonblicket för en text är veckan efter att den skrevs, när
den som skrev den är den enda som läst den.

**Metod.** Tio oberoende granskningar — en per språk plus en för
källtexten — var och en med uppdraget att jämföra varje nyckel mot sin
engelska källa och rapportera fel i betydelse, grammatik,
fackterminologi, terminologisk konsekvens, register och
variabelhållarnas grammatiska integration. Instruktionen var densamma
som i kvalitetsrevisionerna: rapportera bara det som kan motiveras
konkret; ett fynd utan motivering är en åsikt. Varje fynd prövades
därefter mot filen innan det åtgärdades, och varje ersättning
applicerades med träffkrav — en ersättning som inte träffar exakt en
gång stoppar körningen i stället för att rapportera grönt. Lärdomen
från TÜV-2:s patchskript gäller även prosa.

---

## 1. Källtexten (engelska)

### K-1 · KRITISK — Kvalitetskontrollens grindtext kunde läsas baklänges

**Fyndet.** `grind.kvalitetskontroll` sa *"Quality check performed —
symptom verified"*. På engelskt verkstadsspråk betyder "verify the
symptom" att bekräfta att symtomet **förekommer** — det är exakt vad
`grind.reproducering` avser, före reparationen. Den här grinden avser
kontrollen **efter** åtgärd: är symtomet borta? Källtexten riskerade
alltså motsatt betydelse, och som källtext hade den fortplantat
tvetydigheten till tio översättningar.

**Åtgärden.** *"Quality check performed — symptom verified as
resolved"* — i katalogen, i ECM-regelmotorns rubrik (samma text bor på
två ställen; båda ändrade i samma commit), och propagerad till alla nio
översättningarna med respektive språks ord för "verifierat avhjälpt".

### Två större ellipser med samma mekanik

*"Vehicle history checked or justified"* och *"Corrective action
documented or justified"* band grammatiskt "justified" till historiken
respektive åtgärden — men det som motiveras är den **uteblivna**
kontrollen och åtgärdens **frånvaro** (vilket detaljtexterna säger).
Nu *"…, or the omission justified"* respektive *"…, or its absence
justified"*, propagerat till alla språk där samma ellips fanns.

### Övrigt i källtexten

| Fynd | Åtgärd |
| --- | --- |
| Blandad brittisk/amerikansk stavning (authorisation, de-energised, recognises i en fil med organization ×15) | Amerikansk norm genomgående |
| "Photograph the instrument panel" — vägmätaren sitter i mätarhuset | "instrument cluster", även i ärendevyn, ECM-detaljtexterna och genomgångens selektor |
| "Anything else on receipt?" — läses som papperskvittot | "Anything else noted at vehicle reception?" |
| "Responsible" som naken adjektivetikett | "Assigned to" |
| "Calibrated until" | "Calibration valid until" |
| registration/application om samma objekt i webb.drift/webb.pris | "application" konsekvent |
| webb.sprak.etikett "Localization" kolliderade med ALVA-fasens invarianta namn | "Translation" |
| Satsbyggnadsfel (saknat komma i webb.login.demo, verblöst andra led i grind.foton.detalj, saknad artikel i webb.larande.p2, saknat bindestreck i foreign-language) | Rättade |

## 2. Ordlistorna (ord.mjs)

Ordlistorna är metodik, inte gränssnitt — de avgör vad grinden godtar.
Granskningen hittade två felriktningar:

**Luckor som släppte igenom icke-svar** (fel åt det farliga hållet för
ICKESVAR): "faulty", "unknown", "dunno" (en); "fertig", "in ordnung",
"i.o." (de); "hors service", "en panne" (fr); "arreglado", "ya está"
(es); "a posto", "boh" (it); "jw.", "naprawiono", "bez uwag" (pl);
"verholpen", "defect", "stuk" (nl); "resolvido", "arranjado" (pt);
"defect", "schimbat" och femininformerna (ro); "färdigt", "utfört",
"lagat" (sv). Jämförelsen görs mot hela fältet, så varje form måste stå
med.

**Luckor som nekade korrekt skrivna resonemang** (fel åt det håll
filens eget designresonemang förbjuder för ORSAKSORD): "gdyż" — en av
polskans vanligaste kausalmarkörer — saknades, liksom "ya que" (es),
"donc" (fr), "waardoor" (nl), "zurückzuführen" (de), "se datorează",
"fiindcă" och femininformen "confirmată de" (ro), "uma vez que" (pt),
"in quanto", "dovuto a" (it), "orsakar", "tyder på" (sv), "hence",
"points to" (en). Där jämförelsen är delsträng ersattes enstaka
böjningsformer med stammar ("spowodowa", "powoduj", "potwierdz",
"causad", "provoc", "explain", "indicat", "wyjaśni").

**Ett fel i svenskan:** EVIDENSORD innehöll trebokstavsdelsträngen
"mat" (diakritfri form av "mät"), som träffar inuti "information",
"material", "format" och "klimat" — i strid med filens eget
fyrteckensresonemang. Ersatt med de avsedda formerna "matning",
"matvarde", "uppmatt". EVIDENSORD fick också verkstadens faktiska
evidensord: "fehlerspeicher"/"ausles" (de), "diag"/"valise" (fr),
"diagnosis"/"escáner" (es), "trouble code"/"voltage"/"resistance" (en),
"poză"/"verific" (ro), "storingscode"/"uitgelezen" (nl), stammar i
polskan ("zdjęci", "histori", "prób" — inte ascii-"prob", som träffar
"problem").

Typografiska apostrofer införs INTE i ordlistorna: de jämförs mot
användarens inmatning, och ett mobiltangentbord skriver ’ medan ett
fysiskt skriver ' — därför lades i stället bägge varianterna in där
det behövdes ("comme d'habitude"/"comme d’habitude").

## 3. Katalogerna, per språk

Mönster som återkom i flera språk:

1. **"That is not an answer" hade blivit "det är inte en slutsats"** i
   sex språk (de, fr, es, it, nl, ro) — ett betydelseskifte som
   dessutom kolliderade med `slutsats.utan_slutsats`. Rättat överallt
   till språkets ord för "svar".
2. **Kongruens runt {falt}-hållaren.** Fältnamnen som fyller {falt} är
   feminina eller plurala i romanska och slaviska språk; "{falt} est
   trop court" blir fel för "Justification". Löst med ett
   neutrumhuvudord före hållaren ("Le champ « {falt} »", "El campo
   «{falt}»", "Pole „{falt}”", "Câmpul {falt}") i fr, es, pt, pl, ro.
3. **Räkneordsgrammatik.** Polskans "kontroli wymaga" stämmer bara för
   5+; rumänskans tal ≥20 kräver "de" före substantivet. Bägge
   grind.foton.detalj-strängarna gjordes numerusneutrala med
   kolonform.
4. **"Intake" var kalkerat till mottagningsdisk** ("réception",
   "recepción", "ricezione", "punkt przyjęć", "ontvangst", "recepție",
   "mottag") i sju språk — överallt ersatt med språkets ord för en
   mottagningsprocess.
5. **Terminologisk konsekvens för "case"**: expediente (es), pratica
   (it), processo (pt), Vorgang (de), dossier (fr/nl som record) —
   webbtexterna hade infört en andra term ("caso", "Fall") som nu
   följer produktdelens.
6. **Endonymhållaren {sprak}**: nederländskans "in het {sprak}" och
   polskans nominativinsättning höll inte för egetNamn-värden som
   "Polski" — omskrivet till artikelfria konstruktioner ("in {sprak}",
   "w tym języku ({sprak})"), samma mönster som metodik-nycklarna
   redan använde.
7. **Fransk typografi**: hårt mellanslag (U+00A0) före ? ! : ; och
   innanför « » — 26 ställen; ett radbrytbart mellanslag kunde lämna
   skiljetecknet ensamt på ny rad.
8. Enstaka språkfel av tyngd: "Endlich" (läses "äntligen", inte
   "ändlig"), "Statusworte"→"Statuswörter", "je aktivem" (kasusfel),
   "napisał wiersz" (läses "skrev en dikt"), "dépannage" (läses
   bärgning), "nekan" (inte ett svenskt ord), "zawęzić usterkę"
   (ogiltig kollokation), "Säkerhetsnivån" för confidence (kolliderade
   med säkerhetskravet i samma grindlista — nu "Konfidensnivån"),
   nederländskans "Vermogen" (läses motoreffekt på en fordonssajt),
   rumänskans "verificat" för både reviewed och verified (nu
   "revizuit" för granskningsstatus).

## 4. Avvisade fynd

Bokförs för att nästa revision ska veta att de är prövade, inte
förbisedda:

| Fynd | Skäl till avvisande |
| --- | --- |
| it: webb.kallor.rubrik borde läsa "conoscenza operativa" | "Operational Knowledge Infrastructure" är tvetydig i källan; alla tio språk har valt läsningen "operativ infrastruktur för kunskap", och en ensam avvikare hade brutit familjen utan att källan avgör frågan. |
| en: "Incoming/Outgoing odometer reading" borde bli "at check-in/at handover" | Formen är begriplig, och ärendevyns paneltitlar och ECM-rubrikerna använder samma ord — en omdöpning hade brutit synken mellan grindtext och paneltitel utan språklig vinst. Uppskjutet, inte avfärdat i sak. |
| ECM-regelbibliotekets övriga rubriker | Regelbiblioteket är versionsmärkt kod utanför katalogen; endast de tre betydelsefynden (K-1 och ellipserna) speglades dit. En egen genomgång av ECM-rubrikerna hör till en regelpaketsrevision, inte en språkrevision. |

## 5. Vad revisionen inte gör

Granskningarna är utförda av språkkunniga granskare mot källtexten —
de är inte den fackgranskning per marknad som `granskat` i SPRAK
avser. Ingen `granskat`-flagga har ändrats: metodiktexten är
fortfarande inte läst av en yrkesverksam fackman på något språk utom
svenska, och det står kvar på språksidan. Denna revision höjer golvet;
den flyttar inte den gränsen.

## 6. Verifiering

Varje åtgärd applicerad med träffkrav (assert på exakt en träff per
ersättning). Efter åtgärd: fullständig kontrollslinga — enhetstester
(katalogernas kompletthet, hållarintegritet, invarians och
inte-engelska-i-förklädnad är låsta av test), typkontroll, lint, bygge,
artefaktmätning, språkrunda mot den bakade artefakten, genomgång,
portalspärr och integrationstest mot riktig Postgres (ordlistorna bär
ALVA-RULE-200 och prövas där). Resultat i commit-historiken.

---

*ALVA-DOC-0008 · Intern språkrevision · Ersätter ingen fackgranskning per marknad*
