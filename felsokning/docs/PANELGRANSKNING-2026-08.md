# Panelgranskning · ALVA 3.2

**Simulerad expertpanel · 2026-08-06 · ALVA-DOC-0005**

> **Detta är en intern stresstest-övning, inte ett verkligt branschutlåtande.**
> Panelens säten är rollbeskrivningar. Ingen namngiven organisation har
> deltagit, granskat eller uttalat sig om produkten, och dokumentet får
> inte spridas som om så vore fallet. Värdet ligger i kritiken, inte i
> avsändaren.
>
> Varje fynd nedan är kontrollerat mot koden. Där panelen påstår något om
> systemets beteende står filen. Där panelen gissar står det att den
> gissar.

---

## 0. Vad som faktiskt granskades

| | |
|---|---|
| Version | ALVA 3.2 (`services/gemensam/version.mjs`) |
| Kodbas | Vite/React-klient, `node:http`-tjänster, PostgreSQL |
| Provning | 750 enhetstester, 186 integrationskontroller mot riktig Postgres, e2e-genomgång som stänger fyra ärenden, designtest över hela ytan |
| Metodikbibliotek | 16 metodiker (`services/gemensam/metodiker.mjs`) |
| Språk | 10, engelska som källspråk |

Panelen har läst källkod, inte demonstrationer. Det är avsiktligt: en
demonstration visar det som fungerar.

---

## 1. Ordförande — inledning och avgränsning

Innan sakfrågorna vill jag slå fast vad vi bedömer, eftersom panelen
annars kommer att prata förbi varandra hela dagen.

ALVA är **inte** ett diagnossystem i den mening branschen använder ordet.
Det ställer inga diagnoser, rangordnar inga felkällor och räknar inga
sannolikheter. Det är ett **process- och evidenssystem**: det tvingar fram
en viss ordning, kräver att varje påstående bär underlag, och vägrar
stänga ett ärende som inte gör det.

Det betyder att jämförelsen "bättre än dagens OEM-system" är fel ställd.
Ett OEM-system är en kunskapskälla. Det här är en kravställare på
dokumentationen. De konkurrerar inte; frågan är om de går att kombinera.

Om vi håller isär de två sakerna blir mötet användbart. Om vi inte gör
det kommer märkesrepresentanterna att döma ut produkten för att den inte
kan något de aldrig påstått att den kan.

---

## 2. Enskilda utlåtanden

### 2.1 Teknisk chef — volymtillverkare personbil (VW-sätet)

Jag har gått rakt på det som avgör om vi kan använda det här:
**kopplingen till våra egna procedurer finns inte.**

Metodikbiblioteket är sexton handskrivna procedurer. `VIBRATION` börjar
med att fotografera fyra hjul och mäta kast. Det är rimligt allmänt
hantverk, men det är inte vår procedur, det följer inte våra TSB:er, och
det uppdateras inte när vi ändrar oss. `GENERISK` är ett strukturellt
skyddsnät — den fungerar för allt just för att den inte vet något.

Vad som saknas, konkret:

- **Ingen bindning till OEM-procedur.** Ett steg kan inte referera
  "TSB 2026-14 rev 3". Det finns inget fält för det.
- **Inga gränsvärden.** `matvarde` bär `beskrivning`, `varde`, `enhet`
  (`services/gemensam/handelser.mjs`). Ingenting jämförs mot ett börvärde.
  "38 g obalans mot tillverkarens gräns på 10 g" är fritext teknikern
  skrivit. Systemet vet inte vad gränsen är och kan därför inte upptäcka
  att teknikern har fel om den.
- **Ingen fordonsidentifiering mot vår data.** VIN registreras men slås
  inte upp mot modellår, motorkod eller kampanjstatus.

Det som däremot är bättre än vårt eget system: **loggen**. Vår
verkstadsdokumentation är fritext i en arbetsorder. Här är den strukturerad,
serverdaterad och oföränderlig. Det hade jag velat ha.

**Mina tre förbättringar**

1. Inför ett normativt `referens`-fält på steg och kontroll — dokumenttyp,
   identitet, revision — så att en procedur kan spåras till sin källa och
   ogiltigförklaras när källan revideras.
2. Inför gränsvärden som data: `matvarde` ska kunna bära `borvarde`,
   `undre`, `ovre`, `kalla` och `giltigFor` (VIN-intervall/modellår).
   Utan det är E4 en siffra utan innebörd.
3. Öppna metodikbiblioteket för OEM-levererat innehåll med signatur, på
   samma sätt som regelpaketet redan hanteras (`REGELPAKET_STATUS`).
   Signeringsmekanismen finns; den behöver bara peka på metodiker också.

---

### 2.2 Teknisk chef — premiumtillverkare personbil (Volvo-sätet)

Jag instämmer i VW-sätets kritik men vill vara tydlig med att den träffar
*innehållet*, inte *konstruktionen*. Konstruktionen är starkare än jag
väntade mig.

Det som imponerar:

- **Kvalitetsgrinden ligger på servern** (`services/gemensam/grind.mjs`,
  anropad från `server.mjs`). Klienten har ingen egen åsikt. Det betyder
  att en verkstad inte kan stänga ett ärende genom att kringgå
  gränssnittet. I vårt eget system är motsvarande kontroll en
  klientvalidering, och den kringgås.
- **Mätarställningen måste vara fotograferad, inte inskriven.** Ett foto
  är E2, en siffra E1. Det är en liten regel med stor verkan i
  garantiärenden.
- **Mätdonet slås upp i ett register.** Kalibreringen härleds, den
  påstås inte. Det var enligt versionsloggen tidigare ett påstående
  klienten gjorde om sig själv — att man rättat det är ett gott tecken på
  granskningskultur.

Min invändning är en annan och den är allvarlig: **"signaturen" vid
avslut är teknikerns eget namn som text.**

