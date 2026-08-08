# Garantistandarden FGS-1.0 kartlagd mot plattformen

**ALVA 3.6 · 2026-08-06 · ALVA-DOC-0011**

Underlaget är den sammanställda Felsöknings- och Garantistandarden
FGS-1.0: ett gemensamt flöde för fyra betalande parter — fabriksgaranti,
vagnskade-/bilskadegaranti, försäkringsbolag och externa garantigivare —
byggt på offentligt verifierbara källor (EU:s konsument- och
konkurrensregler, Volkswagen Groups offentliga garanti- och
revisionsunderlag kring ODIS/GFF/DISS/SAGA2, svenska försäkringsbolags
och garantiadministratörers publicerade flöden).

Detta dokument bokför hur standarden förhåller sig till plattformen:
vad som redan var uppfyllt, vad som infördes med ALVA 3.6, och var
gränsen mot tillverkarnas egna system går. Grundhållningen är densamma
som FGS §18: ett ärende som inte kan granskas i efterhand utan
kompletteringar är inte klart.

---

## 1. Uppfyllt före denna utgåva

| FGS | Plattformens motsvarighet |
| --- | --- |
| §4 Mottagning (VIN, regnr, miltal, datum, servicehistorik) | Objektidentifiering med registerslagning, mätarställning in/ut med fotokrav, historikkontroll med motiveringstvång vid nej — allt grindat |
| §5 Kundens beskrivning ordagrant | Felbeskrivningen är en egen händelse; symptomsteget frågar vad/när/var och skriver aldrig om kundens ord |
| §6 Reproducering före diagnos | Symptomverifiering med ja/delvis/nej och motivering — grindkrav sedan ALVA 1.x |
| §7 Diagnos, §8 teknisk verifiering | Metodikbiblioteket (16 metodiker, 176 kontroller efter fackgranskningen i ALVA-DOC-0009), evidenskrav på varje kontroll |
| §10 Complaint–Cause–Correction | Felbeskrivning → felorsak (avvikelse, orsaker, underlag, konfidens) → åtgärd + kvalitetskontroll "symptomet verifierat avhjälpt" — och slutsatsen (ALVA-RULE-200) tvingar fram *varför* |
| §12/15 Provkörning, slutkontroll | Provkörningssteg med dokumentationskrav; kvalitetskontrollen är grindad |
| §17 Revisionssäkring | Append-only-logg, hashkedja, förseglat avslut, spårbarhetspaket — varje fråga i FGS §17 besvaras ur loggen |
| Miltal/historik/claim/skadenummer/foto per ärendetyp | Datadrivet regelpaket (ECM Knowledge Library), signerat vid extern distribution |

## 2. Infört med ALVA 3.6

| FGS | Åtgärd |
| --- | --- |
| §1/§3 Ärendeklassificering per betalare | Händelsen `betalare`: spår (fabriksgaranti, vagnskadegaranti, försäkring, extern garanti, leasing/fleet, goodwill, kund), namn, referens, godkännande. Grindkravet `betalare` för alla spår där någon annan än kunden betalar |
| §3 Typ B/C/D saknade | Tre nya ärendetyper med egna regelpaketskrav: Body damage warranty, Extended warranty, Leasing or fleet |
| §8 DISS-mönstret | Händelsen `eskalering` (öppnad/besvarad, kanal, referens). En öppnad eskalering utan dokumenterat svar spärrar avslutet, matchad per referens — "invänta svar" är en grindregel, inte ett råd |
| §11/§12 Claim-/godkännandenummer | Claim- och skadenummer kan komma ur den registrerade betalaren, inte bara ur skannad arbetsorder. Goodwill och externa garantigivare kräver dokumenterat godkännande (`godkannande`-kravet) före avslut — FGS §12: "förhandsbesked innan reparation fortsätter" |
| §13 Reservdelar | Händelsen `reservdel`: artikelnummer, serienummer, batch, beskrivning och markering att den demonterade delen sparas i väntan på garantibeslut |
| Delningsminimering | Betalare, eskalering och reservdel är interna i delningsfiltret: kunden ser åtgärden, inte förhandlingen med betalaren |

**Fynd under arbetet, åtgärdat och regressionstestat:** serverns
ärendetypskrav var en tyst no-op. Servern matade den distribuerade
paketformen (`arendetypRegler`) in i en grindfunktion som bara läste
den slimmade formen (`arendetyper[typ].krav`) — garanti- och
försäkringskraven upprätthölls därmed bara som råd i klienten. Det är
C-2-mönstret från revision 1, återuppstånden genom ett filformat.
Grinden läser nu båda formerna, och regressionstestet låser att den
distribuerade formen faktiskt spärrar på servern.

## 3. Utanför plattformen — med avsikt

| FGS | Gräns |
| --- | --- |
| ODIS/GFF-körning, verktygsversioner inom 14 dagar | Tillverkarens verktyg och versionspolicy. ALVA dokumenterar diagnosens resultat (loggar, foton, mätvärden som evidens) men kör inte tillverkardiagnos. Verktygsversion kan antecknas i mätvärdets beskrivning; ett eget versionsfält bokförs som kandidat till nästa schemarevision |
| DISS-registrering, SAGA2-claimskapande | Tillverkarsystem bakom återförsäljaravtal. ALVA bär eskaleringsspåret och det kompletta bevispaket en SAGA2-claim (eller en extern garantigivares claim) kräver — den skapar inte claimen. Det är samma gräns som fakturamodellen: underlag, inte betalningsflöde |
| §15 Avslagsorsakerna | Var och en motsvarar ett grindkrav eller en evidensregel som redan spärrar; listan är med andra ord en beskrivning av vad grinden finns till för |
| Juridiska ramar (EU-garantiregler, reklamationsrätt) | Reglerar avtal mellan parter, inte verkstadens dokumentation. Noterbart: att garantin inte får villkoras av märkesbunden service är ett skäl att historikkravet formuleras som *kontrollerad*, aldrig som *utförd hos auktoriserad verkstad* |

## 4. Verifiering

Betalar- och eskaleringskraven mutationsprövade i grindtesterna
(öppnad spärrar/besvarad släpper, referensmatchning, betalare med och
utan namn/godkännande, claim ur betalare respektive arbetsorder, den
distribuerade paketformens regression). Klientens och serverns
regelpaket låsta mot varandra av befintligt likhetstest;
delningsfiltrets tillåtelselista täcker de nya händelsetyperna via
schematestet. Full kontrollslinga i commit-historiken.

---

*ALVA-DOC-0011 · FGS-1.0 ⇄ ALVA · ALVA bär bevispaketet — tillverkarsystemen ersätts inte*
