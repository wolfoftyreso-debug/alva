# Module: Work log and time tracking

> Canonical version. Swedish: [work-log-and-time-tracking.sv.md](work-log-and-time-tracking.sv.md).

## Purpose

All work carried out during a diagnostic case should be timed, traceable and
tied to concrete activities.

The system records not only how long a piece of work took, but also what was
done during that time.

This is more than a time clock — it is a digital work record in which time,
activity and technical reasoning hang together. It produces a considerably
stronger record than traditional time reporting.

---

## Starting work

The technician begins by identifying the object.

For example:

- A photo of the registration plate
- A VIN scan
- A QR code
- A serial number
- A machine number

Once the object is verified, the work log starts.

Example:

```
08:03  Work started
       Object: ABC123
       Volvo XC60
```

---

## Automatic timeline

All activities are timestamped automatically.

Example:

```
08:03  Object identified
08:05  Fault description recorded
08:11  Fuse F23 checked
08:18  Supply voltage measured
08:27  Photo uploaded
08:35  Direct feed applied
08:48  Wiring diagram opened
09:01  New check
09:09  Diagnosis completed
```

No manual administration is required.

---

## Active working time

The system distinguishes between:

- active diagnosis
- waiting time
- administrative time
- parts lookup
- road testing
- customer contact

This gives a fairer account of the time spent.

---

## Context after longer breaks

If a longer period passes without activity, the system can ask for context, for
example:

> "No activity has been recorded in the last 20 minutes. Briefly describe what
> was done during this period."

The technician can answer in text or by voice, for example:

> "Removed the instrument panel to reach the wiring harness."

That becomes part of the work log.

---

## The system as documentation support

The system does not judge whether the technician is working "fast enough". What
it does is help ensure the log is comprehensible and complete. If a step lacks
context, it can ask for a short clarification so the report is useful to the
customer or to the technician's own organisation.

---

## Final report

When the work is finished, a report is generated automatically, for example:

**Total time: 1 hour 37 minutes**

Distribution:

- Diagnosis: 54 min
- Disassembly: 18 min
- Measurements: 11 min
- Documentation: 6 min
- Road test: 8 min

The report also contains:

- checks performed,
- measured values,
- attached images,
- technical conclusions,
- recommended next steps.

---

## Business value

This function may become one of the system's strongest arguments, because it:

- reduces administration after the work is finished,
- gives the customer a clear basis for the invoice,
- strengthens the record in warranty and insurance cases,
- makes internal follow-up easier,
- creates a searchable knowledge base of earlier diagnoses.

It makes Guidad Felsökning more than an assistant — it becomes a complete work
tool in which identification, methodical diagnosis, documentation and time
tracking form one coherent and traceable process.
