# ALVA · Designschema 2.0

**ALVA-SPEC-002 · Utökar ALVA-SPEC-001 (`DESIGN.md`), ersätter den inte.**

`DESIGN.md` slår fast identiteten: ett industriverktyg i tysk
verkstadstradition, nästan monokromt, räta hörn, 8-pixelrutnät, ingen
dekoration. Den delen står fast och ska inte omförhandlas.

Det här dokumentet gör tre saker som `DESIGN.md` inte gör:

1. **Ger systemet en fullständig tokenuppsättning.** Paletten fanns; men
   inte tillstånd, fokus, tryckytor, densitet eller hierarkier. Ett
   designsystem som bara definierar färg och rutnät lämnar hälften av
   besluten till den som råkar bygga skärmen.
2. **Åtgärdar konkreta brister i flödena** — samlade i avsnitt 9, var och
   en med plats och åtgärd.
3. **Öppnar två låsta regler, kontrollerat**: rörelse och illustration.
   Båda med snäva villkor, för de stängdes av goda skäl.

> **Läsanvisning för vidare bearbetning.** Avsnitt 2–7 är schemat: tokens,
> skala, komponenter, tillstånd, illustration, rörelse. Avsnitt 8–10 är
> tillämpningen: innehåll, flödesåtgärder, checklistor.

---

## 1. Vad "mer levande" får betyda här

Ett kalibrerat instrument är inte livlöst — det är *vaket*. Skillnaden
mot en konsumentapp är var livet sitter:

| Liv genom | Tillåtet | Varför |
| --- | --- | --- |
| **Hierarki** | Ja, uppmuntras | Ett öga som direkt hittar det viktigaste upplever gränssnittet som snabbt |
| **Täthet och rytm** | Ja | Medveten variation i luft skapar tempo utan dekoration |
| **Materialitet** (hårfina linjer, tydliga ytor) | Ja | Ger djup utan skuggor |
| **Precision** (tabulära siffror, exakt linjering) | Ja | Det som *stämmer* känns levande; det som skevar känns dött |
| **Direkt återkoppling** | Ja, se §7 | Ett system som svarar omedelbart känns levande |
| Färgglädje, gradienter, rundade hörn | **Nej** | Byter identitet |
| Dekorativ animation | **Nej** | Brus |
| Illustration som stämning | **Nej** | Se §6: bara förklarande |

**Regeln:** liv genom precision, aldrig genom utsmyckning.

---

## 2. Tokens

Enda källan till värden. Allt annat i systemet refererar hit — ingen
skärm får införa ett eget värde.

### 2.1 Färg — grund

| Token | Värde | Roll |
| --- | --- | --- |
| `--grafit` | `#1B1E22` | Brödtext, rubriker |
| `--stal` | `#4D5662` | Sekundärtext, etiketter |
| `--ljusstal` | `#D7DCE2` | Linjer och ramar — enda linjefärgen |
| `--yta` | `#FFFFFF` | Kort, fält, sidhuvud |
| `--botten` | `#F6F7F8` | Sidbakgrund |
| `--blå` | `#005CA9` | Aktivt, verifierat, markerat — aldrig dekoration |

### 2.2 Färg — nya härledda steg

Paletten hade sju värden och inga mellanlägen, vilket tvingade fram
improvisation vid varje hovring och vald rad. Dessa är **härledda ur**
grundfärgerna, inte nya kulörer:

| Token | Värde | Roll |
| --- | --- | --- |
| `--ljusstal-svag` | `#E8ECF0` | Avdelare inuti ett kort (svagare än ram) |
| `--botten-sank` | `#EEF1F3` | Nedsänkt yta: tabellhuvud, kodruta |
| `--blå-yta` | `#E6EFF7` | Vald rad, aktiv flik — bakgrund, aldrig text |
| `--blå-mörk` | `#004A87` | Tryckt läge på primärknapp |
| `--stal-svag` | `#79828E` | Hjälptext, platshållare. **Aldrig** brödtext |

### 2.3 Färg — semantik

Semantik är inte accent. Bärs **alltid** av ord, aldrig av färg ensam.

