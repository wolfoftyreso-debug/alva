# Kvalitetsrevision · Revision 3

**ALVA 3.3 · 2026-08-06 · ALVA-DOC-0006**

Revisionens föremål är **härdningen själv**: hashkedjan, förseglingen och
säkerhetstaket som infördes efter panelgranskningen, plus deras sömmar mot
resten av systemet. Skälet att revidera det nyaste först är erfarenheten
från revision 1 och 2: det farligaste ögonblicket för en skyddsmekanism är
veckan efter att den byggdes, när alla tester är skrivna av samma person
som skrev mekanismen och provar samma antaganden.

Metoden är densamma som tidigare: varje misstanke reproduceras innan den
kallas fynd, varje fynd åtgärdas eller bokförs, och varje åtgärd
mutationsprövas eller motviktsprövas. Ett fynd utan repro är en åsikt.

---

## K-1 · KRITISK — Förseglingen larmade falskt i normal drift

**Fyndet.** Offline-synk är en kärnfunktion: en annan enhet kan lämna in
händelser *efter* att någon stängt ärendet — en sen bild, ett sent
kundbesked. Verifieringen jämförde förseglingens rot med kedjans
*nuvarande* rot. Varje legitim efterhändelse flyttade kedjan förbi den
förseglade punkten, och förseglingen rapporterades **OGILTIG**.

**Reproducerad** i integrationsmiljön: ett komplett ärende avslutades och
förseglades (`giltig`), en observation synkades in efteråt, och samma
anrop svarade `OGILTIG`.

**Varför det är kritiskt, fast inget manipulerats.** En verifiering som
larmar falskt i normal drift avfärdas snart som trasig — och därefter
avfärdas även de äkta larmen. Falsklarmet är inte en mindre bugg i ett
skydd; det är det som dödar skyddet.

**Åtgärden.** Förseglingen täcker sitt **prefix**. Den förseglade roten
ska vara *en länk i* den omräknade kedjan; är den det bevisar
förseglingen loggen fram till avslutet, och det som kom efter redovisas
öppet i fältet `efterForsegling` i stället för att smittas eller smitta.
Prefixet prövas separat, så ett kedjebrott *efter* förseglingspunkten
inte heller det fäller ett bevisat prefix — brottet pekas ut för sig.

**Motvikten** — prövad, inte antagen: en rad ändrad som databasägare
*inuti* prefixet fäller både kedjan och förseglingen. Utan det testet
hade "täcker sitt prefix" kunnat vara ett artigare ord för "täcker
ingenting".

**Kvarstående begränsning, avsiktlig:** efterhändelser förseglas inte om
— triggern tillåter inte en andra försegling, och en försegling som kan
skrivas om är ingen försegling. Att `efterForsegling` är synlig är
hanteringen: läsaren ser exakt hur långt beviset når.

---

## m-1 — Kedjelänken vilade på ett tidsformat

**Fyndet.** Länken räknas över tidpunkten som sträng. Vid skrivning
användes strängen som kom in; vid verifiering den som kom *ur databasen*
(`toISOString()`, millisekunder). Alla nuvarande vägar går genom
`tillPost`, som redan producerar exakt den formen — så felet var inte
utlösbart i dag. Men garantin låg i en konvention tre filer bort, och
den första nya skrivvägen som skickade `"…T10:00:00Z"` utan millisekunder
hade gett en kedja som aldrig verifierar. Ett falsklarm igen — se K-1
för varför det är den farligaste sortens fel här.

**Åtgärden.** `skrivKedjat` normaliserar tidpunkten själv, i samma
uttryck som både länken och databasraden får den ur. Garantin bor nu där
den används.

## m-2 — Protokollvägens räkning kunde störas av grannen

**Fyndet.** `skrivna`/`dubbletter` räknades som skillnaden mellan två
`count(*)` runt anropet. En samtidig skrivning från någon annan — sen
synk, kundbesked — hamnade i vår siffra. Fel räkning är inte kosmetik i
ett 207-svar vars poäng är att mottagaren ska veta vad som inte kom in.

**Åtgärden.** `skrivKedjat` äger transaktionen och returnerar nu
räkningen ur den: `{rot, skrivna, dubbletter}`.

