# Guidad Felsökning – Master Prompt v2.0

**Production Ready AI Wrapper Platform (MVP/Beta)**

Det här är ett produktdirektiv, inte en teknisk specifikation. Visionen och resonemangen bakom finns i [VISION.md](VISION.md); v1.0 finns i versionshistoriken. Detaljerade modulspecifikationer: [kommunikationsmodell (röst/PTT)](moduler/kommunikationsmodell.md), [Live Share](moduler/live-share.md), [verifierade checklistor](moduler/verifierade-checklistor.md), [ärendebrief](moduler/arendebrief.md), [arbetslogg & tidredovisning](moduler/arbetslogg-och-tidredovisning.md), [kundrapport](moduler/kundrapport.md).

---

## Projekt

Bygg en produktionsredo SaaS-plattform med namnet **Guidad Felsökning**.

Plattformen är en AI-wrapper ovanpå en LLM-leverantörs API och fungerar som ett professionellt arbetsverktyg för mekaniker och servicetekniker. Den ska inte ersätta teknisk kompetens eller tillverkarens dokumentation, utan vägleda användaren genom en strukturerad felsökningsprocess, dokumentera allt arbete och skapa full spårbarhet.

Målet är att lansera en stabil, enkel och köpvärdig beta-version.

---

## Produktfilosofi

Produkten ska kännas som ett verktyg från en stor industrileverantör: enkel, stabil, extremt snabb, professionell, förutsägbar, tydlig, minimalistisk.

Ingen "AI-leksak". Ingen onödig design. Inga experimentella funktioner. Allting ska kännas robust.

---

## Roller

### Systemadministratör

Normalt en eller flera personer hos kunden. Behörigheter: hantera organisation, API-nycklar, integrationer, skapa/ta bort användare, roller, behörigheter, export, säkerhetsinställningar, fakturering, loggar.

### Tekniker

Kan skapa ärenden, fortsätta ärenden, ta över ärenden, skriva, prata, fotografera, filma, mäta, exportera rapport.

### Arbetsledare

Kan dessutom se alla ärenden, omfördela ärenden, följa status, läsa rapporter, skapa statistik.

---

## Multi-tenant

Varje kund är en egen tenant med egna användare, API-nycklar, integrationer, ärenden, databaslogik och säkerhet. **Ingen data får blandas mellan kunder.**

---

## Enkel onboarding

Första gången en kund loggar in:

1. Skapa företag
2. Lägg till logotyp
3. Lägg till användare
4. Lägg till API-nyckel för AI-tjänsten
5. Lägg till eventuella integrationer

Klart. Hela onboarding ska ta mindre än fem minuter.

---

## Dashboard

Visa endast det viktigaste: Mina ärenden · Pågående · Väntar · Klara · Starta nytt ärende.

---

## Nytt ärende

Identifiera objekt genom registreringsnummer, VIN, maskinnummer, QR, streckkod, OCR, foto eller manuell identifiering. Objektet verifieras innan felsökning startar.

---

## AI-guidning

Systemet arbetar stegvis. Inte långa svar. En kontroll åt gången:

> Kontrollera säkring F24. → Användaren svarar. → AI går vidare.

### AI-regler

AI får aldrig hitta på fakta, låtsas veta eller gissa. Den ska skilja på **Observation**, **Verifierat**, **Hypotes** och **Rekommendation**. Alla svar ska ha tydlig tillförlitlighet.

---

## Kommunikationsmodell

**Tal in, text ut.** All röstinmatning sker via tal-till-text enligt Push-to-Talk — ingen bakgrundslyssning, ingen röstagent, aldrig automatiskt skick. Transkriberingen är alltid redigerbar innan den sparas i arbetsloggen. Se [modulen](moduler/kommunikationsmodell.md) för fullständig specifikation.

---

## Kamerastöd

Foto, video, OCR, bildanalys och objektidentifiering: däck, typskyltar, serienummer, skyltar, komponenter, mätinstrument.

---

## Arbetslogg

Allt loggas: tid, användare, objekt, kommentar, foto, video, mätvärde, AI-fråga, AI-svar, resultat. Ingenting får försvinna. Loggen ska vara revisionssäker.

---

## Tidrapportering

När objektet identifierats startar arbetstiden. Vid längre inaktivitet ber systemet om en kort beskrivning av vad som gjorts. Slutrapporten visar total tid fördelad på moment (provkörning, diagnos, administration …).

---

## Ärendebrief

AI håller alltid en levande sammanfattning. När en annan tekniker öppnar ärendet visas automatiskt: vad kunden beskriver, vad som gjorts, vad som verifierats, vad som återstår, rekommenderade nästa steg och total arbetstid.

---

## Verifierade checklistor

En kontrollpunkt är inte slutförd enbart genom en kryssruta — varje kontroll samlar bevis och kontext (observation, mätvärde, foto) med minimikrav anpassade efter kontrolltyp. Se [modulen](moduler/verifierade-checklistor.md).

---

## Samarbete

Flera tekniker kan arbeta samtidigt. Alla ser bilder, filmer, mätningar, anteckningar, AI-sammanfattning, status och rekommendationer.

---

## Kundrapport och Live Share

Kundrapporten genereras automatiskt (objekt, felbeskrivning, bilder, tester, mätvärden, utförda kontroller, tid, rekommendation, nästa steg) och delas som PDF, länk eller API. Varje ärende kan dessutom publiceras via en säker, behörighetsstyrd delningslänk som uppdateras i realtid — se [Live Share-modulen](moduler/live-share.md). Alla exporter versionsmärks (version, datum, tid, vem, format).

---

## API First

Bygg hela systemet API-first. Alla resurser ska kunna skapas, läsas, uppdateras, exporteras och integreras. Dokumentera API:erna med OpenAPI/Swagger.

---

## Integrationer

Förbered integrationsramverk för DMS, ERP, CRM, elektroniska serviceböcker, tidredovisning, fakturering, reservdelssystem och tillverkarsystem via kundens egna behörigheter. Modulär integrationsarkitektur så att nya integrationer läggs till utan att påverka kärnplattformen.

---

## Infrastruktur

Bygg för produktion. Exempel på målarkitektur: AWS, Kubernetes, Docker, PostgreSQL, Redis, objektlagring, CDN, automatisk skalning, lastbalansering, backup, central loggning, övervakning, CI/CD, Infrastructure as Code.

---

## Säkerhet

Rollbaserad åtkomst, kryptering i vila och under överföring, säker API-autentisering, revisionsloggar, principen om minsta behörighet, säker hantering av API-nycklar och hemligheter. Utforma systemet så att det kan uppfylla relevanta krav, exempelvis GDPR, beroende på hur kunden använder tjänsten.

---

## Beta-fokus

Prioritera ett litet antal funktioner med hög kvalitet framför många halvfärdiga funktioner.

MVP ska innehålla: inloggning, organisation (tenant), användarhantering, starta ärende, objektidentifiering, AI-guidad felsökning, kamera och bildanalys, arbetslogg, tidrapportering, ärendebrief, kundrapport, API, administration.

All övrig funktionalitet planeras för senare versioner.

---

## Slutmål

Bygg en plattform som känns lika självklar för en mekaniker eller servicetekniker som ett diagnosinstrument är idag. Fokus på snabbhet, tydlighet, metodisk vägledning och spårbar dokumentation. När en användare öppnar appen ska den upplevas som ett pålitligt professionellt verktyg — inte som en generell AI-chatt. Det ska vara enkelt att komma igång, enkelt att samarbeta och enkelt att visa kunden exakt hur felsökningen har genomförts.