| Token | Värde | Betyder |
| --- | --- | --- |
| `--varning` | `#8A5A00` | Kräver åtgärd: förfallen faktura, utgången kalibrering |
| `--varning-yta` | `#F6EFE0` | Bakgrund för varningsblock |
| `--stopp` | `#8B1A1A` | Spärrat: konto låst, avslut blockerat, högvolt |
| `--stopp-yta` | `#F7E8E8` | Bakgrund för stoppblock |
| `--klar` | `#1E7A4D` | Verifierat och avslutat, försegling giltig |
| `--klar-yta` | `#E5F1EA` | Bakgrund för klarblock |

> `--klar` är ny. Tidigare gjorde grafit tjänst som "klar", vilket
> gjorde avslutat oskiljbart från vanlig text i en lista. Grönt används
> **enbart** för verifierat/förseglat — aldrig som allmän accent.

### 2.4 Rum

8-pixelrutnätet gäller undantagslöst.

| Token | px |
| --- | --- |
| `--rum-1` … `--rum-8` | 8, 16, 24, 32, 40, 48, 64, 80 |

Halvsteget `4px` finns **endast** för optisk justering inuti en komponent
(ikon mot text) och får aldrig sätta avstånd mellan komponenter.

### 2.5 Linje och form

| Token | Värde |
| --- | --- |
| `--linje` | `1px solid var(--ljusstal)` |
| `--linje-stark` | `1px solid var(--stal)` |
| `--linje-markerad` | `2px solid var(--blå)` |
| `--radie` | `0` — räta hörn, undantagslöst |

**Inga skuggor.** Djup skapas med linje och yta. Ett kort ligger på
`--yta` mot `--botten` och avgränsas av `--linje`.

### 2.6 Tryckyta

Ny och icke förhandlingsbar. Målgruppen bär handskar.

| Token | px | Gäller |
| --- | --- | --- |
| `--tryck-min` | `48` | Varje knapp, fält, länk i navigation eller fot |
| `--tryck-rymlig` | `56` | Primär åtgärd i teknikerflödet |

En länk i löptext undantas, men fot- och navigationslänkar räknas som
kontroller och ska ha full radhöjd som träffyta.

### 2.7 Fokus

Saknades helt. Utan synlig fokusmarkering är gränssnittet obrukbart med
tangentbord.

```css
--fokus: 2px solid var(--blå);
--fokus-avstand: 2px;
```

Gäller **varje** fokuserbart element. Får aldrig tas bort utan ersättning.

---

## 3. Typografi

Snittkedjan står i `DESIGN.md` §4 och ändras inte:
**DIN 2014 → FF DIN → IBM Plex Sans → Inter → Helvetica Neue → system-ui.**
Aldrig antikva. `font-variant-numeric: tabular-nums` på hela ytan.

### 3.1 Skalan

Graderna fanns uppräknade men utan roller, radavstånd eller vikt. Här är
de som en skala:

| Roll | px | Radavstånd | Vikt | Spärrning | Bruk |
| --- | --- | --- | --- | --- | --- |
| `utlasning` | 10 | 14 | 600 | `0.10em` | Sidhuvudets systemutläsning, versaler |
| `etikett` | 11 | 16 | 600 | `0.08em` | Sektionsetikett, statusmärke — versaler |
| `data` | 12 | 18 | 400 | `0` | Tabellceller, navigation, beteckningar |
| `brod` | 13 | 20 | 400 | `0` | Brödtext i kort — den vanligaste graden |
| `brod-stor` | 15 | 24 | 400 | `0` | Ingress, symptombeskrivning |
| `rubrik-3` | 16 | 22 | 600 | `0.02em` | Versaler |
| `rubrik-2` | 22 | 28 | 600 | `0.02em` | Versaler |
| `rubrik-1` | 32 | 38 | 700 | `0.02em` | Versaler |
| `siffra` | 40 | 44 | 500 | `-0.01em` | Ett enskilt mätvärde som ska läsas på avstånd |

`siffra` är ny. Ett mätvärde som avgör en diagnos ska kunna läsas med
telefonen på bänken och teknikern böjd över motorn.

### 3.2 Radlängd

Brödtext bryts vid **66 tecken**. Löptext som går bredare läses inte —
den skummas, och den här produktens texter är till för att läsas.