```
skicka({ typ: "arende_avslutat", signatur: anvandare, ... })
```

Händelsens `anvandare` och `tidpunkt` sätts visserligen av servern ur
verifierad token — det är korrekt gjort och bättre än branschsnittet. Men
fältet som *heter* signatur tillför ingenting och ser ut att tillföra
något. I ett garantiärende som bestrids är det skillnad på "systemet
noterade vem som var inloggad" och "teknikern signerade". Det första har
ni. Det andra påstår ni.

**Mina tre förbättringar**

1. Ta bort `signatur`-fältet eller gör det till en riktig signatur.
   Mellanläget är det sämsta: ett fält som inbjuder en jurist att tro
   något som inte gäller.
2. Kedja händelserna kryptografiskt. Manipulationsskyddet vilar i dag på
   databastriggrar (`infra/postgres-init.sql`). Triggrar skyddar mot
   applikationen, inte mot den som har databasen. En hashkedja per ärende
   flyttar skyddet från behörighet till matematik.
3. Kvalificerad tidsstämpling (RFC 3161) på avslutet. Serverns klocka är
   er egen klocka. I en tvist är det motpartens invändning.

---

### 2.3 Teknisk chef — global volymtillverkare (Toyota-sätet)

Två observationer, en positiv och en som är ett hinder för oss.

Det positiva: **språkhanteringen är den mest genomtänkta jag sett i det
här segmentet.** Att metodens struktur — fasnamn, statusord — är
oföränderlig över språk är exakt rätt. En revisor ska kunna läsa en
rumänsk och en japansk rapport utan att veta vilket språk verkstaden
arbetar på. Och att systemet *vägrar* tyst falla tillbaka på engelska för
procedurtext, utan i stället märker den som ogranskad, är en disciplin
jag önskar att vi själva hade.

Hindret: **ingen procedurtext är fackgranskad på något språk.** Det står
i klartext i `services/gemensam/metodiker.mjs` — texten är skriven på
svenska och översatt till engelska, inte läst av en fackman på målspråket.
De nio andra språken är märkta `granskat: false`.

Jag vill understryka att jag *uppskattar* att det står där. De flesta
leverantörer hade inte skrivit det. Men det betyder att vi inte kan
rekommendera systemet till våra verkstäder i något land i dag. En
säkerhetsinstruktion — "mät och dokumentera spänningsfrihet före ingrepp"
— får inte vara en oöversedd översättning.

**Mina tre förbättringar**

1. Skilj metodikinnehållet från plattformen och versionera det separat.
   Plattformen kan då släppas medan innehållet granskas per marknad, i
   stället för att allt väntar på det långsammaste.
2. Inför granskningsstatus **per metodik och språk**, inte per språk. I
   dag är `granskat` en flagga på hela språket. En verkstad ska kunna
   använda de fyra procedurer som är granskade utan att spärras av de tolv
   som inte är det.
3. Definiera vad "granskad" betyder: av vem, mot vad, hur ofta omprövad.
   En flagga utan definition blir en kryssruta någon fyller i.

---

### 2.4 Teknisk chef — tunga fordon (Scania-sätet)

Ni har byggt för personbil i verkstad. Vi arbetar i fält, på en
lastbil som står still och kostar femtusen kronor i timmen.

Det som fungerar för oss:

- **Offline-läget.** Klientens klocka kastas inte bort utan bevaras som
  `registrerad_tidpunkt` bredvid serverns mottagningstid. Glappet blir
  synligt. Den detaljen visar att någon tänkt på fältarbete.
- **Överlämningen.** Att ett ärende kan lämnas vidare med härledd
  sammanfattning är precis vad ett skiftbyte kräver.

Det som inte fungerar:

- **Ingen uppetidsdimension.** Vi optimerar inte för korrekt diagnos utan
  för *fordon i drift*. Systemet har ingen uppfattning om att en
  provisorisk åtgärd som får ekipaget till nästa verkstad kan vara rätt
  beslut. Grinden känner "åtgärd utförd" och "ingen åtgärd utförd med
  skäl" — inte "temporär åtgärd, definitiv åtgärd planerad".
- **Ingen flottdimension.** `lokalFordonshistorik` är organisationens egna
  ärenden. En åkare med hundra ekipage vill se mönster över flottan, inte
  över verkstaden.
- **Kvalitetskontrollen förutsätter provkörning.** Det går inte alltid.

**Mina tre förbättringar**

1. Inför `atgard_provisorisk` som egen händelsetyp med obligatorisk
   uppföljningspunkt. En provisorisk åtgärd som dokumenteras som definitiv
   är en säkerhetsrisk; en som inte går att dokumentera alls blir odokumenterad.
2. Låt fordonshistoriken vara fordonets, inte verkstadens — med ägarens
   samtycke som grind. Krypto-shreddingen ger er redan mekaniken.
3. Ge grinden en dimension för "kunde inte verifieras på plats" som är
   skild från "verifierades inte". Vi har inte alltid en provbana.

---

### 2.5 Sveriges Fordonsverkstäders Förening

Jag talar för de små. Två anställda, en lyft, ingen IT-avdelning.

Först det goda: **systemet fungerar utan inloggning i lokalt läge**, och
**låsning vid utebliven betalning stänger aldrig läsning eller export**
(`services/gemensam/abonnemang.mjs` — `behorighet()` returnerar `lasa`
och `exportera` sant i varje tillstånd). Det där är ovanligt hederligt.
De flesta leverantörer tar loggen som gisslan. Att ni inte gör det är
skälet till att jag över huvud taget lyssnar.

Sedan invändningen, och den är den viktigaste jag har: **grinden kommer
att upplevas som ett hinder, och då kringgås den.**

