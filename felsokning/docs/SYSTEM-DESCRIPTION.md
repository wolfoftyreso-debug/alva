# Guidad Felsökning (Guided Diagnostics) — complete system description

> **This is the canonical version.** Translations: [Swedish](SYSTEM-DESCRIPTION.sv.md) · [German](SYSTEM-DESCRIPTION.de.md) · [Danish](SYSTEM-DESCRIPTION.da.md) · [Norwegian](SYSTEM-DESCRIPTION.no.md).
> Where a translation disagrees with this document, this document is correct.
>
> **Code identifiers are Swedish and are not translated.** Event types, function
> names, field names, file paths and configuration keys are Swedish *in the code
> itself* — the domain is Swedish and the implementation follows it. Translating
> them here would make this document useless against the repository, so they
> appear verbatim, with an English gloss where the meaning is not obvious. This
> document being English does not change what the code is called.
>
> A self-contained reference document. Everything below is taken from the code
> in `felsokning/` (branch `claude/guidad-felsokning-vision-1mnx7f`), not from
> plans or intentions. Where something does **not** exist, this is stated
> explicitly.
>
> Last synchronised against code: commit `1bb4031`, 2026-08-04.

---

## 0. Summary in thirty seconds

Guidad Felsökning is a SaaS platform for **vehicle workshops**. It guides a
technician through a structured diagnostic process, requires evidence for every
claim, and produces a traceable record that can be shared with the customer, an
insurer, or the next technician.

The load-bearing idea is negative rather than positive: **the system never
presents a hypothesis as a confirmed fault.** This is not a policy in a document
— it is coded, tested, and it blocks flows. When evidence is missing the system
says "Evidens saknas" (evidence missing), not a qualified guess.

Technically: an **append-only event log** is the single source of truth.
Everything else — the case view, the brief, the customer report, the quality
gate, the statistics — is a pure projection of the log and can always be
regenerated.

| | |
|---|---|
| Client | React 18 + TypeScript + Vite + Tailwind + zustand + react-router |
| Backend | Two Node services (`plattform`, `ai-orkester`), plain `node:http`, minimal dependencies |
| Database | PostgreSQL (Aurora Serverless v2), append-only enforced by database triggers |
| Model | Claude, server-owned routing per task |
| Infrastructure | AWS + EKS, 126 Terraform resources across two layers |
| Git & CI | **Self-hosted Gitea + Actions runners on our own EKS** — no GitHub in the operational path |
| Tests | 120 vitest tests + an integration test against real Postgres |
| Language in code | Swedish (identifiers, comments, commit messages) |

---

## 1. Product principles

These five are invariants, not guidelines. Each has a counterpart in code and in
a test.

### 1.1 No hypothesis is presented as a confirmed fault

Hypotheses are their own event type (`hypotes`) with a mandatory confidence
level, and can **never** take the level `hog` (high) —
`niva: Exclude<Tillforlitlighet, "hog">`; the type system forbids it. In the
customer report they are explicitly marked as unverified. The quality gate has a
dedicated row for this.

The wording on failed reproduction is *"kunde inte reproduceras under de
förhållanden som rådde"* ("could not be reproduced under the conditions that
prevailed") — never "fault confirmed" or "no fault found". This is coded in both
the projections and the orchestrator's base prompt.

### 1.2 A checkbox is not evidence

Every check item in every methodology carries a **minimum requirement**:
`matvarde` (measured value) | `kommentar` (observation) | `foto` (photo). A
measurement cannot be marked complete without a value; a photo check cannot be
marked complete without an image. If the technician wants to skip something, a
**documented exemption** with a reason from a fixed list is required.

Locked by the test *"varje kontroll kräver bevis — en kryssruta är inte
evidens"*.

### 1.3 The log is append-only, all the way down

There are no update or delete operations in the API, and the database has
triggers that reject them even if someone bypasses the application. A test
actively searches the server code for `update`/`delete` against the event table
and fails if they appear.

Consequence: an incorrect entry is *corrected by a new event*, never by making
the old one disappear. The history is what gives the record its value in a
dispute.

### 1.4 Terminology

In the UI and in customer communication the words used are **the system, the
analysis, the assessment, the decision support** — not "AI", unless technically
necessary. The product is described as an *evidence-based diagnostic system* /
*intelligent decision support*.

The reason is both commercial and epistemic: a workshop customer who hears "AI"
hears "guess". An insurance assessor who reads "AI assessment" in a record
weights it lower.

### 1.5 The sharing boundary is an allowlist

What may leave the organisation is enumerated **positively**, per level. A new
event type is therefore internal until someone actively releases it. A test
requires every type in the domain model to be classified — if one is forgotten
the build fails, instead of it leaking.

---

## 2. The domain model — the event log

`app/src/felsokning/domain.ts` (281 lines).

A case is: identity + metadata + an **ordered list of log entries**. Each entry
carries `id`, `tidpunkt` (timestamp), `tekniker` (technician) and a `handelse`
(event).

### 2.1 All event types

