# Supplier quality audit — ALVA · Revision 2

> **Framing.** This review was performed at the request of the product owner,
> applying the lens an OEM quality and supplier-assurance function would use
> (Volkswagen AG named as the reference customer). It is an internal engineering
> review authored by the development team — **not** an audit conducted by,
> commissioned by, or endorsed by Volkswagen AG, and it carries no external
> standing.
>
> Scope: commits `031d6d5..45967d0` (15 commits), branch
> `claude/guidad-felsokning-vision-1mnx7f`. This revision covers what was built
> after Revision 1 closed: the ALVA method and design system, the closing
> statement (ALVA-RULE-200), operational metrics (ALVA-REP-0100), the derived
> case summary (ALVA-PROC-0030), and the integration interface
> (ALVA-SPEC-020/021).
>
> Basis: source code, not documentation claims. Every finding below was
> reproduced against the running system or the shared modules. Where a finding
> could not be reproduced, it is not reported.

---

## Summary

Revision 1 found that the central product claim did not hold at the API
boundary. That was fixed properly: the gate moved server-side, provenance now
comes from the verified session, and erasure is real. Those closures still hold
under this review.

What has been added since is, in substance, stronger than what was audited last
time. The closing statement (ALVA-RULE-200) is the first control this reviewer
has seen in workshop tooling that requires a technician to state *why the
conclusion follows from the evidence* — the exact line that is missing from
every workshop record in service today, and the one an assessor actually needs.
The decision to derive the case summary from the log rather than generate it,
and the decision to exclude throughput metrics on the grounds that they reward
skipping checks, are both judgement calls that cost the product something and
were made correctly.

**The finding that decides this revision is different in kind from Revision 1.**
Nothing is broken at the boundary. Instead, two of the guarantees that Revision 1
recorded as closed — erasure (C-3) and the sharing boundary (M-3) — rest on an
assumption that does not hold: that the event schema is closed. It is not. The
validator checks that required fields are present; it accepts and persists any
additional field. Personal data attached to an ordinary event is therefore
stored in clear, survives crypto-shredding, and is served through customer share
links.

A secondary finding is organisational rather than technical. The defect class
Revision 1 closed as C-2 — the client permitting what the server forbids — has
recurred twice since, and neither instance was caught by the test suite. Both
were found by driving ten cases through the interface end to end. A rule
expressed twice will drift; the question is not whether it drifts but how it is
detected.

| Severity | Count | Meaning |
| --- | --- | --- |
| Critical | 1 | Blocks supplier approval. Must be closed before any pilot with customer data. |
| Major | 3 | Blocks series deployment. Closable within one release cycle. |
| Minor | 3 | Track and schedule. |

Revision 1's open items (processor agreement and DPIA under C-4, retiring the
Supabase orchestrator under m-4, manual accessibility review under m-6) remain
open and are not restated as new findings.

---

## Critical findings

### C-5 · The event schema is open; erasure and sharing assume it is closed

`services/gemensam/handelser.mjs:92–105`

```js
for (const [nyckel, regel] of Object.entries(schema)) {
  const fel = fältFel(handelse.typ, nyckel, regel, handelse[nyckel]);
  if (fel) return fel;
}
return null;
```

The validator iterates the *schema's* keys and checks the event supplies them.
It never iterates the *event's* keys. Any field not named in the schema passes
through untouched and is persisted verbatim.

Reproduced against the shared modules with an ordinary technician's claims:

```
input   { typ: "observation", text: "Kontroll av bromsok.",
          vin: "YV1DZ8256F2123456", personnummer: "19800101-1234",
          kund_telefon: "070-1234567" }

granskaHändelse()   → null            (accepted)
tillPost()          → no error
stored as           { typ, text, vin, personnummer, kund_telefon, anvandarId }
skyddaHändelse()    → unchanged       (all three fields still in clear)
```

Three separate guarantees fail on this one fact:

**Erasure does not reach it.** `skyddaHändelse` encrypts a fixed list of field
*names* on three event types (`personuppgifter.mjs:35–46`). A registration
number carried on an `observation` is not in that list, is never encrypted, and
therefore survives the destruction of the case key. The record of a Article 17
erasure will state that the subject was erased. For this data it will be wrong.