---

## 4. Komponenter — tillstånd

Biblioteket i `DESIGN.md` §7 är oförändrat. Det som saknades var
**tillstånden**; utan dem uppfinner varje skärm sina egna.

Varje interaktiv komponent har exakt sex:

| Tillstånd | Uttryck |
| --- | --- |
| `vila` | Grundform |
| `hovring` | Ram → `--stal`. Ingen färgfyllning, ingen förflyttning |
| `fokus` | `--fokus` utanpå, ram oförändrad |
| `tryckt` | Primär: `--blå-mörk`. Sekundär: `--botten-sank` |
| `vald` | Ram `--linje-markerad` + bakgrund `--blå-yta` |
| `spärrad` | Text `--stal-svag`, ram `--ljusstal`, ingen pekare. **Alltid** med skäl i klartext bredvid |

**Ett spärrat läge utan skäl är ett fel, inte ett tillstånd.** Teknikern
ska aldrig behöva gissa varför något inte går att trycka på.

### 4.1 Knapp

Max **en** primärknapp per vy. Undantagslöst — även i par som
Godkänn/Avböj, där bara den bekräftande är primär och avböj är sekundär.
Aldrig röd knapp: rött är spärrat läge, inte ett val.

| Variant | Yta | Text | Ram |
| --- | --- | --- | --- |
| Primär | `--blå` | `--yta` | ingen |
| Sekundär | `--yta` | `--grafit` | `--linje-stark` |
| Fara | `--yta` | `--stopp` | `1px solid var(--stopp)` |

Fara-varianten är för oåterkalleliga handlingar (radering). Den är
sekundär i form med avsikt: en destruktiv knapp ska inte vara den
lättaste att träffa.

### 4.2 Statusmärke

Ord + ram, läsbart i svartvitt. Aldrig enbart färg, aldrig enbart symbol.

    ○ PÅGÅENDE      □ VÄNTAR      ✓ KLAR      ✕ SPÄRRAT

### 4.3 Mätvärde

Ny komponent. Ett mätvärde är produktens viktigaste datatyp och saknade
egen form:

    ETIKETT (11 versal)
    42 g            ← siffra 40 / enhet 15, baslinjejusterade
    gräns 5 g       ← data 12, --stal
    ▍               ← avvikelsemarkör: 2px --varning när utanför gräns

Markören är en linje, inte en färgad bakgrund: värdet ska förbli läsbart.

---

## 5. Layout

| Mått | Värde |
| --- | --- |
| Innehållsbredd | `1040px` |
| Läsbredd (löptext) | `66ch` |
| Sidmarginal | `24px` (`--rum-3`) |
| Sektionsavstånd | `48px` (`--rum-6`) |
| Kortets innerkant | `24px` |
| Minsta stödda bredd | `390px` utan sidledsscroll |

### 5.1 Densitet

Två lägen, samma komponenter:

- **Bänk** (standard): teknikerns telefon eller platta i verkstaden.
  Full tryckyta, `--rum-3` mellan fält.
- **Skrivbord**: arbetsledarens översikt, tabeller med många rader.
  `--rum-2` mellan rader, tryckytan får gå till `--tryck-min` men aldrig
  under.

### 5.2 Långa värden

Hashar, förseglingar och beteckningar sätts i mono och **måste** brytas:

```css
word-break: break-all;
```

På smal skärm blir varje nyckel–värde-par en staplad `<dt>/<dd>`, aldrig
en tabellrad som tvingar fram sidledsscroll.

---

## 6. Illustration

`DESIGN.md` §5 förbjöd illustrationer. Förbudet fanns för att hålla ute
dekorativa figurer — och det syftet står fast. Men en verkstadsmanual i
DIN-tradition *har* bilder: sprängskisser, principskisser, måttritningar.
De förklarar det text inte kan.

**Förbudet ersätts därför av en snäv tillåtelse.**

### 6.1 Villkoren

En illustration får finnas **endast** om alla fem är uppfyllda:

1. Den förklarar något som text eller foto inte förklarar lika väl.
2. Den är en **teknisk skiss** — inte en scen, inte en metafor, aldrig en
   människofigur.
