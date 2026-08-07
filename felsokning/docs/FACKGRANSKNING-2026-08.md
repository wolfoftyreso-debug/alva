# Fackgranskning · Metodikinnehållet, teknisk granskning

**ALVA 3.5 · 2026-08-06 · ALVA-DOC-0009**

Granskningens föremål är **metodikbiblioteket**
(`services/gemensam/metodiker.mjs`) — den enda text i systemet som säger
åt en tekniker vad den ska göra med ett fordon. Sexton metodiker, 64
steg, 153 kontroller före granskningen.

**Vad detta är, och inte är.** Sex oberoende domängranskningar med
verkstadskompetens per fordonssystem: chassi, elsystem, högvolt,
motor/drivlina, övriga system, samt en maskinell granskning av
bibliotekets egna tre regler. Varje fynd verifierades mot filen innan
åtgärd, varje ersättning applicerades med träffkrav. Detta är den
**tekniska** fackgranskningen — den höjer innehållets golv. Den är INTE
den fackgranskning per marknad som `granskat`-flaggan i SPRAK avser:
den flaggan sätts av en namngiven, yrkesverksam människa enligt
protokollet i ALVA-DOC-0010, och ingen flagga har ändrats här.

---

## 1. Kritiska fynd — samtliga åtgärdade

| # | Fynd | Åtgärd |
| --- | --- | --- |
| K-1 | **Högvolt: skyddsutrustning och avspärrning låg SIST i säkerhetssekvensen** — efter spänningsfrihetsmätningen, som per definition är arbete nära potentiellt spänningsförande delar | Kontrollen flyttad först, med krav på isolerhandskar (EN 60903, inom provningsdatum), visir och isolerade verktyg (EN 60900) |
| K-2 | **Högvolt: spänningsfrihetsmätningen saknade instrumentkategori och proval** — en defekt mätare visar 0 V | CAT III-krav, tillverkarens mätpunkter (HV+/HV−/chassi), prova–mät–prova |
| K-3 | **Högvolt: ingen låsning mot återinkoppling** — någon kunde återinkoppla under pågående arbete | Tändning av, nyckel utom räckhåll, frånskiljaren under den arbetandes egen kontroll, skyltat |
| K-4 | **Högvolt: inget förbud formulerat** — metodiken sa aldrig vad som INTE får göras utan behörighet | Beskrivningen anger stopplinjen: ingen kåpdemontering, ingen aktiv isolationsmätning, aldrig arbete i spänningssatt system |
| K-5 | **Metodikvalet: styrningens nyckelord inklistrade i högvoltens lista** — "pulls", "steering", "power steering" routade chassiklagomål till HV-metodiken. Bekräftat oberoende av fyra granskare | De tretton främmande orden borttagna |
| K-6 | **Klimat: ingen behörighetsgrind för köldmediearbete** — f-gasförordningen kräver certifikat | Nytt säkerhetssteg först, samma mönster som högvolt |
| K-7 | **ADAS: provkörningen instruerade att provocera nödbromsingrepp i trafik** | Tillverkarens testmetod; uttryckligt förbud mot att provocera AEB/styrning på allmän väg |
| K-8 | **Kylsystem: ingen varning mot att öppna varmt trycksatt system** — skållningsrisk | Varning i mätsteget; provtryck begränsat till lockets märktryck |
| K-9 | **Motor: bränsletryck och kompressionsprov utan säkerhetsvillkor** — högtryckssida (200+ bar), bränsledimma plus gnista | Trycksänkning före öppning, högtryckssidan läses via styrenheten, tändning och insprutning deaktiveras före kompressionsprov |
| K-10 | **Läckage/avgas: provkörning vid bränsle-/bromsvätskeläckage; motorkörning utan utsug** | Villkorade förbud respektive utsugskrav |

## 2. Större och mindre fynd i urval — åtgärdade

- **Mätvärden fick referenser och villkor**: startspänning >9,6 V,
  spänningsfall ≤0,5 V, laddspänning 13,8–14,8 V med reservation för
  smart laddning, vilostrom <30–50 mA mätt utan kretsbrott,
  CAN-terminering ≈60 ohm med gateway-reservation, AC-tryck vid
  föreskrivet varvtal, batteritest villkorat på laddstatus.
- **Fel metod ersatt med rätt**: säkringar mäts under belastning i
  stället för att synas, krypström lokaliseras med mV-fall över
  säkringarna i stället för säkringsdragning som väcker moduler,
  tändspolar skiftas i stället för att resistansmätas, glappkontrollen
  avlastar leden efter fjädringstyp med 12–6/3–9-metoden.
- **Ordningsfel mot bibliotekets egen regel**: vibrationens provkörning
  låg sist trots att symptomfrågorna kräver körning — flyttad först
  efter symptomsteget; helavläsningen (gratis) före bussmätningen
  (ingrepp); bromsarnas felkodsläsning före mätningarna.
- **23 nya kontroller där granskningen fann diagnostiska hål**:
  bromsvätskenivå före flytt av bilen, temperaturjämförelse per hjul,
  parkeringsbroms, brutna fjädrar med fjädringshöjd, däcktryck och
  däckskifte före hjulinställning, servostyrning, vicktest vid
  intermittenta elfel, HVIL-avläsning, termostatens öppningstemperatur,
  drivaxlar/kardan/kopplingsslir, emissionsmätning, vätskeidentifiering
  och vattenprov, frikopplings-/kurvprotokoll för missljud,
  fordonskondition före ADAS-kalibrering, felkoder och
  energikällefråga i det generiska skyddsnätet.
- **Regelefterlevnad, maskinellt verifierad**: 176/176 kontroller har
  evidenskrav; alla symptomsteg frågar vad/när/var utom läckagets
  hypotesfråga som skrivits om till observation; säkerhetssteg först
  där arbetet kan skada.
- Grindtexten `grind.hogvolt.spanningslos` kräver nu "spänningsfrihet
  verifierad genom mätning" — på alla tio språken, i takt med den
  skärpta spärrfrågan.

## 3. Bokfört utan åtgärd

| Fynd | Beslut |
| --- | --- |
| "Kan inte hoppas över" för säkerhetssteg finns bara som prosa — ingen maskinläsbar flagga | Datamodelländring; tas i nästa regelpaketsrevision |
| Kravtypen "video" saknas — missljudets inspelning kravmärks "foto" | Schemaändring; texten säger vad som avses |
| Högvoltens behörighetsfråga är ja/nej utan evidens | Kräver koppling till användarprofil/behörighetsregister |
| Hjulinställningens krav-asymmetri (foto i styrning, mätvärde i ADAS) | Delvis motiverad av intilliggande mätvärdeskontroll; lämnad till marknadsgranskaren |
| Styrningens saknade provkörningssteg; klimatets kondensorfläktkontroll | Diagnostiska förbättringar utan säkerhetsdimension; till marknadsgranskningen |

## 4. Verifiering

176 kontroller efter åtgärd, samtliga med krav. Metodiktesterna låser
id-stabilitet, symptom-först (säkerhetssteg undantaget), högvoltens
spärrkontroller och unika nycklar. Full kontrollslinga körd efter
åtgärd — enhetstester, genomgång inom interaktionsbudget, portalspärr,
integrationstest, typkontroll, lint, artefaktmätning. Resultat i
commit-historiken.

Nästa steg är människans: protokollet i ALVA-DOC-0010, en granskare
per marknad, en underskrift per språk. Först då flyttas
`granskat`-flaggorna.

---

*ALVA-DOC-0009 · Teknisk fackgranskning · Ersätter inte marknadens granskare*