**The sharing boundary does not filter it.** The customer share filter is
type-level, not field-level (`server.mjs:822–829`): allowed types are returned
as whole JSON objects. `observation` is in `DELBART_KUND`. Injected fields are
therefore served to anyone holding the share link.

**The access log does not show it.** Reads are logged per case, so the presence
of undeclared personal data in a case is invisible to the supervisor reviewing
access.

A complication that must be understood before fixing this: **the openness is
currently load-bearing.** The protocol ingest path (`ALVA-SPEC-020`) attaches a
`kalla` field to every event it derives, and `kalla` is not in the schema. The
integration feature works *because* the schema is open. Closing the schema
without first declaring `kalla` on `observation` and `matvarde` will silently
break protocol ingest — and, given M-8 below, break it without saying so.

**Required.** Reject unknown fields at `granskaHändelse`, after declaring the
fields the system itself relies on (`kalla`, and any other provenance field
added since). Add a test that asserts an event carrying an undeclared field is
refused, so this cannot reopen. The rejection must be an error, not a silent
strip: a caller that believes it recorded a value must not be told it succeeded.

---

## Major findings

### M-7 · The client's closing condition drifts from the server's gate

`app/src/pages/felsokning/ArendeSida.tsx` · `services/gemensam/grind.mjs`

Revision 1 closed C-2 by moving the quality gate to the server. That closure
holds — the server is authoritative and returns 409 with the actual blockers.
But the client keeps its own independent expression of the same rule, in order
to enable or disable the close button, and that expression has now drifted from
the gate **twice** since:

| Drift | Server required | Client required | Consequence |
| --- | --- | --- | --- |
| Closing statement | A closing statement (ALVA-RULE-200) | Nothing | A case could be closed on screen with no *why*; refused at sync. |
| Customer decision | `kundbeslut` when work was performed | Nothing | Ten of ten measured cases closed on screen with performed work and no customer approval; all would be refused at sync. |

Both are now fixed, and both are locked by tests that compare the client's
verdict against `grinda()` for the same log. The finding is not the two bugs.
**The finding is that neither was caught by 293 passing tests**, and that both
were found only by driving ten cases of differing character through the
interface end to end.

The failure mode is specific and worth naming, because it is the worst one
available to this product: the technician is told the case is closed, the
vehicle leaves the workshop, and the refusal arrives at sync — when the evidence
that would have satisfied the gate is no longer collectable.

**Required.** The client must not restate the rule. It should call `grinda()`
with the local log and disable the close button when the returned obstacle list
is non-empty, rendering those obstacles as the explanation. The gate already
runs in the browser for other purposes and the module is shared, so this is a
simplification, not new machinery. Until that refactor lands, every condition
added to the gate must be added to the drift test in the same commit.

### M-8 · Protocol ingest loses events silently

`services/plattform/server.mjs:1451–1482`

```js
for (const [i, h] of handelser.entries()) {
  const { post, fel } = tillPost({ id: `prot-${Date.now()}-${i}`, handelse: h }, anspr);
  if (fel) continue;
  ...
  await pool.query(`insert into ... on conflict (id) do nothing`, ...);
  skrivna += 1;
}
return svara(res, 200, { handelser: skrivna, kalla });
```

Three defects on one path, all of which discard evidence without saying so:

1. **Validation failures are swallowed.** `if (fel) continue` drops the event
   and reports nothing. A diagnostic tool that uploads twelve readings and has
   five rejected receives `200 OK` and a count. It cannot learn which five, or
   why. For an evidence system this is the wrong direction of failure.

2. **Event ids collide under concurrency.** `prot-${Date.now()}-${i}` is unique
   only within one request in one millisecond. Two uploads to the same case in
   the same millisecond produce identical ids, and `on conflict (id) do nothing`
   discards the second silently — while `skrivna` still counts it. This
   reintroduces exactly the defect class Revision 1 closed as m-2, on a new path
   and without m-2's collision counter.

3. **No transaction.** The loop writes row by row. A failure at row 8 of 12
   leaves eight rows committed, throws, and returns 500. The case now contains a
   partially imported protocol with nothing marking it as partial.

