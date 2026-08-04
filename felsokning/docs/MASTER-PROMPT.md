# Guidad Felsökning — Master Prompt v2.0

> Canonical version. Swedish: [MASTER-PROMPT.sv.md](MASTER-PROMPT.sv.md).

**Production Ready AI Wrapper Platform (MVP/Beta)**

This is a product directive, not a technical specification. The vision and the
reasoning behind it are in [VISION.md](VISION.md); v1.0 is in the version
history. Detailed module specifications:
[communication model (voice/PTT)](modules/communication-model.md),
[Live Share](modules/live-share.md),
[verified checklists](modules/verified-checklists.md),
[case brief](modules/case-brief.md),
[work log and time tracking](modules/work-log-and-time-tracking.md),
[customer report](modules/customer-report.md).

---

## Project

Build a production-ready SaaS platform named **Guidad Felsökning**.

The platform is a wrapper on top of the Claude API (Anthropic) and works as a
professional tool for mechanics and service technicians.

**The model is operated by the platform, not by the customer.** The Claude API
keys are platform secrets in the backend and are never exposed to customers or
clients — the guidance is part of the service. The backend owns the system
prompt, the model selection and the response schema, so the rules cannot be
circumvented from the client side.

**The model orchestra.** We run several Claude models in our infrastructure and
route per task — the backend owns the routing table, so it can be adjusted
without client changes:

| Task | Model | Rationale |
| --- | --- | --- |
| Guidance (a response to each piece of documentation) | Claude Sonnet 5 | Many calls, latency-sensitive on the workshop floor |
| Review (contradictions and gaps across the whole record) | Claude Opus 5, high effort | The deepest reasoning — quality before latency |
| Handover summary (risks and uncertainties) | Claude Sonnet 5, low effort | Balance |
| Methodology classification of the fault description | Claude Haiku 4.5 | Pure classification — fastest and cheapest |

All tasks share the same base rules (below) and the same classified response
schema. On a declined request the call automatically falls back to Anthropic's
recommended reserve model. The system should not replace technical competence or
the manufacturer's documentation, but guide the user through a structured
diagnostic process, document all work, and create full traceability.

The goal is to launch a stable, simple beta version worth paying for.

---

## Product philosophy

The product should feel like a tool from a major industrial supplier: simple,
stable, extremely fast, professional, predictable, clear, minimal.

No toy. No unnecessary design. No experimental features. Everything should feel
robust.

---

## Roles

### System administrator

Normally one or more people at the customer. Permissions: manage the
organisation, API keys, integrations, create and remove users, roles,
permissions, export, security settings, billing, logs.

### Technician

Can create cases, continue cases, take over cases, write, speak, photograph,
record video, measure, and export reports.

### Supervisor

Can additionally see all cases, reassign cases, follow status, read reports, and
produce statistics.

---

## Multi-tenancy

Each customer is its own tenant with its own users, API keys, integrations,
cases, database logic and security. **No data may be mixed between customers.**

---

## Simple onboarding

The first time a customer logs in:

1. Create the company
2. Add a logo
3. Add users
4. Add any integrations

Done. The whole onboarding should take less than five minutes. The guidance is
part of the service — the customer handles no model keys.

---

## Dashboard

Show only what matters: My cases · In progress · Waiting · Done · Start new
case.

---

## New case

Identify the object by registration number, VIN, machine number, QR code,
barcode, OCR, photo or manual identification. The object is verified before
diagnosis starts.

---

## Guidance

The system works step by step. Not long answers. One check at a time:

> Check fuse F24. → The user answers. → The system moves on.

### Rules

The model may never invent facts, pretend to know, or guess. It must distinguish
**Observation**, **Verified**, **Hypothesis** and **Recommendation**. Every
answer must carry a clear confidence level.

---

## Communication model

**Speech in, text out.** All voice input goes through speech-to-text on a
push-to-talk basis — no background listening, no voice agent, never automatic
sending. The transcription is always editable before it is saved to the work
log. See [the module](modules/communication-model.md) for the full
specification.

---

## Camera support

Photo, video, OCR, image analysis and object identification: tyres, type plates,
serial numbers, labels, components, measuring instruments.

---

## Work log

Everything is logged: time, user, object, comment, photo, video, measured value,
question, answer, result. Nothing may disappear. The log must be audit-proof.

---

## Time reporting

Once the object is identified, the working time starts. After a longer period of
inactivity the system asks for a short description of what was done. The final
report shows the total time distributed across activities (road test, diagnosis,
administration …).

---

## Case brief

The system always maintains a living summary. When another technician opens the
case, it automatically shows: what the customer describes, what has been done,
what has been verified, what remains, the recommended next steps and the total
working time.

---

## Verified checklists

A check item is not complete merely by ticking a box — every check collects
evidence and context (observation, measured value, photo) with minimum
requirements adapted to the type of check. See
[the module](modules/verified-checklists.md).

---

## Collaboration

Several technicians can work at the same time. Everyone sees images, video,
measurements, notes, the generated summary, status and recommendations.

---

## Customer report and Live Share

The customer report is generated automatically (object, fault description,
images, tests, measured values, checks performed, time, recommendation, next
step) and shared as a PDF, a link or via the API. Each case can additionally be
published through a secure, permission-controlled share link that updates in
real time — see [the Live Share module](modules/live-share.md). Every export is
versioned (version, date, time, who, format).

---

## API first

Build the whole system API-first. All resources must be creatable, readable,
updatable, exportable and integrable. Document the APIs with OpenAPI/Swagger.

---

## Integrations

Prepare an integration framework for DMS, ERP, CRM, electronic service books,
time reporting, invoicing, parts systems and manufacturer systems via the
customer's own credentials. A modular integration architecture so that new
integrations can be added without affecting the core platform.

---

## Infrastructure

Build for production. Example target architecture: AWS, Kubernetes, Docker,
PostgreSQL, Redis, object storage, CDN, autoscaling, load balancing, backup,
central logging, monitoring, CI/CD, infrastructure as code.

---

## Security

Role-based access, encryption at rest and in transit, secure API
authentication, audit logs, the principle of least privilege, secure handling of
API keys and secrets. Design the system so that it can meet relevant
requirements, for example GDPR, depending on how the customer uses the service.

---

## Beta focus

Prioritise a small number of features at high quality over many half-finished
ones.

The MVP must contain: login, organisation (tenant), user management, start a
case, object identification, guided diagnosis, camera and image analysis, work
log, time reporting, case brief, customer report, API, administration.

All other functionality is planned for later versions.

---

## Ultimate goal

Build a platform that feels as obvious to a mechanic or service technician as a
diagnostic instrument does today. Focus on speed, clarity, methodical guidance
and traceable documentation. When a user opens the app it should feel like a
reliable professional tool — not like a general-purpose chat. It should be easy
to get started, easy to collaborate, and easy to show the customer exactly how
the diagnosis was carried out.
