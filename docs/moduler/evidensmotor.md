# Modul: Evidensmotorn (ECM — Evidence & Compliance Matrix)

**Version: ECM v2.0** · ECM är ett eget subsystem — inte en tabell i
databasen — och motorn som styr hela plattformen: den avgör vilken
dokumentation som krävs, när dokumentation saknas, vilken bevisnivå som
uppnåtts, vilka regler som gäller och om ett ärende kan avslutas.
**Systemet kan aldrig skriva en slutsats som ECM inte har godkänt.**

Regelbiblioteket är versionshanterat och skilt från applikationslogiken
(`src/felsokning/ecm.ts`); vyerna anropar bara motorns rena funktioner.

## De sex motorerna

### 1. Evidence Engine
Katalogiserar all bevisning ur händelseloggen. Varje evidenspost får
id, tidpunkt, tekniker, kategori, evidensnivå, sammanfattning och
**innehållshash** — samma post ger alltid samma hash, och den
append-only-låsta loggen (databastriggers) gör varje ändringsförsök
omöjligt.

| Nivå | Typ | Bevisvärde |
| --- | --- | --- |
| E0 | Inget underlag | 0 % |
| E1 | Teknikerns observation | Lågt |
| E2 | Foto | Medel |
| E3 | Video | Högt |
| E4 | Mätvärde | Högt |
| E5 | Diagnosdata/dokument | Mycket högt |
| E6 | Flera oberoende källor | Högsta |

### 2. Rule Engine
Dokumentationskraven: metodikens `krav`-fält per kontroll plus de
automatiska reglerna — *kan det fotograferas → begär foto; låter det →
video med ljud; rör det sig → video; mäts det → mätvärde; visar en
display informationen → fota displayen; finns ett dokument → fota
dokumentet.* Undantagsorsakerna ("Underlag kan inte tas fram") ligger
här.

### 3. Compliance Engine
Ärendetypen styr vilka regler som gäller utöver metodiken. Ärendetyp
väljs i identitetsraden och loggas (`arendetyp_satt`):

| Ärendetyp | Extra krav (v2.0) |
| --- | --- |
| Garanti | Miltal dokumenterat · servicehistorik kontrollerad · claim-/garantinummer |
| Goodwill | Miltal · servicehistorik |
| Försäkring | Skadenummer · bildbevis |
| Reklamation | Historik och tidigare försök kontrollerade |
| Begagnatgaranti | Miltal |

Här ansluter det framtida **ECM Knowledge Library**: serverdistribuerade,
versionerade regelpaket (garantivillkor per tillverkare, försäkringsbolagens
krav, reklamationslagstiftning, OEM-kontrollpunkter) som laddas dynamiskt
utan appändring.

### 4. Validation Engine
Inga påståenden utan underlag, i tre lager: (a) orkesterns grundprompt —
aldrig "OK/kontrollerad/inga fel/åtgärdad" utan evidens, i stället
"Evidens saknas" plus begäran om rätt underlag; (b) projektionerna —
hypoteser kan aldrig bli konstaterade fel; (c) kvalitetsgrinden nedan.

### 5. Completion Engine
Kvalitetsgrinden före slutrapport/avslut — utskriften är spärrad tills
alla obligatoriska rader är gröna:

| Kontroll | Krav |
| --- | --- |
| Fordons-/objektidentifiering verifierad | Obligatorisk |
| Arbetsorder inläst | Rekommenderas |
| Fordonshistorik kontrollerad eller motiverad | Obligatorisk |
| Ingående mätarställning dokumenterad | Obligatorisk |
| Kundens felbeskrivning verifierad | Rekommenderas |
| Utgående mätarställning | Obligatorisk vid avslut |
| Metodikens kontroller: evidens eller dokumenterat undantag | Obligatorisk |
| Foton för fotokrävande kontroller | Obligatorisk |
| Ärendetypens compliance-krav | Obligatoriska |
| Evidensnivå över E0 | Obligatorisk |

### 6. Traceability Engine
Varje export bär ett spårbarhetspaket: ECM-version, ärendetyp,
evidensnivå, grindstatus per regel-id och samtliga evidensposter med
hash. Tillsammans med loggen kan varje slutsats härledas: vilken bild →
vilken mätning → vilken tekniker → vilken regel → vilken regelverksversion
→ när.

## Pre-Diagnostic Validation

Ingen felsökning påbörjas förrän grundkontrollerna är genomförda eller
dokumenterat motiverade — metodiken låses upp först därefter:

