# Technical inspection audit — ALVA, third revision

**ALVA-DOC-0016 · Internal engineering review · Not endorsed by any inspection body**

> **Framing.** Same lens as ALVA-DOC-0003 and ALVA-DOC-0007: the review a
> technical inspection body (TÜV named as the reference) would apply to a system
> whose records are meant to be relied on by third parties — an insurer, a court,
> an OEM warranty function. It is an internal engineering review by the
> development team, carries no external standing, and claims no certification.
> Naming a standard frames a finding; it is not a claim of conformity.
>
> **Scope.** The surfaces added since the second revision: the customer-share
> language layer, the billing module's proportional rework, the diagnosis-flow
> guidance changes, and — most consequentially — the **methodology-change**
> feature (`metodik_byte` / `metodik_vald`), which lets the methodology that
> governs the quality gate change during a case.
>
> **Basis.** Source and the running system. Every finding was reproduced against
> a real Postgres or against the shared modules. Nothing is reported that could
> not be reproduced.

---

## Summary

The characteristic failure this system keeps producing is the one the first two
revisions named: **a control correct inside, unexamined at its boundary.** This
revision found it again, in the feature this session had just added — and the
finding is the sharpest of the three rounds, because it concerns a **safety**
control on a high-voltage vehicle.

The methodology governs which checks the quality gate demands. Making it
changeable mid-case (a genuine need — a mis-selected methodology was a dead end)
opened three boundaries at once: the change was not in the sealed record, the
authoritative server gate ignored it, and — the safety finding — a change to a
weaker methodology **removed the high-voltage safety block**, so an electric
vehicle's case could be closed with no de-energization check at all.

All findings below are closed and exercised by the platform integration suite
against a real Postgres, plus new unit tests.

---

## Critical findings

### T-17 · A methodology change could strip the high-voltage safety block

**Reproduced.** A case opened under `hogvolt`, its safety questions never
answered, with a batch `[metodik_byte → "generisk", …, arende_avslutat]`:
- `metodikId` was validated only as free text — a **non-existent** id passed
  `granskaHändelse`.
- The gate's methodology resolution fell **open** to the weakest methodology on
  an unknown id (`ALLA_METODIKER.find(...) ?? ALLA_METODIKER.at(-1)`, and
  `at(-1)` is `generisk`).
- `generisk` does not own the high-voltage spärror, so `grinda()` returned no
  safety obstacle and the case could close.

This is the T-9 pattern — relaxing requirements — one level up, and the
requirement relaxed is a **life-safety** one: an unverified claim that a
high-voltage system is de-energized can kill.

**Closed at the resource, not the gate** — the root cause the earlier revisions
named:
1. **`metodikId` is validated against the library at the boundary.** An unknown
   id is rejected with `400` at event ingest (`server.mjs`), so it never enters
   the sealed log.
2. **The safety block attaches to the vehicle, not the active methodology.** If
   the case was ever under the owning methodology (a `metodik_vald`/`metodik_byte`
   in the sealed log names it) — or the safety question was ever answered — an
   affirmative answer is required to close, regardless of which methodology is
   active now. Silence still blocks. A case that was never near the methodology
   is untouched, so a genuine mis-selection corrected *before* the safety
   question is answered carries no false block.

### T-18 · The authoritative gate ignored the methodology change (client/server divergence)

**Reproduced.** The server gate (`grindHinder`) resolved the methodology from the
immutable `metodik_id` **column**, ignoring `metodik_byte` entirely, while the
client honoured it. A technician who switched to the *correct* methodology saw
the right guide but was still judged by the server against the *wrong* one — the
mis-selection dead end the change was meant to resolve, reappearing at the
server boundary. And the column is trigger-protected but **not hash-chained**, so
the basis of the gate's strictness was outside the sealed record.

