# Modul: Ärendebrief

> **Svensk översättning.** Källan är [case-brief.md](case-brief.md) (engelska).
> Vid avvikelse gäller det engelska dokumentet.

## Syfte

När en ny tekniker tar över ett pågående ärende ska denne kunna bli produktiv på under en minut, utan att behöva läsa hela historiken.

Systemet genererar automatiskt en strukturerad sammanfattning av ärendet som uppdateras löpande.

Det här är inte en chatt, utan ett **levande ärende** där AI:n hela tiden håller en uppdaterad arbetsbild.

---

## Exempel

**Objekt**

> Volvo XC60 D4 2019
> Reg.nr ABC123
> Kund: Anders Svensson

**Kundens beskrivning**

> Bilen vibrerar runt 88 km/h.
> Symptomet uppträder endast under körning.

**Utförda kontroller**

- ✓ Lufttryck kontrollerat
- ✓ Hjulmoment kontrollerat
- ✓ DOT-koder dokumenterade
- ✓ Fyra hjul fotograferade
- ✓ Provkörning genomförd
- ✓ Balanseringsvikter kontrollerade

**Observationer**

- Höger framdäck visar ojämnt slitage.
- Ingen uppenbar skada på fälgar.
- Vibration känns främst i ratten.
- Ingen förändring vid acceleration.

**Ej kontrollerat**

- Radialkast
- Drivaxlar
- Hjullager
- Fyrhjulsmätning

**Rekommenderat nästa steg**

1. Mät radialkast.
2. Kontrollera drivaxlar.
3. Ny provkörning.

**Total arbetstid**

2 timmar 14 minuter

**Tillförlitlighet**

- 🟢 Kunduppgifter verifierade
- 🟢 Bilder dokumenterade
- 🟢 Mätvärden registrerade
- 🟡 Felorsak ännu inte verifierad

---

## AI:s roll

AI:n ska inte bara sammanfatta historiken, utan också hålla reda på ärendets aktuella läge. Om en ny tekniker ansluter ska systemet kunna svara på frågor som:

- ”Vad återstår?”
- ”Vad är mest sannolikt att kontrollera härnäst?”
- ”Vilka tester är redan utförda?”
- ”Finns det några motsägelsefulla observationer?”
- ”Vad behöver verifieras innan vi går vidare?”

---

## Samarbete

Detta byggs som ett riktigt fleranvändarsystem. Varje ärende blir en arbetsyta där flera personer kan delta.

Exempel:

```
Ärende #45281
Ansvarig:   Anna
Deltagare:  Johan, Erik, Lisa
```

- Alla ser samma information i realtid.
- Alla bilder hamnar i samma ärende.
- Alla mätvärden hamnar i samma logg.
- Alla kommentarer tidsstämplas.
- Alla AI-sammanfattningar uppdateras automatiskt.

---

## Skiftbyte – Överlämning med ett klick

Vid skiftbyte trycker teknikern bara på **Lämna över arbete**. Systemet genererar då automatiskt en överlämningsrapport.

Den nya teknikern får:

- vad kunden upplever,
- vad som redan gjorts,
- vilka mätningar som finns,
- vilka bilder som tagits,
- vilka slutsatser som kan dras med hög säkerhet,
- vilka frågor som fortfarande är obesvarade,
- nästa rekommenderade steg.

Ingen behöver läsa igenom hundratals chattmeddelanden.

Samma funktion används vid eskalering: när en tekniker lämnar sitt pass eller eskalerar ett ärende genereras automatiskt en kort briefing med:

- nuläge,
- verifierade fakta,
- återstående arbete,
- risker eller osäkerheter,
- rekommenderade nästa steg.

Det gör att nästa tekniker kan fortsätta arbetet nästan omedelbart, vilket är särskilt värdefullt i större verkstäder och serviceorganisationer där flera personer arbetar med samma objekt under olika skift.

---

## Arkitektur

Modulen passar mycket bra med en multi-tenant SaaS-arkitektur:

- **Tenant** = verkstad eller serviceorganisation.
- **Användare** = tekniker, arbetsledare, verkstadschef, administratör.
- **Ärende** = en delad arbetsyta med gemensam kontext.
- **AI-kontext** = en strukturerad, löpande sammanfattning av ärendet som används för briefing och vägledning.

Det sista är viktigt: AI:n bör inte behöva läsa hela historiken varje gång någon öppnar ett ärende. I stället underhålls en strukturerad ärendesammanfattning som uppdateras efter varje relevant händelse. Det gör systemet snabbare, billigare att köra och mer konsekvent, samtidigt som hela loggen fortfarande finns kvar för revision och export.
