# Modul: Verifierade checklistor

> **Svensk översättning.** Källan är [verified-checklists.md](verified-checklists.md) (engelska).
> Vid avvikelse gäller det engelska dokumentet.

## Grundprincip

En kontrollpunkt är inte slutförd enbart genom att kryssa i en ruta.

Systemet registrerar inte bara *att* en ruta har kryssats i — det samlar in **bevis och kontext**. Varje kontroll ska innehålla ett eller flera av följande:

- ✔ Bekräftelse att kontrollen är utförd.
- 📝 Kort observation eller slutsats.
- 📷 Foto (när det är relevant).
- 📹 Video (vid behov).
- 🎤 Tal-till-text (för snabb dokumentation).
- 📏 Mätvärde (när tillämpligt).

På så sätt blir varje moment både spårbart och begripligt.

## Exempel

**Kontrollera batterispänning**

> Teknikern markerar "Utförd".
> Systemet: *Vilket värde uppmättes?* → **12,63 V**
> Systemet: *Hur mättes detta? (valfritt)* → **Direkt på batteripolerna.**
> Kontrollpunkten markeras som verifierad.

**Kontrollera säkring F24**

> ✔ Utförd
> Systemet: *Vad observerades?* → **Säkringen är hel och spänning finns på båda sidor.**
> Kontrollpunkten avslutas.

## AI:s roll

AI:n hjälper till att upptäcka när dokumentationen verkar ofullständig:

> "Du har markerat att hjulbalanseringen är kontrollerad, men ingen observation eller mätning har registrerats. Vill du lägga till en kort kommentar innan du går vidare?"

Det ska vara ett **stöd, inte ett hinder**.

## Anpassning efter kontrolltyp

Alla moment behöver inte samma nivå av dokumentation.

| Kontrolltyp | Minimikrav |
| --- | --- |
| Visuell kontroll | Bekräftelse + kort kommentar |
| Mätning | Mätvärde + kommentar |
| Demontering | Kommentar, foto vid behov |
| Provkörning | Sammanfattning av resultat |
| Bildbaserad kontroll | Foto + observation |

## Syfte

Målet är inte att "fånga" teknikern, utan att skapa ett arbetsunderlag som visar:

- vad som kontrollerades,
- hur det kontrollerades,
- vad resultatet blev,
- och vilka slutsatser som är rimliga att dra.

Det stärker kvaliteten i arbetet, gör överlämningar enklare och ger ett bättre underlag gentemot kund och arbetsledning.

## Viktig designprincip

Undvik att göra fritext obligatorisk överallt. Om varje kontroll kräver långa texter upplevs systemet snabbt som tungrott. Använd i stället en kombination av:

- förvalda svar där det passar,
- kort tal-till-text för observationer,
- mätvärdesfält,
- och foto eller video när det ger mest värde.

Då blir dokumentationen rik utan att arbetsflödet bromsas — och teknikerna använder systemet konsekvent i vardagen.
