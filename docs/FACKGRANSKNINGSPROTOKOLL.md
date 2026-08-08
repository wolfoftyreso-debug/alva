# Fackgranskningsprotokoll · Metodikinnehåll per marknad

**ALVA 3.4 · 2026-08-06 · ALVA-DOC-0010 · Mall och process**

Detta dokument gör `granskat`-flaggan i SPRAK operativ. Flaggan är ett
påstående om människor, inte om filer: den betyder att en namngiven,
yrkesverksam fackman har läst metodikinnehållet på språket och skrivit
under på att det är fackmässigt riktigt för marknaden. Ingen intern
granskning — hur grundlig den än är — kan sätta den flaggan. Det här
protokollet definierar vad som krävs för att någon ska kunna det.

## 1. Vem får granska

En person per språk som uppfyller samtliga tre:

1. **Yrkesverksam** fordonstekniker, verkmästare eller teknisk utbildare
   med aktuell verkstadserfarenhet (arbetat i yrket under de senaste två
   åren).
2. **Modersmålsnivå eller motsvarande** i granskningsspråket, och
   arbetsspråket i en verkstad på marknaden.
3. **Behörighet där innehållet kräver det**: högvoltsmetodiken får
   endast granskas av en person med giltig HV-behörighet enligt
   marknadens regelverk (i Sverige: arbete med spänningssatta
   fordonssystem enligt elsäkerhetsanvisningarna; motsvarande nationell
   utbildning i andra länder).

Granskaren får inte vara den som skrivit eller översatt texten.

## 2. Vad som granskas

Granskningsobjektet är avgränsat och versionsmärkt. För språket X ingår:

| # | Innehåll | Fil | Omfattning |
| --- | --- | --- | --- |
| 1 | Metodikerna: varje steg, fråga och kontroll i alla 16 metodiker | `services/gemensam/metodiker.mjs` (eller dess granskade översättning till X när en sådan finns) | Fullständig |
| 2 | Grindtexterna och slutsatsspråket | `services/gemensam/sprak/<X>.mjs`, prefixen `grind.`, `slutsats.`, `pre.`, `evidens.`, `matning.` | Fullständig |
| 3 | Ordlistorna för språket | `services/gemensam/sprak/ord.mjs`, posterna för X i ICKESVAR, ORSAKSORD, EVIDENSORD | Fullständig |
| 4 | Metodikvarningens egen text | nyckeln `metodik.ogranskad` på X | Fullständig |

Webbplatstexter och övrig gränssnittstext ingår inte — de är
gränssnitt, inte metodik (ALVA-SPEC-060).

## 3. Vad granskaren intygar

För varje metodik, med tre möjliga utfall per steg:

- **Riktig** — steget är fackmässigt korrekt för marknaden och kan
  följas som det står.
- **Riktig med anmärkning** — korrekt i sak men med formulering som en
  tekniker på marknaden skulle missförstå eller ifrågasätta; anmärkning
  bifogas och åtgärdas före flaggan sätts.
- **Fel** — steget är felaktigt, farligt eller ogenomförbart;
  granskningen stoppar tills det är åtgärdat och omgranskat.

Särskilt intygande för HOGVOLT: att säkerhetssekvensen är komplett och i
rätt ordning för marknadens regelverk, och att ingenting i metodiken kan
läsas som tillstånd att arbeta i spänningssatt system utan behörighet.

## 4. Hur resultatet registreras

1. Granskaren fyller i protokollet (avsnitt 6) och undertecknar med
   namn, roll, arbetsgivare, behörigheter och datum.
2. Protokollet arkiveras som `docs/granskningar/FG-<språk>-<datum>.md`
   i repot — granskningen är ett kontrollerat dokument (ALVA-klass RH).
3. Först därefter sätts `granskat: true` för språket i
   `services/gemensam/sprak/index.mjs`, i samma commit som protokollet,
   med hänvisning till protokollets beteckning i commit-meddelandet.
4. Granskningen gäller den commit den utfördes mot. Ändras
   metodikinnehållet på språket därefter markeras ändringen ogranskad
   tills granskaren (eller en ny) har läst diffen och kompletterat
   protokollet. Testerna låser att flaggan inte kan sättas utan fil —
   människan låser att filen betyder något.

## 5. Vad flaggan därefter betyder — och inte betyder

`granskat: true` betyder att metodikinnehållet på språket är läst och
undertecknat enligt detta protokoll. Den betyder inte att innehållet är
godkänt av någon myndighet, att det ersätter tillverkarens
serviceinformation, eller att granskningen omfattar framtida ändringar.
Metodikvarningen för ogranskade språk får aldrig tas bort på annan väg
än denna.

## 6. Protokollmall

```
FACKGRANSKNINGSPROTOKOLL FG-<språk>-<ÅÅÅÅ-MM-DD>
Granskat mot commit: <sha>
Språk: <kod och namn>

Granskare
  Namn:
  Roll och arbetsgivare:
  År i yrket, senaste aktiva år:
  Behörigheter (HV m.m.):

Omfattning enligt ALVA-DOC-0010 §2: [ ] 1  [ ] 2  [ ] 3  [ ] 4

Per metodik (16 rader):
  <metodik-id>: [ ] Riktig  [ ] Riktig med anmärkning  [ ] Fel
  Anmärkningar (steg-id + text):

Högvoltsintygande (endast HV-behörig granskare):
  [ ] Säkerhetssekvensen är komplett och i rätt ordning för marknaden
  [ ] Ingen formulering kan läsas som tillstånd till arbete i
      spänningssatt system utan behörighet

Ordlistorna (§2 rad 3): [ ] Genomgångna, tillägg/strykningar bifogade

Underskrift och datum:
```

---

*ALVA-DOC-0010 · Mall och process · Flaggan sätts av människor*
