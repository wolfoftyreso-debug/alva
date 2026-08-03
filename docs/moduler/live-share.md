# Modul: Live Share

## Syfte

Varje ärende kan publiceras via en unik säker delningslänk. Länken visar ärendets aktuella status i realtid och uppdateras automatiskt när ny information registreras. Ingen manuell export behövs.

En livevy ger stort värde för kunder, arbetsledare, försäkringsbolag och tillverkare — men den ska **alltid vara under verkstadens kontroll**, med tydliga behörigheter och säkerhetsnivåer.

## Exempel på kundvy

```
Ärende: Volvo XC60
Status: 🟢 Felsökning pågår

Kundens felbeskrivning
  Bilen vibrerar vid cirka 88 km/h.

Aktuell status
  ✔ Objekt identifierat
  ✔ Provkörning utförd
  ✔ Däck dokumenterade
  ✔ Lufttryck kontrollerat
  🔄 Hjulbalansering kontrolleras
  ⏳ Drivaxlar ej kontrollerade

Bilder · Mätvärden · Tidslinje

Rekommenderat nästa steg
  Kontroll av radialkast.
```

## Liveuppdatering

När teknikern arbetar uppdateras sidan automatiskt, utan omladdning. Mottagaren ser direkt nya bilder, nya mätvärden, nya kommentarer och statusändringar.

## Behörighetsnivåer

Länkar kan skapas med olika åtkomstnivåer:

- **Kund** – läsbehörighet till den information verkstaden valt att dela.
- **Intern** – full insyn för kollegor och arbetsledare.
- **Extern partner** – exempelvis försäkringsbolag eller tillverkare, med avgränsad information (inklusive hypoteser, tydligt märkta som ej verifierade).

Implementerat i plattformen: varje länk skapas med en nivå, filtreringen sker på serversidan och länkar kan återkallas — en återkallad länk ger 404.

## Export

Från samma ärende ska det gå att exportera:

- PDF
- JSON
- CSV
- API
- Utskriftsvänlig HTML

Alla exporter bygger på samma datakälla (händelseloggen), vilket minskar risken för avvikelser.

## Versionshantering

Varje export märks med:

- versionsnummer,
- datum,
- tid,
- vem som exporterade,
- exportformat.

Det gör det möjligt att i efterhand se exakt vilken information som delades vid en viss tidpunkt.

## Produktvision

Ett felsökningsärende är inte bara en chatt eller en logg, utan en **levande digital arbetsjournal**. Den kan följas i realtid, tas över av en kollega, granskas av en arbetsledare, delas med kunden och avslutas med en komplett rapport — allt från samma datamodell. Det minskar dubbelarbete och gör att alla parter utgår från samma aktuella information.