| Type | Contents | Role |
|---|---|---|
| `objekt_identifierat` | `objekt` (plate/VIN, make, model, engine …) | What the case concerns |
| `arbetsorder_skannad` | `falt[]` + attachment | Interpreted work order (**internal**) |
| `felbeskrivning` | `text` | The customer's words, verbatim |
| `arendetyp_satt` | `arendetyp` | Warranty / insurance / customer — selects rule pack |
| `fraga_besvarad` | `stegId`, `frageId`, `fraga`, `svar` | Methodology symptom questions |
| `kontroll_utford` | `stegId`, `kontrollId`, `text`, `resultat?`, `undantag?` | Verified checklist item |
| `observation` | `text` | What the technician saw — not what they believe |
| `matvarde` | `beskrivning`, `varde`, `enhet?` | Measurement (E4) |
| `hypotes` | `text`, `niva` (never `hog`) | Working hypothesis (**internal**) |
| `foto` | `beskrivning` + attachment | Photographic evidence (E2) |
| `video` | `beskrivning` + attachment | Moving-image evidence (E3) |
| `matarstallning` | `lage` (in/out), `varde` + attachment | Odometer in/out |
| `historik_kontrollerad` | `kontrollerad`, `kommentar?` | Service history |
| `reproducering` | `status` (ja/delvis/nej), `beskrivning` | **Symptom verification** |
| `felorsak` | structured root-cause analysis | Cause, category, supporting evidence |
| `atgardsforslag` | proposal with justification | What should be done |
| `kundbeslut` | approved/declined, channel | The customer's decision |
| `atgard_utford` | work performed | What was actually done |
| `kvalitetskontroll` | verification after repair | Is the symptom gone? |
| `kommentar` | `text` | Free note |
| `kategori_byte` | `kategori` | Time accounting (**internal**) |
| `inaktivitet_forklarad` | `text`, `minuter` | Why work stood still |
| `overlamning` | `fran`, `till?` | Shift handover |
| `ansvarig_satt` | `ansvarig` | Supervisor reassignment (**internal**) |
| `ai_svar` | classified `rader[]`, model name | Decision-support response (**internal**) |
| `export_skapad` | `format`, `version` | The export logs itself |
| `arende_avslutat` | `signatur?` | Technician's sign-off |

### 2.2 Attachments are content-addressed

`foto`, `video`, `matarstallning` and `arbetsorder_skannad` are *intersection
types* with `Bilaga` (attachment):

```ts
export interface Bilaga {
  bilagaId?: string;
  bilagaHash?: string;   // SHA-256
  dataUrl?: string;      // stays forever — the log is append-only
}
```

The content lives outside the log (S3 or database), but **the hash lives in the
log**. On read the hash is verified; if it does not match, `409` is returned.
The meaning: if someone swaps an image in storage it is detected, and the log
can prove the original image was a different one.

`dataUrl` is kept in the type because older entries have it embedded — and the
log cannot be rewritten.

---

## 3. The methodology engine

Since the most recent change, **engine and content are separated**:

- `metodik.ts` (171 lines) — types, methodology selection, derivation of the
  next step.
- `metodiker.ts` (899 lines) — the sixteen methodologies.

The library can grow without the engine changing.

### 3.1 The methodology library

Step ids are code and stay Swedish; an English gloss follows each table row
where useful. `symptom` = symptom, `visuell` = visual, `matningar` =
measurements, `provkorning` = road test, `sakerhet` = safety, `avlasning` =
readout.

| id | Name (in code) | Area | Steps | Checks |
|---|---|---|---|---|
| `vibration` | Vibration under körning | Wheels and balance | symptom → visuell → kontroller → provkorning | 19 |
| `bromsar` | Bromssystem | Chassis | symptom → visuell → matningar → system | 14 |
| `styrning_fjadring` | Styrning och fjädring | Chassis | symptom → visuell → glapp → installning | 11 |
| `elsystem` | Elsystem och strömförsörjning | Electrical | symptom → visuell → matningar → rela → funktionstest | 12 |
| `start_laddning` | Start- och laddningssystem | Electrical | symptom → batteri → start → laddning → krypstrom | 15 |
| `motor_drift` | Motorgång och effekt | Engine | symptom → felkoder → mekanik → tandning_bransle → provkorning | 16 |
| `kylsystem` | Kylsystem och överhettning | Engine | symptom → visuell → matningar → packning | 12 |
| `drivlina` | Växellåda och drivlina | Drivetrain | symptom → visuell → matningar → provkorning | 10 |
| `avgas_emission` | Avgassystem och emissioner | Engine | symptom → avlasning → matningar → orsak | 12 |
| `klimat` | Klimatanläggning | Comfort | symptom → visuell → matningar → styrning | 11 |
| `hogvolt` | Högvoltsystem — elbil och hybrid | High voltage | **sakerhet** → symptom → avlasning → laddning | 16 |
| `diagnos_natverk` | Felkoder och kommunikation | Diagnostics | symptom → grund → buss → koder | 10 |
| `lackage` | Läckage | Other | symptom → visuell → metod | 8 |
| `missljud` | Missljud | Other | symptom → inspelning → lokalisering | 7 |
| `adas` | Förarassistans och kalibrering | Diagnostics | symptom → forutsattningar → kalibrering | 9 |
| `generisk` | Generell strukturerad felsökning | Other | symptom → visuell → grundkontroller → funktionstest | 9 |