Räkna på det. Ett normalt ärende kräver, enligt genomgången, 60–76
interaktioner. Ett enkelt fel — en trasig glödlampa — går genom samma
grind som ett intermittent elfel. Slutsatsen kräver fyra fält, varav
motiveringen minst 40 tecken med orsakssamband. En verkstad med tolv
ärenden om dagen kommer att lära sig skriva fyrtio tecken som passerar
filtret.

Och filtret är svagt: det är en ordlista över icke-svar
(`services/gemensam/sprak/ord.mjs`). "Relätkontakten var bränd eftersom
den var sliten" passerar — den innehåller "eftersom" och är lagom lång.
Den säger ingenting.

**Mina tre förbättringar**

1. **Gradera grinden efter ärendets tyngd.** Ett ärende utan garanti-,
   försäkrings- eller säkerhetsdimension behöver inte samma bevisbörda.
   Regelpaketet kan redan styra krav per ärendetyp — utnyttja det åt
   andra hållet också.
2. Mät den faktiska tiden i drift och publicera den. Ni har `arbetstid`
   per kategori i loggen. Om ALVA kostar sju minuter per ärende ska det
   stå, inte gissas.
3. Gör om icke-svarsfiltret till något som inte går att lära sig kringgå
   — eller ta bort det och var ärliga med att slutsatsen granskas av
   människor. Ett filter som ser strängt ut men släpper igenom skräp är
   sämre än inget filter, för det invaggar handläggaren i tron att texten
   är kontrollerad.

---

### 2.6 Oberoende verkstadskedja

Vi driver fyrtio anläggningar och allbilsverkstad. För oss är frågan
inte metodik utan **drift**.

- **Tjänsten är en `node:http`-process mot en Postgres.** Ingen kö, ingen
  läsreplika, ingen partitionering. Det duger till pilot. Det duger inte
  till fyrtio anläggningar med samtidig synk var femtonde sekund.
- **Terraform finns men har enligt dokumentationen aldrig körts.** Då vet
  ni inte att den fungerar.
- **Ingen SSO.** Vi har fyrahundra tekniker i ett Entra-ID. Fyrahundra
  separata lösenord är ett säkerhetsproblem, inte en bekvämlighetsfråga.
- **Ingen roll mellan tekniker och administratör som passar en
  kedjestruktur.** Vi behöver regionchef som ser flera organisationer.

Det som däremot är starkt: **hyresgästisolering är provad**
(integrationstestet innehåller ett uttryckligt "motspelande hyresgäst"-fall).
Det är fler leverantörer som påstår det än som testar det.

**Mina tre förbättringar**

1. OIDC/SAML mot företagsidentitet, med rollmappning från
   identitetsleverantören. Utan det kommer vi inte att införa systemet.
2. Koncernnivå över organisation, med läsbehörighet och statistik
   men inte skrivbehörighet i ärenden.
3. Belastningsprov med publicerad siffra. "Klarar N samtidiga ärenden på
   M anläggningar" — annars är skalbarhet en åsikt.

---

### 2.7 Garantiansvarig — fordonstillverkare

Jag är den som ska betala eller neka. Min måttstock är: **kan jag fatta
ett beslut på det här underlaget utan att ringa verkstaden?**

Svaret är: oftare än i dag, men inte alltid.

Det som gör underlaget bättre än allt jag får i dag:

- **ALVA-RULE-200.** Fyra fält: vad som konstaterats, vilken evidens som
  bär det, vad som uteslutits och varför, vad som kvarstår osäkert.
  **Det tredje fältet är det som saknas i varje verkstadsprotokoll jag
  någonsin läst.** En felsökning utan uteslutna alternativ är en gissning
  som råkade stämma, och i dag kan jag inte se skillnaden.
- **Obemötta hypoteser härleds ur loggen.** Den som skrivit ned en
  misstanke och landat i något annat *måste* säga varför den föll bort.
  Det är den enskilt starkaste funktionen i produkten.
- **Retentionen följer ärendetypen** — 120 månader för garanti. Och det
  finns ett arv för ärenden som öppnades innan ärendetyperna bytte språk,
  vilket betyder att någon tänkt på att uppslaget kan missa. Det gör man
  inte om man inte tagit frågan på allvar.

Det som hindrar mig:

- **Säkerhetsnivån är teknikerns egen bedömning.** `sakerhet: hog | medel
  | lag` väljs med en knapp. Det är ett självskattat värde som ser ut som
  en mätning. Jag kan inte prissätta det.
- **Ingen koppling till reservdel.** Ett garantiärende handlar till slut
  om en artikel. Systemet vet inte vilken.
- **Ingen oberoende bekräftelse.** Allt underlag kommer från den part som
  har ett ekonomiskt intresse av utfallet.

**Mina tre förbättringar**

1. Härled säkerhetsnivån i stället för att fråga efter den — ur
   evidensgrad, antal oberoende källor och om symptomet reproducerats och
   verifierats borta. Låt teknikern *sänka* den, aldrig höja den.
2. Koppla åtgärd till artikelnummer och gör kopplingen obligatorisk vid
   garantiärendetyp. Regelpaketet kan uttrycka det redan i dag.
3. Inför en maskinläsbar exportprofil för garantianspråk — inte PDF, utan
   ett schema vi kan ta emot maskinellt. Ni har `openapi.yaml`; det här
   är nästa steg.

---

### 2.8 Försäkringsbolag — maskinskada och skadereglering

Jag ansluter mig till garantiansvarigs kritik av den självskattade
säkerhetsnivån och lägger till min egen vinkel.

**Systemet vägrar avsiktligt ge sannolikheter.** Försäkringsvillkorsmodulen
"returnerar avsiktligt inget fält som liknar ett utslag"
(`services/gemensam/forsakring.mjs`). Garantimodulen svarar `inom`,
`utanfor` eller `oklart`, och saknad data ger alltid `oklart`, aldrig
`utanfor`.

