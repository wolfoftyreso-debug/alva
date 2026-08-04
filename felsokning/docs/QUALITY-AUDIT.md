# Supplier quality audit — Guidad Felsökning

> **Framing.** This review was performed at the request of the product owner,
> applying the lens an OEM quality and supplier-assurance function would use
> (Volkswagen AG named as the reference customer). It is an internal engineering
> review authored by the development team — **not** an audit conducted by,
> commissioned by, or endorsed by Volkswagen AG, and it carries no external
> standing.
>
> Scope: commit `031d6d5`, branch `claude/guidad-felsokning-vision-1mnx7f`.
> Basis: source code, not documentation claims. Where the two disagree, the code
> is reported.

---

## Summary

The product is unusually well engineered for its stage. The append-only model,
the allowlist sharing boundary, split IAM roles, immutable image tags and the
refusal to state conclusions without evidence are all above what this reviewer
normally sees in a workshop-tooling supplier.

**However, the central product claim does not hold at the API boundary.** The
documentation states: *"The system can never write a conclusion that ECM has not
approved"* and *"the history is what gives the record its value in a dispute."*
Neither is true as implemented. The quality gate exists only in the browser, and
the two fields that establish evidentiary provenance — **who** did the work and
**when** — are supplied by the client and accepted unverified.

For a tool whose commercial premise is that its records hold up in warranty and
insurance disputes, that is the finding that decides everything else.

| Severity | Count | Meaning |
| --- | --- | --- |
| Critical | 4 | Blocks supplier approval. Must be closed before any pilot with customer data. |
| Major | 6 | Blocks series deployment. Closable within one release cycle. |
| Minor | 7 | Track and schedule. |

---

## Critical findings

### C-1 · Event attribution and timestamps are client-controlled

`services/plattform/server.mjs:1176–1185`

```js
if (typeof post?.id !== "string" || !post.tidpunkt || typeof post.anvandare !== "string" || !post.handelse) {
  return svara(res, 400, { error: "Ogiltig händelse." });
}
await pool.query(
  `insert into felsokning_handelser (id, arende_id, tidpunkt, anvandare, handelse)
   values ($1, $2, $3, $4, $5) on conflict (id) do nothing`,
  [post.id, handelserVag[1], post.tidpunkt, post.anvandare, post.handelse],
);
```

The server checks that `anvandare` is *a string* and that `tidpunkt` is *truthy*.
It does not check that either is true.

Consequences, all reachable with an ordinary technician token and `curl`:

- Work can be attributed to a colleague who was not present.
- Work can be backdated or forward-dated at will. The same field drives the
  billing time distribution shown to the customer.
- The JWT already carries the authenticated identity (`sub`, `namn`). It is
  ignored on this path.

An append-only log whose author and time fields are attacker-controlled is not
an audit trail. It is a signed container for unverified assertions. In a warranty
dispute, opposing counsel needs one sentence to establish that.

**Required:** derive `anvandare` from the verified JWT and reject any
client-supplied value. Set `tidpunkt` server-side; if the client's clock matters
for offline work, accept it as a separate `registrerad_tidpunkt` field and store
the server's receipt time alongside it, so the gap is visible rather than
invisible.

### C-2 · The ECM quality gate is a client-side control only

`app/src/felsokning/ecm.ts:730` · `app/src/pages/felsokning/ArendeSida.tsx:2214`

`grindGodkand()` runs in the browser. The server accepts `arende_avslutat` — and
every other event type — with no reference to the gate.

A case can therefore be closed with zero evidence, no root-cause analysis, no
symptom verification and no customer decision, by posting one event to the API.
The printed report and the traceability package will present that case as
complete.

This directly contradicts the documented control. Every compliance guarantee
built on top of ECM — warranty rule packs, insurance evidence requirements,
the customer-approval interlock — inherits the same weakness.

**Required:** evaluate the gate server-side on `arende_avslutat` and reject the
event when it fails. The client-side gate stays as user guidance; it must not be
the enforcement point. This also means ECM has to run on the server, which
argues for extracting it into `services/gemensam/` alongside the observability
module.

### C-3 · No lawful basis for erasure, retention or data-subject requests

`infra/postgres-init.sql:127–133` · no deletion path in the API

The design is append-only in three layers, deliberately and with good reason.
There is no corresponding mechanism for:

- **GDPR Art. 17 erasure.** Customer names, telephone numbers, e-mail addresses,
  registration numbers and VINs are personal data. VIN in particular is treated
  as personal data by EDPB guidance when it can be linked to a person, which is
  precisely what this system does. There is no path to erase them, and the
  database trigger actively prevents it.
- **Retention limits (Art. 5(1)(e)).** Nothing expires. `inloggningsforsok` is
  cleaned after a day; case data is kept forever by construction.
- **Data-subject access requests.** No export scoped to one person.
- **Pseudonymisation (Art. 32).** Technician names are stored in clear in every
  event.