English names: vibration while driving · braking system · steering and
suspension · electrical system and power supply · starting and charging ·
engine running and power · cooling and overheating · gearbox and drivetrain ·
exhaust and emissions · climate control · high-voltage system (EV/hybrid) ·
fault codes and communication · leakage · abnormal noise · driver assistance and
calibration · generic structured diagnosis.

### 3.2 Three rules, locked by tests

1. **Every check has a minimum requirement.** Measured value, photo or
   observation.
2. **Every methodology begins by verifying the symptom**, never by repairing.
   The customer's words become a verified symptom only once reproduced.
3. **Where the work can injure someone, the safety step comes first.** Only
   `sakerhet` may precede `symptom` — the test permits exactly that exception
   and no other.

`hogvolt` is the only methodology with a safety step. It requires
authorisation, a documented removed service disconnect (photo), the
manufacturer's waiting time, **measured absence of voltage** (a measured value —
not a yes to a question), and protective equipment. The test checks that the
step comes first, that `spanningsfrihet` requires a measured value, and that the
description contains the word "livsfarlig" (potentially lethal).

The reason is simple: that work can kill someone. A checkbox will not do there.

### 3.3 Methodology selection

Previously a regex chain with three outcomes. Now **scored keyword matching**:

```ts
export function metodikPoang(metodik: Metodik, text: string): number
export function valjMetodik(felbeskrivning: string): Metodik
```

- Score = the sum of the lengths of the keywords that match. A longer — more
  specific — word weighs more. `traktionsbatteri` (16) beats `batteri`.
- **Short words (≤3 characters) match as whole words, longer ones as stems.**
  Otherwise `"ac"` would have matched *acceleration* and a vibration would have
  ended up in the climate-control methodology.
- On a tie the one listed first in the library wins → the selection is **stable**
  across runs.
- No match → `generisk`.

**A pitfall that actually bit during development:** the keywords must be
*stems*, not fully inflected words. Swedish inflection often drops an `e`:
*filter → filtret*, so `"partikelfilter"` never matches the text a technician
actually writes. The same applies to *regenerering → regenererar*,
*misständning → misständer*, *skrammel → skramlar*. The library therefore uses
`partikelfilt`, `regenerer`, `misständ`, `skram`.

*(For readers translating this to another market: this is a property of Swedish
morphology, and the same class of problem exists in German compounding and
Danish/Norwegian definite forms. A localised keyword set has to be validated
against the same test, not translated word-for-word.)*

**The selection is a question order, not a diagnosis.** It decides where the
technician starts looking, not what is wrong. If nothing matches, `generisk` is
the honest answer — structurally complete, and better than a guess.

### 3.4 Next step

```ts
export function nastaSteg(arende: Arende, metodik: Metodik): NastaSteg
```

Purely derived from the log: the first unanswered question, then the first
un-performed check, in the methodology's order. No hidden state machine — the
same log always yields the same next step.

### 3.5 On "covering everything"

That cannot be promised honestly, and the documentation does not claim it. What
is possible is to cover the vehicle's systems systematically and let `generisk`
be a structurally complete safety net for what nobody anticipated.

---

## 4. ECM v2.0 — the evidence and rule engine

`app/src/felsokning/ecm.ts` (749 lines). Six engines:

### 4.1 Evidence Engine

Evidence levels, derived from the log:

| Level | Meaning |
|---|---|
| E0 | No supporting evidence |
| E1 | Technician's observation |
| E2 | Photo |
| E3 | Video |
| E4 | Measured value |
| E5 | Diagnostic data / document |
| E6 | Multiple independent sources |

A case's evidence level is the highest the record supports. It is shown in the
UI and travels with the export.

**Content hash:** `innehallsHash()` is a deterministic FNV-1a over the evidence
content. The same record ⇒ the same hash, regardless of machine or moment. That
makes the export verifiable after the fact.

### 4.2 Rule Engine

- `ORSAKSKATEGORIER` — fixed list of root-cause categories (gives comparable
  statistics across the fleet).
- `UNDANTAGSORSAKER` — fixed list of reasons for "why this was not done".
- `UNDERLAGSKALLOR` — what a conclusion rests on.
- `INGEN_ATGARD_ORSAKER`, `KUNDKANALER` (customer channels).
- `granskaAvvikelse()` — flags text phrased as a statement of fact without
  cover.

Fixed lists instead of free text is a deliberate choice: free text cannot be
aggregated, and fleet statistics are one of the product's real assets.

### 4.3 Compliance Engine

`ARENDETYPER` (case types) selects which **rule pack** applies. A warranty case
requires a claim number and service history; an insurance case requires a claim
reference and photographic evidence; a customer-paid case requires less. The
packs are data (`ecm-regler.json`, servable via `/api/ecm/regler`) — new
requirements need no new release.

### 4.4 Validation Engine — pre-diagnostics

Before diagnosis may begin: object identification verified, work order read in,
vehicle history checked **or justified**, incoming odometer documented,
customer's fault description verified, early observations handled.

### 4.5 Completion Engine — the quality gate

The largest single function (`kvalitetsgrind`, ~240 lines). The case cannot be
closed until every row is green or justified:

