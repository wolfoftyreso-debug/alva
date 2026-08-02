# Guidad Felsökning – MVP

Första körbara versionen av kärnan i [Master Prompt v1.0](MASTER-PROMPT.md). Byggd som en fristående del av denna kodbas under `/felsokning`.

## Kör

```sh
npm install
npm run dev        # öppna http://localhost:8080/felsokning
npm test           # projektionstester
```

## Vad som ingår

| Direktivets kärna | Status i MVP |
| --- | --- |
| Objektidentifiering först | ✅ Manuell inmatning (reg.nr/VIN/serienummer/maskinnummer) med bekräftelsesteg. QR/streckkod/OCR är markerade som kommande. |
| AI-guidad felsökning | ✅ Deterministisk metodikmotor: en fråga i taget, stora knappar. Två metodiker (vibration + generisk) som väljs utifrån felbeskrivningen. LLM-integrationen ansluter i samma motor senare. |
| Arbetslogg | ✅ Append-only händelselogg med tidsstämpel och användare på varje post. Ingenting skrivs över. |
| Tidredovisning | ✅ Kategorier (aktiv felsökning, väntetid, provkörning …) via kategoribyten i loggen; paus räknas inte i total tid. Inaktivitetsfråga efter 20 min utan händelser. |
| Dokumentation | ✅ Observationer, mätvärden, foton (nedskalade), kommentarer och hypoteser. Hypoteser märks alltid 🔴 och kan aldrig loggas som konstaterade fel. |
| Ärendebrief | ✅ Regenereras ur loggen vid varje visning: utförda kontroller, observationer, **ej kontrollerat**, rekommenderat nästa steg, tillförlitlighet, total arbetstid. |
| Överlämning | ✅ ”Lämna över arbete” genererar överlämningsrapport ur briefen och loggar överlämningen. |
| Kundrapport | ✅ Tidslinjevy utan interna poster, med bilder och tidsfördelning. Utskrift/PDF via webbläsaren, med påminnelse om granskning före delning. |
| Röstinmatning (tal in, text ut) | ✅ Push-to-Talk via webbläsarens taligenkänning (sv-SE): lyssnar bara efter aktivt tryck, röd indikator med realtidstranskript, texten hamnar i ett redigerbart fält och skickas aldrig automatiskt. Knappen visas bara i webbläsare med talstöd. Produktionsversionen byter motor till leverantörens Voice-to-Text bakom samma gränssnitt. |
| Verifierade checklistor | ✅ Varje kontroll i metodiken har ett minimikrav (foto, mätvärde eller kort observation). Foto-kontroller verifieras med bild; mätningar kan inte markeras verifierade utan värde. |
| Export | ✅ Versionsmärkt JSON-export (version = antal händelser vid exporttillfället, med användare och tidpunkt); exporten loggas själv som händelse. PDF via utskrift. CSV och API i backend-fasen. |
| Öppet API | 🔶 Datamodellen är API-klar (händelser som JSON), men MVP:t lagrar lokalt (localStorage). Nästa steg: backend med samma händelsemodell. |
| Live Share | 🔶 Kräver backend — specificerad i [moduler/live-share.md](moduler/live-share.md). Kundrapporten är förberedd som samma projektion. |

## Arkitekturprinciper i koden

- **Händelseloggen är enda sanningskällan.** `src/felsokning/domain.ts` definierar händelsetyperna; poster läggs endast till.
- **Alla vyer är projektioner.** `src/felsokning/projektioner.ts` — brief, tidsfördelning, överlämningstext och kundrapport är rena funktioner av loggen och kan alltid regenereras. Testerna i `src/felsokning/__tests__/` låser detta.
- **Metodikmotorn är deterministisk.** `src/felsokning/metodik.ts` — nästa steg härleds ur vad som redan dokumenterats. Det är här den framtida AI:n ansluter, utan att logg eller projektioner ändras.
- **Fabriksverktygs-UI.** `src/felsokning/ui.tsx` — hög kontrast, minst 56 px höga knappar, få val per skärm.

## Medvetna avgränsningar

- Ingen backend/multi-tenant ännu — datat bor per enhet. Append-only-modellen är vald just för att synkronisering (inkl. offline) blir konfliktfri när backend läggs till.
- Ingen LLM-koppling — guidningen är regelstyrd metodik. Gränssnittet mot motorn (`nastaSteg`) är den framtida integrationspunkten.
- Röst, bildanalys och tillverkarintegrationer ingår inte i MVP:t.
