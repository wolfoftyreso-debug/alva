# Guidad Felsökning – MVP

Första körbara versionen av kärnan i [Master Prompt v1.0](MASTER-PROMPT.md). Byggd som en fristående del av denna kodbas under `/felsokning`.

## Kör

```sh
npm install
npm run dev        # öppna http://localhost:8080/felsokning
npm test           # projektions-, synk- och demotester
```

Demomanus för visning: [DEMO.md](DEMO.md). Knappen **Skapa demoärende** på startsidan lägger in ett komplett vibrationsärende med 1 tim 35 min historik.

## Vad som ingår

| Direktivets kärna | Status i MVP |
| --- | --- |
| Objektidentifiering först | ✅ Manuell inmatning (reg.nr/VIN/serienummer/maskinnummer) med bekräftelsesteg. QR/streckkod/OCR är markerade som kommande. |
| AI-guidad felsökning | ✅ Deterministisk metodikmotor (en fråga i taget, tre metodiker) **plus Claude-handledning driven av plattformen**: edge-funktionen `felsokning-ai` äger Claude API-nyckeln (serverhemligheten `ANTHROPIC_API_KEY`), systemprompten, modellen (Claude Opus 5) och svarsschemat — kunden hanterar inga AI-nycklar. Claude svarar på varje bekräftad dokumentation, klassificerat som observation/verifierat/hypotes/rekommendation enligt AI-reglerna, schema-bundet, med automatisk fallback till Anthropics rekommenderade reservmodell vid avböjd förfrågan. Kräver inloggad användare; svaren loggas som händelser (interna — delas aldrig i kundvyer). I lokalt läge guidar metodiken ensam. |
| Arbetslogg | ✅ Append-only händelselogg med tidsstämpel och användare på varje post. Ingenting skrivs över. |
| Tidredovisning | ✅ Kategorier (aktiv felsökning, väntetid, provkörning …) via kategoribyten i loggen; paus räknas inte i total tid. Inaktivitetsfråga efter 20 min utan händelser. |
| Dokumentation | ✅ Observationer, mätvärden, foton (nedskalade), kommentarer och hypoteser. Hypoteser märks alltid 🔴 och kan aldrig loggas som konstaterade fel. |
| Ärendebrief | ✅ Regenereras ur loggen vid varje visning: utförda kontroller, observationer, **ej kontrollerat**, rekommenderat nästa steg, tillförlitlighet, total arbetstid. |
| Överlämning | ✅ ”Lämna över arbete” genererar överlämningsrapport ur briefen och loggar överlämningen. |
| Kundrapport | ✅ Tidslinjevy utan interna poster, med bilder och tidsfördelning. Utskrift/PDF via webbläsaren, med påminnelse om granskning före delning. |
| Röstinmatning (tal in, text ut) | ✅ Push-to-Talk via webbläsarens taligenkänning (sv-SE): lyssnar bara efter aktivt tryck, röd indikator med realtidstranskript, texten hamnar i ett redigerbart fält och skickas aldrig automatiskt. Knappen visas bara i webbläsare med talstöd. Produktionsversionen byter motor till leverantörens Voice-to-Text bakom samma gränssnitt. |
| Verifierade checklistor | ✅ Varje kontroll i metodiken har ett minimikrav (foto, mätvärde eller kort observation). Foto-kontroller verifieras med bild; mätningar kan inte markeras verifierade utan värde. |
| Export | ✅ Versionsmärkt JSON-export (version = antal händelser vid exporttillfället, med användare och tidpunkt); exporten loggas själv som händelse. PDF via utskrift. CSV och API i backend-fasen. |
| Backend & synk | ✅ Databas-migration (`supabase/migrations/20260802230000_guidad_felsokning.sql`): ärenden + händelser med RLS, append-only även i databasen (inga update/delete-rättigheter). Synklager i klienten: konfliktfri ihopflätning av händelser per id (testad), push av lokala + pull av kollegors händelser var 15:e sekund. Utan inloggning arbetar appen i lokalt läge; status visas i ärendehuvudet. |
| Metodiker | ✅ Tre: vibration, elsystem/strömförsörjning (relä-exemplet ur visionen) och generisk — vald automatiskt utifrån felbeskrivningen. |
| Live Share | ✅ Skrivskyddad livevy per ärende (`/felsokning/dela/:id`): status ✔/🔄/⏳, bilder, mätvärdestabell, tidslinje, rekommenderat nästa steg. Uppdateras automatiskt, interna poster filtreras bort. Publik delningssida (`/felsokning/delad/:kod`) läser via `hamta_delat_arende` utan inloggning och pollar för liveuppdatering; "Kopiera delningslänk" finns i rapportfliken. Behörighetsnivåer (kund/intern/partner) i nästa fas. |
| Dashboard | ✅ Enligt direktivet: räknare och filter för Alla/Pågående/Klara plus Starta nytt ärende. |
| Utskrift | ✅ Kundrapport och Live Share-vy skrivs ut svart på vitt; interaktiva element döljs automatiskt. |
| Öppet API | 🔶 Datamodellen är API-klar (händelser som JSON i Postgres). REST/OpenAPI-lager i nästa fas. |

## Arkitekturprinciper i koden

- **Händelseloggen är enda sanningskällan.** `src/felsokning/domain.ts` definierar händelsetyperna; poster läggs endast till.
- **Alla vyer är projektioner.** `src/felsokning/projektioner.ts` — brief, tidsfördelning, överlämningstext och kundrapport är rena funktioner av loggen och kan alltid regenereras. Testerna i `src/felsokning/__tests__/` låser detta.
- **Metodikmotorn är deterministisk.** `src/felsokning/metodik.ts` — nästa steg härleds ur vad som redan dokumenterats. Det är här den framtida AI:n ansluter, utan att logg eller projektioner ändras.
- **Fabriksverktygs-UI.** `src/felsokning/ui.tsx` — hög kontrast, minst 56 px höga knappar, få val per skärm.

## Medvetna avgränsningar

- Ingen backend/multi-tenant ännu — datat bor per enhet. Append-only-modellen är vald just för att synkronisering (inkl. offline) blir konfliktfri när backend läggs till.
- Ingen LLM-koppling — guidningen är regelstyrd metodik. Gränssnittet mot motorn (`nastaSteg`) är den framtida integrationspunkten.
- Röst, bildanalys och tillverkarintegrationer ingår inte i MVP:t.
