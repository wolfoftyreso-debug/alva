# Module: The Evidence Engine (ECM — Evidence & Compliance Matrix)

> Canonical version. Swedish: [evidence-engine.sv.md](evidence-engine.sv.md).
> Code identifiers are Swedish and appear verbatim.

**Version: ECM v2.0** · ECM is its own subsystem — not a table in the database
— and the engine that governs the whole platform: it decides what documentation
is required, when documentation is missing, what level of evidence has been
reached, which rules apply, and whether a case may be closed.
**The system can never write a conclusion that ECM has not approved.**

The rule library is versioned and separate from the application logic
(`src/felsokning/ecm.ts`); the views only call the engine's pure functions.

## The six engines

### 1. Evidence Engine

Catalogues all evidence from the event log. Each evidence entry receives an id,
timestamp, technician, category, evidence level, summary and a **content hash**
— the same entry always yields the same hash, and the append-only log (database
triggers) makes every attempt at alteration impossible.

| Level | Type | Probative value |
| --- | --- | --- |
| E0 | No supporting evidence | 0 % |
| E1 | Technician's observation | Low |
| E2 | Photo | Medium |
| E3 | Video (with sound — for what makes noise or moves) | High |
| E4 | Measured value | High |
| E5 | Diagnostic data / document | Very high |
| E6 | Multiple independent sources | Highest |

### 2. Rule Engine

The documentation requirements: the methodology's `krav` field per check, plus
the automatic rules — *can it be photographed → require a photo; does it make
noise → video with sound; does it move → video; is it measured → a measured
value; does a display show the information → photograph the display; does a
document exist → photograph the document.* The exemption reasons ("supporting
evidence cannot be obtained") live here.

### 3. Compliance Engine

The case type determines which rules apply on top of the methodology. The case
type is chosen in the identity row and logged (`arendetyp_satt`):

| Case type | Additional requirements (v2.0) |
| --- | --- |
| Warranty | Odometer documented · service history checked · claim/warranty number |
| Goodwill | Odometer · service history |
| Insurance | Claim reference · photographic evidence |
| Complaint | History and previous attempts checked |
| Used-vehicle warranty | Odometer |

**The ECM Knowledge Library is implemented**: the rules are declarative data
(requirement type, not code) and are distributed from the platform via
`GET /api/ecm/regler` (`services/plattform/ecm-regler.json` — replaceable in the
cluster via a ConfigMap and the environment variable `ECM_REGLER_FIL`). The
client fetches the pack on page load, caches it, and falls back to its built-in
default pack when offline; broken packs and unknown requirement types are
filtered out. The rule pack's version travels with every traceability package.
New rules — warranty terms per manufacturer, insurers' requirements, consumer
complaint legislation, OEM checkpoints — are added in operations without
rebuilding the application.

### 4. Validation Engine

No claims without support, in three layers: (a) the orchestrator's base prompt —
never "OK / checked / no faults / repaired" without evidence, instead "Evidens
saknas" (evidence missing) plus a request for the right documentation; (b) the
projections — hypotheses can never become confirmed faults; (c) the quality gate
below.

### 5. Completion Engine

The quality gate before the final report and closing — printing is blocked until
every mandatory row is green:

| Check | Requirement |
| --- | --- |
| Vehicle/object identification verified | Mandatory |
| Work order read in | Recommended |
| Vehicle history checked or justified | Mandatory |
| Incoming odometer reading documented | Mandatory |
| Customer's fault description verified | Recommended |
| Customer's decision on the repair proposal | Mandatory when work has been performed |
| Repair documented or justified | Mandatory on closing |
| Quality check performed | Mandatory on closing after a repair |
| Outgoing odometer reading | Mandatory on closing |
| Methodology checks: evidence or documented exemption | Mandatory |
| Photos for photo-requiring checks | Mandatory |
| The case type's compliance requirements | Mandatory |
| Technician's conclusion signed | Automatic on closing |
| Evidence level above E0 | Mandatory |

### 6. Traceability Engine

Every export carries a traceability package: ECM version, case type, evidence
level, gate status per rule id, and all evidence entries with their hashes.
Together with the log, every conclusion can be traced: which image → which
measurement → which technician → which rule → which rule-set version → when.

## Pre-Diagnostic Validation

No diagnosis begins until the basic checks are performed or documented as
justified — the methodology unlocks only afterwards:

1. **Vehicle history** — the system automatically retrieves the organisation's
   earlier cases on the same object (registration/VIN) together with their
   documented root causes (`GET /api/fordon/{identifierare}/historik`; the local
   store when offline) and shows them in the history step. The technician can
   link the **causal chain** to the current case with one tap ("linked to
   earlier case #N — …"), acknowledge the check — or answer No with a mandatory
   reason → quality warning.
2. **Incoming odometer reading** — the instrument cluster is photographed; the
   image interpretation proposes the value and the technician confirms it. The
   photo becomes the official incoming reading.
3. **Customer's fault description verified** — additional symptoms are
   documented as separate observations, never mixed in with the customer's
   description.
4. **Early observations** — traces of previous repair, modifications, damage,
   leakage and so on are documented with a photo or observation, or acknowledged
   as "none further".

The **outgoing odometer reading** is photographed before closing and becomes
mandatory in the gate when the case is closed. The report shows in and out.

## Symptom Verification Protocol (SVP)

A fault is never diagnosed straight from a vague customer description. The chain
is always: **documented → clarified → reproduced, or documented as not
reproducible.**

- The customer's description is recorded verbatim at case start and verified in
  pre-diagnostics; new symptoms become separate observations.
- Clarification happens through the methodology's symptom questions (when /
  where / how / conditions / frequency — the generic methodology carries the
  full SVP question set).
- **Reproduction** (Yes / Partly / No) is documented before closing: Yes
  requires how and under what conditions; Partly requires what could and could
  not be recreated; No requires a justification. The system never writes "fault
  confirmed" without reproduction or other verification — instead: *"The
  customer's description could not be reproduced under the conditions that
  prevailed during the examination."* (also encoded in the orchestrator's base
  prompt).
