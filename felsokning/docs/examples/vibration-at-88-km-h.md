# Worked example: "The car vibrates at around 88 km/h"

> Canonical version. Swedish: [vibration-at-88-km-h.sv.md](vibration-at-88-km-h.sv.md).

This example illustrates how Guidad Felsökning works in practice: a digital
diagnostic process, not a chat. The system does not jump straight to "it's
probably wheel balancing" — it follows a reproducible method.

---

## The case

**Customer's description**

> "The car vibrates at around 88 km/h."

---

## Step 1 — Verify the symptom

The system asks:

- Is the vibration speed-dependent?
- Is it felt in the steering wheel, the seat, or the whole car?
- Does it occur under acceleration, at steady speed, or under braking?
- Does it disappear above or below a particular speed range?

Once the answers are documented, the process moves on.

---

## Step 2 — Visual check

The system asks the technician to photograph:

- The left front wheel
- The right front wheel
- The left rear wheel
- The right rear wheel

The image analysis can then help identify things that are genuinely observable,
for example:

- the tyre's DOT/manufacturing date (via OCR),
- unusual or uneven wear,
- visible damage or deformation,
- missing or loose balance weights, if clearly visible,
- an incorrect tyre size or mismatched tyre types.

What matters is that the system distinguishes **observation** from
**conclusion**. For instance it may say:

> "A balance weight appears to be missing on the right front wheel. Check the
> wheel manually."

rather than asserting that this is the cause of the fault.

---

## Step 3 — Recommended checks

The system then proposes the next steps, for example:

- check tyre pressure,
- check wheel torque,
- check radial and lateral runout,
- check wheel balancing,
- check bushings and joints,
- carry out a road test.

Each item is ticked off and documented.

---

## Step 4 — Road test

The system summarises what is to be verified during the road test:

- The speed at which the vibration occurs.
- Any change under acceleration.
- Any change under engine braking.
- Any change when cornering.
- Whether the vibration is felt in the steering wheel or the body.

---

## Step 5 — Summary

When the technician chooses to pause or finish the work, a report is generated
automatically, for example:

**Checks performed**

- Four wheels photographed.
- DOT codes documented.
- Tyre wear checked.
- Tyre pressure verified.
- Wheel balancing checked.
- Road test carried out.

**Result**

Observations and measured values are summarised without the system drawing
conclusions that lack support.

**Recommended next steps**

For example checking the driveshafts, wheel bearings or other components if the
earlier checks have not identified the cause.