3. Den är ren vektor: `1.5px` linje, inga fyllningar utom `--botten-sank`
   som hjälpyta, ett enda `--blå` för det som markeras.
4. Den ligger på 8-pixelrutnätet och fungerar i svartvitt.
5. Den bär sin förklaring i text bredvid — bilden är aldrig ensam
   informationsbärare.

### 6.2 Uppsättningen

Åtta skisser täcker produkten. Fler kräver ett skäl.

| Skiss | Förklarar |
| --- | --- |
| `faserna` | A-L-V-A som fyra led i en kedja |
| `bevisked` | Hur en händelse länkas till föregående |
| `forsegling` | Vad HMAC-förseglingen låser |
| `tidsforankring` | Varför en oberoende klocka behövs |
| `matning` | Mätvärde mot toleransgräns |
| `anmarkning` | Fyndet och dess bundna bevisbild |
| `delning` | Vad mottagaren ser, och inte ser |
| `radering` | Krypto-shredding: loggen kvar, identiteten borta |

Ritas som inline-SVG med `currentColor`, så de följer temat automatiskt.

---

## 7. Rörelse

`DESIGN.md` §6 förbjöd all rörelse, med motiveringen att *ett värde som
rör sig är svårare att läsa än ett som står stilla*. Den meningen är
sann och behålls.

Men förbudet gjorde också att systemet inte kunde **kvittera**. En
tekniker som trycker på "Markera utförd" i en bullrig verkstad, med
handskar, på en repig skärm, behöver veta att trycket registrerades.
Utan kvittens trycker hen igen — och dubbelregistrerar.

### 7.1 Vad som gäller

| Rörelse | Tillåten |
| --- | --- |
| Tillståndsbyte på en kontroll (vila→tryckt) | **Ja**, ≤ 120 ms, enbart färg |
| Att ett nytt element visas | **Ja**, ≤ 160 ms, enbart opacitet |
| Ett värde eller en siffra som ändras | **Nej** — aldrig |
| Fasrad, statusmärke, mätvärde | **Nej** — aldrig |
| Snurror, pulser, skelett, laddningsindikatorer | **Nej** — använd `Procedurvy` med `○` och `□` |
| Sidövergång, parallax, scrollrörelse | **Nej** |

```css
--rorelse-kvittens: 120ms;
--rorelse-intrade: 160ms;
--rorelse-kurva: linear;
```

Kurvan är `linear` med avsikt. En mjuk kurva antyder fysikalitet; det
här är ett instrument, inte ett föremål.

### 7.2 Undantagslös regel

```css
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}
```

---

## 8. Språk och ton

Språkgränsen i `DESIGN.md` §8 gäller, med ett förtydligande som saknades:

- **Strukturen** (fasnamn, statusord, portalens navigation) är engelsk
  och oföränderlig — så att en revisor kan läsa ett rumänskt och ett
  tyskt ärende utan att veta vilket språk verkstaden arbetar på.
- **Innehållet** talar arbetsspråket.
- **Publika webbplatsen och kunddelningen** talar mottagarens språk. Där
  fasnamnen visas för en mottagare som inte är utbildad i ALVA sätts en
  förklaring i brödtext under det engelska namnet — namnet står kvar,
  förklaringen tolkar det.

### 8.1 Ton

Sakligt, tätt, entydigt. En kontroll säger exakt vad som händer
(`Avsluta felsökning`), och kvittensen säger att det hände
(`Felsökningen avslutad`). Ett fel förklarar vad som gick fel och vad
som ska göras — aldrig en ursäkt, aldrig ett skämt.

**Skriv aldrig** "Oj!", "Något gick fel" eller "Försök igen senare".
Skriv vad som hände och vad som återstår.

---

## 9. Åtgärder i flödena

Fynden ur genomgången av de fem flödena, med plats och åtgärd.

### 9.1 Publika webbplatsen

| # | Brist | Åtgärd |
| --- | --- | --- |
| 1 | Exempelflödet på startsidan kan förväxlas med skarpt gränssnitt | Omslut med `Demonstration` |
| 2 | Fasnamnen står oöversatta för en besökare som aldrig sett ALVA | Behåll engelskt namn, sätt förklaring i brödtext under (§8) |
| 3 | Risk för två primärknappar i ansökan | Endast slutlig `Skicka ansökan` är primär |
| 4 | Fotens juridiklänkar för små att träffa | Full radhöjd som träffyta, `--tryck-min` |

