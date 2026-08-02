# Guidad Felsökning – Master Prompt v1.0

Det här är ett produktdirektiv, inte en teknisk specifikation – ett styrdokument som ett utvecklingsteam kan använda från dag ett. Visionen och de resonemang som ligger bakom finns i [VISION.md](VISION.md).

---

## Projektmål

Bygg en produktionsklar SaaS-plattform med namnet **Guidad Felsökning**.

Plattformen är ett professionellt arbetsverktyg för mekaniker, servicetekniker och felsökare inom alla tekniska områden där strukturerad diagnostik används.

Exempel:

- Fordon
- Lastbilar
- Bussar
- Entreprenadmaskiner
- Lantbruksmaskiner
- Kompressorer
- Generatorer
- Industrimaskiner
- Marin utrustning
- Elsystem
- Hydraulik
- Pneumatik
- Automation

Systemet ska fungera som en digital diagnostikhandledare. Det ska inte ersätta teknikerens kompetens eller fatta beslut åt användaren, utan metodiskt vägleda genom en dokumenterad felsökningsprocess.

---

## Designfilosofi

Designen ska kännas som ett professionellt fabriksverktyg.

Målbild:

- enkel
- robust
- extremt tydlig
- inga onödiga animationer
- inga sociala funktioner
- inga distraktioner
- stora knappar
- hög kontrast
- optimerad för arbete med handskar
- fullt stöd för mobil, surfplatta och dator

Varje skärm ska ha ett tydligt syfte och minimera antalet val.

---

## Arbetsflöde

1. Identifiera objektet.
2. Starta arbetsloggen.
3. Beskriv felet.
4. AI leder användaren genom verifierbara kontroller.
5. Bilder, video och mätvärden dokumenteras.
6. Alla aktiviteter tidsstämplas.
7. Rapport genereras.
8. Rapport exporteras eller delas via API.

---

## Kärnfunktioner

- Samtalsbaserad guidning (text och röst)
- Bildanalys
- OCR
- Objektidentifiering
- Automatisk arbetslogg
- Tidrapportering
- Fotodokumentation
- Videostöd
- Mätvärdeslogg
- Checklista
- Kundrapport
- API-export
- Integration med affärssystem
- Integration med tillverkarinformation via användarens egna behörigheter
- Rollbaserad behörighet
- Offline-läge med synkronisering

---

## AI-principer

AI får aldrig gissa.

Alla rekommendationer ska tydligt skilja mellan:

- observation
- verifierat faktum
- hypotes
- rekommenderat nästa steg

Varje svar ska ha en tydlig tillförlitlighetsnivå.

AI ska vara konsekvent, kortfattad och metodisk.

---

## Dokumentation

Varje aktivitet ska lagras.

Exempel:

- tid
- användare
- GPS (om aktiverat)
- objekt
- bilder
- video
- mätvärden
- användarens kommentarer
- AI:s rekommendation
- resultat

Loggen ska vara revisionssäker, vilket innebär att historik bevaras och ändringar kan spåras.

---

## API-first

Hela plattformen byggs API-first.

Alla objekt ska kunna:

- hämtas
- uppdateras
- exporteras
- integreras

Dokumentationen ska vara komplett (exempelvis OpenAPI/Swagger) så att externa system enkelt kan anslutas.

---

## Infrastruktur

Bygg för hög tillgänglighet och skalbarhet.

Exempel på målarkitektur:

- AWS
- Kubernetes
- Docker
- PostgreSQL
- Redis
- Objektlagring för bilder och dokument
- CDN
- Lastbalansering
- Automatisk skalning
- Övervakning och loggning
- Dagliga säkerhetskopior
- Katastrofåterställning
- Kryptering av data under överföring och lagring

---

## Säkerhet

Systemet ska vara lämpligt för professionella verksamheter.

Prioritera:

- stark autentisering
- rollbaserad åtkomst
- API-nycklar och OAuth där det passar
- detaljerad revisionslogg
- principen om minsta behörighet
- säker nyckelhantering
- möjlighet att uppfylla krav enligt relevanta regelverk (t.ex. GDPR)

---

## Integrationer

Systemet ska kunna integreras med:

- DMS-system
- ERP-system
- CRM-system
- elektroniska serviceböcker
- garantihantering
- fakturering
- tidredovisning
- reservdelssystem
- tillverkarnas informationssystem, när användaren har giltig behörighet och integration finns tillgänglig

---

## Kundrapport

Efter varje avslutat arbete ska systemet kunna generera en professionell rapport med:

- identifierat objekt
- felbeskrivning
- utförda kontroller
- bilder
- mätvärden
- provkörning
- rekommenderade nästa steg
- total tidsåtgång
- komplett arbetslogg

Rapporten ska kunna delas via länk, PDF eller API.

---

## Affärsmål

Produkten ska ge värde på flera nivåer:

- Teknikern får metodstöd och mindre administration.
- Verkstaden får bättre kvalitet, spårbarhet och debiteringsunderlag.
- Kunden får insyn i vad som faktiskt utförts.
- Organisationen bygger över tid en sökbar kunskapsbas.
- I framtiden kan anonymiserade och aggregerade data användas för trendanalyser, förutsatt att detta sker i enlighet med avtal och tillämpliga regler.

---

## MVP-avgränsning

Det här är en produkt som lämpar sig väl för ett MVP. Den första versionen behöver inte stödja alla maskintyper eller alla integrationer.

Om man bygger en stabil kärna –

1. objektidentifiering,
2. AI-guidad felsökning,
3. arbetslogg,
4. dokumentation,
5. ett öppet API

– finns en plattform som sedan kan utökas bransch för bransch utan att behöva göras om i grunden.