**Closed.** Both the client (`metodikForArende`) and the authoritative server
gate now derive the methodology from the **sealed log** — latest `metodik_byte`,
then the initial `metodik_vald`, then the legacy column. The initial selection is
recorded as a `metodik_vald` event at case creation, so the full methodology
lineage is in the hash chain and provable to an examiner. A verified round-trip
(the chain sweep is type-agnostic and already covers the new types) confirms no
break.

## Major findings — billing

### T-19 · The correction workflow was blocked by its own idempotency index

**Reproduced against Postgres.** The unique period index added earlier
(`fakturor_org_period_unikt`) could not tell a duplicate run from a **legitimate
re-issue after a credit note**: the credited original still occupied the period
slot, so the corrected invoice for the same period was rejected. The module's own
promise — "a credit note that points back, **and a new one**" — could not be
kept for the commonest correction.

**Closed.** The index is dropped. The monthly job's idempotency moves into the
transaction (a conditional advance of `senast_fakturerad` — only one of two
concurrent runs advances; the other rolls back and skips). The manual issuer
path checks in the application layer for an existing **non-credited** invoice for
the exact period, so a re-issue after crediting succeeds and a true duplicate
still answers `409`.

### T-20 · Idempotency was timezone-unstable, and non-existent dates were accepted

**Reproduced.** `nastaPeriod`/`laggTillManad` used local `getDate()`, so a
Jan-31-anchored period ended `2026-02-27` under UTC but `2026-02-28` under US
Pacific — the same real period, two different keys, so two nodes in different
zones could double-invoice. And `granskaPeriod` accepted `2026-02-30`
(`Date.parse` rolls it over instead of rejecting), which then travelled into the
frozen document and the PDF. A Pacific-zone month boundary could also yield a
zero-month **empty** invoice that looked valid.

**Closed.** All period date math is UTC, so the key is timezone-invariant.
`granskaPeriod` now requires the string to round-trip as a real UTC calendar date
and rejects periods shorter than one month.

### T-21 · The invoice PDF hid credited/paid status

**Reproduced.** The PDF endpoint read only the frozen `dokument`, so a fully
**credited** invoice produced a PDF identical to a live one — the party relying
on the paper could not see the claim no longer stood.

**Closed.** The endpoint derives the status from the invoice events and stamps
`CREDITED` / `PAID` on the PDF. `utfardad` needs no stamp.

## Minor findings

| # | Finding | Closure |
| --- | --- | --- |
| T-22 | `/api/abonnemang` exposed the overdue invoice's designation and total to any authenticated user — commercial data the invoice list gates to admins | Non-admins get the state and countdown (which govern whether new cases may open) but not the invoice reference, amount or naming text |
| T-23 | Attachment reads via a share link were not written to the access log — the "who saw a customer's data" promise covered text but not photographs | The attachment path now logs access, org derived from the case, exactly as the JSON read does |

## Examined and holding (no defect)

Reproduced against the running system and found sound:

- **Erasure, chain, blinding at their boundaries.** Nulling the blinded index on
  erasure does not break the chain or the seal (they live in other columns than
  the digested `handelse`). The payer's name and reference, newly folded into
  crypto-shredding, do not break the chain (the T-16 canonical-form fix covers
  them). Gallringen does not over-delete when the blinded index is null — each
  keyless case is its own group via `coalesce(index, id)`. The chain sweep is
  type-agnostic and covers the new event types automatically.
- **Record prevention (T-1 lineage).** No new way to prevent another party's
  record: case creation answers `409` on a foreign id, events are `(arende_id,
  id)`-keyed and org-scoped, the billing idempotency is org-scoped and issuer-
  only, erasure is org-scoped and admin-gated.
- **Sharing boundary.** 33 event types, all classified; `metodik_byte` and
  `metodik_vald` are internal on both client and server, in parity; the filter is
  an allow-list, so an unclassified type fails closed and the closed schema
  rejects an unknown type at write.
- **`?sprak=` on the summary** changes the language, never the substance: facts
  come from the log, the language only selects a catalogue phrase, and the text
  is stable for a given language.

## Residual

Updated after the residual-closing round. Items marked **closed** are done;
the rest name exactly why they cannot close in this environment.

