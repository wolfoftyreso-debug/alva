# Module: Verified checklists

> Canonical version. Swedish: [verified-checklists.sv.md](verified-checklists.sv.md).

## Core principle

A check item is not complete merely by ticking a box.

The system records not only *that* a box has been ticked — it collects
**evidence and context**. Every check must contain one or more of the following:

- ✔ Confirmation that the check was performed.
- 📝 A short observation or conclusion.
- 📷 A photo (where relevant).
- 📹 Video (where needed).
- 🎤 Speech-to-text (for quick documentation).
- 📏 A measured value (where applicable).

In this way every step becomes both traceable and comprehensible.

## Examples

**Check battery voltage**

> The technician marks "Performed".
> The system: *What value was measured?* → **12.63 V**
> The system: *How was this measured? (optional)* → **Directly at the battery
> terminals.**
> The check item is marked as verified.

**Check fuse F24**

> ✔ Performed
> The system: *What was observed?* → **The fuse is intact and voltage is present
> on both sides.**
> The check item is closed.

## The role of the analysis

The system helps detect when documentation appears incomplete:

> "You have marked wheel balancing as checked, but no observation or measurement
> has been recorded. Would you like to add a short comment before moving on?"

It should be **support, not an obstacle**.

## Adapted to the type of check

Not every step needs the same level of documentation.

| Type of check | Minimum requirement |
| --- | --- |
| Visual check | Confirmation + short comment |
| Measurement | Measured value + comment |
| Disassembly | Comment, photo where needed |
| Road test | Summary of the result |
| Image-based check | Photo + observation |

## Purpose

The aim is not to "catch" the technician, but to create a working record that
shows:

- what was checked,
- how it was checked,
- what the result was,
- and which conclusions it is reasonable to draw.

That strengthens the quality of the work, makes handovers easier, and gives a
better record towards the customer and management.

## Important design principle

Avoid making free text mandatory everywhere. If every check requires long
passages of text, the system quickly feels cumbersome. Use instead a combination
of:

- preset answers where they fit,
- short speech-to-text for observations,
- measured-value fields,
- and photo or video where they add the most value.

The documentation then becomes rich without slowing the workflow — and the
technicians use the system consistently in everyday work.