Jag är kluven. Som riskbedömare vill jag ha ett tal. Som den som blir
stämd när talet är fel inser jag att ni har rätt. Ett system som säger
"87 % sannolikhet för maskinskada" kommer att citeras i domstol av båda
parter, och ingen kommer att kunna förklara var talet kom ifrån. Att
avstå är den mognare hållningen och jag noterar den.

Min verkliga invändning gäller **bevisvärdet i fotot**.

Fotot skalas ned via canvas, vilket tar bort all metadata inklusive GPS.
Det är motiverat och testat (`bildmetadata.test.ts`) — jag vill inte veta
var kundens bil stod. Men följden är att **fotot inte bär någon uppgift
om när eller var det togs**. `capture="environment"` är en hint till
webbläsaren, inte en spärr; ett galleribildval passerar.

Det betyder i klartext: ett foto på en annan bils mätarställning går
igenom. Kravet att mätarställningen ska fotograferas — som jag i övrigt
anser är produktens skarpaste enskilda regel — vilar alltså på
teknikerns hederlighet, inte på bevisning.

**Mina tre förbättringar**

1. Försegla bilden vid *upptagningen*: hasha pixeldata i klienten, låt
   servern signera hashen tillsammans med sin egen mottagningstid. Ni får
   integritet utan att återinföra GPS. Säg sedan uttryckligen i rapporten
   vad fotot bevisar — innehållets oföränderlighet sedan mottagandet,
   inte upptagningsomständigheten.
2. Egen kameravy i stället för filväljare där det är tekniskt möjligt.
3. Inför korsreferens mot mätarställningens rimlighet: en utgående
   mätarställning lägre än den ingående, eller en som avviker kraftigt
   mot fordonets historik, ska flaggas. Ni har historiken.

---

### 2.9 Besiktningsingenjör

Min fråga är enkel: **kan ett ALVA-ärende ersätta eller komplettera en
teknisk kontroll?**

Svar: nej, och det bör det inte heller.

En besiktning är en *oberoende* kontroll mot ett *fastställt* regelverk.
ALVA-ärendet är verkstadens egen dokumentation av sitt eget arbete. Att
den är välordnad gör den inte oberoende. Om ett ALVA-ärende började väga
vid teknisk kontroll skulle incitamentet att skriva det snyggt uppstå
omedelbart.

Däremot ser jag ett *underlagsvärde*: vid en efterkontroll är ett
dokumenterat åtgärdsförlopp med evidens bättre än en kvittotext.

En sak vill jag ha noterad i protokollet, och den är obekväm för
datasäkerhetsspecialisten: **krypto-shreddingen kan förstöra underlag som
behövs.** När nyckeln förstörs maskeras fälten permanent. Det är rätt mot
dataskyddsförordningen. Men om ett fordon senare visar sig ha ett
säkerhetsrelaterat fel som spåras till en åtgärd, och identifieringen är
raderad på begäran, finns kopplingen inte längre.

**Mina tre förbättringar**

1. Skilj i modellen på **personuppgift** och **fordonsuppgift**. Ett VIN
   är kopplat till ett fordon, inte primärt till en person. I dag
   raderas de tillsammans.
2. Definiera ett undantag för säkerhetsrelaterade fel där kopplingen
   fordon–åtgärd bevaras även efter radering av personuppgifter, med
   rättslig grund angiven i modellen.
3. Om systemet någon gång ska väga vid teknisk kontroll krävs oberoende
   verifiering av minst mätdonens kalibrering mot ackrediterat organ. I
   dag matas kalibreringsdatum in av organisationen själv.

---

### 2.10 Konsumentrepresentant

Jag är förvånad. Det här är det första verkstadssystem jag granskat som
faktiskt är byggt med kunden i åtanke.

- **Kundens besked på åtgärdsförslaget måste registreras innan arbetet
  utförs**, och arbete utfört trots avböjt förslag är ett *hårt hinder*,
  inte en varning. Det är precis den tvisten jag ser oftast.
- **Beskedet registreras med kanal** — telefon, på plats, e-post,
  delningslänk — så det går att härleda till ett faktiskt samtal.
- **Delningsnivåerna filtreras på servern.** Kunden ser det kunddelbara,
  partnern ser hypoteser märkta som overifierade. Filtreringen sker inte i
  webbläsaren, vilket betyder att den faktiskt gäller.
- Rapporten säger uttryckligen att den är härledd ur loggen och redovisar
  observationer "utan slutsatser som saknar stöd".

Mina invändningar:

- **Kunden har ingen egen kopia.** Delningslänken kan återkallas av
  verkstaden. I en tvist är det motparten som äger bevisningen.
- **Ingen tidsstämplad kvittens till kunden.** Att kunden godkänt syns i
  verkstadens logg, som verkstaden kontrollerar.
- Språket i kunddelningen är samma tekniska språk som teknikern läser.
  "Symptom verification: reproduced" betyder ingenting för en bilägare.

**Mina tre förbättringar**

1. Låt kundens besked generera en oåterkallelig kvittens till kundens
   e-post eller telefon i samma ögonblick — utanför verkstadens kontroll.
2. Ge kunden rätt till en export av sitt ärende som inte kan återkallas.
3. Skriv en kundvy på kundspråk. Ni har redan skiljelinjen mellan
   struktur och innehåll; det här är ett tredje register, inte ett
   fjärde språk.

---

### 2.11 Professor i fordonsdiagnostik

Jag vill lyfta panelen från funktionslistan till den fråga uppdraget
faktiskt ställer: **är arbetsflödet reproducerbart?**

Svaret är preciserat, och preciseringen är hela poängen:

**Processen är reproducerbar. Slutsatsen är det inte.**

Två tekniker som får samma fordon kommer att gå genom samma steg, tvingas
dokumentera samma evidenstyper och passera samma grind. De kan ändå landa
i olika slutsatser, och systemet stoppar ingen av dem. Grinden prövar
**närvaron** av underlag, inte **korrektheten** i resonemanget
(`services/gemensam/grind.mjs`).

