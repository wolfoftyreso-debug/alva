# Guidad Felsökning — demo script

> Canonical version. Swedish: [DEMO.sv.md](DEMO.sv.md).

A 5–10 minute script for showing the platform. Everything runs locally, with no
accounts and no keys.

## Preparation

```sh
npm install
npm run dev
```

Open `http://localhost:8080/felsokning` — ideally on a phone, or in mobile mode
in the browser (the app is built for the workshop floor). Enter a name
(everything is logged per user).

Chrome is recommended: voice input (push-to-talk) then works as well.

## Demo flow

### 1. The dashboard and the demo case (1 min)

Click **Skapa demoärende (Volvo XC60, vibration)** — create demo case. A complete
case with 1 h 35 min of work history is loaded: identified object, answered
symptom questions, four wheel photos, measured values, a road test, a handover
between two technicians, and a hypothesis.

The point to make: the dashboard shows only what matters — in progress, done,
new case.

### 2. The case brief (2 min)

Open the case → the **Brief** tab. This is the core argument:

- **Checks performed** with results — not just tick boxes.
- **Not checked** — derived automatically from the methodology; what causes
  duplicated work at shift change is the thing nobody wrote down that nobody
  did.
- **Hypotheses** clearly marked 🔴 — the system never presents a hypothesis as a
  confirmed fault.
- **Reliability** and **total working time**.

The point: a new technician is productive in under a minute, without reading
hundreds of log lines.

### 3. The guide and verified checklists (2 min)

The **Guide** tab. The methodology carries on where it left off: one question or
check at a time, large buttons.

- Show that a measurement check **cannot be verified without a measured value**
  (the button is locked until the value is filled in).
- Press 🎤 and dictate an observation — the text lands in the field, editable,
  and is saved only when you press Save. Speech in, text out; nothing is sent
  automatically.
- Show the category buttons (active diagnosis / waiting / road test …) — time
  reporting takes care of itself.

### 4. The work log (1 min)

The **Logg** tab: every event timestamped with its user, append-only — nothing
can be changed or deleted afterwards. Point out the handover between Anna and
Johan.

### 5. The customer report and Live Share (2 min)

The **Rapport** tab:

- **Print / PDF** — the report becomes black on white automatically.
- **Export JSON** — versioned (version = number of events), and the export logs
  itself.
- **Open Live Share view** — what the customer sees through the share link:
  status ✔/🔄/⏳, images, measured values, timeline. No hypotheses, no internal
  entries.

The point: instead of "Diagnosis — 2.5 hours" on the invoice, the customer gets
a timeline of what was actually done.

### 6. Close with the philosophy (30 sec)

> The system documents observations, leads the user through verifiable checks
> and recommends the next step — but never presents a hypothesis as a confirmed
> fault.

It does not replace the technician. It replaces the binder, the sticky notes,
and "ask Kent, he was working on it on Thursday".

## What is demo mode and what is production

| In the demo | In production |
| --- | --- |
| Deterministic methodology engine (16 methodologies) | The model selects/generates steps through the same engine interface |
| The browser's speech recognition | The vendor's voice-to-text behind the same interface |
| localStorage + sync on login | Multi-tenant backend (the migration exists), roles per the Master Prompt |
| Share link requires a synced case | Live Share with permission levels customer/internal/partner |
| Demo images drawn by the system | Real photos via the camera (already works in the demo too) |
