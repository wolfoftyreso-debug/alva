# Guidad Felsökning — MVP

> Canonical version. Swedish: [MVP.sv.md](MVP.sv.md).
> Code identifiers, paths, environment variables and UI labels are Swedish and
> appear verbatim.

The first runnable version of the core of [Master Prompt v2.0](MASTER-PROMPT.md).
Built as a self-contained part of this codebase under `/felsokning`.

## Running it

```sh
npm install
npm run dev        # open http://localhost:8080/felsokning
npm test           # projection, sync and demo tests
npm run typkontroll # tsc --noEmit (vite build does not typecheck)
```

**A single-file preview** (for sharing, say) is built with hash routing —
otherwise it only works when served from the root:

```sh
VITE_HASH_ROUTER=1 npm run build
```

In that mode `/` is Guidad Felsökning rather than the host application's home
page, and the page works from any path.

The complete system description in one document (for review, or for reasoning
about the system outside the repository): [SYSTEM-DESCRIPTION.md](SYSTEM-DESCRIPTION.md)
— also available in [Swedish](SYSTEM-DESCRIPTION.sv.md),
[German](SYSTEM-DESCRIPTION.de.md), [Danish](SYSTEM-DESCRIPTION.da.md) and
[Norwegian](SYSTEM-DESCRIPTION.no.md). Every version keeps the code identifiers
untranslated — the code is Swedish whatever language the document is in.

Demo script for presentations: [DEMO.md](DEMO.md). The **Skapa demoärende**
button on the home page loads a complete vibration case with 1 h 35 min of
history.

## What is included