1. **Fordonshistorik** — kontrollerad (tidigare arbeten, återkommande
   fel, TSB, kampanjer; relevanta samband kan noteras som orsakskedja)
   eller Nej med obligatorisk orsak → kvalitetsvarning.
2. **Ingående mätarställning** — instrumentpanelen fotograferas;
   bildtolkningen föreslår värdet, teknikern bekräftar. Fotot blir den
   officiella ingående mätarställningen.
3. **Kundens felbeskrivning verifierad** — ytterligare symptom
   dokumenteras som separata observationer, aldrig hopblandade med
   kundens beskrivning.
4. **Tidiga observationer** — reparationsspår, modifieringar, skador,
   läckage m.m. dokumenteras med foto/observation, eller kvitteras
   "inga ytterligare".

**Utgående mätarställning** fotograferas inför avslut och blir
obligatorisk i grinden när ärendet stängs. Rapporten visar in/ut.

## Symptom Verification Protocol (SVP)

Ett fel diagnostiseras aldrig direkt från en vag kundbeskrivning.
Kedjan är alltid: **dokumenterats → förtydligats → reproducerats eller
dokumenterats som ej reproducerbart.**

- Kundens beskrivning registreras ordagrant vid ärendestart och
  verifieras i pre-diagnostiken; nya symptom blir separata observationer.
- Förtydligandet sker genom metodikens symptomfrågor (när/var/hur/
  förhållanden/frekvens — generiska metodiken har hela SVP-frågesetet).
- **Reproducering** (Ja/Delvis/Nej) dokumenteras innan avslut: Ja kräver
  hur och under vilka förhållanden; Delvis vad som kunde respektive inte
  kunde återskapas; Nej kräver motivering. Systemet skriver aldrig
  "felet konstaterat" utan reproducering eller annan verifiering — i
  stället: *"Kundens beskrivning kunde inte reproduceras under de
  förhållanden som rådde vid undersökningen."* (kodat även i orkesterns
  grundprompt).
- Rapportens beviskedja skiljer alltid: kundens beskrivning →
  verifierad observation → felorsaksanalys → rekommenderad åtgärd.

## Felorsaksanalys (Root Cause Analysis)

Ett ärende avslutas aldrig med enbart "komponent defekt, byt komponent".
Varje konstaterat fel kräver fyra obligatoriska svar:

1. **Konstaterad avvikelse** — kvalitetsregeln avvisar generella
   formuleringar ("trasig", "defekt", "sliten", "behöver bytas") utan
   förklaring.
2. **Mest sannolik orsak** — en eller flera kategorier (normalt slitage,
   materialutmattning, tillverkningsfel, bristande underhåll, felaktig
   tidigare reparation, yttre påverkan, korrosion, överhettning,
   modifiering … samt *Okänd orsak*, som kräver motivering).
3. **Underlag** — minst en evidenskälla, och källan valideras mot
   loggen: "Foto" godtas bara om ett foto faktiskt finns.
4. **Säkerhetsnivå** — hög/medel/låg; vid medel/låg krävs vilka
   ytterligare kontroller som skulle stärka bedömningen.

Avslutsknappen är spärrad tills SVP + felorsaksanalys är dokumenterade,
och kvalitetsgrinden gör båda obligatoriska när ärendet stängs. Efter
tusentals ärenden ger orsakskategorierna dessutom flottdata: vilka
komponenter fallerar av slitage, vilka efter tidigare reparationer,
vilka tyder på konstruktionsproblem.

## Ärendeidentitet (Case Identity & Vehicle Context)

Fordonsobjektet är den röda tråden: identiteten registreras **en gång**
(normalt via arbetsorderskanningen, som nu även läser claim-/garantinummer
och skadenummer) och återanvänds sedan överallt:

- **Identitetsrad i arbetsytan** — AO, claim, skadenummer, fordon, regnr,
  VIN, miltal, ansvarig tekniker + ärendetypsval.
- **Live Share** — låst panel överst med fordon, referenser och status,
  härledd ur det nivåfiltrerade underlaget.
- **Slutrapportens första sida** — Ärendeinformation + Fordonsinformation
  automatiskt.
- **Exporten** — identitet + spårbarhetspaket i varje JSON.

## Terminologi

Produkten beskrivs aldrig som en "AI-app" utan som ett **evidensbaserat
diagnossystem** / **intelligent beslutsstöd**. I användargränssnitt och
dokument används *systemet, analysen, bedömningen, tolkningen,
bildtolkningen, beslutsstödet, regelmotorn* — inte "AI", om det inte är
tekniskt nödvändigt.
