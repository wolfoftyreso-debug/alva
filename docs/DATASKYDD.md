# Dataskydd — register, biträdesavtal och överföringsbedömning

Detta dokument stänger tre revisionspunkter som inte är kod utan beslut och
åtaganden: **C-4** (personuppgiftsbiträdesavtal och underbiträdesregister),
**överföringsbedömningen** för AI-orkesterns anrop till tredje land, och
**transparenskravet i T-3** — att raderingslöftet måste beskrivas ärligt för
den registrerade, inklusive det fönster där en säkerhetskopia tagen före
raderingen fortfarande bär uppgiften.

Det är avsiktligt kortfattat och faktagrundat i koden. Där en formulering
återger en teknisk mekanism pekar den på filen som styr den, så att dokumentet
och systemet inte kan glida isär utan att det syns.

---

## 1. Roller

ALVA levereras som en tjänst till fordonsverkstäder. I varje ärende är

- **verkstaden personuppgiftsansvarig** för sin kund (fordonsägaren): det är
  verkstaden som bestämmer ändamålet — att felsöka och åtgärda ett fordon — och
  som har kundrelationen.
- **ALVA:s driftansvarige personuppgiftsbiträde**: vi behandlar uppgifterna för
  verkstadens räkning, enligt dess instruktion, och bestämmer inte själva
  ändamålet.

Den registrerade (fordonsägaren, och i förekommande fall en betalande tredje
part som ett försäkringsbolag) vänder sig till verkstaden med sina rättigheter.
Systemet är byggt för att verkstaden faktiskt ska kunna infria dem — se avsnitt
5 om radering och avsnitt 6 om övriga rättigheter.

För ALVA:s **egna** användare (verkstadens tekniker och administratörer, deras
namn och e-post i inloggningen) är driftansvarige själv personuppgiftsansvarig.

---

## 2. Behandlingsregister (artikel 30)

| Kategori | Uppgifter | Var | Rättslig grund (verkstadens) | Gallring |
| --- | --- | --- | --- | --- |
| Fordonsägare / kund | Namn, telefon, e-post, adress, registreringsnummer, VIN | Händelseloggen, **krypterade per subjekt** (`services/gemensam/personuppgifter.mjs`) | Avtal / berättigat intresse | Krypto-shredding på begäran; nyckeln gallras med ärendet (`services/plattform/gallring.mjs`) |
| Betalande tredje part | Betalarens namn, claim-/ärendereferens | Samma, krypterat | Verkstadens rättsliga förpliktelse (fakturering) | Som ovan |
| Verksamhetsdata | Mätvärden, kontrollresultat, observationer, tidsstämplar, teknikerns roll | Händelseloggen, **i klartext** | — (bär inget personvärde i sig) | Append-only; bevaras som garantiunderlag |
| ALVA-användare | Teknikers/administratörs namn, e-post, lösenordshash | Användartabellen | Avtal | Vid avslutat konto |
| Arbetsordersbild | Foto av arbetsorder (kan innehålla samtliga kunduppgifter ovan) | Skickas till AI-orkestern för tolkning, se avsnitt 4 | Verkstadens berättigade intresse | Bilden lagras som bilaga med referens; inte hos underbiträdet |

Varför identifierande fält krypteras men verksamhetsdata inte gör det står
utförligt i `personuppgifter.mjs`: att kryptera allt vore enklare att beskriva
och sämre i praktiken, eftersom då raderas beviset tillsammans med
personuppgiften. Registreringsnummer och VIN räknas som identifierande — EDPB
behandlar VIN som personuppgift när kopplingen till en ägare finns, och här
finns den.

---

## 3. Personuppgiftsbiträdesavtal (C-4)

Driftansvarige tecknar ett personuppgiftsbiträdesavtal med varje verkstad. Det
ska, utöver artikel 28.3:s obligatoriska innehåll, binda följande som redan är
sant i systemet — avtalet får inte utlova mindre än vad koden gör, och inte mer:

1. **Behandling endast på dokumenterad instruktion.** Ändamålet är felsökning,
   åtgärd och det garantiunderlag verkstaden behöver. Ingen sekundäranvändning.
2. **Append-only med bevisvärde.** Loggen kan inte ändras eller raderas
   selektivt av någon roll — det är en egenskap i databasen (`infra/postgres-init.sql`),
   inte en policy. Detta är en styrka för den registrerade: ett ärende går inte
   att skriva om i efterhand.
3. **Radering genom krypto-shredding.** Rätten till radering infrias enligt
   avsnitt 5, med den ärligt angivna begränsningen om säkerhetskopior.
4. **Underbiträden** enligt registret i avsnitt 3.1, med förhandsinformation vid
   byte och rätt för den ansvarige att invända.
5. **Bistånd** vid registrerades förfrågningar, incidenter (72-timmarsregeln)
   och konsekvensbedömningar.
6. **Radering eller återlämning** vid avtalets slut, och möjlighet till granskning.