Det är inte ett fel. Det är en ärlig avgränsning, och den är rätt: ett
system som påstod sig kunna avgöra vilken av två motiverade slutsatser som
är sann skulle ljuga. Men den måste stå i specen, för annars kommer den
att läsas som ett löfte om diagnostisk samstämmighet.

Två metodologiska anmärkningar:

- **Hypoteser får bara vara `medel` eller `lag`** i händelseschemat. En
  hypotes kan alltså aldrig vara starkt understödd utan att bli en
  slutsats. Det är en klok tvingande konstruktion — den hindrar en
  misstanke från att glida över till fastställd orsak utan att passera
  verifiering. Jag hade inte förutsett den och jag gillar den.
- **Orsakskategorierna är en sluten lista** om femton poster — normalt
  slitage, materialutmattning, tillverkningsfel och så vidare. Det ger
  jämförbar statistik. Men listan blandar orsaksmekanism (materialutmattning,
  korrosion) med orsaksursprung (tillverkningsfel, felaktig tidigare
  reparation). Två dimensioner i en lista ger statistik som inte går att
  tolka.

**Mina tre förbättringar**

1. Dela orsakskategorierna i två oberoende dimensioner: **mekanism** och
   **ursprung**. Ett tillverkningsfel som yttrar sig som materialutmattning
   är i dag två kryss i samma lista.
2. Skriv in avgränsningen "process, inte utfall" i den normativa texten,
   som en definierad egenskap med en definierad mätmetod — annars kommer
   någon att mäta samstämmighet och kalla systemet misslyckat.
3. Inför strukturerad mellanteknikervalidering: låt en andra tekniker
   kunna granska ett stängt ärende och registrera instämmande eller
   avvikande bedömning. Då kan samstämmigheten mätas i stället för antas.

---

### 2.12 Specialist — människa–maskin-interaktion

Jag har gått igenom skärmbilderna och gränssnittskoden och jag ska vara
rakt på sak: **den kognitiva belastningen är för hög i pre-diagnostiken,
och den är fel fördelad.**

Vad jag ser på en 390 px-skärm i ett ärendes första läge: en
identitetsrad med åtta fält, en flikrad med fyra flikar, en
tidskategorirad med sju, en kryssruta-lista med fyra öppna punkter, och
sedan fyra frågeblock under varandra — historik, mätarställning,
felbeskrivningsverifiering, tidiga observationer. Elva
beslutspunkter innan arbetet börjar.

Det är designat som ett formulär, inte som ett arbetsflöde. Ett
arbetsflöde visar **ett** beslut i taget.

Samtidigt vill jag ge beröm åt saker som är ovanligt väl gjorda:

- **Bristerna visas under fältet medan man skriver**, inte som ett
  felmeddelande efter Spara. Att bli nekad efter att ha skrivit klart är
  det som gör obligatoriska fält förhatliga, och ni har undvikit det.
- **Statusen anges alltid med ord, aldrig enbart med färg.**
- **Ingen rörelse.** Inga animationer, inga övergångar. I en miljö med
  visuellt brus är det rätt beslut.
- **Grindens hinder visas medan arbetet pågår**, vid den tidpunkt då de
  fortfarande går att åtgärda — inte vid avslutsknappen.

När blir guidningen för styrande? Den blir det när teknikern *redan vet*
vad felet är. En erfaren tekniker som ser en lossnad balansvikt med
blotta ögat måste ändå gå genom symptomverifiering, fyra hjulfoton och
kastmätning. Systemet har ingen väg för "jag ser orsaken, här är
beviset".

**Mina tre förbättringar**

1. **Ett beslut per skärm i pre-diagnostiken.** Elva punkter samtidigt är
   en formulärvy; guidning är sekventiell.
2. Inför en **direktväg för konstaterad orsak**: teknikern lämnar
   evidens och slutsats direkt, och systemet räknar baklänges vilka
   kontroller som därmed är obehövliga och vilka som kvarstår. Grindens
   krav bevaras, ordningen släpps.
3. Mät faktiskt. Ni har interaktionsräkning i genomgången (60–76 per
   ärende). Sätt ett tak per ärendetyp och låt det falla bygget när det
   överskrids, precis som ni gjort med färgpaletten. Ni har visat att ni
   kan låsa design med test — gör det med interaktionsbudget också.

---

### 2.13 Specialist — datasäkerhet

Jag har granskat detta hårdare än jag brukar, eftersom mycket ser bra ut
och det är då man missar saker.

**Det som håller:**

- **Krypto-shredding med kuvertkryptering.** Per-subjektsnycklar,
  inlindade under en huvudnyckel som ligger utanför databasen. Radering
  sker genom att nyckeln förstörs; loggen förblir append-only. Det är den
  korrekta lösningen på konflikten mellan artikel 17 och oföränderlig
  logg, och den är ovanlig.
- **Utan huvudnyckel maskeras uppgiften och anropet går ändå igenom.**
  Att systemet inte kraschar utan degraderar till maskering är rätt: en
  otillgänglig nyckel ska inte göra hela organisationens historik oläsbar.
- **Härkomst sätts av servern.** `anvandare` och `tidpunkt` är
  serverägda fält som avvisas om klienten skickar dem.
- **Append-only genomdrivet i databasen**, inte i applikationen.
- **EXIF och GPS tas bort genom omritning**, och egenskapen är låst med
  test som läser *vägen* och inte bara utfallet.
- **Åtkomstlogg och raderingar är också append-only.**

**Det som inte håller:**

1. **Ingen kryptografisk kedja.** Manipulationsskyddet är
   behörighetsbaserat. Den som har `superuser` på databasen kan släppa en
   trigger. En hashkedja per ärende gör efterhandsändring upptäckbar även
   för den som äger databasen. För ett system vars hela värde är
   bevisvärde är detta den viktigaste bristen jag hittar.
