# UI-genomgången — flödena prövade i webbläsare

**ALVA-DOC-0014 · 2026-08-17 · 22 vyer vid 390 px, alla flöden**

Metoden: varje flöde kördes i riktig webbläsare på telefonbredd —
publika webben, inloggningen, portalens tio vyer, teknikerns
diagnosruta, nytt ärende, ärendevyn med samtliga paneler, statistiken,
inställningarna och kunddelningen. Varje steg skärmdumpades och
granskades; konsolfel, sidledsspill och råvärden (`undefined`, `NaN`)
fångades maskinellt. Maskinellt: rent. Mänskligt: fynden nedan.

## Åtgärdat i denna genomgång

| Fynd | Åtgärd |
| --- | --- |
| Verktyget halvtalade svenska: tidslinjens händelsetexter (`handelseRubrik`) var till hälften svenska — "Objekt identifierat", "Kundens besked", "Kvalitetskontroll" — mitt i det engelska verktyget | Alla 18 kvarvarande texter översatta. HändelseTYPERNA i schemat är orörda — detta är visningstexter, inte identiteter |
| Kunddelningens sammanfattning ("Ärendet gäller … Kunden beskrev …") svensk medan vyns rubriker var engelska | `sammanfattning.mjs` engelsk (delad modul, symlänkad till servern); testlitteralerna följde med |
| Startknappen "Skanna arbetsorder" svensk | "Scan the work order" |
| AI-panelens rubrik "Handledning" svensk | "Guidance" |
| Demoärendet blandade språk: "Kontrollera lufttryck", "140 Nm samtliga hjul", "890 kr inkl. moms", "Balansvikter 40 g", svar "Ja"/"Endast i ratten", kanal "Telefon" | Demodata genomgående engelsk — demon ÄR produktintrycket |
| Delningsvyns etiketter "Ditt besked", "registrerat via", "Uppskattad kostnad" | Engelska |
| **Statistiklänken var en återvändsgränd i lokalt läge**: teknikern som klickade Statistics möttes av "requires supervisor rights" trots att ingen plattform ens fanns | Lokalt läge visar nu ENHETENS statistik — nyckeltal ur samma statistikmodul som organisationens, ärligt märkta "this device", med uppmaning att logga in för helheten. Plattformsläge utan behörighet behåller rättighetstexten, nu med hänvisning till Cases |

Verifiering efter åtgärd: 846 tester gröna, typkontroll ren,
integrationstestet allt grönt, genomgången 4/4 inom budget, omkörd
UI-runda utan konsolfel eller spill, delningsvyn och statistiken
visuellt kontrollerade.

## Bokfört utan åtgärd — nästa beslut

| Fynd | Skäl |
| --- | --- |
| ~~Kunddelningens språk är konsekvent engelskt — men kunden är ofta svensk~~ **AVGJORT OCH BYGGT 2026-08-21, se nedan** | — |
| Portalens demonstrationsdata (Dashboard, fakturor) är engelska med svenska organisationsnamn ("Verkstad A") | Konsekvent nog för demonstration |

## Avgjort efter genomgången · Kunddelningen på mottagarens språk

Beslutet föll på MOTTAGARENS val, inte organisationens: mottagaren är
den enda läsare som aldrig valt verktyget, och delningsvyn bär nu en
egen språkväljare med webbens kedja (eget val → webbläsare → engelska,
sparat lokalt). Bygget, allt genom tiospråkssystemet:

- **77 nya katalognycklar** per språk (`sammanfattning.*`, `delning.*`)
  i alla tio kataloger — kompletthets-, hållar- och förklädnadstesten
  omfattar dem automatiskt.
- **`sammanfatta(arende, sprak)` / `enrading(arende, sprak)`** med
  engelska som standard: servern (symlänken) och verktyget läser exakt
  samma text som före bygget; serverns sammanfattningsendpoint tar
  `?sprak=`. `saknas`-listan är maskinvänd och förblir engelsk.
- **Delningsvyn och den publika delningssidan** hämtar varje etikett,
  beskedsflödet och för-laddningsskärmarna ur katalogen.
- **Tidslinjen översätts INTE**: teknikerns poster är evidens och visas
  ordagrant på verkstadens arbetsspråk — och vyn SÄGER det, på
  mottagarens språk, i stället för att låtsas.

Låst av `delningssprak.test.ts` (17 tester: varje nyckel vyn slår upp finns i
katalogen — `t()` faller annars tyst tillbaka till nyckeln på kundens
skärm; de gamla litteralerna får inte återuppstå) och av
språkassertioner i sammanfattningstestet. Verifierat i webbläsare vid
390 px: engelska utan val, svenska och tyska via väljaren, valet
överlever omläsning, inga konsolfel, inget spill.

---

*ALVA-DOC-0014 · Flödena håller; verktyget talar ETT språk — och
delningen talar mottagarens.*