| Item | Status |
| --- | --- |
| External anchoring (RFC 3161) | **Closed.** `services/gemensam/tidsstampel.mjs`: the seal's root is stamped by an independent RFC 3161 TSA after commit; verification confirms the token covers our root and reports the TSA's time as a second, non-us witness. Proven against a real openssl-generated token and a standalone TSA in the integration test. |
| `kalla` from `X-Forwarded-For` | **Closed.** `kallaFor` no longer trusts the header without a configured trusted-proxy count (`BETRODDA_PROXYHOPP`); with N hops it reads the address N steps from the right, else the socket. |
| C-4 (processor agreement) | **Closed as documentation.** `docs/DATASKYDD.md`: processor-agreement obligations and a sub-processor register grounded in the production build. |
| Transfer impact (Anthropic, US) | **Closed as assessment.** `docs/DATASKYDD.md` §4: the one third-country transfer (work-order OCR) is assessed; the remaining product step (make it disableable/masking per org) is named. |
| T-3 transparency | **Closed as documentation.** `docs/DATASKYDD.md` §5: the pre-erasure backup window is stated as part of the erasure promise to data subjects. |
| T-3 (technical, full closure) | **Built, awaiting a live KMS.** The envelope is now a pluggable vault (`services/plattform/nyckelvalv.mjs`): local (unchanged) or a KMS vault with a per-subject key, wired into both erasure paths (`gallra`, `/api/radering`) so destruction schedules the subject's KMS key for deletion before the pointer is removed. The KMS SigV4 signing is proven bit-identical to botocore; the vault's calls are proven against an injected fetcher. Only a real KMS round-trip and lazy key creation remain — unvalidatable in this environment. |
| Terraform | **Open — infra.** The CronJob and secret wiring are written but not applied in this environment; unvalidated beyond review. |
| m-4 (Supabase retirement) | **Closed.** The legacy Supabase path is removed entirely — client integration, the `supabase/` edge functions and migrations, the `@supabase/supabase-js` dependency, and the `VITE_SUPABASE_*` build args. The client now runs plattform-only (or local/device-only without a platform URL); the fragile import-time Supabase client (which crashed the whole app without placeholder env) is gone. Suite green, bundle carries no Supabase reference. |
| ALVA-RULE-210 (new) | **Closed.** The check that *found* something could be a bare text claim: "bushing split, 4 mm play" closed the case and billed the arm with no image of the split. A finding must now be flagged and carry a photo or video **bound to that check** (stegId/kontrollId), and a repair with no flagged finding at all is blocked — otherwise the requirement would be optional. Client, gate and schema move together; e2e closes 4/4 cases under the stricter rule. |
| m-6 (accessibility) | **Closed this round.** Palette contrast measured AA on every pair; `<html lang>` now follows the selected language (WCAG 3.1.1) and voice input follows the UI language. |

## Test protocol

| Suite | Result |
| --- | --- |
| Unit | 949 passed |
| Integration (real PostgreSQL) | all green, including the methodology-bypass block, unknown-id rejection, credit-then-reissue, invalid-date rejection, and the CREDITED PDF stamp |
| End-to-end walkthrough | 4/4 cases closed within budget, schema clean, including the high-voltage case in the new question order |
| Smoke | clean |

## Re-audit verdict

The methodology-change feature was the sharpest boundary this system has crossed
because it put a **safety** control on the moving side of the boundary. It is now
closed at the resource: the safety block belongs to the vehicle, the methodology
lineage is in the sealed record, and the authoritative gate reads it there. The
billing regression this session introduced (the correction lock) is undone, and
the timezone and calendar-date boundaries the second revision's method would have
caught are closed.

Applying the product's own vocabulary: the quality gate's methodology basis moves
to `validated` (provable from the sealed log); erasure stays `tested`, bounded by
backup retention, as before.

---

*ALVA-DOC-0016 · Internal engineering review · Not endorsed by any inspection body*