- Vehicle history checked or justified
- Incoming/outgoing odometer documented
- Customer's fault description verified
- **Symptom verification:** reproduced, or documented as non-reproducible
- Root-cause analysis documented
- Repair documented or justified
- Customer's decision on the proposal recorded
- Work performed despite a declined proposal (where applicable)
- Quality check performed — symptom verified
- Methodology checks: evidence or documented exemption
- Photos present for photo-requiring checks
- Technician's conclusion signed
- Hypotheses presented as unverified
- The case type's rule pack satisfied (claim / insurance reference / odometer /
  history)

### 4.6 Traceability Engine

`sparbarhetspaket()` — the whole chain of evidence in one structured object:
what is claimed, what it rests on, who documented it and when.

---

## 5. Symptom verification (SVP)

Its own principle, because it is the product's sharpest edge against reality.

**The customer's description ≠ a confirmed fault.**

1. The description is documented **verbatim** (`felbeskrivning`).
2. It is clarified through the methodology's symptom questions — *when, where,
   how*, never "what is wrong".
3. It is **reproduced**, with three possible outcomes:
   - **Yes** — with documented conditions.
   - **Partly** — what could and could not be recreated.
   - **No** — mandatory justification.

The report's chain of evidence separates four things that otherwise get mixed
together: *the customer's description*, *verified observation*, *root-cause
analysis* and *recommended action*.

---

## 6. The client

`app/src/felsokning/` + `app/src/pages/felsokning/`.

| Module | Lines | Responsibility |
|---|---|---|
| `ArendeSida.tsx` | 2433 | The case view. Three-column layout on desktop |
| `metodiker.ts` | 899 | The methodology library |
| `ecm.ts` | 749 | Rule and evidence engine |
| `NyttArende.tsx` | 497 | Case start, work-order scanning |
| `Arendelista.tsx` | 399 | Dashboard: counters, filters |
| `projektioner.ts` | 356 | All views as pure functions of the log |
| `ai.ts` | 305 | Client side of the orchestrator, prompt building, response parsing |
| `plattform.ts` | 296 | API client against the self-hosted platform |
| `DelatArendeVy.tsx` | 283 | Shared view (customer/partner/internal) |
| `domain.ts` | 281 | Event types |
| `Installningar.tsx` | 281 | Organisation, users, integrations |
| `Oversikt.tsx` | 238 | Supervisor view |
| `demo.ts` | 200 | Demo case with 1 h 35 min of history |
| `ui.tsx` | 174 | Industrial workshop UI |
| `metodik.ts` | 171 | The methodology engine |
| `synk.ts` | 141 | Conflict-free merging of events |
| `ikoner.tsx` | 132 | Own SVG line icons (no emojis) |
| `streckkod.ts` | 131 | Barcode/VIN reading |
| `store.ts` | 106 | zustand store |
| `bilagor.ts` | 96 | Upload + blob-URL cache |
| `installningar.ts` | 86 | Organisation settings |
| `Bilagevisning.tsx` | 69 | `<Bild>` / `<Klipp>` |
| `Mikrofon.tsx` / `rost.ts` | 66 / 65 | Speech recognition |
| `format.ts` | 48 | Photo scaling etc. |

### 6.1 The projections

```
objekt · felbeskrivning · ansvarig · arendeidentitet · arAvslutat
lokalFordonshistorik · utfordaKontroller · ejKontrollerat
observationer · hypoteser · foton · videor
tidsfordelning · formateraTid · tillforlitlighet
brief · overlamningstext · tidsfordelningsRader · sistaAktivitet
```

All pure functions of `Arende`. `ejKontrollerat` ("not yet checked") is the one
that saves the most time in practice: *what causes duplicated work at shift
change is the thing nobody wrote down that nobody did.*

### 6.2 UI language