| Core of the directive | Status in the MVP |
| --- | --- |
| Object identification first | ✅ **QR/barcode reading** (`src/felsokning/streckkod.ts`): the camera stream reads QR, Code 39/128, Data Matrix and PDF417 through the browser's BarcodeDetector. A scanned code is classified before it is used — VIN (17 characters without I/O/Q), Swedish registration number (both series) or serial number — and the identifier is extracted even from QR content such as URLs or `vin=…` fields; free text and bare URLs are rejected. If the browser lacks the API (iOS/Safari, for instance) **the type plate is photographed** instead and the platform's image interpretation reads it — the camera is the interface whatever the device. Manual entry with a confirmation step remains. |
| Guided diagnosis | ✅ A deterministic methodology engine (one question at a time, sixteen methodologies) **plus the Claude orchestra driven by the platform**: the edge function `felsokning-ai` owns the Claude API key (the server secret `ANTHROPIC_API_KEY`) and routes per task — live guidance (Sonnet 5), deep review of the whole record from a button in the brief (Opus 5, high effort), completion of the handover with risks and uncertainties (Sonnet 5) and methodology classification of the fault description (Haiku 4.5). All answers are schema-bound and classified according to the rules, with automatic fallback to Anthropic's recommended reserve model on a declined request; the model that answered is logged in every event. Requires a logged-in user; the answers are internal and are never shared in customer views. In local mode the methodology guides on its own. |
| Work log | ✅ Append-only event log with a timestamp and user on every entry. Nothing is overwritten. |
| Time reporting | ✅ Categories (active diagnosis, waiting, road test …) via category changes in the log; a pause does not count towards total time. An inactivity prompt after 20 minutes without events. |
| Documentation | ✅ Observations, measured values, photos (downscaled), **video with sound** (E3 evidence for what makes noise or moves — a short clip with a mandatory description, a hard size limit, the original file preserved and shown in the log, the report and Live Share), comments and hypotheses. Hypotheses are always marked as unverified and can never be logged as confirmed faults. **Closing is signed automatically** by the technician ("Felsökning avslutad — signerad av …"), reported in the quality gate. |
| Case brief | ✅ Regenerated from the log on every view: checks performed, observations, **not checked**, recommended next step, reliability, total working time. |
| Handover | ✅ "Lämna över arbete" generates a handover report from the brief and logs the handover. |
| Customer report | ✅ A timeline view without internal entries, with images and time distribution. Print/PDF through the browser, with a reminder to review before sharing. |
| Voice input (speech in, text out) | ✅ Push-to-talk via the browser's speech recognition (sv-SE): listens only while actively pressed, a red indicator with a live transcript, the text lands in an editable field and is never sent automatically. The button appears only in browsers with speech support. The production version swaps the engine for the vendor's voice-to-text behind the same interface. |
| Verified checklists | ✅ Every check in the methodology has a minimum requirement (photo, measured value or a short observation). Photo checks are verified with an image; measurements cannot be marked verified without a value. |
| Export | ✅ Versioned JSON export (version = number of events at the time of export, with user and timestamp); the export itself is logged as an event. PDF via printing. CSV and API in the backend phase. |
| Multi-tenancy and roles | ✅ In self-hosted mode: registration creates an organisation plus a system administrator; admins manage users (technician/supervisor/admin) through the UI; all case data is organisation-isolated in the API; role and organisation in the JWT. **Supervisor view** (`/felsokning/oversikt`): all the organisation's cases with status, participating technicians and statistics (in progress/closed/lead time) — derived from the event log; cases can be pulled to the device with conflict-free merging. **Root-cause statistics** (fleet data): the cause categories from all root-cause analyses are aggregated per organisation and shown as a bar overview in the supervisor view. The **responsible technician** per case is derived from the log (creator → handover → reassignment) and the supervisor can reassign ongoing cases — logged as the organisation-internal event `ansvarig_satt`, never visible in customer or partner shares. Integration-tested against real Postgres (isolation, role enforcement, append-only, the supervisor view's permissions and derivations). |
| Backend and sync | ✅ Database schema (`infra/postgres-init.sql`): cases and events, append-only in the database too (no update/delete privileges). A sync layer in the client: conflict-free merging of events by id (tested), pushing local events and pulling colleagues' events every 15 seconds. Without login the app works in local mode; the status is shown in the case header. |
| Methodologies | ✅ **Sixteen**, in `src/felsokning/metodiker.ts`: vibration, brakes, steering/suspension, electrical (the relay example from the vision), starting and charging, engine running, cooling, drivetrain, exhaust and emissions, climate, high voltage (EV/hybrid), fault codes and communication, leakage, abnormal noise, driver assistance (ADAS) — plus generic. The methodology is selected on keywords from the fault description, scored so that the most specific word wins (`traktionsbatteri` beats `batteri`); if nothing matches, generic is selected — structurally complete, an honest "we don't know where to start" rather than a guess, after which the orchestrator's classifier (Haiku 4.5) gets a try. Three rules are locked by tests: every check has a minimum requirement, every methodology begins by verifying the symptom, and where the work can injure someone the safety step comes first — the high-voltage methodology cannot be started without documented absence of voltage, a removed service disconnect and protective equipment. |
| Live Share | ✅ **The sharing boundary is an allowlist**: event types are enumerated per level (customer/partner/internal) instead of being denied one by one, so a new event type is internal until someone actively releases it — locked by a test that requires every type in the domain model to be classified. A read-only live view per case (`/felsokning/dela/:id`): status ✔/🔄/⏳, images, a table of measured values, a timeline, the recommended next step. Updates automatically; internal entries are filtered out. The public share page (`/felsokning/delad/:kod`) reads via `hamta_delat_arende` without login and polls for live updates; "Kopiera delningslänk" is in the report tab. **Permission levels**: revocable share links per level — customer (the customer-shareable material), external partner (also hypotheses, marked unverified), internal (full visibility) — with server-side filtering, managed from the report tab in self-hosted mode. |
| Dashboard | ✅ Per the directive: counters and filters for All/In progress/Done, plus Start new case. |
| Case start via work order | ✅ The primary path when a case is started: photograph the front of the work order — the orchestrator's document interpretation (Claude Sonnet 5, vision) reads customer, vehicle and workshop details regardless of layout and assigns a confidence per field. 🟢 ≥95 % accepted automatically, 🟡 80–95 % flagged for reading, 🔴 <80 % requires active confirmation — the technician reviews only the uncertain fields. Visual review with the document beside the fields (clicking marks the approximate position), then the whole case is created with one tap. The interpretation is logged as an organisation-internal event (`arbetsorder_skannad`) and is never shared in customer or partner views. Manual entry remains as a fallback; in local mode a clearly marked demo interpretation is shown. Logged-in users are never asked for their name — the account already knows. |
| Settings | ✅ The system administrator chooses which object types and identification methods are shown when a case is started (`/felsokning/installningar`). On the platform the choice applies to the whole organisation (stored on the organisation, only admins may change it — verified in the integration test); in local mode the choice applies to the device. Unknown values are filtered out and empty lists fall back to the default. |
| Evidence engine (ECM) | ✅ Its own subsystem with six engines ([modules/evidence-engine.md](modules/evidence-engine.md), `src/felsokning/ecm.ts`, **ECM v2.0**): Evidence (evidence entries with level E0–E6, technician and content hash), Rule (documentation requirements plus the exemption rule with a mandatory reason), Compliance (the case type — warranty/insurance/complaint and others — governs additional requirements), Validation ("Evidens saknas" instead of assumptions, encoded in the orchestrator's base prompt), Completion (a quality gate that blocks the final report) and Traceability (a traceability package with rule version and hash in every export). **The ECM Knowledge Library**: the compliance rules are declarative data served by the platform (`GET /api/ecm/regler`, replaceable via a ConfigMap) — updated in operations without an app change; the client caches them and falls back to its built-in default pack when offline. |
| Pre-diagnostics | ✅ No diagnosis until the basic checks are done or justified: vehicle history — earlier cases on the same vehicle are retrieved automatically with their root causes (from the server when logged in, the local store otherwise) and the causal chain is linked with one tap; Yes/No with a mandatory reason → quality warning, the **incoming odometer reading** (a photo of the instrument cluster, the image interpretation proposes the value), the customer's fault description verified, and early observations handled. Only then does the methodology unlock. The **outgoing odometer reading** is photographed before closing and becomes mandatory in the gate when the case is closed. |
| Symptom verification (SVP) | ✅ The customer's description ≠ a confirmed fault: the description is documented verbatim, clarified through the methodology's symptom questions (the generic methodology carries the when/where/how set) and reproduced — Yes (how and under what conditions), Partly (what could and could not be recreated) or No (mandatory justification). The report's chain of evidence separates the customer's description, verified observation, root-cause analysis and recommended action; the wording "kunde inte reproduceras under de förhållanden som rådde" is used instead of "fault confirmed" (encoded in the orchestrator's base prompt too). |
| Root-cause analysis | ✅ Mandatory before closing: the observed deviation (the quality rule rejects "broken/defective/worn" without explanation), cause categories (including Unknown cause, which requires a justification), at least one evidence source validated against the log, a confidence level (medium/low requires strengthening checks) and a recommended action. The close button is blocked until SVP and root cause exist; the quality gate makes both mandatory on closing. Its own section in the final report. |
| Customer approval | ✅ A repair proposal is given to the customer before work starts (pre-filled from the root-cause analysis, with an estimated cost) and **shown in Live Share** — the customer sees what is proposed. The customer's decision is recorded with an outcome, a channel (telephone/in person/e-mail/SMS/share link) and a justification when declined. The repair button is locked until the decision exists and stays locked on a refusal; the quality gate flags it hard if work was performed despite a declined proposal. **The customer can also answer directly in their share link** — the only writing public route, with six safeguards (customer level only, not revoked, a proposal must exist, one decision per case, limited content, rate limiting), all verified in the integration test. |
| Repair and quality check | ✅ The last link in the workflow: the repair is documented (what was done plus parts) or justified as to why it did not happen (the customer declined, waiting for a part …). If a repair has been performed, a **quality check** is required — symptom gone / remains / partly / could not be verified, with a description of how it was verified under the same conditions the symptom was reproduced. A remaining symptom is flagged in the gate rather than hidden. The close button is blocked until the whole chain symptom verification → root cause → repair → quality check is complete; the report has its own section "Utförd åtgärd och verifiering". |
| Case identity | ✅ The vehicle object as the connecting thread: the identity (work order number, claim/warranty number, insurance reference, registration, VIN, odometer, customer) is recorded once — normally via the work-order scan — and reused in the identity row in the workspace (with the case type selector), the locked panel at the top of Live Share, the first page of the final report (case information plus vehicle information) and the export. |
| Instrument reading (visual-first) | ✅ The camera as a universal interface: `📷 Instrument` in the documentation panel photographs multimeters, diagnostic screens, battery testers and so on — the image interpretation identifies the instrument type and extracts values, units and fault codes with a confidence per value; the technician confirms before anything is logged. The original image is always logged together with the structured measurements — structured data never replaces the original evidence. No integration with diagnostic systems is required. |
| Printing | ✅ The customer report and the Live Share view print black on white; interactive elements are hidden automatically. Printing goes through the ECM quality gate. |
| Brand-specific integrations | ✅ The workshop configures its own OEM/vehicle-data vendors under Settings with its own credentials ([modules/brand-integrations.md](modules/brand-integrations.md)): the credentials are encrypted with AES-256-GCM at rest, always returned masked (`••••3456`) and **all lookups are performed by the server** — vendor keys never reach the browser. Only the system administrator manages them, the integrations are organisation-scoped, and if the encryption key is missing nothing at all is saved (fail closed). Vendors are data, not code: the URL template, authentication type (bearer/header/basic/query) and response mapping are described in `integrationer.json` (ConfigMap-replaceable via `INTEGRATIONER_FIL`) — new brands are added without a rebuild. Every lookup logs its test status, so an expired subscription shows up in settings instead of producing silently empty answers. Verified in the integration test (role enforcement, masking, encryption in the database, organisation isolation, fail closed). |
| Attachments | ✅ Photos, video and instrument images live **outside the event**; the log carries a reference with the content's SHA-256. That strengthens the probative value: the hash sits in the append-only-protected log, so a swapped image can be detected — and the content is checked against the hash every time it is served (409 instead of showing the image). Content-addressed, so the same photo is stored once. Two modes: `databas` (bytea, works everywhere) and `s3` (AWS/MinIO/Ceph) with our own SigV4 signing, cross-verified bit for bit against botocore in the tests. The sharing boundary applies to attachments too — the scanned work order is never reachable through the customer link. Older events with an embedded data URL keep working forever, and local mode still embeds so documentation is never lost without a network. |
| Access control | ✅ **Revocation is immediate**: every authenticated call checks that the account is active and that the token version matches, instead of a suspension taking effect when the token expires. The administrator disables and re-enables accounts in the user list (cannot disable themselves, never across the organisation boundary), and anyone can log out on all devices when a phone is lost. **Login rate limiting** lives in the database and therefore holds behind several replicas: 10 attempts per account and 30 per source address within 15 minutes, and the block applies to the account even on a correct password. All limits verified in the integration test. |
| Observability | ✅ **Zero new dependencies**: W3C Trace Context (`traceparent` from the client through the platform to the orchestrator) and CloudWatch EMF — structured JSON on stdout from which CloudWatch extracts metrics, with no agent and no SDK. Every call produces a log line with a **breakdown of the time** per part (database, model call, object storage, vendor lookup), so the question "where did the time go" is answered by one line instead of by guesswork. The route is normalised before it becomes a dimension, and organisation/case/trace never become dimensions — locked by a test, because every unique combination is a time series that costs money. Three alarms on what the technician notices: response time p95, server errors, and the model declining. |
| Operations on AWS | ✅ All our own, no GitHub: **Gitea with its own Actions runners** in the same cluster, **ECR** with immutable tags, **EKS** with nodes without public addresses, **Aurora PostgreSQL** in a subnet layer with no route out, **S3** for attachments and **Secrets Manager** as the source of truth for secrets — mirrored by External Secrets, never visible to Terraform. Access via IRSA where every role is bound to exactly one service account in one namespace; build and operations have separate roles so a compromised build cannot deploy. **Observability**: CloudWatch with Container Insights, a dashboard and four alarms — one of which alarms on *missing* data, because a backup you believe exists is worse than none. |
| Infrastructure as code | ✅ `infra/terraform` is the system's definition ([README](../infra/terraform/README.md)): `karta.tf` describes the whole system once as data — services, ports, routing, secrets per service, data flows and boundaries — and `terraform output karta` prints the same thing in plain text. The namespace is closed with network policies (only ingress→services, platform→postgres, HTTPS out except private networks), Postgres runs with a security context, and secrets can be generated or come from a secrets manager. Two layers in order: `infra/aws` (VPC, EKS, Aurora, S3, ECR, Secrets Manager, Route 53/ACM, CloudWatch) and `infra/terraform` (the workload), where the second reads the first's outputs so nothing is stated twice. The split is not a matter of taste — an apply that both creates a cluster and schedules into it is a known Terraform trap. |
| Open API | ✅ The platform API is documented with OpenAPI 3.0 (`services/plattform/openapi.yaml`) — auth, users, cases/events (append-only), the supervisor overview, public sharing and the orchestrator, with schemas for every event type. The spec is validated mechanically, parity-tested against the server's routes and served live at `GET /api/openapi.yaml`. |

## Architectural principles in the code

- **The event log is the single source of truth.** `src/felsokning/domain.ts`
  defines the event types; entries are only appended.
- **All views are projections.** `src/felsokning/projektioner.ts` — the brief,
  the time distribution, the handover text and the customer report are pure
  functions of the log and can always be regenerated. The tests in
  `src/felsokning/__tests__/` lock this.
- **The methodology engine is deterministic.** `src/felsokning/metodik.ts` is the
  engine (types, methodology selection, derivation of the next step);
  `src/felsokning/metodiker.ts` is the content. The next step is derived from
  what is already documented. The library can grow without the engine changing,
  and the orchestrator's methodology catalogue is compared against the client's
  in a test so the lists cannot drift apart.
- **No conclusion without evidence.** `src/felsokning/ecm.ts` — the rule engine
  (ECM) validates every claim against the event log: completion rules, evidence
  levels and the quality gate. The camera is the integration layer
  (visual-first) — what appears on a screen or an instrument is photographed and
  interpreted rather than integrated.
- **Terminology.** The product is described as an evidence-based diagnostic
  system / intelligent decision support — in the UI and in customer
  communication the words used are *the system / the analysis / the assessment /
  the decision support*, never "AI" unless technically necessary.
- **Our own icons.** `src/felsokning/ikoner.tsx` — simple industrial line icons
  (SVG, stroke in the current text colour) instead of emojis; reliability and
  status levels are shown as colour dots.
- **Industrial workshop UI (ETKA-inspired).** `src/felsokning/ui.tsx` — flat
  light-grey surfaces (#ECECEC/#F7F7F7), sharp edges, deep navy as the primary
  colour, dense typography (11–15 px), rectangular buttons (max 4 px radius),
  toolbar ~44 px. The case page has a classic three-column layout on desktop: a
  navigation tree (views plus the methodology steps' status) on the left, the
  workspace in the middle, a context panel (technical information, reliability,
  technical recommendation) on the right; one column with a tab bar on narrow
  screens.

## Deliberate limitations

- The framework for manufacturer integrations exists (the customer enters their
  own credentials and looks up vehicle details), but the enriched data sets —
  equipment level, recalls, technical service bulletins — are not mapped yet;
  the register needs more response fields and vendor profiles before that is
  meaningful.