2. **Ingen extern förankring.** Även en hashkedja är verkstadens egen. Ett
   dagligt rotvärde till en oberoende part — eller kvalificerad
   tidsstämpling — kostar nästan ingenting och flyttar bevisbördan.
3. **Ingen hotmodell och ingen mappning mot regelverk.** Jag hittar inget
   dokument som säger vem angriparen antas vara. För ett system som ska
   bli branschstandard krävs mappning mot ISO/IEC 27001, och för
   fordonsanknytning ISO/SAE 21434 och UNECE R155.
4. **Inget kryptografiskt agilitetsschema.** Vilka algoritmer, vilken
   nyckelrotation, vad händer när AES-GCM ska bytas? En logg som ska
   läsas om tio år behöver det.

**Mina tre förbättringar**

1. Hashkedja per ärende, med rotvärdet i avslutshändelsen.
2. Extern förankring av rotvärdet — kvalificerad tidsstämpling räcker.
3. Publicerad hotmodell och regelverksmappning. Utan den kan ingen
   säkerhetsavdelning i branschen godkänna ett införande, oavsett hur bra
   koden är.

---

### 2.14 Specialist — utbildning av fordonstekniker

Det här är produktens starkaste sida och jag tror att ni underskattar
den.

En lärling lär sig i dag felsökning genom att titta på en erfaren
tekniker. Det som överförs är slutsatser, inte resonemang — och
resonemanget är yrket. ALVA gör resonemanget **synligt och obligatoriskt**:

- Fyra namngivna frågor med olika adressat i stället för en fritextruta.
- Hypoteser måste bemötas, inte glömmas.
- Skillnaden mellan observation och slutsats är kodad i gränssnittet
  ("Fotografera samtliga hjul. Skilj på observation och slutsats.").
- Evidensgraderna E0–E6 lär ut ett begrepp branschen saknar ord för.
- Den ärliga vägen finns: orsaken kunde inte fastställas, och varför.
  **Att systemet har en väg för "jag vet inte" som inte är en lögn är
  pedagogiskt det viktigaste i hela produkten.**

Mina invändningar:

- **Ingen återkoppling.** Lärlingen får veta att grinden inte är
  passerad, inte att resonemanget var svagt. Systemet dömer form, inte
  innehåll — vilket professorn redan konstaterat — men i utbildning är
  det innehållet som ska tränas.
- **Ingen övningsdata.** Det finns ett demoärende. Ett utbildningsläge
  behöver hundra, med känt facit.
- **Ingen progression.** En lärling och en mästare möter samma grind.

**Mina tre förbättringar**

1. **Utbildningsläge med facit.** Kända ärenden där systemet efteråt kan
   visa vad som faktiskt var fel och var resonemanget avvek. Det är den
   funktion som skulle göra produkten till branschstandard i
   yrkesutbildningen inom tre år.
2. **Handledarvy**: en instruktör som ser flera lärlingars ärenden och
   kan kommentera resonemanget, inte bara utfallet.
3. Koppla evidensmodellen till yrkesutbildningens mål. Om E-graderna kom
   in i utbildningsplanen kommer nästa generation tekniker att tänka i
   dem oavsett vilket system de sedan använder — och det, inte
   licensintäkten, är den verkliga standardiseringsvägen.

---

## 3. Diskussion

**Ordföranden:** Låt oss ta de tre punkter där panelen är oense.

---

**Den självskattade säkerhetsnivån.**

*Garantiansvarig:* Härled den. Ett självskattat värde som ser ut som en
mätning är värre än inget värde.

*Professorn:* Var försiktig. Om den härleds ur evidensgrad blir den ett
mått på **dokumentationsmängd**, inte på diagnostisk säkerhet. En
teknikers välgrundade osäkerhet är information; en formel som räknar foton
är det inte.

*Garantiansvarig:* Då låt formeln sätta taket och teknikern sänka. Ingen
kan påstå högre säkerhet än underlaget bär, men den som vet mer om
fordonets historia får sänka.

*Professorn:* Det accepterar jag. Asymmetrin är poängen.

*Ordföranden:* Noterat som panelens gemensamma rekommendation.

---

**Fotots bevisvärde mot integritet.**

*Datasäkerhet:* Jag försvarar EXIF-borttagningen. Delningsvyn går till
försäkringsbolag och partners. GPS i den vyn är en läcka som ingen bett om.

*Försäkring:* Jag begär ingen GPS. Jag begär att veta att bilden togs vid
det tillfälle loggen påstår.

*Datasäkerhet:* Då är vi överens, och lösningen är billig: hasha i
klienten, låt servern signera hash och mottagningstid. Ni får en
förseglad bild utan en enda personuppgift.

*Försäkring:* Med tillägget att rapporten då måste säga vad förseglingen
bevisar. "Oförändrad sedan mottagandet" är inte "tagen på detta fordon",
och den skillnaden kommer en motpartsjurist att hitta.

*Ordföranden:* Enighet. Detta är panelens tekniskt mest konkreta
rekommendation.

---

**Grindens tyngd.**

*Verkstadsföreningen:* Gradera den. Annars kringgås den.

*Garantiansvarig:* Gradera den inte. Undantaget blir regeln inom ett år.

*Verkstadsföreningen:* Ni betalar inte för de sju minuterna.

*Garantiansvarig:* Vi betalar för de ärenden där underlaget inte håller,
och det är dyrare.

*HMI-specialisten:* Ni argumenterar om fel sak. Problemet är inte
kravnivån utan **ordningen**. Elva beslutspunkter på en skärm känns som
mycket arbete även när det är lite. Samma krav, ett i taget, känns som
ett flöde. Mät interaktioner innan ni sänker krav.