"Append-only" and "erasure on request" are not irreconcilable, but they must be
reconciled deliberately. The standard resolution is crypto-shredding: store
personal identifiers encrypted with a per-subject key, and erase by destroying
the key. The log stays intact and hash-verifiable; the personal data becomes
unrecoverable. The evidentiary chain survives because what is erased is
identification, not the record of what was checked.

**Required:** a documented retention and erasure design before any deployment
with real customer data, plus a DPIA. This is not a feature request — without it
the product cannot lawfully be sold to an EU workshop.

### C-4 · Third-country transfer of customer and vehicle data is undocumented

`services/ai-orkester/server.mjs` · `docs/OPERATIONS.md`

The work-order scan sends a photograph of the work order — customer name,
address, telephone, e-mail, registration number, VIN — to the Anthropic API. The
guidance and review tasks send the case brief, which contains the same data plus
the fault description.

The operations document states there are "no external service dependencies
beyond the Anthropic API for the model calls." That is technically accurate and
legally the whole issue: it is the one dependency that processes personal data
outside the workshop's control.

Absent from the repository: a data processing agreement reference, a transfer
impact assessment, the processing location, the retention behaviour of the
processor, and whether the customer is informed. There is also no configuration
to run the platform with the model calls disabled for customers who cannot
accept the transfer — the methodology engine would function alone, so this is
achievable.

**Required:** document the processor relationship and the transfer basis; add a
per-organisation setting that disables model calls entirely; state in the
customer-facing report when a model contributed to the record.

---

## Major findings

### M-1 · Measured values carry no instrument identity or calibration status

`app/src/felsokning/ecm.ts:31–39` · `app/src/felsokning/domain.ts`

The evidence hierarchy rates a measured value E4 — "high" — above a photograph.
The `matvarde` event carries `beskrivning`, `varde` and `enhet`. It does not
carry which instrument produced the value, its serial number, or whether that
instrument was within calibration on the date of measurement.

In an OEM warranty audit, an uncalibrated measurement is not evidence of a lower
grade; it is not evidence. A workshop claiming warranty on a measured
out-of-tolerance value must be able to show the instrument was traceable to a
standard. The system currently ranks such a value above a photograph that
actually shows the fault.

**Required:** an instrument register per organisation (designation, serial,
calibration due date) and an instrument reference on `matvarde`. Downgrade a
measurement to E1 when no calibrated instrument is referenced, and say so in the
report rather than silently claiming E4.

### M-2 · High-voltage authorisation is self-attested, ungraded, and non-blocking

`app/src/felsokning/metodiker.ts:577–593`

The safety step asks *"Har du behörighet för arbete på högvoltsystem?"* as a
yes/no question. Three problems, in ascending order of seriousness:

1. **No competence level.** OEM practice distinguishes graded qualifications
   (instructed person / qualified for de-energised work / qualified for work
   under voltage). "Authorised" is not a single thing, and the level determines
   which steps are permissible.
2. **No expiry and no register.** The answer is a checkbox, not a lookup against
   a held qualification with a validity date.
3. **Answering "No" blocks nothing.** `nastaSteg()` advances on any answer. A
   technician who honestly declares they are not qualified is walked into the
   next step of a procedure that can kill them.

The team's own stated rule is that where work can injure someone, the safety step
comes first *and cannot be skipped*. It comes first. It can be skipped.

**Required:** make the safety step a hard interlock — a "No" must stop the
methodology and offer escalation, not advance. Record the competence level and
its validity on the organisation's user record, not as a question.

### M-3 · No server-side event schema validation

`services/plattform/server.mjs:1176`

`post.handelse` is accepted as arbitrary JSON. An unknown or malformed `typ`
enters the append-only log permanently and cannot be corrected, because the log
is append-only. A client bug at one workshop permanently contaminates that
organisation's evidentiary record.

The sharing allowlist fails safe here (an unknown type is not in `DELBART_KUND`,
so it is filtered out), which is good design and limits the blast radius to
internal views.

**Required:** validate `handelse` against the domain schema at the API boundary.
The OpenAPI specification already defines these types; validate against it.

### M-4 · No read audit trail

`services/plattform/server.mjs`

Every write is logged. No read is. There is no record of which technician,
supervisor or administrator viewed which case, nor of who followed a share link.

For personal data this is an Art. 32 gap. For the product's own value
proposition it is a missed opportunity: "the customer opened the share link
three times before approving" is exactly the kind of fact a workshop wants when a
customer later disputes having approved the work.

### M-5 · Backup is monitored but never restore-tested; no RTO/RPO

`infra/aws/50-doman-observation.tf:131–147` · `docs/OPERATIONS.md`

The backup-age alarm is well designed — alarming on missing data rather than a
threshold is a mature choice and the team documented why. But the alarm proves
that backup *occurs*, not that it *restores*. There is no scheduled restore
test, and no stated recovery time or recovery point objective.

The operations document says correctly that a lost event log destroys every
case's probative value and cannot be recreated. That makes an untested restore
the largest single-point risk in the system.

### M-6 · Compliance rules are swappable without approval or integrity control

`services/plattform/server.mjs:34–41`