### 9.2 Inloggning och portalvakt

| # | Brist | Åtgärd |
| --- | --- | --- |
| 5 | Laddningsindikator under tokenkontroll | `Procedurvy` med `○`/`□`, ingen snurra (§7) |
| 6 | Fel markeras med färgad ram | `Statusmärke` med ord: `SPÄRRAT`, `UTGÅNGEN` (§2.3) |
| 7 | Två primärknappar (logga in / återställ) | Återställ blir textlänk i `--stal` |
| 8 | Fält och knappar för små för handskar | `--tryck-min` 48px |

### 9.3 Teknikerflödet

| # | Brist | Åtgärd |
| --- | --- | --- |
| 9 | Grindens hinder är en löpande textlista | Ett `Statusmärke` per hinder, med den blockerande kontrollen namngiven |
| 10 | Fasrad svårläst i solljus | Symbol `○`/`□`/`✓` alltid kopplad till fasnamnet, aldrig färg ensam |
| 11 | Ingen kvittens när en kontroll markeras utförd | Tillståndskvittens ≤120 ms (§7.1) |
| 12 | Bevisbild kan inte granskas i detalj | Helskärmsvisning vid klick, 0 ms, tydlig stängknapp |
| 13 | Mätvärden saknar egen form | Komponenten `Mätvärde` (§4.3) |

### 9.4 Kunddelning

| # | Brist | Åtgärd |
| --- | --- | --- |
| 14 | Hashkedjan tvingar sidledsscroll under 390 px | `break-all` + staplad `<dt>/<dd>` (§5.2) |
| 15 | Godkänn/Avböj som blå och röd | Godkänn primär, Avböj sekundär, ingen röd knapp (§4.1) |
| 16 | Mottagaren förstår inte fasnamnen | Förklaring under namnet (§8) |

### 9.5 Arbetsledarens portal

| # | Brist | Åtgärd |
| --- | --- | --- |
| 17 | Portalnavigationen blandar språk | Strukturen engelsk, innehållet på arbetsspråket (§8) |
| 18 | Statistik riskerar diagramfärger utanför paletten | Stapel i `--stal`, markerad stapel i `--blå`, inget mer (§10.1) |
| 19 | Flera primärknappar vid radvis tilldelning | Radåtgärder är sekundära; en primär per vy |

---

## 10. Regler för det som ofta går fel

### 10.1 Diagram

Ett diagram i ALVA får använda **två** färger: `--stal` för stapeln och
`--blå` för den markerade. Ingen kategorifärgning, ingen legend som
kräver färgseende. Värdet skrivs ut vid stapeln — diagrammet är en
sammanfattning, inte källan.

### 10.2 Tomma lägen

Ett tomt läge säger tre saker: vad som saknas, varför, och vad som är
nästa steg. Aldrig en illustration, aldrig ett utrop.

    INGA ÄRENDEN
    Organisationen har inga öppna ärenden.
    → Nytt ärende

### 10.3 Tabeller

Huvudet är `etikett`-grad i versaler på `--botten-sank`. Sifferkolumner
högerställs och sätts tabulärt. Under `sm` blir varje rad ett staplat
kort — aldrig sidledsscroll.

---

## 11. Checklista före leverans av en skärm

- [ ] Varje värde kommer ur en token
- [ ] Allt rum ligger på 8-pixelrutnätet
- [ ] Exakt en primärknapp
- [ ] Varje kontroll når `--tryck-min`
- [ ] Fokus syns på allt fokuserbart
- [ ] Ingen status bärs av färg ensam
- [ ] Läsbar i svartvitt
- [ ] Inget spärrat läge utan skäl i klartext
- [ ] 390 px utan sidledsscroll
- [ ] Långa värden bryts
- [ ] Ingen rörelse utöver §7
- [ ] Demo märkt med `Demonstration`

---

*Liv genom precision, aldrig genom utsmyckning.*