### 3.1 Underbiträdesregister

Detta är de underbiträden produktionsbygget faktiskt använder. Bygget väljs i
`Dockerfile` (`VITE_PLATTFORM_URL=/api`, `VITE_AI_ORKESTER_URL=/ai`), så listan
speglar den körande produkten och inte en tidigare variant.

| Underbiträde | Behandling | Plats | Överföring tredje land |
| --- | --- | --- | --- |
| Amazon Web Services (Aurora PostgreSQL) | Lagring av händelseloggen och användare | EU-region (välj EU vid drift) | Nej, när EU-region väljs |
| Amazon Web Services (S3) | Lagring av bilagor — **valfritt**, standard är i databasen (`bilage_innehall`) | EU-region | Nej, när EU-region väljs |
| Anthropic (Claude API) | AI-orkesterns tolkning: arbetsordertydning och diagnosresonemang | USA | **Ja** — se avsnitt 4 |
| Google (Gemini API) | Bildanalys — **en kommentar under en bevisbild** (valfri, av/på med `GEMINI_API_KEY`; under utvärdering) | USA | **Ja** — se avsnitt 4 |

Ingen betalningshanterare finns med. Fakturering sker utan kortuppgifter och
utan extern tjänst; betalning registreras av en administratör när pengarna kommit
in (`services/plattform/fakturering.mjs`). Inget e-postutskick lämnar systemet.

En äldre driftform (Supabase/Lovable) fanns i kodbasen som reservväg men ingår
inte i produktionsbygget; dess edge-funktioner var det enda stället kortbetalning
(Stripe) förekom. Se `docs/` för retirementbeslutet.

---

## 4. Överföring till tredje land — bedömning (TIA)

**Överföringar till tredje land sker till AI-leverantörerna: Anthropic (Claude API)
och — när bildanalysen är påslagen — Google (Gemini API), båda i USA.** Allt annat
kan hållas inom EU genom regionvalet.

Behandlingarna:

- **Arbetsordertydning.** Ett foto av en arbetsorder skickas för OCR och
  layoutförståelse. Bilden **kan innehålla samtliga kunduppgifter** — namn,
  telefon, e-post, registreringsnummer, VIN (`services/ai-orkester/server.mjs`,
  `ARBETSORDER_FALT_ID`). Detta är den känsligaste överföringen och måste
  behandlas som en personuppgiftsöverföring.
- **Diagnosresonemang.** Verksamhetsdata (mätvärden, symptom, kontroller).
  Fältkatalogen för det som skickas är identifierande-medveten, men verkstaden
  ska instrueras att inte skriva personuppgifter i fritextfält som följer med.
- **Bildanalys (Gemini, valfri).** Ett bevisfoto skickas för en kort kommentar.
  Fotot kan visa en fordonsdetalj, men också — oavsiktligt — ett
  registreringsnummer, en verkstadslokal eller en person i bakgrunden. Funktionen
  är därför **av som standard** och slås på per drift med `GEMINI_API_KEY`. Den
  är under utvärdering; ingen kommentar skrivs till den förseglade loggen, så
  behandlingen lämnar inget spår i bevismaterialet.

**Grund för överföringen.** Respektive leverantörs standardavtalsklausuler (SCC, modul 2/3)
tecknas som del av biträdesavtalskedjan. En kompletterande bedömning
(Transfer Impact Assessment) krävs enligt Schrems II:

- **Uppgiftskategori:** kontaktuppgifter och fordonsidentitet — inte särskilda
  kategorier. Låg till medelhög känslighet.
- **Kompletterande skyddsåtgärder som redan finns:** verksamhetsdata skiljs från
  identitet i systemets egen lagring; arbetsorderbilden är den punkt där de möts,
  och det är den överföringen som är den reella risken.
- **Kvarstående åtgärd som ska genomföras innan funktionen används i skarpt läge
  för en ansvarig som inte accepterar överföringen:** göra arbetsordertydningen
  avstängningsbar per organisation, eller förbehandla bilden så att
  identifierande fält maskeras innan den lämnar EU. Detta är en produktåtgärd,
  inte ett avtal — den är listad i avsnitt 7.

Tills dess är slutsatsen: **överföringen är tillåten med SCC för verkstäder som
informeras om och accepterar den, men arbetsordertydningen ska kunna stängas av
för den ansvarige som inte gör det.**

---

## 5. Rätten till radering (artikel 17) — och dess ärliga gräns

Systemet infriar radering genom **krypto-shredding**: identifierande fält lagras
krypterade med en nyckel som är unik per registrerad, och radering sker genom att
nyckeln förstörs. Loggen förblir intakt och hashverifierbar — det som blir
oåtkomligt är identifieringen, inte protokollet över vad som kontrollerades
(`services/gemensam/personuppgifter.mjs`). Ett ärende kan efter radering
fortfarande visa att lufttrycket mättes till 2,4 bar av en behörig tekniker
klockan 08:42 — bara inte längre vem bilen tillhörde.