The ECM rule pack is read from a file replaceable by a ConfigMap. This is a
genuinely good design for operability — new warranty terms without a release.

But the rules govern what the system will accept as a compliant case. Anyone
with namespace write access can change what "compliant" means, with no
signature, no approval record, and no four-eyes control. The pack version is
recorded in the traceability package, which is necessary but not sufficient: a
version number nobody approved proves only that something was loaded.

**Required:** sign the rule pack and verify the signature on load; record who
approved a pack version and when.

---

## Minor findings

| # | Finding | Location |
| --- | --- | --- |
| m-1 | Share code generation has modulo bias — `randomBytes` 0–255 reduced `% 36` makes the first four characters ~14 % more likely. ~82 bits remain, so not exploitable, but it signals the crypto path was not reviewed against a checklist. Use rejection sampling. | `server.mjs:299` |
| m-2 | Event `id` is client-supplied with `on conflict do nothing`. A client can pre-claim an id and silently suppress a later legitimate event. | `server.mjs:1183` |
| m-3 | EXIF stripping (including GPS) happens as a side effect of canvas re-encoding. It is correct, undocumented and untested — a future "preserve original quality" change would silently reintroduce location data into shared photographs. Lock it with a test. | `format.ts:21–25` |
| m-4 | Two orchestrator copies kept in sync by test rather than shared code. Works today; a structural liability. | `ai-orkester/`, `supabase/functions/` |
| m-5 | No SBOM and no dependency scanning in CI, with 53 direct client dependencies. Required under most OEM supplier security baselines. | `.gitea/workflows/` |
| m-6 | No end-to-end tests and no accessibility testing. The UI is designed for gloves, noise and sunlight — commendable — but EN 301 549 conformance is unevidenced. | `app/` |
| m-7 | The model that answered is logged; the prompt version and rule-pack version in force at that moment are not both bound to the response. Two identical cases can receive different guidance with no way to reconstruct why. | `ai-orkester/server.mjs` |

---

## Confirmed strengths

Stated because an audit that lists only faults gives a false picture, and because
these should be protected in any remediation.

- **No write path to the vehicle.** Diagnosis is photograph- and
  observation-based. This keeps the product outside UN R156 scope and removes an
  entire category of safety argumentation. It appears to be a deliberate choice
  and it is the right one.
- **Append-only enforced at the database.** Triggers reject changes even for a
  misconfigured role. The application layer is not the only barrier.
- **Allowlist sharing.** A forgotten event type becomes internal, not leaked.
  The test that requires every domain type to be classified is exactly the right
  control.
- **Content-addressed attachments with hash verification on read.** Serving 409
  on mismatch rather than showing the image is the correct failure mode.
- **Split build and deploy roles; immutable registry tags; IRSA with per-account
  roles; IMDSv2 hop limit 1.** This is a stronger cloud posture than most
  suppliers present at series maturity.
- **`generisk` as an honest fallback.** A system that says "we do not know where
  to start" instead of guessing is a system whose confident statements can be
  trusted. This is a quality property, not a limitation.
- **The alarm on missing backup data.** Reasoning about the failure mode rather
  than the metric.

---

## Recommended sequence

The order matters more than the list. C-1 and C-2 are cheap to fix and everything
else depends on them being true.

**Before any pilot with real data**

1. C-1 — derive `anvandare` and `tidpunkt` server-side. Roughly a day, including
   a migration note that historical rows cannot be re-attributed.
2. C-2 — move ECM to `services/gemensam/` and enforce the gate on
   `arende_avslutat`. Reuses existing pure functions.
3. M-3 — validate events against the OpenAPI schema at the boundary. Same commit
   as C-1.
4. M-2 — make the high-voltage safety step a hard interlock. Small change, and
   the one whose absence could kill someone.

**Before series deployment**

5. C-3 — retention and erasure design (crypto-shredding), plus a DPIA.
6. C-4 — processor documentation and a per-organisation model-off switch.
7. M-1 — instrument register and calibration-aware evidence grading.
8. M-5 — scheduled restore test with a stated RTO/RPO.
9. M-6 — signed rule packs with an approval record.
10. M-4 — read audit trail.

**Continuous**

11. The minor findings, m-1 and m-3 first — both are single-commit changes and
    m-3 protects a property that currently holds only by accident.

---

## Closing assessment

The engineering judgement in this codebase is consistently good, and in several
places better than the standard the product is being measured against here. The
reasoning recorded in the commit history and in the design-decision table is of a
quality that makes an audit unusually easy to conduct — motives are written down,
so it is possible to check whether the implementation matches the intent rather
than merely whether it works.

That is what makes C-1 and C-2 worth stating plainly rather than diplomatically.
They are not oversights of ambition; they are the gap between a system that
*documents* evidence and a system that *guarantees* it. The product is sold on
the second claim. Closing that gap is roughly two days of work, and until it is
closed every other guarantee in the documentation rests on a client that anyone
can bypass with `curl`.

Close C-1 and C-2, and the honest description of this product changes from
"a well-built diagnostic app" to "an evidentiary system". That is a different
market and a different price.
