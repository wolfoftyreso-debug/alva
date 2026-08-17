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
| **Kunddelningens språk är nu konsekvent engelskt — men kunden är ofta svensk.** Rätt lösning är att delningen följer ett SPRÅKVAL (organisationens eller mottagarens) via tiospråkssystemet, som redan bär 258 nycklar per språk. Sammanfattningens meningar och tidslinjetexterna blir då katalognycklar | Språkval per delning är ett designbeslut (var väljs det? per ärende, per organisation?) och en katalogutbyggnad — eget arbete, inte en snabbrättelse |
| Portalens demonstrationsdata (Dashboard, fakturor) är engelska med svenska organisationsnamn ("Verkstad A") | Konsekvent nog för demonstration; följer med språkvalsarbetet |

---

*ALVA-DOC-0014 · Flödena håller; verktyget talar nu ETT språk, och
nästa språk är ett beslut — inte en olycka.*