An ETKA-inspired workshop UI: flat light-grey surfaces (#ECECEC/#F7F7F7), sharp
edges, deep navy as the primary colour, dense typography (11–15 px), rectangular
buttons (max 4 px radius), toolbar ~44 px. Own line icons instead of emojis;
status as colour dots.

The motive: the technician is wearing gloves, standing in a noisy space, and has
no time for an airy consumer UI.

### 6.3 Local mode

Without login the app works against `localStorage`. The methodology guides
alone; the orchestrator is off. Status is shown in the case header. On login,
local events are merged with the server's — conflict-free per event id, tested.

---

## 7. Backend

### 7.1 `services/plattform` (1210 lines)

Plain `node:http`. The only dependency is `pg`.

**API routes:**

```
GET  /halsa                        health
GET  /api/openapi.yaml
POST /api/auth/registrera          creates organisation + system administrator
POST /api/auth/logga-in            log in
POST /api/auth/logga-ut-alla       raises token_version → every session dies
GET  /api/anvandare                users; admin only
POST /api/anvandare
POST /api/anvandare/{id}/avaktivera | /aktivera
GET  /api/organisation
GET/PUT /api/organisation/installningar
GET  /api/ecm/regler               rule packs as data
GET/POST /api/arenden              cases
POST /api/arenden/{id}/handelser   append-only
POST /api/arenden/{id}/bilagor     attachments
GET  /api/bilagor/{id}             hash verified on read
GET  /api/fordon/{identifierare}/historik
GET  /api/statistik/felorsaker     root-cause statistics
GET  /api/oversikt                 supervisor view
GET  /api/delad/{kod}              shared, filtered by level
POST /api/delad/{kod}/beslut       customer decision without login
GET  /api/delad/{kod}/bilagor/{id} level-filtered
GET  /api/integrationer/leverantorer
GET/PUT/DELETE /api/integrationer/{leverantor}
POST /api/integrationer/{leverantor}/uppslag
```

There are no update or delete routes against case data. By design.

**Security functions in the service:**

```
ursprungFor · forTataForsok · kallaFor · inloggningSparrad · loggaForsok
skapaJwt · verifieraJwt · kontoGiltigt · kravAuth · arendeIOrg
integrationsNyckel · kryptera · dekryptera · maskera
arPrivatAdress · pekarInat · gorUppslag · skickaBilaga · synligaTyper
```

### 7.2 `services/ai-orkester` (400 lines)

Owns the Claude key. The client **never** has it. Routing per task:

| Task | Model | Effort | Vision |
|---|---|---|---|
| `handledning` (live guidance) | `claude-sonnet-5` | medium | — |
| `granskning` (deep review) | `claude-opus-5` | **high** | — |
| `sammanfattning` (handover summary) | `claude-sonnet-5` | low | — |
| `metodikval` (classification) | `claude-haiku-4-5` | *(none — the model does not take the parameter)* | — |
| `instrumentavlasning` (instrument reading) | `claude-sonnet-5` | low | ✔ |
| `dokumenttolkning` (document reading) | `claude-sonnet-5` | low | ✔ |

All responses are **schema-bound** (`json_schema`). The base prompt encodes the
rules: *"Never invent facts"*, *"never a hypothesis as a confirmed fault"*,
*"REQUIRES verification"*. On a declined request there is automatic fallback to
a reserve model. **The model that answered is logged in every `ai_svar`
event** — the record must be auditable after the fact.

The methodology catalogue is built from a single list (`METODIK_KATALOG`) that
generates both the schema's `enum` and the prompt's bullet list. A test compares
it against the client's library: if the lists drift apart, the classifier
returns an id the client does not recognise, and the selection would fall back
*silently* to generic. Now the test fails instead.

### 7.3 `services/gemensam/observation.mjs` (166 lines)

Tracing and metrics **with no new dependencies**. The services deliberately have
almost no dependencies; pulling in an OpenTelemetry SDK with thirty packages to
measure four things would be the wrong trade. Instead, two standards that are
both just text on stdout:

- **W3C Trace Context** — `traceparent` travels through the whole chain
  (client → platform → orchestrator).
- **CloudWatch EMF** — structured JSON from which CloudWatch itself extracts
  metrics. No agent, no SDK, nothing that can silently stop working.

```
spårFrån(header) · traceparent(trace) · starta(name, trace)
  → .mät(partName, work) · .ms() · .delar()
logga(level, message, fields) · mätvärde(name, value, unit, dims, extra)
avsluta(span, { status, väg, extra })
```

What is measured was chosen from one question: *what do you want to know at
three in the morning when something is slow?* The answer is **where the time
went** — not how many calls were made. Hence `delar()` ("parts"): the database,
the model call, object storage, the customer's vendor, with count and sum per
part in the same log line.

`mät()` measures even when the work throws — otherwise errors look like zero
time.

**Dimensions are deliberately few.** Every unique combination is its own time
series that costs money, so organisation, case and trace id must never become
dimensions — they are ordinary fields. Locked by a test that explicitly forbids
`org`, `organisation`, `arende`, `spårId`, `anvandare` among the dimensions.

---

## 8. Security

| Protection | Implementation |
|---|---|
| **Multi-tenant isolation** | All case queries are organisation-scoped (`arendeIOrg`); integration-tested against real Postgres |
| **Roles** | `tekniker` / `arbetsledare` / `admin` (technician / supervisor / admin), in the JWT and as a database check |
| **JWT claims** | `{ sub, namn, org, roll, tv }` — `tv` = token_version |
| **Immediate revocation** | `kontoGiltigt()` checks `aktiv` + `token_version` on *every* authenticated request. A valid signature is not enough |
| **Global logout** | `/api/auth/logga-ut-alla` raises `token_version` → every issued token dies immediately |
| **Passwords** | bcrypt via `gen_salt('bf')` in the database |
| **Login throttling** | 15-minute window; max 10 attempts per account, 30 per source. Cleaned probabilistically (2 % chance per write) to avoid needing a cron job |
| **Encryption at rest** | AES-256-GCM for customers' integration credentials; secret fields are always masked in API responses |
| **SSRF defence** | `arPrivatAdress()` + `pekarInat()`: 10/8, 127/8, 169.254/16, 172.16–31, 192.168/16, 100.64/10, ::1, fc/fd, fe80, ::ffff:. **DNS is resolved** before the call; `.local`/`.internal` blocked. Escape hatch `TILLAT_INTERNA_UPPSLAG` for test environments |
| **CORS** | `TILLATNA_URSPRUNG` allowlist; the origin is set once per request |
| **Attachment integrity** | SHA-256 in the log, verified on read → `409` on mismatch |
| **Append-only in the database** | Triggers `before update or delete` on both `felsokning_handelser` and `felsokning_arenden` |
| **Pod hardening** | IMDSv2 mandatory, hop limit 1 → pods cannot borrow the node's IAM role |
| **IRSA** | Every service account has its own role; nodes share no permissions |
| **Split IAM roles** | `bygg` (build) may publish to ECR but not touch the cluster; `drift` (operate) may touch the cluster but not publish images |
| **Network policy** | Default deny inbound; explicit `_ut` (outbound) rules per service |
| **Database access** | Only from the cluster's nodes, in a subnet layer **with no route out** |

### 8.1 Database schema

```
organisationer · anvandare · inloggningsforsok
felsokning_arenden · felsokning_handelser
bilagor · bilage_innehall
delningar · integrationer
```

(organisations · users · login attempts · cases · events · attachments ·
attachment content · shares · integrations)

---

## 9. Live Share — sharing levels

Three levels, server-side filtering:

| Level | Sees |
|---|---|
| **kund** (customer) | 22 event types: object, fault description, questions, checks, observations, measurements, photos, videos, comments, handovers, repairs, quality check … |
| **partner** | Everything the customer sees **+ `hypotes`** (marked unverified) |
| **intern** (internal) | Full visibility — no filtering |

**Never outside the organisation:**
`kategori_byte`, `hypotes`, `ai_svar`, `ansvarig_satt`, `arbetsorder_skannad`.

```js
export function synligaTyper(niva) {
  if (niva === "intern") return null;           // full visibility
  return niva === "partner" ? DELBART_PARTNER : DELBART_KUND;
}
```

Links are revocable. The public share page (`/felsokning/delad/:kod`) requires
no login and polls for live updates. The customer can give their decision
directly in the view (`POST /api/delad/{kod}/beslut`).

**Why an allowlist:** a denylist must be updated whenever a new event type is
added — and that is exactly what gets forgotten. An allowlist turns "forgotten"
into "internal", which is the safe outcome.

---

## 10. Brand-specific integrations

Vendors are **data, not code** (`integrationer.json`, mountable as a ConfigMap
via `INTEGRATIONER_FIL`). New brands require no rebuild.

| id | Vendor |
|---|---|
| `generisk_vin` | Any VIN service over HTTP |
| `vag_erwin` | Volkswagen Group erWin (VW, Audi, Škoda, SEAT) |
| `volvo_vida` | Volvo VIDA |
| `fordonsregister` | Registration number → vehicle |

Each vendor declares its fields, which are secret (encrypted + masked), and how
the response maps to the domain's fields (`marke`, `modell`, `arsmodell`,
`motor`, `vaxellada` — make, model, year, engine, transmission).

