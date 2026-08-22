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
  "grind.historik": "Vehicle history checked, or the omission justified",
  "grind.historik.nekad": "A declined history check requires a stated reason.",
  "grind.historik.saknas": "No history check documented.",
  "grind.matarstallning.ingaende": "Incoming odometer reading photographed",
  "grind.matarstallning.utgaende": "Outgoing odometer reading photographed",
  "grind.matarstallning.saknas": "No odometer reading documented.",
  "grind.matarstallning.ej_foto":
    "The reading is entered but not photographed. Photograph the odometer, or state why that is not possible.",
  "grind.reproducering": "Symptom verification: reproduced, or documented as not reproducible",
  "grind.felorsak": "Root cause analysis documented",
  "grind.atgard": "Corrective action documented, or its absence justified",
  "grind.atgard.saknas": "Neither a performed action nor a reason for its absence is documented.",
  "grind.kundbeslut": "Customer decision on the proposal recorded",
  "grind.kundbeslut.avbojt": "Work performed despite a declined proposal",
  "grind.kundbeslut.avbojt.detalj": "The customer declined the proposal, but work has been documented as performed.",
  "grind.kvalitetskontroll": "Quality check performed — symptom verified as resolved",
  "grind.kontroller": "Methodology checks: evidence, or a documented exemption",
  "grind.foton": "Photographs present for checks that require them",
  "grind.slutsats": "Closing statement (ALVA-RULE-200)",
  "grind.hogvolt.behorighet": "High-voltage authorization confirmed",
  "grind.hogvolt.spanningslos": "Vehicle de-energized per the manufacturer’s procedure, absence of voltage verified by measurement",
  "grind.regelpaket": "Rule package signature does not match — closing blocked.",
  "grind.regelpaket.osignerat": "An external rule package is in use without a signature — closing blocked.",
  "grind.evidens": "Evidence above E0",
  "grind.evidens.saknas": "No evidence of any kind is present in the log.",
  "grind.foton.detalj": "{kontroller} checks require a photograph; {foton} photographs are in the log.",
  "grind.anmarkning.bevis": "Findings carry visual evidence",
  "grind.anmarkning.saknas": "A repaired fault must be recorded as a finding",
  "grind.anmarkning.saknas.detalj": "Work was carried out and a root cause established, but no check is marked as a finding. What was repaired then appears nowhere in the log as something that was found.",
  "grind.sparr.ej_uppfyllt": "The safety requirement is not met.",
  "grind.sparr.kringgangen": "A safety precondition was answered and not met. It cannot be set aside by changing methodology — satisfy it, or if the methodology was wrong, the safety question should not have been answered under it.",
  "grind.arendetyp.okant": "Unknown requirement in the rule package: {krav}",
  "grind.arendetyp.krav": "Requirement for this case type: {krav}",
  "grind.sakerhet": "Confidence level within what the evidence supports",
  "grind.sakerhet.detalj": "The stated confidence ({niva}) exceeds what the evidence supports ({tak}). Add supporting evidence, or lower the confidence — honest uncertainty is information.",
  "grind.eskalering": "Technical escalations answered",
  "grind.eskalering.detalj": "An escalation is open ({referens}). Await the answer and document it before the case is closed.",


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
  "arende.ansvarig": "Assigned to",

  // ---- Pre-diagnostics ------------------------------------------------------
  "pre.rubrik": "Pre-diagnostics — before the work begins",
  "pre.historik.fraga": "Has the vehicle’s history been checked? (previous work, recurring faults, TSBs, campaigns)",
  "pre.historik.ja": "Yes — checked",
  "pre.historik.nej": "No",
  "pre.historik.skal": "Reason the history was not checked (required)",
  "pre.historik.relevant": "Relevant previous work (optional — causal chain)",
  "pre.matarstallning": "Odometer reading",
  "pre.fotografera": "Photograph the instrument cluster",
  "pre.felbeskrivning": "Customer’s fault description verified",
  "pre.observationer": "Anything else noted at vehicle reception?",

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
  "matning.kalibrerad_till": "Calibration valid until",

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
  "sprak.tackning": "{procent}% of the interface",

  // Shown when the methodology content has not been reviewed by a
  // specialist in the user’s language. Deliberately specific: a general
  // disclaimer is read by nobody.
  "metodik.ogranskad":
    "Procedure text has not been reviewed by a technical specialist in {sprak}. Steps and checks are shown in English where no reviewed translation exists — an unreviewed translation of a safety instruction is worse than a foreign-language one, because it does not look foreign.",
  "metodik.pa_engelska": "Shown in English — no reviewed translation in {sprak}",

  // ---- Public website (webb.) ---------------------------------------------
  //
  // The marketing site and the platform are the same system, so the site
  // speaks through the same catalogue. Keys follow the page order. The
  // portal chrome is deliberately absent: the portal is the product, and
  // its language is governed by account and organization, not by the
  // visitor’s footer choice.
  "webb.nav.oversikt": "Overview",
  "webb.ansok": "Request account",
  "webb.loggain": "Sign in",
  "webb.fot.impressum": "Legal notice",
  "webb.fot.dataskydd": "Privacy",
  "webb.fot.villkor": "Terms",
  "webb.fot.tillganglighet": "Accessibility",
  "webb.fot.sprak": "Languages",
  "webb.fot.utgavor": "Release notes",

  "webb.hero.position": "Guided Diagnostic Platform",
  "webb.hero.definition": "Standardized diagnostic procedures for repeatable and verifiable troubleshooting.",

  "webb.metod.etikett": "Methodology",
  "webb.metod.rubrik": "The ALVA model",
  "webb.metod.ingress":
    "ALVA is a standardized method for systematic analysis, localization, verification and action. Every decision is traceable, every conclusion verifiable, every action reproducible.",
  "webb.fas.analysis.syfte": "Collect evidence.",
  "webb.fas.analysis.avgransning": "Facts only. Hypotheses are not collected in this phase.",
  "webb.fas.localization.syfte": "Isolate the fault.",
  "webb.fas.localization.avgransning": "Narrow the area. The cause is not yet established.",
  "webb.fas.verification.syfte": "Confirm root cause.",
  "webb.fas.verification.avgransning": "The cause is verified — not the symptom.",
  "webb.fas.action.syfte": "Execute corrective action.",
  "webb.fas.action.avgransning": "Result verified and documented. Otherwise the phase is incomplete.",

  "webb.drift.etikett": "Operation",
  "webb.drift.rubrik": "How it works",
  "webb.drift.s1.rubrik": "Create organization",
  "webb.drift.s1.text": "An application is submitted and reviewed.",
  "webb.drift.s2.rubrik": "Users receive accounts",
  "webb.drift.s2.text": "Roles are assigned by the organization administrator.",
  "webb.drift.s3.rubrik": "Guided diagnostic procedures",
  "webb.drift.s3.text": "Each case follows a defined procedure.",
  "webb.drift.s4.rubrik": "Verification",
  "webb.drift.s4.text": "Root cause is confirmed before corrective action.",
  "webb.drift.s5.rubrik": "Documentation",
  "webb.drift.s5.text": "The record is generated from the case log.",
  "webb.drift.s6.rubrik": "Continuous improvement",
  "webb.drift.s6.text": "Verified outcomes refine subsequent procedures.",

  "webb.larande.etikett": "Capability",
  "webb.larande.rubrik": "Enterprise learning",
  "webb.larande.p1":
    "The platform continuously refines diagnostic procedures using verified operational experience from your own organization.",
  "webb.larande.p2":
    "Every completed diagnostic contributes to subsequent guidance. Only verified outcomes are used — a case closed without a confirmed root cause contributes nothing, by design.",
  "webb.larande.p3":
    "The knowledge base belongs to the organization. It is derived from your cases, your procedures and your documentation, and it is not aggregated across customers.",
  "webb.larande.block": "Derived from",
  "webb.larande.k1": "Verified root causes",
  "webb.larande.k2": "Confirmed corrective actions",
  "webb.larande.k3": "Recurring fault categories",
  "webb.larande.k4": "Procedure completion records",
  "webb.larande.k5": "Organization documentation",

  "webb.rapport.etikett": "Reporting",
  "webb.rapport.rubrik": "Quarterly improvement report",
  "webb.rapport.ingress":
    "Once a quarter, the platform answers six questions about the workshop’s own work. Every answer is derived from the case log — nothing is estimated, and nothing is asked of anyone.",
  "webb.rapport.f1": "Which faults are we now diagnosing correctly the first time?",
  "webb.rapport.f2": "How often does a suspected cause turn out to be the actual one?",
  "webb.rapport.f3": "Which faults keep coming back across the fleet?",
  "webb.rapport.f4": "Which procedure steps are being skipped, and why?",
  "webb.rapport.f5": "What does the workshop know now that it did not know last quarter?",
  "webb.rapport.f6": "Are cases being completed, verified and documented — or only completed?",

  "webb.pris.etikett": "Commercial",
  "webb.pris.rubrik": "Licensing",
  "webb.pris.komponent": "Component",
  "webb.pris.grund": "Basis",
  "webb.pris.plattform": "Platform license",
  "webb.pris.plattform.grund": "Per organization, annually",
  "webb.pris.anvandare": "User licenses",
  "webb.pris.anvandare.grund": "Per active user, monthly",
  "webb.pris.moduler": "Enterprise modules",
  "webb.pris.moduler.grund": "Optional, per module",
  "webb.pris.betalning": "No online payment. No subscription sign-up. Invoicing follows review of the application.",
  "webb.pris.aktivering": "Activation sequence",
  "webb.pris.a1": "Organization submits an application.",
  "webb.pris.a2": "Application is reviewed.",
  "webb.pris.a3": "Invoice is issued.",
  "webb.pris.a4": "Payment is registered.",
  "webb.pris.a5": "Organization is activated.",
  "webb.pris.a6": "Additional users are billed monthly.",

  "webb.kallor.etikett": "Infrastructure",
  "webb.kallor.rubrik": "Operational Knowledge Infrastructure",
  "webb.kallor.p1":
    "ALVA uses the organization’s own authorized knowledge sources. The architecture is provider-agnostic: every source implements the same interface, and no provider is assumed.",
  "webb.kallor.p2":
    "A beta installation operates on internal documentation alone. External providers are enabled later through separate connectors, without change to the platform core.",
  "webb.kallor.block": "Source resolution order",
  "webb.kallor.k1": "Internal company procedures",
  "webb.kallor.k2": "OEM documentation",
  "webb.kallor.k3": "Technical bulletins",
  "webb.kallor.k4": "Warranty information",
  "webb.kallor.k5": "Service manuals",
  "webb.kallor.k6": "Historical verified diagnostics",
  "webb.kallor.k7": "Organization best practices",

  "webb.login.etikett": "Access",
  "webb.login.demo":
    "This login authenticates nothing. Type anything into Email and Password and press Sign in — no account is needed, and the portal behind it presents fixed example data. When connected to a platform instance, this page authenticates against it, and the portal is closed without a valid session.",
  "webb.login.losenord": "Password",
  "webb.login.ofullstandigt": "Authentication incomplete. Email and password required.",
  "webb.login.misslyckades": "Authentication failed.",
  "webb.login.logga_in": "Sign in",
  "webb.login.loggar_in": "Signing in",
  "webb.login.glomt": "Forgot password",

  "webb.ansokan.etikett": "Registration",
  "webb.ansokan.demo":
    "Nothing is sent. Submitting this form stores nothing, notifies no one, and creates no application — there is no intake behind it yet. The description below states how registration is intended to work, not what happens today.",
  "webb.ansokan.avsikt": "Intended operation: applications are reviewed manually and no payment is taken at this stage.",
  "webb.falt.foretag": "Company",
  "webb.falt.orgnummer": "Company registration number",
  "webb.falt.kontakt": "Contact person",
  "webb.falt.epost": "Email",
  "webb.falt.telefon": "Phone",
  "webb.falt.tekniker": "Number of technicians",
  "webb.falt.bransch": "Industry",
  "webb.falt.land": "Country",
  "webb.falt.anvandare": "Expected number of users",
  "webb.falt.noteringar": "Notes",
  "webb.falt.kravs": "(required)",
  "webb.ansokan.skicka": "Submit application",
  "webb.ansokan.mottagen.etikett": "Application",
  "webb.ansokan.mottagen": "Submitted",
  "webb.ansokan.mottagen.demo":
    "Nothing was submitted and no one was notified. The reference below was computed in your browser from what you typed, and exists nowhere else — it will be gone when you close this page.",
  "webb.ansokan.status": "Status",
  "webb.ansokan.referens": "Reference",
  "webb.ansokan.granskning":
    "Applications are reviewed manually. An invoice is issued on approval. The organization is activated once payment is registered.",

  "webb.sprak.etikett": "Translation",
  "webb.sprak.rubrik": "Languages",
  "webb.sprak.ingress":
    "English is the default and the source language. Nine translations follow. What the platform does not do is claim that a translated interface means a translated method.",
  "webb.sprak.princip.etikett": "Principle",
  "webb.sprak.princip.rubrik": "Two kinds of text",
  "webb.sprak.granssnitt.rubrik": "Interface text",
  "webb.sprak.granssnitt.beteckning": "Falls back silently",
  "webb.sprak.granssnitt.text":
    "Labels, buttons, statuses. Finite, rarely changed. An English string reaching a German user is an irritation, not a hazard — so a missing translation falls back to English without comment.",
  "webb.sprak.metodik.rubrik": "Procedure text",
  "webb.sprak.metodik.beteckning": "Never falls back silently",
  "webb.sprak.metodik.text":
    "Instructions for work on a vehicle. Here an unreviewed translation is worse than a foreign-language one — because English looks foreign, while a bad translation looks like an instruction. It is shown in English and marked, with the language named.",
  "webb.sprak.invariant":
    "The method itself is never translated. Phase names and status words are ALVA’s structure and read identically in every country, so an auditor can read a Romanian and a German case record without knowing which language the workshop works in.",
  "webb.sprak.tackning.etikett": "Coverage",
  "webb.sprak.tackning.rubrik": "What is translated, and what is reviewed",
  "webb.sprak.kolumn.sprak": "Language",
  "webb.sprak.kolumn.granssnitt": "Interface",
  "webb.sprak.kolumn.granskat": "Method reviewed by a specialist",
  "webb.sprak.granskat.ja": "Yes",
  "webb.sprak.granskat.nej": "No — procedure text shown in English",
  "webb.sprak.matt":
    "Interface coverage is measured, not estimated: a test fails the build if any key is missing from any language. Review status is a statement about people, not about files, and is set by hand.",
  "webb.sprak.kallsprak":
    "The English procedure text is a translation of the Swedish source and has not yet been read by a specialist working in the trade. It is held to the same standard as the other nine languages, and the same statement is made about it here rather than quietly excepted because it is the source.",
  "webb.sprak.bevis.etikett": "Verification",
  "webb.sprak.bevis.rubrik": "The strings that stop a case",
  "webb.sprak.bevis.ingress":
    "These are the sentences that refuse to let a technician close a case. A refusal nobody understands is a refusal with no way through — so they are the right strings to judge a translation by.",
  "webb.sprak.ej_granskad": "Not reviewed",
  "webb.sprak.granskad": "Reviewed",
  "webb.sprak.granskad.text":
    "Procedure text in {sprak} has been read by a specialist working in the trade. Steps and checks are shown in {sprak} throughout.",
  "webb.sprak.val.etikett": "Operation",
  "webb.sprak.val.rubrik": "How the language is chosen",
  "webb.sprak.val.s1.rubrik": "User preference",
  "webb.sprak.val.s1.text": "What the individual has selected.",
  "webb.sprak.val.s2.rubrik": "Organization setting",
  "webb.sprak.val.s2.text": "The workshop’s documentation language.",
  "webb.sprak.val.s3.rubrik": "Browser language",
  "webb.sprak.val.s3.text": "The first language the platform recognizes.",
  "webb.sprak.val.s4.rubrik": "English",
  "webb.sprak.val.s4.text": "The default, and the source.",
  "webb.sprak.val.notering":
    "The organization ranks above the browser deliberately. A workshop in Germany with a Polish technician needs one documentation language — the case record must not change language depending on who happened to write the line.",

  // ---- The customer share (ALVA-PROC-0030 · the share view) ---------------
  //
  // The recipient of a share — the customer, an insurance assessor, a
  // fleet manager — is the one reader who never chose the tool, so the
  // share speaks the recipient's language. Timeline entries are the
  // technician's own words and stay verbatim in the workshop's working
  // language; everything derived — the summary and the labels — lives here.
  "sammanfattning.objekt": "The case concerns {objekt}.",
  "sammanfattning.objekt_utan_namn": "The case concerns an identified object.",
  "sammanfattning.objekt_saknas": "The object is not identified in the log.",
  "sammanfattning.kundbeskrivning": "The customer described: ”{text}”",
  "sammanfattning.repro.ja": "The symptom was reproduced.",
  "sammanfattning.repro.delvis": "The symptom could be partially reproduced.",
  "sammanfattning.repro.nej":
    "The symptom could not be reproduced under the conditions present during the examination.",
  "sammanfattning.repro.dokumenterad": "The reproduction is documented.",
  "sammanfattning.orsak_ej_faststalld": "The cause could not be established: {motivering}",
  "sammanfattning.avvikelse": "Established deviation: {avvikelse}",
  "sammanfattning.bedomd_orsak": "Assessed cause: {kategori}.",
  "sammanfattning.motivering": "Rationale: {motivering}",
  "sammanfattning.atgard_utford": "Action performed: {beskrivning}",
  "sammanfattning.atgard_ej_utford": "No action was performed: {motivering}",
  "sammanfattning.kvalitet.symptomet_borta": "At the quality check the symptom was gone.",
  "sammanfattning.kvalitet.kvarstar": "At the quality check the symptom remained.",
  "sammanfattning.kvalitet.delvis": "At the quality check the symptom partially remained.",
  "sammanfattning.kvalitet.ej_verifierbar": "The quality check could not verify the outcome.",
  "sammanfattning.kvalitet.dokumenterad": "The quality check is documented.",
  "sammanfattning.kvarstaende": "Remaining: {text}",
  "sammanfattning.rad.oidentifierat": "Unidentified object",
  "sammanfattning.rad.pagaende": "{vad} — in progress.",
  "sammanfattning.rad.utan_orsak": "{vad} — closed without an established cause.",
  "sammanfattning.rad.avslutat": "{vad} — closed.",
  "delning.rubrik.fall": "Case",
  "delning.rubrik.delat": "Shared case",
  "delning.status.avslutat": "Closed",
  "delning.status.pagaende": "Diagnosis in progress",
  "delning.identitet.arbetsorder": "Work order",
  "delning.identitet.claim": "Claim",
  "delning.identitet.skadenummer": "Claim no.",
  "delning.identitet.regnr": "Reg. no.",
  "delning.identitet.vin": "VIN",
  "delning.identitet.miltal": "Mileage",
  "delning.identitet.ansvarig": "Responsible technician",
  "delning.identitet.status": "Status",
  "delning.rubrik.sammanfattning": "Summary",
  "delning.rubrik.slutsats": "Closing statement and rationale",
  "delning.slutsats.ej_faststalld": "Reason the cause could not be established",
  "delning.slutsats.motivering": "Rationale",
  "delning.slutsats.uteslutet": "Dismissed alternatives",
  "delning.slutsats.atgardsval": "Choice of action",
  "delning.slutsats.kvarstaende": "Remaining uncertainty",
  "delning.rubrik.felbeskrivning": "Customer's fault description",
  "delning.rubrik.forslag": "Proposed action",
  "delning.forslag.kostnad": "Estimated cost: {kostnad}",
  "delning.forslag.beslut": "Your decision: {beslut}",
  "delning.forslag.via": "(recorded via {kanal})",
  "delning.forslag.vantar": "Awaiting your decision — contact the workshop to approve or decline.",
  "delning.beslut.rubrik": "Your decision to the workshop",
  "delning.beslut.godkann": "Approve the action",
  "delning.beslut.avboj": "Decline",
  "delning.beslut.kommentar": "Comment (optional)",
  "delning.beslut.motivering": "Short rationale (optional)",
  "delning.beslut.skickar": "Sending …",
  "delning.beslut.skicka": "Send decision",
  "delning.beslut.info":
    "The decision is recorded in the case and cannot be changed here — contact the workshop if you change your mind.",
  "delning.beslut.godkant": "Approved",
  "delning.beslut.avbojt": "Declined",
  "delning.beslut.delvis": "Partly approved",
  "delning.beslut.fel.plattform": "The decision cannot be given here — contact the workshop.",
  "delning.beslut.fel.registrering": "The decision could not be recorded — try again.",
  "delning.beslut.fel.forbindelse": "The decision could not be sent — check the connection.",
  "delning.rubrik.laget": "Current status",
  "delning.rubrik.video": "Video",
  "delning.rubrik.bilder": "Images",
  "delning.rubrik.matningar": "Measurements",
  "delning.rubrik.tidslinje": "Timeline",
  "delning.tidslinje.arbetssprak": "Timeline entries are shown verbatim, in the workshop's working language.",
  "delning.rubrik.nasta": "Recommended next step",
  "delning.rubrik.arbetstid": "Labour time",
  "delning.fot": "Case #{nummer} · started {datum} · generated from the case log",
  "delning.notis.kund":
    "Read-only live view from the workshop — the page updates automatically as new information is recorded.",
  "delning.notis.partner":
    "Read-only live view (partner level) — includes technical hypotheses, clearly marked as unverified. Updates automatically.",
  "delning.notis.intern":
    "Read-only live view (internal level) — full visibility of the case. Updates automatically.",
  "delning.hamtar": "Retrieving the case …",
  "delning.saknas": "The case is not available. Check the link with the workshop — the share may have been revoked.",
};