*Verkstadsföreningen:* Om ni kan visa att samma krav tar hälften så lång
tid drar jag tillbaka mitt förslag.

*Ordföranden:* Panelen rekommenderar att ordningen åtgärdas först och
kravnivån omprövas därefter, mot mätdata.

---

**Toyota-sätet, avslutande:** Jag vill ha en sak i protokollet. Panelen
har ägnat en förmiddag åt att hitta fel och hittat riktiga fel. Men vi
har inte hittat ett enda ställe där systemet **påstår något som inte är
sant**. Ogranskad metodik står som ogranskad. Osäker garantibedömning
står som oklar. Demonstrationsytor står som demonstration. Att ett
uppslag som missar ska ge det försiktigaste utfallet är skrivet som en
regel, inte som en förhoppning.

Det är sällsynt, och det är den egenskap som gör att jag anser att
produkten är värd att bygga vidare på trots allt vi räknat upp.

---

## 4. Betyg

Skala 1–10. Kolumnerna: **TI** teknisk innovation · **DK** diagnoskvalitet ·
**AN** användbarhet · **SÄ** säkerhet · **SK** skalbarhet · **OEM**
OEM-anpassning · **VN** verkstadsnytta · **UV** utbildningsvärde ·
**ST** standardiserbarhet · **KP** kommersiell potential.

| Säte | TI | DK | AN | SÄ | SK | OEM | VN | UV | ST | KP |
|---|---|---|---|---|---|---|---|---|---|---|
| Ordförande | 8 | 6 | 6 | 8 | 5 | 4 | 7 | 9 | 7 | 7 |
| Volymtillverkare personbil | 7 | 5 | 6 | 8 | 5 | 3 | 7 | 8 | 6 | 6 |
| Premiumtillverkare personbil | 8 | 6 | 7 | 7 | 5 | 4 | 8 | 8 | 7 | 7 |
| Global volymtillverkare | 8 | 5 | 7 | 8 | 5 | 3 | 7 | 9 | 7 | 6 |
| Tunga fordon | 7 | 5 | 6 | 8 | 4 | 3 | 6 | 8 | 6 | 6 |
| Fordonsverkstädernas förening | 7 | 6 | 5 | 8 | 5 | 4 | 6 | 8 | 6 | 7 |
| Oberoende verkstadskedja | 7 | 6 | 6 | 7 | 3 | 4 | 7 | 8 | 6 | 7 |
| Garantiansvarig | 8 | 7 | 6 | 7 | 5 | 4 | 8 | 8 | 7 | 8 |
| Försäkringsbolag | 8 | 7 | 6 | 7 | 5 | 4 | 8 | 8 | 7 | 8 |
| Besiktningsingenjör | 7 | 6 | 6 | 8 | 5 | 4 | 6 | 8 | 6 | 6 |
| Konsumentrepresentant | 8 | 6 | 6 | 8 | 5 | 4 | 7 | 8 | 7 | 7 |
| Professor | 9 | 6 | 6 | 8 | 5 | 4 | 7 | 10 | 8 | 7 |
| HMI-specialist | 8 | 6 | 5 | 8 | 5 | 4 | 6 | 9 | 7 | 7 |
| Datasäkerhet | 8 | 6 | 6 | 7 | 5 | 4 | 7 | 8 | 6 | 7 |
| Utbildningsspecialist | 8 | 6 | 6 | 8 | 5 | 4 | 7 | 10 | 8 | 8 |
| **Medel** | **7,7** | **6,0** | **6,0** | **7,7** | **4,8** | **3,8** | **6,9** | **8,5** | **6,7** | **7,0** |

**Läsanvisning.** Två tal förklarar hela bilden. **Utbildningsvärde 8,5**
är det högsta någon produkt fått av den här panelen, och det beror på en
enda egenskap: systemet gör resonemanget obligatoriskt och synligt.
**OEM-anpassning 3,8** är det lägsta, och det beror på en enda egenskap:
metodikinnehållet är inte tillverkarnas.

Det är samma observation sedd från två håll. Produkten är stark där den
handlar om *hur man tänker* och svag där den handlar om *vad man ska
göra med en viss bil*.

---

## 5. Slutrapport

### 5.1 Är produkten redo för pilotdrift?

**Ja, med tre villkor.**

Systemet är påtagligt mer genomarbetat än vad panelen väntade sig av en
produkt i det här skedet. Serverauktoritativ grind, oföränderlig logg med
serverbunden härkomst, krypto-shredding, provad hyresgästisolering och en
provningsapparat som faktiskt kör mot riktig databas — det är
pilotmässigt.

Villkoren:

1. **Metodikinnehållet måste fackgranskas för de procedurer piloten
   använder.** Inte alla sexton; de som faktiskt körs. Säkerhetsstegen i
   högvoltsmetodiken är inte förhandlingsbara.
2. **`signatur`-fältet tas bort eller görs riktigt.** Ett fält som ser ut
   som en signatur får inte finnas i en pilot vars data kan komma att
   åberopas.
3. **Piloten mäter.** Interaktioner per ärende, tid per ärende, andel
   ärenden som nekas avslut och varför. Utan mätning blir utvärderingen
   en tyckandeövning.

### 5.2 Är den redo för nationell implementering?

**Nej.** Inte i närheten, och skälen är inte kvalitetsbrister utan
avsaknad av förutsättningar:

- Ingen företagsidentitet (OIDC/SAML), ingen koncernstruktur.
- Ingen belastningsprovning; infrastrukturkoden aldrig körd.
- Ingen mappning mot ISO/IEC 27001, ISO/SAE 21434 eller UNECE R155.
- Ingen OEM-datakoppling, inga gränsvärden, ingen artikelkoppling.
- Ingen kryptografisk kedja och ingen extern förankring av loggen.

Panelen bedömer detta som 12–24 månaders arbete, varav den tekniska delen
är den mindre.