Lookups go through the SSRF protection — a customer therefore cannot point a
"vendor" at the cluster's internal addresses.

---

## 11. Visual-first

The camera **is** the integration layer. What appears on a screen or an
instrument is photographed and interpreted, rather than integrated.

- **Work-order scanning** is the primary path at case start. Sonnet 5 (vision)
  reads customer, vehicle and workshop details regardless of layout, with a
  confidence per field:
  - 🟢 ≥95 % accepted automatically
  - 🟡 80–95 % flagged for reading
  - 🔴 <80 % requires active confirmation

  The technician therefore reviews only the uncertain fields. Visual review with
  the document beside the fields; clicking marks the approximate position.

- **Instrument reading** — a photo of a diagnostic screen or instrument →
  structured values.

The motive is commercial: one integration per workshop system is one sales cycle
per customer. A camera works against everything, immediately.

---

## 12. Infrastructure

Two Terraform layers. The base runs rarely, the workload layer often.

### 12.1 `infra/aws` — the base (91 resources)

| Area | Contents |
|---|---|
| **Network** | 1 VPC, 3 subnet layers × 3 zones: public (ALB + NAT only), private (nodes, no public addresses), data (Aurora, **no route out at all**). VPC endpoints: S3 (gateway); ECR, logs, Secrets Manager, STS, ELB (interface) → traffic never leaves the network |
| **Cluster** | EKS, arm64 nodes, IRSA via OIDC provider, IMDSv2 hop limit 1, all five control-plane logs on |
| **Data** | Aurora PostgreSQL Serverless v2, PITR to the second, KMS with its own key, `sslmode=require` |
| **Object storage** | S3 for attachments: SSE-KMS, public access blocked, TLS mandatory, versioning on. The platform role may read and write — **but never delete** |
| **Registry** | ECR with **immutable tags** + vulnerability scanning |
| **Secrets** | Secrets Manager; readable only by the platform role via IRSA |
| **Roles** | 9 IAM roles, including the split `bygg` / `drift` |
| **Domain** | Route 53 + ACM with DNS validation |
| **Observability** | 7 alarms, 1 dashboard, 3 log groups, SNS topic |

**The alarms** — few, but the ones that exist mean something. *An alarm nobody
acts on teaches people to ignore alarms.*

- Aurora CPU > 85 % for three periods (the scaling ceiling may have been hit)
- Aurora free local storage < 5 GiB
- **Backup age** — `treat_missing_data = "breaching"`. If the metric is missing,
  there is no backup. *A backup you believe exists is worse than none.*
- Fewer nodes than the desired minimum
- Response time **p95** > 3 s for three periods — not the mean, which hides that
  every twentieth technician waits unreasonably long
- Server errors (sum > 5)
- The model declines (indicates unexpected input, not an operational fault)

### 12.2 `infra/terraform` — the workload (35 resources)

Reads the base via `terraform_remote_state`; repeats nothing.

