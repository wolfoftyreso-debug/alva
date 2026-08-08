# Modul: Kommunikationsmodell (röst)

> **Svensk översättning.** Källan är [communication-model.md](communication-model.md) (engelska).
> Vid avvikelse gäller det engelska dokumentet.

## Grundprincip

**Användaren pratar, systemet skriver.**

Systemet använder tal-till-text (Voice-to-Text) för all röstinmatning. Teknikern ska aldrig behöva skriva med tangentbord under ett pågående arbete.

Ingen röstagent: systemet för inte ett löpande röstsamtal, läser inte upp långa svar och försöker inte efterlikna en mänsklig konversation. Kommunikationen är **tal in, text ut**.

## Viktig designprincip

> All röst behandlas som ett inmatningssätt, inte som ett separat gränssnitt.

All logik i systemet bygger på text. Voice-to-Text är endast ett sätt att skapa den texten. Det gör lösningen enklare att underhålla, enklare att söka i, enklare att exportera och enklare att utveckla vidare med nya AI-modeller i framtiden.

## Arbetsflöde

1. Teknikern trycker på mikrofonen: *"Jag har mätt mellan stift 14 och jord. Jag får 12,4 volt."*
2. Voice-to-Text transkriberar talet.
3. Den transkriberade texten skickas till AI:n som en vanlig textförfrågan.
4. AI:n svarar alltid skriftligt: *Verifierat: Matningsspänning finns på stift 14. Nästa steg: Kontrollera jordanslutningen på stift 7.*

## Varför detta val?

- fungerar bättre i bullriga verkstäder,
- ger en permanent textlogg utan extra steg,
- gör det enkelt att söka i historiken,
- minskar risken för missförstånd jämfört med ett kontinuerligt röstsamtal,
- passar bättre när flera tekniker arbetar i samma ärende.

## Push-to-Talk (PTT)

Röstinmatning fungerar enligt Push-to-Talk. Appen lyssnar **endast** när användaren aktivt håller inne mikrofonknappen eller har startat en tydlig inspelning. Ingen bakgrundslyssning. Ingen automatisk aktivering.

### Flöde

1. Användaren håller inne mikrofonknappen (eller trycker på en tydlig "Spela in"-knapp beroende på plattform).
2. Inspelning startar omedelbart.
3. Appen visar tydligt att inspelning pågår: röd indikator, timer, ljudnivåmätare, texten "Inspelning pågår".
4. Talet transkriberas i realtid — användaren ser texten växa fram och får direkt återkoppling om talet uppfattats korrekt.
5. När inspelningen avslutas visas den transkriberade texten i ett **redigerbart** textfält.
6. Användaren kan godkänna, redigera eller spela in på nytt.
7. **Först när användaren bekräftar** skickas texten vidare till AI:n och sparas i arbetsloggen.

### Redigering före skick

Transkriberingen är alltid redigerbar. Vanliga korrigeringar: registreringsnummer, serienummer, komponentbeteckningar, personnamn, facktermer.

**"Skicka" sker aldrig automatiskt.** Teknikern får alltid en snabb chans att rätta transkriberingen innan den blir en del av den permanenta arbetsloggen. Det minskar risken för felaktiga registreringsnummer, komponentbeteckningar och mätvärden.

### Ingen dold funktionalitet

Användaren ska alltid kunna se:

- när inspelning pågår,
- när den är avslutad,
- vad som kommer att skickas,
- vad som faktiskt har sparats.

Det ska aldrig råda någon tvekan om när ljud spelas in eller när information skickas.

## Automatisk journalföring

Varje transkriberad mening blir automatiskt en del av arbetsloggen:

```
08:14  "Mätt spänning mellan stift 14 och jord. 12,4 volt."
08:14  AI: Matningsspänning verifierad.
08:15  "Relä klickar inte."
08:15  AI: Kontrollera styrsignal till relä.
```

Allt sparas utan att teknikern behöver skriva en enda rad.

## Handsfree-arbete

Appen är optimerad för upptagna eller smutsiga händer. Under ett normalt ärende ska användaren kunna identifiera objektet med kameran, fotografera komponenter, diktera observationer, få nästa steg presenterat och fortsätta arbetet — utan att skriva manuellt. Gränssnittet ska fungera med handskar, smutsiga händer, starkt solljus, buller och vibrationer; mikrofonknappen är stor, lätt att träffa och har tydlig visuell återkoppling.
