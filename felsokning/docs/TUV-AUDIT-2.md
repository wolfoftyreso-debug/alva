# Conformity Re-examination · TÜV-style Audit, Round 2

**ALVA 3.3 · 2026-08-06 · ALVA-DOC-0007**

> *Internal engineering review conducted in the style of a certification
> re-examination. Not endorsed by TÜV or any inspection body. The value
> is in the findings, not the letterhead.*

**Scope.** Everything added since the first examination (ALVA-DOC-0003):
the event hash chain, the closing seal, the derived confidence ceiling,
the ten-language catalogue, subscription and invoicing, and the
regression status of findings T-1 through T-12. Method as before: every
claim is exercised against a running system with a real PostgreSQL, not
read off the documentation. A finding without a reproduction is an
opinion.

---

## 1. Follow-up on the first examination

| # | First-round status | Re-examined | Result |
| --- | --- | --- | --- |
| T-1 | Closed | Adversarial-tenant harness in CI, re-run this round | **Holds.** Cross-tenant id occupation answers 409, nothing written. |
| T-2 | Closed | Register lookup on the technician path, re-run | **Holds on the examined path — but see T-14.** The control was enforced at one gate while a second door existed. |
| T-3 | Reduced | Restore drill re-run this round | **Holds, and the drill was extended** — see T-16. Pre-erasure backup + master key still restores data; the erasure promise remains bounded by backup retention and must be stated to data subjects. |
| T-4 | Closed | Nightly key destruction; integration section 17 | **Holds.** Noted with approval: erasure destroys *keys*, not rows, so it cannot collide with the append-only triggers or break the new hash chain. The two mechanisms compose without special cases. |
| T-5 | Closed | `kalla` on model-read values | Holds. |
| T-6 | Closed | Cost parsed from every call site, ≥12 | Holds. |
| T-7 | Closed | Append-only on the data-protection records, non-empty-table proof | Holds. |
| T-8–T-11 | Closed | Spec, rule-package signature, CORS, `exp` | Hold. |
| T-12 | Traded | react-router advisory pair | Unchanged; the carried advisory still does not apply to this build (no RSC, no SSR). |
| Terraform | Open | — | **Still open.** Written, never applied. Unvalidated beyond review. |
| Rev 1 C-4, m-4, m-6 | Open | — | Still open (documents, deployment decision, manual review). |

---

## 2. New findings

### T-13 · Major — The confidence ceiling accepted an expired calibration as traceable

**Observed.** `sakerhetstak` treated any measurement carrying `matdonId`
as traceable. The register lookup (T-2 remediation) derives the
calibration *date* but never records whether the calibration was *valid
when the measurement was received*. Consequence: a measurement taken
with an instrument whose calibration lapsed in 2019 enabled the ceiling
**hög** — while the evidence model itself grades that same measurement
E1, "calibration missing or expired". The system's two judgments of one
fact contradicted each other, and the more permissive one governed the
gate.

**Why the obvious fix is wrong.** Comparing the calibration date against
the clock at gate time would make the gate non-deterministic — the same
log would close on Tuesday and refuse on Wednesday. The gate module's
founding rule is that the same log always yields the same outcome; that
rule is what makes a refusal auditable.

**Remediation.** The fact is frozen when it is still a fact:
`mätdonsFakta` stamps `kalibreradVidMatning` at receipt, from the
register's date against the server's clock *at write time*. The ceiling
requires the stamp to be `true`. The client cannot inject the field —
the server overwrites it unconditionally, the same pattern as the
designation and date.

**Strict toward legacy, deliberately.** A measurement written before the
stamp existed does not count as traceable. Same principle the first
examination established for claimed designations: what cannot be
substantiated does not carry "hög".

**Exercised.** Integration: an instrument calibrated until 2019-01-01 is
accepted (refusing would destroy evidence), stamped `false` even when
the client claimed `true`, and the register's date travels — not the
client's. A currently calibrated instrument stamps `true`. Unit: the
ceiling refuses `hög` for the expired and the unstamped cases.

### T-14 · Major — The supplier protocol path bypassed the instrument register

**Observed.** The T-2 remediation routed the technician's measurement
through the register. The *supplier* path (`POST …/protokoll`) did not:
a provider profile maps `instrumentId` straight into `matdonId`, and the
event entered the log carrying an instrument claim no register ever saw.
T-2, resurfaced through the side door — and after T-13, an unverified
supplier claim would also have fed the confidence ceiling.

**The examiner's note on the pattern:** the control was implemented at
the *gate it was found at*, not at the *resource it protects*. This is
the second occurrence of that pattern in this codebase (the quality gate
itself was once client-only). A control belongs where the data enters,
not where the finding happened to be observed.

