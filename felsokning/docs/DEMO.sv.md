# Guidad Felsökning – Demomanus

> **Svensk översättning.** Källan är [DEMO.md](DEMO.md) (engelska).
> Vid avvikelse gäller det engelska dokumentet.

Ett 5–10 minuters manus för att visa plattformen. Allt körs lokalt utan konton eller nycklar.

## Förberedelser

```sh
npm install
npm run dev
```

Öppna `http://localhost:8080/felsokning` — helst på mobil eller i mobilläge i webbläsaren (appen är byggd för verkstadsgolvet). Ange ett namn (allt loggas per användare).

Chrome rekommenderas: då fungerar även röstinmatningen (Push-to-Talk).

## Demoflöde

### 1. Dashboarden och demoärendet (1 min)

Klicka **Skapa demoärende (Volvo XC60, vibration)**. Ett komplett ärende med 1 tim 35 min arbetshistorik läggs in: identifierat objekt, besvarade symptomfrågor, fyra hjulfoton, mätvärden, provkörning, en överlämning mellan två tekniker och en hypotes.

Poäng att göra: dashboarden visar bara det viktigaste — pågående, klara, nytt ärende.

### 2. Ärendebriefen (2 min)

Öppna ärendet → fliken **Brief**. Det här är kärnargumentet:

- **Utförda kontroller** med resultat — inte bara kryssrutor.
- **Ej kontrollerat** — härlett automatiskt ur metodiken; det som orsakar dubbelarbete vid skiftbyte är det ingen skrivit ner att ingen gjort.
- **Hypoteser** tydligt märkta 🔴 — systemet presenterar aldrig en hypotes som ett konstaterat fel.
- **Tillförlitlighet** och **total arbetstid**.

Poäng: en ny tekniker är produktiv på under en minut, utan att läsa hundratals loggrader.

### 3. Guiden och verifierade checklistor (2 min)

Fliken **Guide**. Metodiken fortsätter där den slutade: en fråga eller kontroll i taget, stora knappar.

- Visa att en mätkontroll **inte kan verifieras utan mätvärde** (knappen är låst tills värdet är ifyllt).
- Tryck på 🎤 och diktera en observation — texten hamnar i fältet, redigerbar, och sparas först när man trycker Spara. Tal in, text ut; inget skickas automatiskt.
- Visa kategoriknapparna (aktiv felsökning / väntetid / provkörning …) — tidrapporteringen sköter sig själv.

### 4. Arbetsloggen (1 min)

Fliken **Logg**: varje händelse tidsstämplad med användare, append-only — ingenting kan ändras eller raderas i efterhand. Peka på överlämningen mellan Anna och Johan.

### 5. Kundrapporten och Live Share (2 min)

Fliken **Rapport**:

- **Skriv ut / PDF** — rapporten blir svart på vitt automatiskt.
- **Exportera JSON** — versionsmärkt (version = antal händelser), och exporten loggas själv.
- **Öppna Live Share-vy** — det kunden ser via delningslänken: status ✔/🔄/⏳, bilder, mätvärden, tidslinje. Inga hypoteser, inga interna poster.

Poäng: i stället för "Felsökning – 2,5 timmar" på fakturan får kunden en tidslinje över vad som faktiskt gjorts.

### 6. Avsluta med filosofin (30 sek)

> Systemet dokumenterar observationer, leder användaren genom verifierbara kontroller och rekommenderar nästa steg — men presenterar aldrig en hypotes som ett konstaterat fel.

Det ersätter inte teknikern. Det ersätter pärmen, minneslapparna och "fråga Kent, han skruvade på den i torsdags".

## Vad som är demoläge respektive produktion

| I demon | I produktion |
| --- | --- |
| Deterministisk metodikmotor (16 metodiker) | LLM väljer/genererar steg genom samma motorgränssnitt |
| Webbläsarens taligenkänning | Leverantörens Voice-to-Text bakom samma gränssnitt |
| localStorage + synk vid inloggning | Multi-tenant-backend (migration finns), roller enligt Master Prompt |
| Delningslänk kräver synkat ärende | Live Share med behörighetsnivåer kund/intern/partner |
| Demobilder ritade av systemet | Riktiga foton via kameran (fungerar redan i demon också) |