- The report's chain of evidence always separates: the customer's description →
  verified observation → root-cause analysis → recommended action.

## Root-cause analysis

A case never closes with merely "component defective, replace component". Every
confirmed fault requires four mandatory answers:

1. **Observed deviation** — the quality rule rejects generic phrasing ("broken",
   "defective", "worn", "needs replacing") without explanation.
2. **Most probable cause** — one or more categories (normal wear, material
   fatigue, manufacturing defect, poor maintenance, incorrect previous repair,
   external influence, corrosion, overheating, modification … plus *Unknown
   cause*, which requires a justification).
3. **Supporting evidence** — at least one evidence source, and the source is
   validated against the log: "Photo" is accepted only if a photo actually
   exists.
4. **Confidence level** — high / medium / low; at medium or low, the technician
   must state which further checks would strengthen the assessment.

The close button is blocked until SVP and the root-cause analysis are
documented, and the quality gate makes both mandatory when the case is closed.
The fleet data is already running: the **root-cause statistics** in the
supervisor view (`GET /api/statistik/felorsaker`) aggregate the cause categories
across the organisation — which components fail from wear, which after previous
repairs, which point to a design problem.

## Customer approval before work

The workshop may never carry out proposed work without the customer's decision
being recorded and traceable:

- **The repair proposal** is written in the guide (pre-filled from the
  root-cause analysis's recommended action) with any estimated cost, and is
  **shown to the customer in Live Share** — it is customer-shareable material.
- **The customer's decision** is recorded with an outcome (approved / declined /
  partial), a **channel** (telephone, in person, e-mail, SMS, share link) and a
  justification when declined or partial. The log entry carries who at the
  workshop received the decision and when.
- **The "Document work performed" button is locked** as long as a proposal has
  no decision — and stays locked when the decision is a refusal. The "No work
  performed" path is open and refers to the recorded decision.
- The quality gate requires a recorded decision when work has been performed,
  and flags the conflict *"Work performed despite a declined proposal"* as a
  hard error.

**The customer can answer directly in their share link**
(`POST /api/delad/{kod}/beslut`) — the only writing public route in the entire
API, with six safeguards, each verified in the integration test:

1. Only shares at **customer level** (partner and internal links may never
   answer on the customer's behalf) and never revoked ones.
2. The case's original share code has no recorded level and therefore cannot
   answer either.
3. There must be a repair proposal to answer.
4. **One decision per case** — the answer cannot be changed afterwards (contact
   the workshop instead).
5. Only `godkant` / `avbojt` / `delvis` plus a comment of at most 500
   characters; nothing else can be written to the log by that route.
6. Rate limiting per share code.

The decision is logged as `kundbeslut` with the channel `Delningslänk` (share
link) and the sender "Kund via delningslänk" — the workshop's own entries
(telephone, in person …) work exactly as before.

## The repair phase (Repair & Verification)

The loop opened by symptom verification is closed here — a case cannot be
finished without it being clear what was done and whether it helped:

1. **Repair documented or justified** — either what was actually performed (with
   any parts), or why no work was done (the customer declined, waiting for a
   part, investigation only, quotation submitted, repair at another workshop).
2. **Quality check** — mandatory when a repair has actually been performed: is
   the symptom gone, does it remain wholly or partly, or could it not be
   verified? The outcome is documented together with how the verification was
   carried out (the same conditions under which the symptom was reproduced).

A remaining symptom is never hidden: the gate states in writing that the case
should not be closed as repaired. The close button is blocked until the chain
**symptom verification → root-cause analysis → repair → quality check** is
complete, and the report presents it in its own sections.

## Case identity and vehicle context

The vehicle object is the connecting thread: the identity is recorded **once**
(normally via the work-order scan, which now also reads claim/warranty numbers
and insurance references) and is then reused everywhere:

- **Identity row in the workspace** — work order, claim, insurance reference,
  vehicle, registration, VIN, odometer, responsible technician, plus the case
  type selector.
- **Live Share** — a locked panel at the top with vehicle, references and
  status, derived from the level-filtered record.
- **First page of the final report** — case information and vehicle information,
  automatically.
- **The export** — identity plus traceability package in every JSON.

## Terminology

The product is never described as an "AI app" but as an **evidence-based
diagnostic system** / **intelligent decision support**. In the user interface
and in documents the words used are *the system, the analysis, the assessment,
the interpretation, the image interpretation, the decision support, the rule
engine* — not "AI", unless technically necessary.