## m-3 — Läsordning och kedjeordning var två ordningar

**Fyndet.** Kedjan ordnas av `sekvens` (insättningsordning). GET,
grinden, sammanfattningen och delningsvyn sorterade på `tidpunkt, id`.
Inom en batch kan två händelser dela millisekund, och då avgjorde id:ts
*bokstavsordning* vilken som var "senast" — grindens `.at(-1)` kunde läsa
en annan ordning än den loggen skrevs i. Latent (batchar med två
händelser av samma typ i samma millisekund är sällsynta), men två
sanningar om ordning i ett system vars bevis *är* ordningen är en för
mycket.

**Åtgärden.** Alla läsvägar sorterar `sekvens nulls first, tidpunkt, id`
— kedjeordningen, med tidsordning som arv för rader från före kedjan.

---

## Granskat utan anmärkning

Bokförs för att nästa revision ska veta vad som redan är prövat — och
för att "hittade inget" ska betyda "letade", inte "antog".

| Område | Hur det prövades |
|---|---|
| Numerisk rundresa genom jsonb | Kedjans digest räknas om ur lagrad jsonb, och Postgres normaliserar tal. Provat med de former som brukar gå sönder: `0.55`, `1e-7`, `0.10000000000000009`. Kedjan verifierar — normaliseringarna är samstämmiga eftersom allt passerat JS `JSON.parse` vid intaget. Integrationskontroll, inte antagande. |
| Sabotage som databasägare | Trigger släppt, rad ändrad, trigger återskapad — brottet pekas ut med radens id. Provat både utanför (18c) och inuti (18f) det förseglade prefixet. |
| Dubbletter och kedjan | En omsänd händelse skrivs inte och flyttar inte kedjan — roten är identisk före och efter omsändningen. |
| Samtidighet i kedjan | Radlås per ärende (`select … for update`) serialiserar batchar; en fork hade sett ut som manipulation utan att vara det. Konstruktionsgranskad; lasttest återstår (känt sedan panelen, §5.2). |
| Krypto-shredding mot kedjan | Radering förstör nycklar, inte rader. Digest tas över den lagrade (krypterade) formen, så kedjan verifierar även efter en radering. |
| Signaturen | `arende_avslutat.signatur` skrivs ur verifierad token; klientens värde ignoreras. Mutationsprövad. |
| Säkerhetstakets monotoni | Taket beräknas ur händelser som bara kan tillkomma, och varje villkor kan bara slå om till sant — taket kan aldrig sjunka under ett redan valt värde. Ett valt värde förblir därmed alltid inom tak. |
| Gallring mot förseglingskolumnerna | Gallringen raderar hela ärenden; förseglingen följer raden. Ingen särbehandling krävs. |

## Kända och accepterade

| | Beslut |
|---|---|
| Två samtidiga avslut kan båda passera grinden | Grindprövning och skrivning är inte atomära. Följden är två avslutshändelser, varav den första förseglar. Ofarligt för beviset (allt är kedjat), förvirrande i loggen. Accepterat tills verkliga data visar att det inträffar. |
| Extern förankring saknas | Förseglingen är serverns egen nyckel. RFC 3161 kvarstår från panelens lista — utan den är serverns klocka vår klocka. |
| Klienthash av foto vid upptagning | Kvarstår från panelens lista. Kedjan förseglar innehållet från mottagandet; upptagningsögonblicket är fortfarande obevisat. |

---

## Sammanfattning

Ett kritiskt fynd, tre mindre — **alla fyra i kod som var en dag gammal
och redan hade gröna tester.** Det är inte ett argument mot härdningen;
det är argumentet för revisionen. Testerna som skrevs med mekanismen
provade manipulation, som är det man tänker på när man bygger ett skydd.
Det som gick sönder var i stället normal drift: sen synk, samtidiga
grannar, en batch i samma millisekund. Skydd fallerar oftare genom att
larma falskt än genom att missa angrepp, och tre av fyra fynd var just
falsklarmsrisker.

Efter åtgärd: 766 enhetstester, 206 integrationskontroller mot riktig
Postgres — varav sabotage som databasägare i två varianter, numerisk
rundresa och skrivning efter avslut — genomgång 4/4, portalspärr,
typkontroll, lint och artefaktmätning gröna.
