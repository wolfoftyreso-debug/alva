# Module: The case brief

> Canonical version. Swedish: [case-brief.sv.md](case-brief.sv.md).

## Purpose

When a new technician takes over an ongoing case, they should become productive
in under a minute, without having to read the whole history.

The system automatically generates a structured summary of the case, updated
continuously.

This is not a chat but a **living case** in which the system maintains an
up-to-date working picture at all times.

---

## Example

**Object**

> Volvo XC60 D4 2019
> Registration ABC123
> Customer: Anders Svensson

**Customer's description**

> The car vibrates at around 88 km/h.
> The symptom occurs only while driving.

**Checks performed**

- ✓ Tyre pressure checked
- ✓ Wheel torque checked
- ✓ DOT codes documented
- ✓ Four wheels photographed
- ✓ Road test carried out
- ✓ Balance weights checked

**Observations**

- The right front tyre shows uneven wear.
- No obvious damage to the rims.
- The vibration is felt mainly in the steering wheel.
- No change under acceleration.

**Not checked**

- Radial runout
- Driveshafts
- Wheel bearings
- Four-wheel alignment

**Recommended next step**

1. Measure radial runout.
2. Check the driveshafts.
3. New road test.

**Total working time**

2 hours 14 minutes

**Reliability**

- 🟢 Customer details verified
- 🟢 Images documented
- 🟢 Measured values recorded
- 🟡 Root cause not yet verified

---

## The role of the analysis

The system should not merely summarise the history but also keep track of the
case's current position. When a new technician joins, it should be able to
answer questions such as:

- "What is left?"
- "What is most likely worth checking next?"
- "Which tests have already been performed?"
- "Are there any contradictory observations?"
- "What needs verifying before we go further?"

---

## Collaboration

This is built as a genuine multi-user system. Each case becomes a workspace in
which several people can take part.

Example:

```
Case #45281
Responsible:  Anna
Participants: Johan, Erik, Lisa
```

- Everyone sees the same information in real time.
- All images end up in the same case.
- All measured values end up in the same log.
- All comments are timestamped.
- All generated summaries update automatically.

---

## Shift change — handover in one click

At shift change the technician simply presses **Hand over work**. The system
then generates a handover report automatically.

The incoming technician receives:

- what the customer experiences,
- what has already been done,
- which measurements exist,
- which images have been taken,
- which conclusions can be drawn with high confidence,
- which questions remain unanswered,
- the recommended next step.

Nobody has to read through hundreds of chat messages.

The same function is used for escalation: when a technician leaves their shift
or escalates a case, a short briefing is generated automatically containing:

- current position,
- verified facts,
- remaining work,
- risks or uncertainties,
- recommended next steps.

This lets the next technician carry on almost immediately, which is especially
valuable in larger workshops and service organisations where several people work
on the same object across different shifts.

---

## Architecture

The module fits a multi-tenant SaaS architecture well:

- **Tenant** = workshop or service organisation.
- **User** = technician, supervisor, workshop manager, administrator.
- **Case** = a shared workspace with common context.
- **Model context** = a structured, continuously maintained summary of the case,
  used for briefing and guidance.

The last point matters: the model should not have to read the entire history
every time someone opens a case. Instead a structured case summary is
maintained and updated after every relevant event. That makes the system faster,
cheaper to run and more consistent, while the full log still remains for audit
and export.