```
kubernetes_namespace_v1        denna, gitea
kubernetes_service_account_v1  plattform (IRSA), drift, runner
kubernetes_deployment_v1       plattform, orkester, web
kubernetes_service_v1          plattform, orkester, web
kubernetes_horizontal_pod_autoscaler_v2  × 3
kubernetes_pod_disruption_budget_v1      × 3
kubernetes_ingress_v1          denna, gitea
kubernetes_network_policy_v1   neka_allt_in, tjanster_in, dns_ut,
                               plattform_ut, orkester_ut, web_ut
kubernetes_manifest            hemlighetskalla, hemligheter (External Secrets)
helm_release                   lastbalanserare (ALB), external_secrets,
                               cloudwatch, metrics, gitea
aws_route53_record             denna
```

`karta.tf` (117 lines) produces a readable map of the whole operational picture:
`terraform output karta`.

### 12.3 Git and CI — fully self-hosted

An explicit product decision: **no GitHub in the operational path.** Gitea +
Actions runners run on our own EKS. `.gitea/workflows/felsokning.yml`:

| Job | Contents |
|---|---|
| `test-och-bygg` | `vitest run`, `typkontroll`, eslint, `vite build` |
| `tjanster` | eslint on the services, **integration test against real Postgres**, `swagger-cli validate` |
| `terraform` | `fmt -check -recursive`, `init -backend=false`, `validate` |
| `publicera` | Only on `main`, only if the above passed. Builds three images, tags with the commit SHA, pushes to our own ECR. **OIDC, no static key** |
| `driftsatt` | **Manual** (`workflow_dispatch`) with an explicit image tag |

Deployment is a separate step by design: *an image in the registry is not the
same thing as an image that is running.* Rollback = run again with the previous
tag.

The client's API address is baked in at build time (Vite), so the image is
environment-bound. The build context for the services is `felsokning/services`
so that both reach the shared observability module without duplicating it.

---

## 13. Testing

**120 vitest tests** across 13 files:

| File | Count | Locks |
|---|---|---|
| `ecm.test.ts` | 32 | Evidence levels, rule packs, quality gate, pre-diagnostics |
| `metodiker.test.ts` | 14 | Library structure, methodology selection, catalogue parity with the orchestrator |
| `projektioner.test.ts` | 13 | Views as pure functions, next step |
| `ai.test.ts` | 11 | Orchestrator parity, OpenAPI ↔ server, append-only, prompt rules |
| `observation.test.ts` | 10 | Tracing, EMF format, **forbidden dimensions** |
| `bilagor.test.ts` | 9 | Content hash, SigV4, storage-layer selection |
| `delning.test.ts` | 7 | The allowlist covers every event type |
| `integrationer.test.ts` | 7 | Vendor lookups, SSRF guard |
| `demo.test.ts` | 4 | The demo case is rich enough to show |
| `installningar.test.ts` | 4 | Organisation settings |
| `streckkod.test.ts` | 4 | VIN/barcode |
| `synk.test.ts` | 4 | Conflict-free merging |
| `example.test.ts` | 1 | — |

**Beyond the unit tests:**

- `integrationstest.sh` — the whole flow against **real Postgres**:
  organisations, roles, the append-only trigger, isolation, sharing,
  attachments.
- SigV4 **cross-verified bit-for-bit against botocore**
  (`sigv4-referens.json`).
- `swagger-cli validate` on the OpenAPI spec.
- Parity tests comparing spec ↔ server, client ↔ orchestrator (× 2 copies),
  domain model ↔ sharing list.

### 13.1 The verification loop before every commit

```
npx vitest run                    # 120 tests
npm run typkontroll               # tsc --noEmit  (vite build does NOT typecheck)
npx eslint src/felsokning src/pages/felsokning
cd ../services && npx eslint .
npm run build
terraform fmt -check -recursive
# root CI: lint · format:check · typecheck · test
```

`typkontroll` was added after two latent crashes (`TextFalt` and
`UNDANTAGSORSAKER` used without import) got past `vite build` — which
transpiles but does not typecheck.

---

## 14. Repository structure

`main` is an npm-workspaces monorepo called **Semantika** which owns the root.
When the two products were merged, both were kept, with the toolchains **kept
separate per tree** — not by weakening anyone's rules.

```
/                             Semantika (workspaces root)
├── apps/mobile/              Semantika
├── services/api/             Semantika
├── infra/                    Semantika
├── .github/workflows/ci.yml  Semantika  — untouched
│
├── .gitea/workflows/felsokning.yml      Guidad Felsökning (self-hosted CI)
└── felsokning/
    ├── app/                  client (own package.json, eslint, vitest, tsconfig)
    ├── services/
    │   ├── plattform/
    │   ├── ai-orkester/
    │   └── gemensam/         observation.mjs (shared)
    ├── infra/
    │   ├── aws/              the base, 91 resources
    │   ├── terraform/        the workload, 35 resources
    │   └── postgres-init.sql
    ├── docs/
    └── supabase/             migrations + edge function (older path)
```

**Two operational paths exist in parallel:** the self-hosted AWS stack (the one
that counts) and an older Supabase-based one (the edge function
`felsokning-ai`, migrations). The orchestrator therefore exists in **two
copies**, kept in sync by tests.

