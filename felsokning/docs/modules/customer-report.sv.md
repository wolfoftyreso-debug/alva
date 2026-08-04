# Modul: Delningsbar kundrapport (Kundvy)

> **Svensk översättning.** Källan är [customer-report.md](customer-report.md) (engelska).
> Vid avvikelse gäller det engelska dokumentet.

## Syfte

I stället för att kunden får en rad på fakturan som säger ”Felsökning – 2,5 timmar” kan de få en tydlig tidslinje över vad som faktiskt utförts.

Exempel:

```
08:03  Fordonet identifierat
08:10  Felbeskrivning registrerad
08:18  Däck dokumenterade
08:26  Visuell kontroll genomförd
08:42  Lufttryck verifierat
08:57  Provkörning utförd
09:18  Slutsats och rekommendation dokumenterad
```

Med bilder, mätvärden och kommentarer blir det tydligt vad kunden faktiskt har betalat för. Det stärker förtroendet och kan minska diskussioner om felsökningstid.

---

## Relation till övriga moduler

Kundrapporten är en härledd vy av samma händelselogg som [Arbetslogg & Tidredovisning](work-log-and-time-tracking.sv.md) bygger på – ingen separat dokumentation behöver skapas. Verkstaden väljer vilken detaljnivå som delas med kund, i linje med den rollbaserade behörighetsstyrningen.