**Required.** Return per-event outcomes (accepted / rejected with reason), not a
count. Derive ids from the content or a UUID rather than the clock. Wrap the
import in a transaction so a protocol is imported whole or not at all.

### M-9 · Generated webhook secrets are unreachable

`services/plattform/server.mjs:1410–1414`

```js
[anspr.org, namn.trim(), url, kryptera(String(hemlighet ?? nyKod(32))), handelser]
...
return svara(res, 200, { id: rad.rows[0].id });
```

When an administrator creates a subscription without supplying a secret, the
server generates one, encrypts it, stores it — and returns only the id. The
secret is never disclosed, and the `GET` handler deliberately does not select
it. There is no path by which the administrator can ever learn it.

Deliveries to that subscription will be signed with a secret the receiving
system cannot possess, so `verifieraLeverans` can never succeed. The receiver's
only options are to ignore the signature or to reject every delivery. The first
is the likely outcome, which quietly converts a signed channel into an unsigned
one — the opposite of the control's purpose.

**Required.** Return the generated secret once, at creation, and say plainly
that it will not be shown again. Alternatively require the administrator to
supply one. Either is defensible; generating a secret nobody can hold is not.

---

## Minor findings

### m-8 · Profile paths are unrestricted property lookups

`services/gemensam/integration.mjs:154`

```js
const plocka = (objekt, vag) => String(vag ?? "").split(".").reduce((o, n) => o?.[n], objekt);
```

The path comes from the caller-supplied profile and is walked without
restriction, so `__proto__`, `constructor` and `constructor.prototype` are
reachable. The traversal is read-only and the values are stringified into event
text, so this is not prototype pollution and not a privilege boundary — but it
is an unnecessary degree of freedom on a path that accepts external input.
Restrict lookups to own enumerable properties.

### m-9 · The ALVA portal presents a mock with the authority of the product

`app/src/pages/alva/LoggaIn.tsx:22–31` · `app/src/pages/alva/Portal.tsx`

The login validates that two fields are non-empty and then navigates to the
portal. Nothing is authenticated. The dashboard renders a hardcoded
organisation (`ALVA-ORG-0142`) and static figures; the only portal view backed
by real data is Analysis.

No data leaks — the portal holds none. The finding is one of representation.
The Integration page states, correctly and unusually, that a profile is marked
`validated` only after it has been run against the vendor, on the stated grounds
that *"an integration list where everything looks finished is the fastest route
to a failed rollout, because the workshop plans around it."* That principle is
not applied to the portal itself, which is presented in the same finished visual
language as the working system.

**Required.** Mark the portal's unbacked views with the same maturity language
the product already uses for integration profiles, or gate the route behind the
real platform session.

### m-10 · A verified measurement check now appears twice in the report

`app/src/pages/felsokning/ArendeSida.tsx` (KontrollKort) ·
`app/src/felsokning/projektioner.ts:157–164`

A check whose requirement is `matvarde` now writes both a `matvarde` event and
a `kontroll_utford` event carrying the same value. This was a deliberate fix in
this cycle — 56 of the 153 checks in the methodology library required a
measurement and produced no measurement evidence, so root-cause analysis refused
"Mätresultat" as a source immediately after the technician had entered the
figure the check demanded.

The fix is correct, and the evidence profile does not double count (it takes the
strongest source per case). But the generated report now lists the value twice:
once under *Observationer*, via `matvarde`, and once under *Utförda kontroller*,
via the check's `resultat`. Harmless, and visible to any reader of a report.

**Required.** Suppress the `matvarde` entry in `observationer()` when it
originates from a check that already reports its result, or stop copying the
value into `kontroll_utford.resultat`.

---

## Confirmed strengths

Stated because an audit that lists only defects gives a false picture of the
product, and because two of these are unusual enough to be worth defending in
future review.

**ALVA-RULE-200 is a genuine control, not a required field.** Four questions
with four different readers, live validation while writing rather than refusal
after, a catalogue of non-answers (`klart`, `ok`, `åtgärdat`, `trasig`, `enligt
kund`), a requirement that the text carry a causal relation or cite concrete
evidence — and a rule that a hypothesis recorded during the case and not adopted
as the conclusion must be answered. The last one is the difference between a
diagnosis and a guess that happened to be right, which is precisely what an
assessor is trying to establish. The honest path — *cause could not be
established* — is accepted, and still requires a why.

