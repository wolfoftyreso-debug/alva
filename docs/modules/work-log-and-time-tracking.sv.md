# Modul: Arbetslogg & Tidredovisning

> **Svensk översättning.** Källan är [work-log-and-time-tracking.md](work-log-and-time-tracking.md) (engelska).
> Vid avvikelse gäller det engelska dokumentet.

## Syfte

Allt arbete som utförs under ett felsökningsärende ska vara tidsatt, spårbart och kopplat till konkreta aktiviteter.

Systemet registrerar inte bara hur lång tid ett arbete tagit, utan även vad som utförts under tiden.

Det här är mer än en stämpelklocka – ett digitalt arbetsprotokoll där tid, aktivitet och tekniskt resonemang hänger ihop. Det ger ett betydligt starkare underlag än traditionell tidrapportering.

---

## Start av arbete

Teknikern börjar genom att identifiera objektet.

Exempel:

- Foto av registreringsnummer
- VIN-skanning
- QR-kod
- Serienummer
- Maskinnummer

När objektet är verifierat startar arbetsloggen.

Exempel:

```
08:03  Arbete startat
       Objekt: ABC123
       Volvo XC60
```

---

## Automatisk tidslinje

Alla aktiviteter tidsstämplas automatiskt.

Exempel:

```
08:03  Objekt identifierat
08:05  Felbeskrivning registrerad
08:11  Säkring F23 kontrollerad
08:18  Mätning av matningsspänning
08:27  Foto uppladdat
08:35  Direktmatning utförd
08:48  Elschema öppnat
09:01  Ny kontroll
09:09  Felsökning avslutad
```

Ingen manuell administration krävs.

---

## Aktiv arbetstid

Systemet skiljer på:

- aktiv felsökning
- väntetid
- administrativ tid
- reservdelssökning
- provkörning
- kundkontakt

Det ger en mer rättvisande tidsredovisning.

---

## Kontext vid längre avbrott

Om det gått en längre stund utan aktivitet kan systemet fråga efter sammanhang, exempelvis:

> ”Ingen aktivitet har registrerats de senaste 20 minuterna. Beskriv kort vad som gjorts under denna period.”

Teknikern kan svara med text eller tal, till exempel:

> ”Demonterade instrumentpanelen för att komma åt kabelstammen.”

Det blir en del av arbetsloggen.

---

## AI som dokumentationsstöd

AI bedömer inte om teknikern arbetar ”tillräckligt snabbt”. Däremot hjälper den till att säkerställa att loggen blir begriplig och komplett. Om ett steg saknar sammanhang kan den be om ett kort förtydligande så att rapporten blir användbar för kunden eller den egna organisationen.

---

## Slutrapport

När arbetet avslutas genereras automatiskt en rapport med exempelvis:

**Total tid: 1 timme 37 minuter**

Fördelning:

- Diagnos: 54 min
- Demontering: 18 min
- Mätningar: 11 min
- Dokumentation: 6 min
- Provkörning: 8 min

Rapporten innehåller även:

- utförda kontroller,
- mätvärden,
- bifogade bilder,
- tekniska slutsatser,
- rekommenderade nästa steg.

---

## Affärsvärde

Den här funktionen kan bli ett av systemets starkaste argument, eftersom den:

- minskar administration efter avslutat arbete,
- ger kunden ett tydligt underlag för debiteringen,
- stärker underlaget vid garanti- och försäkringsärenden,
- gör intern uppföljning enklare,
- skapar en sökbar kunskapsbank över tidigare felsökningar.

Det gör att Guidad Felsökning blir mer än en AI-assistent – den blir ett komplett arbetsverktyg där identifiering, metodisk felsökning, dokumentation och tidredovisning bildar en sammanhängande och spårbar process.
