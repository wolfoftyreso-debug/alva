# Modul: Evidensmotorn (ECM — Evidence & Compliance Matrix)

**Version: ECM v1.0** · Regelbiblioteket är versionshanterat och skilt från
applikationslogiken (`src/felsokning/ecm.ts`). Vyerna anropar bara motorns
rena funktioner — regler kan uppdateras utan att applikationen byggs om.

## Grundprincip

**Inget underlag = ingen slutsats.**

Systemet får aldrig anta att en kontroll är utförd eller påstå att
dokumentation finns om den inte faktiskt är insamlad. Varje påstående i
diagnos, brief och slutrapport ska kunna härledas till minst en
evidenspost i händelseloggen. Systemet skriver aldrig "OK",
"kontrollerad", "inga fel" eller "åtgärdad" utan evidens — i stället:
**"Evidens saknas."** Regeln är kodad i orkesterns grundprompt och kan
inte kringgås från klienten.

## Evidensnivåer

| Nivå | Typ | Bevisvärde |
| --- | --- | --- |
| E0 | Inget underlag | 0 % |
| E1 | Teknikerns observation | Lågt |
| E2 | Foto | Medel |
| E3 | Video | Högt |
| E4 | Mätvärde | Högt |
| E5 | Diagnosdata/dokument (t.ex. skannad arbetsorder) | Mycket högt |
| E6 | Flera oberoende källor | Högsta |

Ärendets nivå härleds ur loggens faktiska innehåll (`evidensNiva`) och
visas i kvalitetsgrinden.

## Fullbordansregler

En kontrollpunkt kan bara slutföras när något av följande är sant:

1. **Krävd evidens är insamlad** — foto för det synliga, mätvärde för det
   som mäts, kommentar där inget bättre är möjligt (metodikens
   `krav`-fält per kontroll).
2. **Teknikern dokumenterar ett undantag**: *"Underlag kan inte tas
   fram"* med **obligatorisk orsak** (komponenten oåtkomlig, fordonet kan
   inte lyftas säkert, kunden avböjde demontering, dålig sikt, utrustning
   saknas — eller fri text). Undantaget loggas i händelseloggen och
   flaggas ⚠ i brief, överlämning och rapport — det redovisas aldrig som
   "utförd".

## Kvalitetsgrind före slutrapport

Slutrapporten kan inte genereras förrän grinden är godkänd
(`kvalitetsgrind`/`grindGodkand`):

| Kontroll | Krav |
| --- | --- |
| Fordons-/objektidentifiering verifierad | Obligatorisk |
| Arbetsorder inläst | Rekommenderas |
| Metodikens kontroller: evidens eller dokumenterat undantag | Obligatorisk |
| Foton finns för fotokrävande kontroller | Obligatorisk |
| Hypoteser redovisas som ej verifierade | Informativ (alltid sant per konstruktion) |
| Evidensnivå över E0 | Obligatorisk |

Utskriftsknappen är spärrad tills varje obligatorisk rad är grön; varje
röd rad visar exakt vad som saknas.

## Visual-first: kameran är integrationslagret

Plattformen prioriterar visuell insamling framför systemintegrationer.
När information redan visas på en skärm, ett instrument, en utskrift
eller en etikett fotograferas den — bildtolkningen extraherar, validerar
och strukturerar informationen automatiskt. Ingen specialintegration
behövs mot Bosch, TEXA, Autel, Launch, Hella Gutmann m.fl. så länge en
människa kan läsa informationen.

- **Arbetsorder** → ärendestartens dokumenttolkning (fält + konfidens).
- **Instrument/diagnosskärmar** → `📷 Instrument` i Dokumentera-panelen:
  foto → typidentifiering (multimeter, diagnosdator, batteritestare,
  mätarkluster, manometer …) → värden med enhet och konfidens → teknikern
  bekräftar → **originalbilden loggas alltid tillsammans med de
  strukturerade värdena** — strukturerad data ersätter aldrig
  originalevidensen.

Värden med hög säkerhet godkänns automatiskt; osäkra markeras för
granskning — samma konfidensmodell som arbetsorderskanningen
(🟢 ≥95 %, 🟡 80–95 %, 🔴 <80 %).

## Spårbarhet

Varje evidenspost är en händelse i den append-only-loggen med tidpunkt,
tekniker, ärende och innehåll — omöjlig att ändra i efterhand (triggers i
databasen). Det ger varje slutsats juridiskt spårbart underlag för kund,
försäkringsbolag eller domstol.

## Terminologi

Produkten beskrivs aldrig som en "AI-app" utan som ett **evidensbaserat
diagnossystem** / **intelligent beslutsstöd**. I användargränssnitt och
dokument används *systemet, analysen, bedömningen, tolkningen,
bildtolkningen, beslutsstödet, regelmotorn* — inte "AI", om det inte är
tekniskt nödvändigt (t.ex. i arkitekturdokumentation om modellorkestern).

## Kommande (regelbibliotekets väg framåt)

- Områdesregler per komponent (däck: fyra bilder + DOT + dimension;
  bromsar: närbild per ok; motorljud: video med ljud …) som
  serverdistribuerade, versionerade regelpaket.
- Video- och ljudevidens (E3) med analys.
- Garanti-/försäkrings-/reklamationsprofiler med egna obligatoriska
  fält i kvalitetsgrinden.
