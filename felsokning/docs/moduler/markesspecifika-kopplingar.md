# Märkesspecifika kopplingar

Verkstaden har redan sina avtal. Volvo-verkstaden har VIDA, VAG-verkstaden
har erWin, den fria verkstaden har en fordonsdataleverantör. Ingen av dem
vill att vi ska vara mellanhand för deras abonnemang — och ingen av dem
har samma uppsättning som grannen.

Därför konfigurerar **kunden själv** sina kopplingar under
**Inställningar → Märkesspecifika kopplingar**, med sina egna credentials.
Vi tillhandahåller ramen, inte kontot.

## Principer

**Uppgifterna når aldrig webbläsaren.** Samma regel som för
plattformens egna API-nycklar: hemligheter bor på servern. Credentials
krypteras med AES-256-GCM innan de skrivs till databasen, och API:t
returnerar hemliga fält maskerade (`••••3456`). Klienten kan se *att* en
koppling finns och när den senast fungerade — aldrig vad nyckeln är.

**Alla uppslag görs av servern.** Klienten skickar en identifierare
(VIN eller regnr); servern hämtar uppgifterna, dekrypterar dem i minnet,
anropar leverantören och returnerar bara de mappade fordonsfälten.

**Fail closed.** Saknas krypteringsnyckeln (`INTEGRATION_NYCKEL`) sparas
ingenting — API:t svarar 503 och inställningssidan förklarar varför.
Alternativet, att lagra i klartext "så länge", finns inte.

**Endast systemadministratören.** Att lägga till, ändra och ta bort
kopplingar kräver rollen `admin`. Teknikern kan läsa registret över
tillgängliga leverantörer (annars kan inställningssidan inte visa dem)
men aldrig någon organisations uppgifter.

**Organisationsknutet.** Kopplingarna hör till organisationen, precis
som ärendedata. Ingen tenant ser en annans.

## Leverantörer är data, inte kod

Registret ligger i `services/plattform/integrationer.json` och kan bytas
mot en ConfigMap-mount via `INTEGRATIONER_FIL`. En leverantör beskrivs
helt deklarativt:

```json
{
  "id": "volvo_vida",
  "namn": "Volvo VIDA",
  "falt": [
    { "nyckel": "bas_url", "etikett": "Bas-URL (använd {vin} som platshållare)", "hemlig": false },
    { "nyckel": "api_nyckel", "etikett": "API-nyckel", "hemlig": true }
  ],
  "uppslag": {
    "urlFalt": "bas_url",
    "auth": "header",
    "authHeader": "X-Api-Key",
    "authFalt": "api_nyckel",
    "svarsfalt": { "marke": "make", "modell": "model", "arsmodell": "year" }
  }
}
```

* `falt` — vad administratören ska fylla i. `hemlig: true` styr både
  kryptering och maskering.
* `uppslag.auth` — `bearer`, `header`, `basic` eller `query`. Inga
  leverantörsspecifika kodgrenar; all variation ligger i registret.
* `svarsfalt` — mappning från leverantörens JSON (punktnotation stöds)
  till våra fordonsfält.
* `nyckeltyp: "regnr"` — uppslaget sker på registreringsnummer i stället
  för VIN. `{vin}`/`{regnr}` i URL-mallen ersätts URL-kodat.

Ett nytt märke läggs alltså till genom att beskriva det — inte genom att
bygga om applikationen.

## Vad ett uppslag gör och inte gör

Uppslaget fyller i **fordonsbeskrivningen** (märke, modell, årsmodell,
motor, växellåda). Det är kontextdata, inte evidens: ett svar från en
leverantör är aldrig en utförd kontroll och räknas inte i
[evidensmotorn](evidensmotor.md). Returnerar leverantören inga kända fält
säger systemet det rakt ut i stället för att visa tomma rader.

Varje uppslag skriver `senast_testad` och `senaste_status` på
kopplingen. Ett utgånget abonnemang syns därför i inställningarna som ett
felmeddelande från leverantören, inte som tysta tomma svar.

## API

| Väg | Metod | Roll | Vad |
| --- | --- | --- | --- |
| `/api/integrationer/leverantorer` | GET | inloggad | Registret (fältdefinitioner, inga uppgifter) |
| `/api/integrationer` | GET | admin | Organisationens kopplingar, hemligheter maskerade |
| `/api/integrationer` | POST | admin | Spara/uppdatera credentials (krypteras) |
| `/api/integrationer/{leverantor}` | DELETE | admin | Ta bort |
| `/api/integrationer/{leverantor}/uppslag` | POST | inloggad | Slå upp VIN/regnr via servern |

Fullständigt dokumenterat i `services/plattform/openapi.yaml`.

## Drift

`INTEGRATION_NYCKEL` är 32 byte hex eller base64 (`openssl rand -hex 32`),
levererad via secret:en `felsokning-hemligheter` — se
[DRIFT.md](../DRIFT.md). Byts nyckeln måste kopplingarna sparas om;
tjänsten visar då inga värden i stället för att gissa.