**The case summary is derived, not generated.** Five sentences assembled from
the log in a fixed order and grammar. It cannot contradict the record, it is
identical every time it is rendered, and it works with no model and no network.
Where a sentence has no basis it reports the gap and marks itself incomplete
rather than omitting it quietly. A generated summary would have to be re-checked
against the log on every reading, which would make it not a shortcut.

**Speed metrics are excluded on principle.** The log holds the timestamps, so
throughput is measurable; it is not published, on the stated grounds that any
metric whose fastest route to a better number is doing less of the method
rewards skipping checks. Rework is attributed to the object rather than the
technician, for the same reason. This is the single most consequential design
decision in the reporting layer and it was made correctly.

**Integration maturity is stated honestly.** Profiles are marked `draft` until
run against the vendor's actual interface, and the interface says so in plain
sight rather than in a footnote. No invented vendor endpoints were shipped.

**The safety interlocks hold.** Verified independently: answering *No* to the
high-voltage authorisation question stops the methodology with an explicit
hand-over instruction and disables closing. Silence is still not a yes.

**The system refused a false evidence claim during testing.** When the test
harness asserted "Mätresultat" as the basis for a root cause in a methodology
that contains no measurement checks, the analysis panel rejected it. That is the
rule doing its job against an automated caller that had no intention of lying.

---

## What this revision changes about how the product should be tested

Three defects in this cycle (M-7's two instances and the measurement-evidence
gap behind m-10) were found by driving ten cases of differing character through
the real interface and counting every interaction. None were found by the unit
suite, which passed throughout.

The reason is structural. The unit tests verify the modules; the defects lived
in the *agreement* between modules, and in one case in the agreement between the
client and the server. That agreement is only exercised by completing a case.

**Recommended.** Promote the measurement harness to a checked-in test that runs
a representative set of methodologies end to end and asserts two things: that
every case reaches a closed state, and that the interaction count per case stays
within a stated budget. The second matters commercially — a diagnostic tool that
silently grows from 65 interactions to 90 will be abandoned in the bay long
before anyone files a defect report.

Reference measurement from this cycle, ten cases, corrected build:

| | Interactions |
| --- | --- |
| Minimum (Läckage, 9 methodology steps) | 57 |
| Median | 65.5 |
| Maximum (Vibration, 20 methodology steps) | 76 |
| Fixed cost independent of methodology | 52 ± 4 |

Ten of ten reached a closed state, and the methodology was selected correctly
from the customer's complaint text in all ten.

---

## Recommended sequence

1. **C-5.** Declare `kalla`, then close the schema and add the rejection test.
   Nothing else in this list matters if personal data can still be attached to
   an ordinary event and survive erasure.
2. **M-8.** Per-event outcomes, content-derived ids, one transaction. Do this
   before any vendor is given the ingest endpoint, not after.
3. **M-9.** Return the secret once at creation.
4. **M-7.** Refactor the client to call `grinda()` rather than restate it.
   Until then, gate additions to the gate on the drift test.
5. **m-8, m-9, m-10.** Schedule normally.

---

## Closing assessment

Revision 1 asked whether the product's records would hold up in a dispute, and
found that they would not, because the boundary did not enforce what the
documentation claimed. That is fixed.

Revision 2 asks a narrower question: whether the guarantees now claimed are
actually guaranteed. Three of them are — provenance, the server-side gate, and
the safety interlocks were re-verified and hold. One is not: erasure is
guaranteed only for data that arrives in the shape the schema anticipates, and
nothing enforces that shape.

The product's own stated standard is the right one to judge it by. It refuses to
mark an integration profile `validated` before it has been run against the
vendor, on the grounds that a list where everything looks finished is worse than
an honest one. The same standard applied to C-3 says: erasure is `tested`, not
`validated`, until the schema is closed.

Subject to C-5 and M-8, and to the two documents still outstanding from
Revision 1, this product would pass supplier assessment for a pilot with
customer data. The engineering judgement on display in the closing statement and
the metrics selection is, in this reviewer's experience, ahead of the segment.

---