### 5.3 Kan den ligga till grund för en ny svensk standard?

**Ja — men inte produkten. Modellen.**

Detta är panelens viktigaste slutsats och den måste läsas noggrant.

ALVA är i dag en **implementation**, inte en **specifikation**. Det finns
specdokument, men de lever inne i kodbasen som kommentarer och
`docs/`-filer, och de är inte separerbara från just den här koden. En
standard kräver tre saker som saknas:

1. **Ett normativt dokument** som beskriver modellen oberoende av
   implementation — händelseschema med utvidgningsregler, evidensgrader
   E0–E6 med definitioner, grindens regler uttryckta som prövbara
   påståenden, och de invarianta strukturorden.
2. **En konformanstestsvit** som en tredje part kan köra mot sin egen
   implementation. Ni har 750 tester, men de testar *er* kod.
3. **Minst två oberoende implementationer.** En standard med en
   implementation är en produktbeskrivning.

Det som *är* standardiserbart, och som panelen anser bör standardiseras,
är:

- **Evidensmodellen E0–E6.** Branschen saknar ord för skillnaden mellan
  en teknikers påstående och en mätning med spårbart mätdon. Detta är
  produktens mest överförbara idé.
- **ALVA-RULE-200:s fyra fält**, särskilt kravet på uteslutna alternativ.
  Panelen är enig om att detta är den enskilt största förbättringen av
  verkstadsdokumentation som lagts fram.
- **Kravet att härkomst sätts av mottagande system**, aldrig av
  klienten.
- **Principen att ett uppslag som missar ska ge det försiktigaste
  utfallet.**
- **Skillnaden mellan invariant struktur och översatt innehåll.**

Det som **inte** bör standardiseras är metodikinnehållet. Procedurer hör
hemma hos tillverkaren. En standard som föreskriver hur man felsöker en
vibration kommer att vara felaktig för något fordon och föråldrad inom
två år.

**Panelens formulering av en möjlig standard:** *"Krav på dokumentation,
evidensgradering och avslutsvillkor vid guidad fordonsdiagnostik."* Alltså
en standard för **bevisningen**, inte för **diagnostiken**.

En sådan standard är realistisk att föra till CEN och därefter ISO. Den
skulle sannolikt placeras nära ISO 18541-familjen men adressera något
den inte täcker: vad verkstaden ska producera, inte vad tillverkaren ska
tillhandahålla.

### 5.4 Vad måste förbättras först

Rangordnat efter vad som blockerar mest:

| # | Åtgärd | Blockerar |
|---|---|---|
| 1 | Fackgranskning av metodikinnehåll, per metodik och språk | All användning utanför pilot |
| 2 | Riktig signatur + hashkedja + extern tidsstämpling | Garanti- och försäkringsanvändning |
| 3 | Normativ spec separerad från koden + konformanstestsvit | All standardisering |
| 4 | Gränsvärden som data, kopplade till fordonsidentitet | OEM-acceptans |
| 5 | Härledd säkerhetsnivå med teknikersänkning | Garantibeslut |
| 6 | Förseglat foto vid upptagning | Bevisvärde, bedrägeriminskning |
| 7 | Ett beslut per skärm i pre-diagnostiken | Införandegrad i verkstad |
| 8 | OIDC/SAML och koncernstruktur | Kedjeverkstad |
| 9 | Belastningsprovning med publicerad siffra | Nationell drift |
| 10 | Regelverksmappning (27001, 21434, R155) | Säkerhetsgodkännande |

### 5.5 Vad panelen själv skulle lägga till

Funktioner som inte finns i produkten och som panelen anser att en
nästa generations standard bör innehålla:

1. **Utbildningsläge med facit och handledarvy.** Panelens enskilt mest
   entusiastiska förslag. Ingen annan aktör gör detta, och det är den
   snabbaste vägen till att modellen blir branschpraxis — genom
   yrkesutbildningen, inte genom inköp.
2. **Mellanteknikervalidering.** Låt en andra tekniker registrera
   instämmande eller avvikande bedömning på ett stängt ärende. Då blir
   diagnostisk samstämmighet mätbar i stället för antagen, och panelen
   får svar på den fråga vi i dag bara kan resonera om.
3. **Fordonsburen historik med ägarens samtycke.** I dag är historiken
   verkstadens. Fordonets historik hör till fordonet och följer det mellan
   verkstäder. Krypto-shreddingen ger redan mekaniken för samtycke.
4. **Negativa fynd som förstklassig data.** Systemet dokumenterar vad som
   uteslöts — men bara i fritext i slutsatsen. Strukturerade negativa fynd
   är den mest undervärderade datamängden i branschen: de säger vad felet
   *inte* var, vilket är hälften av all diagnostisk information.
5. **Återkallelse- och kampanjkoppling** i pre-diagnostiken. Historikfrågan
   ställs redan och kan inte hoppas över; den borde besvaras av data.
6. **Provisorisk åtgärd som egen händelsetyp** med obligatorisk
   uppföljning — för tunga fordon och mobilt arbete.

---

## 6. Panelens sammanfattande omdöme

> ALVA löser inte diagnostikens svåra problem, och gör inte anspråk på
> det. Vad produkten gör är att göra verkstadens resonemang synligt,
> strukturerat och svårt att fejka — och det är ett problem branschen har
> haft i femtio år utan att angripa.
>
> Produkten är inte redo att bli en standard. **Modellen bakom den är
> redo att bli utgångspunkten för en.**
>
> Panelen rekommenderar pilotdrift under de tre angivna villkoren, och
> att ett normativt arbete inleds parallellt med fokus på evidensmodellen
> och avslutsvillkoren — inte på metodikinnehållet.
>
> Panelen noterar avslutningsvis att den under granskningen inte funnit
> något ställe där systemet påstår mer än det kan belägga. Det är
> ovanligt, och det är det som gör rekommendationen möjlig.
