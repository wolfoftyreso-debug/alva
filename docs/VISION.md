# Guidad Felsökning (Guided Diagnostics)

> Canonical version. Swedish: [VISION.sv.md](VISION.sv.md).
> Development is governed by [Master Prompt v2.0](MASTER-PROMPT.md).

## Vision

Guidad Felsökning is a professional diagnostic platform that guides technicians
step by step through a structured diagnostic process. The platform documents
every step, retrieves information from the manufacturer's systems using the
user's own credentials, and creates a complete, traceable diagnostic history.

The system does not replace the technician's competence — it ensures the work is
carried out methodically, documented correctly, and can be reviewed afterwards.

The product should not try to be an automated mechanic, but a **digital
diagnostic supervisor**. That makes it both more credible and easier to use in
professional environments.

---

## Guiding principle

> **The system documents observations, leads the user through verifiable checks
> and recommends the next step — but never presents a hypothesis as a confirmed
> fault.**

That principle makes the tool useful both to experienced technicians and to less
experienced users, while providing a robust record for customers, workshops and
future analysis. Guidad Felsökning is a digital diagnostic process, not a chat.

---

## Core principles

### 1. No guessing

The system must never present speculation as fact.

Every claim is marked with a confidence level:

- 🟢 **High** — verified through measurement, manufacturer information or the
  user's own input.
- 🟡 **Medium** — a logical conclusion based on available information.
- 🔴 **Low** — a hypothesis or possible cause requiring verification.

If there is not enough to go on, the system must say so explicitly.

### 2. Identify the object first

No diagnosis begins before the object has been identified.

Identification can happen through:

- registration number
- VIN
- machine number
- serial number
- QR code
- barcode
- OCR from the type plate
- a photo of the object
- manual entry of an object ID

Once identification is complete, a clear confirmation is shown before the
diagnosis continues.

### 3. Integration with manufacturer systems

The user connects their own credentials via an API or an equivalent integration.

Examples of information sources:

- the manufacturer's workshop system
- parts catalogues
- wiring diagrams
- service bulletins
- service history
- electronic service books
- internal DMS systems

Guidad Felsökning uses these as reference but does not store copyrighted
documentation unless the user or the organisation has the right to do so.

### 4. Conversational guidance

The technician works naturally:

> "I've measured."
>
> "There's 13.9 volts."
>
> "The relay doesn't click."

The system chooses the next step based on earlier observations and the
established diagnostic methodology.

### 5. Complete audit log

Every activity is recorded.

Examples of log entries:

- timestamp
- user
- object
- measured values
- images
- documents
- observations
- the system's recommendation
- the user's answer
- next step

Nothing is overwritten. Events are only appended, which gives full traceability.

### 6. Export and API

Every completed case can be exported as a structured diagnostic record.

There should also be an API for:

- retrieving logs
- retrieving reports
- connecting to a DMS
- connecting to business systems
- connecting to an ERP
- connecting to electronic service books
- connecting to warranty administration

In this way Guidad Felsökning becomes a component in existing workflows, not an
isolated system.

---

## Modules

Beyond the core principles, the platform is built from modules specified
separately:

- [Work log and time tracking](modules/work-log-and-time-tracking.md) — timed,
  traceable work tied to concrete activities; a digital work record in which
  time, activity and technical reasoning hang together.
- [Shareable customer report (customer view)](modules/customer-report.md) — a
  clear timeline with images, measured values and comments that shows the
  customer what they actually paid for.
- [The case brief](modules/case-brief.md) — a continuously updated working
  picture of the case that makes a new technician productive in under a minute;
  a multi-user workspace with one-click handover.
- [Communication model (voice)](modules/communication-model.md) — speech in,
  text out via push-to-talk; voice is an input method, not a separate interface,
  and nothing is sent without confirmation.
- [Verified checklists](modules/verified-checklists.md) — a check item is not
  complete by ticking a box; every check collects evidence and context, with a
  minimum requirement per type of check.
- [Live Share](modules/live-share.md) — a permission-controlled share link that
  shows the case in real time; versioned exports from the same event log.

How the process works in practice is illustrated in the worked example
["The car vibrates at around 88 km/h"](examples/vibration-at-88-km-h.md).

---

## User interface

The interface should be deliberately simple.

No chat with long generated answers.

Instead:

- one question at a time
- one clear recommended action
- large buttons
- clear status indicators
- high contrast
- few choices per screen

The design should give the same feeling as a modern factory tool: function
before aesthetics.

---

## Security

The system is designed for professional use with a focus on information
security.

The aim is to:

- encrypt data in transit and at rest,
- log all changes and access,
- support role-based access control,
- offer secure API authentication,
- enable export and deletion in line with the organisation's policy and
  applicable regulation.

---

## Product philosophy

The most important principle is that Guidad Felsökning never tries to replace
the technician.

It does not replace experience.

It does not replace the manufacturer's documentation.

It does not replace the workshop manual.

It acts as a consistent supervisor that ensures the right questions are asked in
the right order, that no steps are overlooked, and that the whole diagnostic
process is documented in a way that is traceable, reusable and easy to integrate
with the rest of the organisation's systems.

That gives workshops and service organisations higher quality, more consistent
working methods, better knowledge transfer between technicians, and a clear
record towards customers, warranty handling and internal follow-up.
