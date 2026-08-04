# Module: Shareable customer report (customer view)

> Canonical version. Swedish: [customer-report.sv.md](customer-report.sv.md).

## Purpose

Instead of the customer receiving a line on the invoice reading "Diagnosis —
2.5 hours", they can be given a clear timeline of what was actually done.

Example:

```
08:03  Vehicle identified
08:10  Fault description recorded
08:18  Tyres documented
08:26  Visual check completed
08:42  Tyre pressure verified
08:57  Road test carried out
09:18  Conclusion and recommendation documented
```

With images, measured values and comments it becomes clear what the customer has
actually paid for. That strengthens trust and can reduce arguments about
diagnostic time.

---

## Relationship to the other modules

The customer report is a derived view of the same event log that
[Work log and time tracking](work-log-and-time-tracking.md) builds on — no
separate documentation has to be created. The workshop chooses what level of
detail is shared with the customer, in line with the role-based permission
model.
