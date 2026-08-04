# Module: Live Share

> Canonical version. Swedish: [live-share.sv.md](live-share.sv.md).

## Purpose

Every case can be published through a unique secure share link. The link shows
the case's current status in real time and updates automatically as new
information is recorded. No manual export is needed.

A live view is of great value to customers, supervisors, insurers and
manufacturers — but it must **always remain under the workshop's control**, with
clear permissions and security levels.

## Example customer view

```
Case: Volvo XC60
Status: 🟢 Diagnosis in progress

Customer's fault description
  The car vibrates at about 88 km/h.

Current status
  ✔ Object identified
  ✔ Road test carried out
  ✔ Tyres documented
  ✔ Tyre pressure checked
  🔄 Wheel balancing being checked
  ⏳ Driveshafts not checked

Images · Measurements · Timeline

Recommended next step
  Check radial runout.
```

## Live updating

While the technician works, the page updates automatically without reloading.
The recipient immediately sees new images, new measurements, new comments and
status changes.

## Permission levels

Links can be created with different access levels:

- **Customer** — read access to the information the workshop has chosen to
  share.
- **Internal** — full visibility for colleagues and supervisors.
- **External partner** — for example an insurer or a manufacturer, with a
  restricted set of information (including hypotheses, clearly marked as
  unverified).

Implemented in the platform: every link is created with a level, the filtering
happens server-side, and links can be revoked — a revoked link returns 404.

## Export

From the same case it should be possible to export:

- PDF
- JSON
- CSV
- API
- Print-friendly HTML

All exports build on the same data source (the event log), which reduces the
risk of discrepancies.

## Versioning

Every export is stamped with:

- a version number,
- date,
- time,
- who exported it,
- the export format.

That makes it possible to establish afterwards exactly what information was
shared at a given moment.

## Product vision

A diagnostic case is not merely a chat or a log, but a **living digital work
journal**. It can be followed in real time, taken over by a colleague, reviewed
by a supervisor, shared with the customer and concluded with a complete report —
all from the same data model. That reduces duplicated work and means every party
starts from the same current information.
