# Guidad Felsökning

## Vision

Guidad Felsökning är en professionell diagnostikplattform som steg för steg vägleder tekniker genom en strukturerad felsökningsprocess. Plattformen dokumenterar varje moment, hämtar information från tillverkarens system via användarens egna behörigheter och skapar en komplett, spårbar felsökningshistorik.

Systemet ersätter inte teknikerens kompetens – det säkerställer att arbetet utförs metodiskt, dokumenteras korrekt och kan följas i efterhand.

Produkten ska inte försöka vara en AI-mekaniker, utan en **digital felsökningshandledare**. Det gör den både mer trovärdig och lättare att använda i professionella miljöer.

---

## Grundprinciper

### 1. Ingen gissning

Systemet får aldrig presentera spekulation som fakta.

Varje påstående märks med en tillförlitlighetsnivå:

- 🟢 **Hög** – verifierat genom mätning, tillverkarinformation eller användarens inmatning.
- 🟡 **Medel** – logisk slutsats baserad på tillgänglig information.
- 🔴 **Låg** – hypotes eller möjlig felorsak som kräver verifiering.

Om tillräckligt underlag saknas ska systemet uttryckligen säga det.

### 2. Identifiera objektet först

Ingen felsökning börjar innan objektet identifierats.

Identifiering kan ske genom:

- registreringsnummer
- VIN
- maskinnummer
- serienummer
- QR-kod
- streckkod
- OCR från typskylt
- foto av objektet
- manuell inmatning av objekt-ID

När identifieringen är klar visas en tydlig bekräftelse innan felsökningen fortsätter.

### 3. Integration med tillverkarsystem

Användaren ansluter sina egna behörigheter via API eller motsvarande integrationslösning.

Exempel på informationskällor:

- tillverkarens verkstadssystem
- reservdelskataloger
- elscheman
- servicebulletiner
- servicehistorik
- elektroniska serviceböcker
- interna DMS-system

Guidad Felsökning använder dessa som referens men lagrar inte upphovsrättsskyddad dokumentation om inte användaren eller organisationen har rätt att göra det.

### 4. Samtalsbaserad guidning

Teknikern arbetar naturligt:

> ”Jag har mätt.”
>
> ”Det finns 13,9 volt.”
>
> ”Reläet klickar inte.”

Systemet väljer nästa steg utifrån tidigare observationer och den etablerade felsökningsmetodiken.

### 5. Fullständig revisionslogg

Varje aktivitet registreras.

Exempel på loggposter:

- tidpunkt
- användare
- objekt
- mätvärden
- bilder
- dokument
- observationer
- AI:s rekommendation
- användarens svar
- nästa steg

Ingenting skrivs över. Händelser läggs endast till, vilket ger full spårbarhet.

### 6. Export och API

Varje avslutat ärende kan exporteras som ett strukturerat felsökningsprotokoll.

Det ska även finnas ett API för att:

- hämta loggar
- hämta rapporter
- koppla mot DMS
- koppla mot affärssystem
- koppla mot ERP
- koppla mot elektroniska serviceböcker
- koppla mot garantiadministration

På så sätt blir Guidad Felsökning en komponent i befintliga arbetsflöden, inte ett isolerat system.

---

## Moduler

Utöver grundprinciperna byggs plattformen upp av moduler som specificeras separat:

- [Arbetslogg & Tidredovisning](moduler/arbetslogg-och-tidredovisning.md) – tidsatt, spårbart arbete kopplat till konkreta aktiviteter; ett digitalt arbetsprotokoll där tid, aktivitet och tekniskt resonemang hänger ihop.

---

## Användargränssnitt

Gränssnittet ska vara avsiktligt enkelt.

Ingen chatt med långa AI-svar.

Istället:

- en fråga i taget
- en tydlig rekommenderad åtgärd
- stora knappar
- tydliga statusindikatorer
- hög kontrast
- få val per skärm

Designen ska ge samma känsla som ett modernt fabriksverktyg: funktion före estetik.

---

## Säkerhet

Systemet ska utformas för professionell användning med fokus på informationssäkerhet.

Målet är att:

- kryptera data under överföring och lagring,
- logga alla förändringar och åtkomster,
- stödja rollbaserad behörighetsstyrning,
- erbjuda säker API-autentisering,
- möjliggöra export och radering enligt organisationens policy och tillämpliga regelverk.

---

## Produktfilosofi

Den viktigaste principen är att Guidad Felsökning aldrig försöker ersätta teknikern.

Den ersätter inte erfarenhet.

Den ersätter inte tillverkarens dokumentation.

Den ersätter inte verkstadshandboken.

Den fungerar som en konsekvent arbetsledare som säkerställer att rätt frågor ställs i rätt ordning, att inga steg förbises och att hela felsökningsprocessen dokumenteras på ett sätt som är spårbart, återanvändbart och enkelt att integrera med övriga verksamhetssystem.

Det gör att verkstäder och serviceorganisationer får högre kvalitet, jämnare arbetssätt, bättre kunskapsöverföring mellan tekniker och ett tydligt underlag gentemot kunder, garantihantering och intern uppföljning.
