// ALVA-SPEC-060 · English — the source language.
//
// Every key that exists lives here first. A key added to another
// catalogue but not to this one is not a translation; it is a string
// with no original, and the test refuses it.
//
// ---- Naming --------------------------------------------------------------
//
// `område.sak` — the prefix says where the string is used, so a
// translator can read the file in the order the user meets it rather
// than alphabetically.
//
// ---- Tone ---------------------------------------------------------------
//
// The status language of ALVA-SPEC-001 §7 applies to every string here:
// the system reports state, it does not address the user. "Verification
// passed", not "Well done!". A translator who makes it friendlier has
// made it wrong.

export const EN = {
  // ---- Phases (ALVA) ----------------------------------------------------
  "fas.analys": "Analysis",
  "fas.lokalisering": "Localization",
  "fas.verifiering": "Verification",
  "fas.atgard": "Action",

  // ---- Status ------------------------------------------------------------
  "status.pending": "Pending",
  "status.in_progress": "In progress",
  "status.complete": "Complete",
  "status.passed": "Passed",
  "status.failed": "Failed",
  "status.blocked": "Blocked",
  "status.incomplete": "Incomplete",
  "status.not_applicable": "Not applicable",

  // ---- Evidence grades ----------------------------------------------------
  "evidens.E1": "Observation",
  "evidens.E2": "Photograph",
  "evidens.E3": "Video with sound",
  "evidens.E4": "Measurement, calibrated instrument",
  "evidens.E5": "Document",
  "evidens.ej_kalibrerad": "calibration missing or expired",
  "evidens.ej_angivet": "instrument not stated",
  "evidens.ej_fotograferad": "entered, not photographed",

  // ---- The quality gate ---------------------------------------------------
  //
  // These are the highest-stakes strings in the product. Each one is the
  // reason a technician cannot close a case, so it has to say what is
  // missing — not that something is missing.
  "grind.objekt": "Vehicle or object identification verified",
  "grind.historik": "Vehicle history checked or justified",
  "grind.historik.nekad": "A declined history check requires a stated reason.",
  "grind.historik.saknas": "No history check documented.",
  "grind.matarstallning.ingaende": "Incoming odometer reading photographed",
  "grind.matarstallning.utgaende": "Outgoing odometer reading photographed",
  "grind.matarstallning.saknas": "No odometer reading documented.",
  "grind.matarstallning.ej_foto":
    "The reading is entered but not photographed. Photograph the odometer, or state why that is not possible.",
  "grind.reproducering": "Symptom verification: reproduced, or documented as not reproducible",
  "grind.felorsak": "Root cause analysis documented",
  "grind.atgard": "Corrective action documented or justified",
  "grind.atgard.saknas": "Neither a performed action nor a reason for its absence is documented.",
  "grind.kundbeslut": "Customer decision on the proposal recorded",
  "grind.kundbeslut.avbojt": "Work performed despite a declined proposal",
  "grind.kundbeslut.avbojt.detalj": "The customer declined the proposal, but work has been documented as performed.",
  "grind.kvalitetskontroll": "Quality check performed — symptom verified",
  "grind.kontroller": "Methodology checks: evidence, or a documented exemption",
  "grind.foton": "Photographs present for checks that require them",
  "grind.slutsats": "Closing statement (ALVA-RULE-200)",
  "grind.hogvolt.behorighet": "High-voltage authorisation confirmed",
  "grind.hogvolt.spanningslos": "Vehicle de-energised per the manufacturer's procedure",
  "grind.regelpaket": "Rule package signature does not match — closing blocked.",
  "grind.regelpaket.osignerat": "An external rule package is in use without a signature — closing blocked.",
  "grind.evidens": "Evidence above E0",
  "grind.evidens.saknas": "No evidence of any kind is present in the log.",
  "grind.foton.detalj": "{kontroller} checks require a photograph, {foton} photographs in the log.",
  "grind.sparr.ej_uppfyllt": "The safety requirement is not met.",
  "grind.arendetyp.okant": "Unknown requirement in the rule package: {krav}",
  "grind.arendetyp.krav": "Requirement for this case type: {krav}",
  "grind.sakerhet": "Confidence level within what the evidence supports",
  "grind.sakerhet.detalj": "The stated confidence ({niva}) exceeds what the evidence supports ({tak}). Add supporting evidence, or lower the confidence — honest uncertainty is information.",


  // ---- The closing statement (ALVA-RULE-200) ------------------------------
  "slutsats.rubrik": "Closing statement",
  "slutsats.konstaterat": "What was established",
  "slutsats.evidens": "Which evidence carries it",
  "slutsats.avfardat": "Which hypotheses were dismissed, and why",
  "slutsats.osakert": "What remains uncertain",
  "slutsats.ickesvar": "That is not an answer. State what was established and which evidence carries it.",
  "slutsats.falt.motivering": "Rationale",
  "slutsats.falt.motivering_ej": "Reason the cause could not be established",
  "slutsats.falt.uteslutet": "Dismissed alternatives",
  "slutsats.falt.kvarstaende": "Remaining uncertainty",
  "slutsats.falt.atgardsval": "Choice of action",
  "slutsats.saknas": "{falt} is missing.",
  "slutsats.ickesvar.falt": "{falt}: “{text}” is not a reason. State what actually applies, and why.",
  "slutsats.for_kort": "{falt} is too short ({langd} of at least {minsta} characters) to be reviewable afterwards.",
  "slutsats.utan_varfor": "{falt} states what, but not why. Tie the conclusion to the evidence — what in it makes this follow?",
  "slutsats.utan_slutsats": "The case cannot be closed without a closing statement. State why the conclusion follows from the evidence.",
  "slutsats.hypotes_obemott": "The hypothesis “{text}” is in the log but is not addressed. State why it was dismissed, or why it remains open.",


  // ---- Case flow -----------------------------------------------------------
  "arende.nytt": "New case",
  "arende.oppna": "Open cases",
  "arende.avslutade": "Closed cases",
  "arende.avsluta": "Close case",
  "arende.avslutat": "Case closed",
  "arende.kan_ej_avslutas": "The case cannot be closed yet",
  "arende.hinder": "Outstanding before closing",
  "arende.overlamna": "Hand over",
  "arende.ansvarig": "Responsible",

  // ---- Pre-diagnostics ------------------------------------------------------
  "pre.rubrik": "Pre-diagnostics — before the work begins",
  "pre.historik.fraga": "Has the vehicle's history been checked? (previous work, recurring faults, TSBs, campaigns)",
  "pre.historik.ja": "Yes — checked",
  "pre.historik.nej": "No",
  "pre.historik.skal": "Reason the history was not checked (required)",
  "pre.historik.relevant": "Relevant previous work (optional — causal chain)",
  "pre.matarstallning": "Odometer reading",
  "pre.fotografera": "Photograph the instrument panel",
  "pre.felbeskrivning": "Customer's description verified",
  "pre.observationer": "Anything else on receipt?",

  // ---- Common actions --------------------------------------------------------
  "handling.spara": "Save",
  "handling.avbryt": "Cancel",
  "handling.fortsatt": "Continue",
  "handling.tillbaka": "Back",
  "handling.dokumentera": "Document",
  "handling.fotografera": "Photograph",
  "handling.spela_in": "Record video",
  "handling.undantag": "Document an exemption",
  "handling.undantag.skal": "Reason for the exemption (required)",
  "handling.exportera": "Export",
  "handling.skriv_ut": "Print",

  // ---- Measurement -------------------------------------------------------------
  "matning.varde": "Value",
  "matning.enhet": "Unit",
  "matning.matdon": "Instrument",
  "matning.matdon.valj": "Select instrument",
  "matning.matdon.okant": "Unknown instrument. Register it before saving the measurement.",
  "matning.kalibrerad_till": "Calibrated until",

  // ---- Report --------------------------------------------------------------------
  "rapport.rubrik": "Case report",
  "rapport.sammanfattning": "Summary",
  "rapport.evidens": "Evidence",
  "rapport.atgarder": "Actions",
  "rapport.harledd": "Generated from the case log. Observations and measurements are reported without conclusions that lack support.",

  // ---- Language ----------------------------------------------------------------------
  "sprak.valj": "Language",
  "sprak.granskat": "Reviewed",
  "sprak.ogranskat": "Not reviewed",
  "sprak.tackning": "{procent} % of the interface",

  // Shown when the methodology content has not been reviewed by a
  // specialist in the user's language. Deliberately specific: a general
  // disclaimer is read by nobody.
  "metodik.ogranskad":
    "Procedure text has not been reviewed by a technical specialist in {sprak}. Steps and checks are shown in English where no reviewed translation exists — an unreviewed translation of a safety instruction is worse than a foreign-language one, because it does not look foreign.",
  "metodik.pa_engelska": "Shown in English — no reviewed translation in {sprak}",
};