**Remediation.** Every protocol measurement now passes `mätdonsFakta`.
The difference from the technician path is deliberate and disclosed: an
unknown instrument is **degraded, not rejected** — a webhook cannot
register the instrument on the spot, and discarding the evidence would
be worse than grading it honestly. The value is kept, the instrument
claims are stripped (grade falls to E1), and the degradation is reported
in the response (`nedgraderade`) instead of happening silently. A known
instrument gets the register's designation, date and validity stamp like
any other measurement.

**Exercised.** Integration: a fabricated `instrumentId` from a supplier
is written without any instrument claim and reported as degraded; a
registered one carries the register's stamp.

### T-15 · Minor — Unsealed operation was visible only as log noise

**Observed.** Without `FORSEGLING_NYCKEL`, the chain is written but no
closing is ever sealed. The only signals were one warning line *per
closing* in the log stream, and `"saknas"` in a verification response
nobody calls until there is a dispute. A misconfigured production would
run unsealed for months and discover it at the worst possible moment.

**Remediation.** The service now warns once at startup — a line at boot
is a decision someone made; a line per closing is noise — and the
environment-variable documentation in the server header describes the
key and the consequence of omitting it. The per-closing warning remains.

### T-16 · Minor — The restore drill predated the chain

**Observed.** The backup/restore drill (first round, T-3 follow-up)
proved that events, provenance, order, attachment hashes, subject keys
and the append-only triggers survive a dump-and-restore. It was written
before the hash chain existed, so it proved nothing about `sekvens`,
`kedjehash`, or the seal — and a backup that loses the chain restores a
log that never verifies again. The drill was green while measuring the
wrong thing, which the first examination twice identified as the most
dangerous kind of green.

**Remediation.** The drill now seeds chained, sealed data and verifies
after restore: links present, order present, seal present, and the
seal's write-once trigger still biting (an attempted re-seal in the
restored database is refused).

---

## 3. Examined without objection

Recorded so that the next examiner knows what was probed, not assumed.

| Area | What was done |
| --- | --- |
| Chain and seal design | Reviewed against the revision-3 findings (prefix semantics, false-alarm analysis). The verification response states what it does and does not prove; the OpenAPI description carries the same text. No objection. |
| Erasure vs. chain | Key destruction leaves rows in place; the chain digests the stored (encrypted) form and verifies after erasure. Composes correctly. |
| Ten-language catalogue | Closed catalogue, per-language completeness locked by test, invariant structure never translated, non-answer word lists unioned across languages. The *procedure text* remains unreviewed by trade specialists in every language including English — honestly labeled in the module header and on the public language page. |
| Numeric round-trip | Chain digests recomputed from stored jsonb, probed with `1e-7` and `0.10000000000000009` (revision 3). |
| Database-owner sabotage | Trigger dropped, row altered, trigger restored — detected and pointed out, inside and outside the sealed prefix. |
| Subscription lockout | Read and export remain available in every state, including locked. Verified in integration. |

---

## 4. Conditions of use

The examiner's view of what must hold before each use, unchanged in
substance from the panel review but now with the audit's authority:

1. **Per-market methodology review.** No procedure text is
   trade-reviewed in any language. The system says so itself; a
   deployment must not remove that notice before the review exists.
2. **Key custody.** `PERSONNYCKEL_HUVUD` and `FORSEGLING_NYCKEL` in a
   secrets manager, never in the database or image. The seal is only as
   external as its key.
3. **Erasure statement.** The backup-retention bound on erasure (T-3)
   must be stated to data subjects. It is not closed; it is bounded.
4. **External anchoring** (RFC 3161 or equivalent) before the seal is
   presented as evidence against a party disputing the server's clock.

---

## 5. Test protocol

| Suite | Result |
| --- | --- |
| Unit | 768 passed |
| Integration (real PostgreSQL) | 213 checks, including both sabotage variants, expired-calibration stamping, supplier degradation, post-close append |
| Restore drill | Extended for chain and seal; passes |
| End-to-end walkthrough | 4/4 cases closed within interaction budget, schema clean |
| Design conformance | 278 checks across the full surface |

## 6. Verdict

The re-examination found no regression in the twelve first-round
findings, and the first round's most important structural claims —
tenant isolation, register-derived traceability, append-only enforcement
— held under re-test. The two Major findings of this round share one
root: **a control enforced at the gate where it was found, rather than
at the resource it protects.** T-13 and T-14 are both that error, and
both are now closed at the resource.

Applying the product's own vocabulary: the confidence ceiling moves from
`claimed` to `validated`; the chain and seal remain `validated` with the
external-anchoring caveat; erasure remains `tested`, bounded by backup
retention, and must continue to be stated as such.

---

*ALVA-DOC-0007 · Internal engineering review · Not endorsed by any inspection body*