Nycklarna lagras **kuverterade under en huvudnyckel som inte finns i databasen**
(`PERSONNYCKEL_HUVUD`, `services/plattform/server.mjs`). En återställd
databasdump ger därför nycklar som inte går att öppna utan huvudnyckeln.

### Det som måste sägas till den registrerade

**En säkerhetskopia tagen _före_ raderingsbegäran bär fortfarande uppgiften tills
den kopian rullar av.** Raderingen är omedelbar i det levande systemet, men
databasen säkerhetskopieras med point-in-time-recovery (Aurora PITR) inom ett
retentionsfönster. En återställning till en tidpunkt före raderingen, tillsammans
med huvudnyckeln, kan återskapa uppgiften under den tiden.

Detta är inte en brist att dölja utan ett faktum att ange. Den registrerade ska
informeras om att:

1. radering i det aktiva systemet sker utan onödigt dröjsmål,
2. uppgiften kan finnas kvar i säkerhetskopior under driftens
   PITR-retentionsfönster (driftansvarige anger fönstrets längd), och
3. säkerhetskopior återställs endast vid katastrof, aldrig för att nå enskilda
   uppgifter, och den återställda kopian omfattas i sin tur av samma radering.

Att stänga fönstret helt kräver den tekniska åtgärden i avsnitt 7.

---

## 6. Övriga rättigheter

- **Tillgång och portabilitet:** ärendet kan exporteras. Rätten till kundens
  eget underlag betonas även i faktureringens spärrlogik — "that record belongs
  to your customer, not to us" (`services/plattform/abonnemang.mjs`).
- **Rättelse:** loggen är append-only, så en rättelse görs som en ny, daterad
  post som hänvisar till den tidigare — historiken skrivs inte om, men den
  korrekta bilden framgår. Detta bevarar bevisvärdet.
- **Invändning mot AI-överföring:** se avsnitt 4 och åtgärd 7.1.

---

## 7. Kvarstående tekniska åtgärder

Dessa är kända, avgränsade och förberedda i koden. De kräver drift- eller
infrastrukturbeslut och kan inte verifieras enbart i utvecklingsmiljön.

### 7.1 Avstängbar / maskerande arbetsordertydning (för TIA)
Gör AI-orkesterns arbetsordertydning avstängningsbar per organisation, alternativt
förbehandla bilden så identifierande fält maskeras innan den lämnar EU. Stänger
den enda reella tredjelandsöverföringen för den ansvarige som inte accepterar den.

### 7.2 Per-subjektsnyckel i KMS (T-3, full stängning)
Förvaringen av personnycklarna är nu ett utbytbart **valv**
(`services/plattform/nyckelvalv.mjs`) med två implementationer:

- **Lokalt valv** (standard, oförändrat): nyckeln kuverteras under
  `PERSONNYCKEL_HUVUD`. Stänger "backup + nyckel i databasen", men inte
  backupfönstret i avsnitt 5 — `durabel = false`, och det säger valvet ärligt.
- **KMS-valv** (`PERSONNYCKEL_KMS_*`): en KMS-nyckel per subjekt, adresserad via
  ett hashat alias. `omslut`/`oppna` krypterar mot subjektets egen nyckel med
  subjektet som `EncryptionContext`; **raderingen** (`gallra` och `/api/radering`)
  schemalägger den nyckeln för radering innan pekaren tas bort. Efter KMS
  väntefönster (7–30 dagar, angivet mot den registrerade som avsnitt 5:s "utan
  onödigt dröjsmål") går varken den levande databasen eller någon backup att
  öppna. `durabel = true` — det är så backupfönstret stängs per subjekt.

**Vad som är bevisat här:** SigV4-signeringen mot KMS är bitidentisk mot AWS egen
(botocore-referens, `kms-sigv4-referens.json`), och valvets anrop och tolkning är
provade mot en injicerad hämtare. Särskilt: ett SLUTGILTIGT tillstånd (nyckeln
schemalagd för radering eller borta) skiljs från ett ÖVERGÅENDE fel (strypning,
500, behörighet) — en förstörd nyckel ger raderad post, medan ett övergående fel
kastar i stället för att tyst se ut som en radering. Därför kan varken en
misslyckad `forstor` lämna en pekarlös men levande nyckel, eller en tillfälligt
otillgänglig KMS maskera levande uppgifter som förstörda. **Vad som återstår:** en riktig KMS i andra änden — den lata
nyckelskapelsen (CreateKey/CreateAlias vid första användning) och en verklig
Encrypt/Decrypt/ScheduleKeyDeletion-rundtur går inte att prova i utvecklingsmiljön.
Terraform för CronJob och secret-koppling finns skrivet men är inte applicerat i
denna miljö.

---

*Dokumentet speglar systemets faktiska konstruktion. Ändras mekanismen ska detta
register ändras i samma veva — annars lovar avtalet något koden inte längre gör.*