---

## 15. Documentation in the repository

```
docs/VISION.md                          the product vision
docs/MASTER-PROMPT.md                   the founding instruction
docs/MVP.md                             what is built, feature by feature
docs/DEMO.md                            demo script for presentations
docs/DRIFT.md                           operations
docs/SYSTEM-DESCRIPTION.md              this document — the canonical version
docs/SYSTEM-DESCRIPTION.sv.md           Swedish
docs/SYSTEM-DESCRIPTION.de.md           German
docs/SYSTEM-DESCRIPTION.da.md           Danish
docs/SYSTEM-DESCRIPTION.no.md           Norwegian (Bokmål)
docs/exempel/vibration-vid-88-km-h.md   worked example
docs/moduler/                           eight module documents
```

---

## 16. Design decisions and their motives

Collected because the motive is often more important than the decision.

| Decision | Motive |
|---|---|
| Event sourcing | The record has to hold up in a dispute. The history *is* the value |
| Append-only in the database too | The application layer can be bypassed; the trigger cannot |
| Allowlist for sharing | A forgotten event type becomes internal, not leaked |
| Fixed cause categories | Free text cannot be aggregated; fleet statistics are an asset |
| Server-owned model routing | The client must never hold the key, and routing must change without a release |
| Model logged per response | The record must be auditable after the fact |
| Avoid the word "AI" | The customer hears "guess"; the assessor weights it lower |
| Visual-first | One integration per workshop system = one sales cycle per customer. The camera works immediately |
| Vendors as data | A new brand should not require a release |
| Own observability, zero dependencies | 30 packages to measure 4 things is the wrong trade |
| Few EMF dimensions | Every combination is a paid time series |
| p95 in the alarm, not the mean | The mean hides that every twentieth technician waits |
| Alarm on *missing* backup data | A backup you believe exists is worse than none |
| Split build/operate roles | A compromised build must not be able to touch the cluster |
| Manual deployment | An image in the registry ≠ an image that is running |
| Immutable ECR tags | A tag must mean the same thing tomorrow |
| Content-addressed attachments | A swapped image must be detected, not assumed |
| Hash verification on read | Hashing on write is not enough |
| The S3 role may not delete | Append-only must apply to storage too |
| Engine separated from content | The library grows; the engine should not have to change |
| Scored methodology selection | Regex chains become opaque at 16 alternatives |
| Keywords as stems | Swedish inflection drops an `e` — otherwise nothing matches |
| `generisk` as fallback | An honest "we don't know" beats a guess |
| Safety step first in high voltage | That work can kill |
| Swedish in the code | The domain is Swedish; translating back and forth loses precision |

---

## 17. Known limitations and open items

Explicitly not finished:

- **Two orchestrator copies** (Supabase edge function + K8s service) are kept in
  sync by tests, not by shared code. The Supabase path is the older one and
  should be retired.
- **`ArendeSida.tsx` is 2433 lines.** It works, but it is the file that costs
  the most to change.
- **`terraform validate` cannot be run locally** in the development environment
  (the outbound network policy blocks provider downloads). Replaced by
  `terraform fmt` plus a bespoke static reference check; real validation happens
  in CI.
- **The Claude key is filled in by hand** after the first `apply` — it is not in
  Terraform state, by design.
- **`postgres-init.sql` is run manually** against the database after the base
  `apply`.
- **No automatic restore test of the backup.** The alarm says backup *happens*,
  not that it *can be restored*.
- **The methodology library does not cover everything** — and does not claim to.
  `generisk` is the safety net.
- The root eslint has 20 pre-existing errors in Semantika's own pages
  (`no-explicit-any`) unrelated to Guidad Felsökning.

---

## 18. Glossary

The left column is the term as it appears in code and UI.

| Swedish | English |
|---|---|
| Ärende | Case — one diagnostic job |
| Händelse / loggpost | Event / log entry — atomic entry in the append-only log |
| Metodik | Methodology — structured diagnostic flow |
| Steg | Step — phase in a methodology (symptom, visual, measurements …) |
| Kontroll | Check — individual checklist item with a minimum requirement |
| Krav | Requirement — `matvarde` / `kommentar` / `foto` |
| Undantag | Exemption — documented reason a check was skipped |
| Brief | Brief — compiled case picture; a projection |
| Kvalitetsgrind | Quality gate — rule set that must be passed before closing |
| Evidensnivå | Evidence level — E0–E6, the probative value of the record |
| Reproducering | Reproduction — symptom verification: yes / partly / no |
| Felorsak | Root cause — structured analysis with category and supporting evidence |
| Delning | Share — external link with a permission level |
| Orkester | Orchestrator — the service that owns model routing |
| Spann / spår | Span / trace — timing and W3C tracing respectively |
| Bilaga | Attachment — content-addressed photo/video/document |
| Tekniker | Technician |
| Arbetsledare | Supervisor / foreman |
| Fordon | Vehicle |
| Mätvärde | Measured value |
| Felbeskrivning | Fault description (the customer's words) |
| Arbetsorder | Work order |
| Mätarställning | Odometer reading |
| Överlämning | Handover |
| Åtgärd | Repair / action |
| Kundbeslut | Customer decision |
| Säkerhet | Safety |
| Högvolt | High voltage |