## Remediation status

Recorded after the fixes were implemented. Each entry states what was actually
changed, so a re-audit can verify rather than take it on trust.

| # | Status | What changed |
| --- | --- | --- |
| **C-5** | ✅ Closed | `granskaHändelse` now iterates the *event's* keys as well as the schema's and rejects anything undeclared. `VALFRIA_FÄLT` declares every optional field per type, including `kalla` — the provenance field the protocol path depends on, which previously worked only because the schema was open. The rejection is hard, not a silent strip: a caller that believes it stored a value is never told it succeeded. Two structural tests lock the declaration against the domain model in both directions, so neither a new optional field in the model nor a stale declaration can drift. Verified against real traffic: all 41 events produced by driving a case through the interface pass the closed schema. |
| **M-7** | ✅ Closed | The client no longer restates the rule. It calls `grinda()` with the local log and disables closing when the obstacle list is non-empty, rendering the gate's own obstacles as the explanation. The old test — which required the client to enumerate the gate's conditions — was inverted: it now requires the client to have no opinion of its own, because an expression cannot drift from itself. **This immediately exposed a real gate defect** (see below). |
| **M-8** | ✅ Closed | Per-event outcomes replace the count: rejected events are returned with index, type and reason, and a partial import answers `207`, not `200`. Ids derive from a SHA-256 of case, source, index and content, which removes the millisecond collision and makes re-uploading the same protocol idempotent rather than duplicating. The whole import runs in one transaction. |
| **M-9** | ✅ Closed | A generated secret is returned once at creation with an explicit note that it will not be shown again. A caller-supplied secret is still never echoed. |
| **m-8** | ✅ Closed | Profile path lookups are restricted to own enumerable properties, so `__proto__` and `constructor.prototype` are unreachable from an external profile. |
| **m-9** | ◐ Open | The portal remains a presentation shell with an authenticating-looking login. Deliberately deferred: the honest fix is to gate the route behind the real platform session, which is a product decision about what the portal is for. |
| **m-10** | ✅ Closed | `observationer()` suppresses a `matvarde` whose description and value already appear as a check result, so a measurement taken through the methodology is reported once. |

### The defect M-7 uncovered

Removing the client's independent condition did what the finding predicted it
would: it made the server's actual answer visible, and the server's answer was
wrong.

`grinda` required a text result on **every** methodology check — including
checks whose requirement is `foto`, whose evidence is the photograph, and whose
text field the interface explicitly labels *"Observation (valfritt)"*. The gate
therefore refused to close nearly every real case, because most methodologies
contain photo checks and most technicians leave an optional field empty.

This had been true since the gate moved server-side. It was invisible for one
reason only: the client had its own, weaker condition, so the close button lit
up and the refusal would have arrived at sync. It is the exact failure mode M-7
describes, and it was found within minutes of removing the duplicate rule.

The gate now grades evidence by the check's own requirement: a photo check is
satisfied by a photograph, a measurement or comment check by a result. Three
tests lock the distinction, including the negative case — remove the photos and
it still blocks.

### What remains

| From | Item | Why it is still open |
| --- | --- | --- |
| Rev 1 · C-4 | Processor agreement and transfer impact assessment | Documents to be written and signed, not code. |
| Rev 1 · m-4 | Retiring the Supabase orchestrator | A deployment decision belonging to the product owner. |
| Rev 1 · m-6 | Manual accessibility review | Automated tooling finds malformation, not usability. |
| Rev 2 · m-9 | The portal mock | A product decision about what the portal is for. |

### Re-audit verdict

The finding that decided this revision — C-5 — is closed at the point where it
had to be closed: erasure and the sharing boundary no longer depend on callers
sending only the fields the system anticipated.

The more valuable outcome is M-7. Removing one of two expressions of a rule did
not merely prevent future drift; it revealed that the surviving expression had
been wrong the whole time, in a way that would have refused almost every case at
sync. That is the argument for single-sourcing a rule, made concrete.

Applying the product's own standard: erasure has moved from `tested` to
`validated`. Subject to the four items above, none of which are code, this
product would pass supplier assessment for a pilot with customer data.

---

*ALVA-DOC-0002 · Revision 2 · Internal engineering review*
