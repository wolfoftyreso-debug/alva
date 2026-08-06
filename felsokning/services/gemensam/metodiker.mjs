// Metodikbiblioteket — delad kod.
//
// Låg tidigare bara i klienten, vilket gjorde att servern inte kunde
// utvärdera kvalitetsgrindens metodikrader (QUALITET C-2). Datan bor nu
// här; app/src/felsokning/metodiker.ts återexporterar den med typer, så
// det finns fortfarande exakt en sanning.
//
// En metodik är inte en checklista över vad som brukar vara fel — det
// vore att gissa åt teknikern. Den är en ordning för att utesluta:
// symptomet verifieras först, sedan det billiga och synliga, sedan det
// som kräver mätning, sist det som kräver demontering.
//
// Tre regler gäller alla metodiker här:
//
//   1. Varje kontroll har ett minimikrav (mätvärde, foto eller
//      observation). En kryssruta är inte evidens.
//   2. Symptomsteget frågar aldrig "vad är fel" utan "vad händer, när,
//      var". Kundens ord blir ett verifierat symptom först när det
//      reproducerats.
//   3. Där arbetet kan skada någon kommer säkerhetssteget först och kan
//      inte hoppas över — se HÖGVOLT.
//
// Att "täcka allt" går inte att lova. Det som går är att täcka fordonets
// system systematiskt och låta GENERISK vara ett strukturellt komplett
// skyddsnät: den fungerar även för det ingen förutsett.
//
// ---- Språk och granskningsstatus (ALVA-SPEC-060) ------------------------
//
// Texten är skriven på svenska och översatt till engelska när engelska
// blev källspråk. Det är alltså en ÖVERSÄTTNING som ännu inte lästs av en
// fackman på målspråket, och den ska behandlas som en sådan tills den är
// det — samma krav som ställs på de nio andra språken.
//
// Det spelar roll här och ingen annanstans i produkten: det här är den
// enda text i systemet som säger åt någon vad den ska göra med ett
// fordon. "Mät och dokumentera spänningsfrihet före ingrepp" är inte en
// etikett.
//
// NYCKELORDEN är ett undantag och är avsiktligt tvåspråkiga. De matchas
// mot teknikerns egen fritext; att byta ut de svenska mot engelska hade
// gjort metodikvalet blint för allt en svensk verkstad skriver. Fler
// nyckelord kan bara ge fler träffar, aldrig färre.

export const VIBRATION = {
  id: "vibration",
  namn: "Vibration while driving",
  omrade: "Wheels and balance",
  nyckelord: ["vibration", "vibrer", "skak", "obalans", "ojämn gång", "rattvibration", "vibrat", "shak", "shimm", "imbalance", "unbalance", "wheel wobble", "rough running"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verify the symptom",
      fragor: [
        { id: "hastighetsberoende", text: "Is the vibration speed-dependent?", svarstyp: "janej" },
        { id: "var", text: "Where is the vibration felt?", svarstyp: "val", val: ["In the steering wheel", "In the seat", "Throughout the vehicle"] },
        {
          id: "nar",
          text: "When does the vibration occur?",
          svarstyp: "val",
          val: ["Under acceleration", "At steady speed", "Under braking", "Always while driving"],
        },
        { id: "intervall", text: "Does it disappear above or below a certain speed range?", svarstyp: "text" },
      ],
    },
    {
      id: "visuell",
      rubrik: "Visual inspection",
      beskrivning: "Photograph every wheel. Keep observation separate from conclusion.",
      kontroller: [
        { id: "foto_vf", text: "Photograph the left front wheel", krav: "foto" },
        { id: "foto_hf", text: "Photograph the right front wheel", krav: "foto" },
        { id: "foto_vb", text: "Photograph the left rear wheel", krav: "foto" },
        { id: "foto_hb", text: "Photograph the right rear wheel", krav: "foto" },
        { id: "dot", text: "Document the DOT / manufacturing date", krav: "kommentar" },
        { id: "slitage", text: "Check tyre wear and the wear pattern", krav: "kommentar" },
      ],
    },
    {
      id: "kontroller",
      rubrik: "Measurements",
      kontroller: [
        { id: "lufttryck", text: "Check tyre pressure", krav: "matvarde" },
        { id: "hjulmoment", text: "Check wheel torque", krav: "matvarde" },
        { id: "kast", text: "Check radial and lateral runout", krav: "matvarde" },
        { id: "balansering", text: "Check wheel balance", krav: "kommentar" },
        { id: "bussningar", text: "Check bushings and joints", krav: "kommentar" },
      ],
    },
    {
      id: "provkorning",
      rubrik: "Road test",
      beskrivning: "Verify during the road test:",
      kontroller: [
        { id: "pk_hastighet", text: "Speed at which the vibration occurs", krav: "kommentar" },
        { id: "pk_acc", text: "Change under acceleration", krav: "kommentar" },
        { id: "pk_motorbroms", text: "Change under engine braking", krav: "kommentar" },
        { id: "pk_kurva", text: "Change when cornering", krav: "kommentar" },
        { id: "pk_var", text: "Whether the vibration is felt in the steering wheel or the body", krav: "kommentar" },
      ],
    },
  ],
};

export const ELSYSTEM = {
  id: "elsystem",
  namn: "Electrical system and power supply",
  omrade: "Electrical",
  nyckelord: ["relä", "rela", "säkring", "elektr", "spänning", "volt", "lampa", "belysning", "ström", "kortslut", "kabel", "kabla", "kontaktdon", "jordfel", "relay", "fuse", "electric", "voltage", "lamp", "light", "current", "short circuit", "wiring", "harness", "connector", "earth fault", "ground fault"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verify the symptom",
      fragor: [
        { id: "reproducerbart", text: "Can the fault be reproduced?", svarstyp: "janej" },
        {
          id: "omfattning",
          text: "Is the function completely dead or partly working?",
          svarstyp: "val",
          val: ["Completely dead", "Partly working", "Intermittent"],
        },
        { id: "funktion", text: "Which function is missing or faulty?", svarstyp: "text" },
        { id: "forandring", text: "Has anything been repaired or changed recently?", svarstyp: "text" },
      ],
    },
    {
      id: "visuell",
      rubrik: "Visual inspection",
      kontroller: [
        { id: "foto_komponent", text: "Photograph the component and its connections", krav: "foto" },
        { id: "skador", text: "Check for visible damage, corrosion and loose connectors", krav: "kommentar" },
      ],
    },
    {
      id: "matningar",
      rubrik: "Measurements",
      beskrivning: "Measure under load. A voltage without load says almost nothing about a poor connection.",
      kontroller: [
        { id: "batterispanning", text: "Measure battery voltage", krav: "matvarde" },
        { id: "sakringar", text: "Check the fuses concerned", krav: "kommentar" },
        { id: "matningsspanning", text: "Measure supply voltage at the component under load", krav: "matvarde" },
        { id: "jord", text: "Measure voltage drop to earth under load", krav: "matvarde" },
      ],
    },
    {
      id: "rela",
      rubrik: "Relay and control signal",
      kontroller: [
        { id: "rela_klick", text: "Check whether the relay clicks when energised", krav: "kommentar" },
        { id: "styrsignal", text: "Measure the control signal to the relay", krav: "matvarde" },
      ],
    },
    {
      id: "funktionstest",
      rubrik: "Function test",
      kontroller: [{ id: "test", text: "Perform a function test and document the result", krav: "kommentar" }],
    },
  ],
};

export const START_LADDNING = {
  id: "start_laddning",
  namn: "Starting and charging system",
  omrade: "Electrical",
  nyckelord: ["startar inte", "startproblem", "startmotor", "generator", "laddning", "batteriet dör", "urladdat", "batterilampa", "drar inte runt", "klick vid start", "will not start", "wont start", "no start", "starter", "alternator", "charging", "battery dies", "flat battery", "battery light", "does not crank", "click when starting"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verify the symptom",
      fragor: [
        {
          id: "beteende",
          text: "What happens when starting is attempted?",
          svarstyp: "val",
          val: ["Nothing at all", "A single click", "Cranks slowly", "Cranks normally but does not fire", "Starts intermittently"],
        },
        { id: "kallt_varmt", text: "Does the fault appear cold, warm or always?", svarstyp: "val", val: ["Cold", "Warm", "Always"] },
        { id: "stillestand", text: "How long has the vehicle stood between attempts?", svarstyp: "text" },
        { id: "laddat", text: "Has the battery been charged or replaced recently?", svarstyp: "text" },
      ],
    },
    {
      id: "batteri",
      rubrik: "Battery condition",
      beskrivning: "A weak battery causes consequential faults across the vehicle. Rule it out first.",
      kontroller: [
        { id: "vilospanning", text: "Measure resting voltage after at least one hour at rest", krav: "matvarde" },
        { id: "batteritest", text: "Load test — photograph the tester's result", krav: "foto" },
        { id: "poler", text: "Check battery terminals and earth straps", krav: "kommentar" },
      ],
    },
    {
      id: "start",
      rubrik: "Starting system",
      kontroller: [
        { id: "startspanning", text: "Measure voltage at the starter motor during cranking", krav: "matvarde" },
        { id: "spanningsfall_plus", text: "Measure voltage drop in the positive lead during cranking", krav: "matvarde" },
        { id: "spanningsfall_jord", text: "Measure voltage drop in the earth lead during cranking", krav: "matvarde" },
        { id: "startsignal", text: "Check the control signal to the starter relay", krav: "matvarde" },
      ],
    },
    {
      id: "laddning",
      rubrik: "Charging system",
      kontroller: [
        { id: "laddspanning", text: "Measure charging voltage at idle and at raised engine speed", krav: "matvarde" },
        { id: "rippel", text: "Measure ripple from the alternator", krav: "matvarde" },
        { id: "rem", text: "Check the drive belt and its tension", krav: "kommentar" },
      ],
    },
    {
      id: "krypstrom",
      rubrik: "Parasitic drain",
      beskrivning: "Only relevant when the battery discharges while the vehicle stands.",
      kontroller: [
        { id: "vilostrom", text: "Measure quiescent current once the vehicle has gone to sleep", krav: "matvarde" },
        { id: "sakringsdrag", text: "Localize the circuit by removing fuses one at a time", krav: "kommentar" },
      ],
    },
  ],
};

export const MOTOR_DRIFT = {
  id: "motor_drift",
  namn: "Engine running and power",
  omrade: "Engine",
  nyckelord: ["ryck", "tappar kraft", "effektbrist", "misständ", "ojämn tomgång", "tomgång", "motorlampa", "kraftlös", "hack", "går på tre", "jerk", "hesitat", "loses power", "power loss", "misfire", "rough idle", "idle", "engine light", "check engine", "gutless", "running on three"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verify the symptom",
      fragor: [
        {
          id: "nar",
          text: "When does the fault appear?",
          svarstyp: "val",
          val: ["On a cold start", "At idle", "Under load", "At a particular engine speed", "Always"],
        },
        { id: "varvtal", text: "At what engine speed or load?", svarstyp: "text" },
        { id: "varningslampa", text: "Is the engine warning lamp on or flashing?", svarstyp: "val", val: ["On steady", "Flashing", "Off"] },
        { id: "brankslebyte", text: "Was fuel added or service performed shortly before?", svarstyp: "text" },
      ],
    },
    {
      id: "felkoder",
      rubrik: "Fault codes and measured data",
      beskrivning: "Read before anything is dismantled. A fault code points to a circuit, not to a broken component.",
      kontroller: [
        { id: "dtc", text: "Read fault codes — photograph the diagnostic screen", krav: "foto" },
        { id: "frysdata", text: "Document the freeze frame data for the code", krav: "kommentar" },
        { id: "misstandning", text: "Read the misfire counter per cylinder", krav: "matvarde" },
        { id: "branslekorrigering", text: "Read short- and long-term fuel trim", krav: "matvarde" },
      ],
    },
    {
      id: "mekanik",
      rubrik: "Basic engine condition",
      beskrivning: "Without sound basic condition, every sensor value is hard to interpret.",
      kontroller: [
        { id: "kompression", text: "Measure compression, or relative compression", krav: "matvarde" },
        { id: "vevhustryck", text: "Check crankcase pressure", krav: "kommentar" },
        { id: "insugslackage", text: "Check the intake system for unmetered air", krav: "kommentar" },
      ],
    },
    {
      id: "tandning_bransle",
      rubrik: "Ignition and fuel",
      kontroller: [
        { id: "tandstift", text: "Check the spark plugs — photograph all of them", krav: "foto" },
        { id: "spolar", text: "Measure ignition coil resistance, or swap coils between cylinders", krav: "matvarde" },
        { id: "bransletryck", text: "Measure fuel pressure under load", krav: "matvarde" },
        { id: "insprutare", text: "Check injector return quantity or injector control", krav: "matvarde" },
      ],
    },
    {
      id: "provkorning",
      rubrik: "Road test with logging",
      kontroller: [
        { id: "logg", text: "Log measured data while driving where the fault appears", krav: "foto" },
        { id: "reproducerat", text: "Document the conditions under which the fault appeared", krav: "kommentar" },
      ],
    },
  ],
};

export const BROMSAR = {
  id: "bromsar",
  namn: "Braking system",
  omrade: "Chassis",
  nyckelord: ["broms", "bromspedal", "skevhet", "gnisslar vid inbromsning", "abs", "bromsvätska", "handbroms", "drar snett vid inbromsning", "brake", "brake pedal", "judder", "squeal when braking", "brake fluid", "handbrake", "parking brake", "pulls when braking"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verify the symptom",
      fragor: [
        {
          id: "karaktar",
          text: "How does the fault present?",
          svarstyp: "val",
          val: ["Judder or pulsation", "Abnormal noise", "Long pedal travel", "Soft pedal", "Pulls to one side", "The brake is binding"],
        },
        { id: "nar", text: "At what speed and braking force?", svarstyp: "text" },
        { id: "varningslampa", text: "Is the brake or ABS warning lamp on?", svarstyp: "janej" },
        { id: "senaste", text: "When were brake components last replaced?", svarstyp: "text" },
      ],
    },
    {
      id: "visuell",
      rubrik: "Visual inspection",
      kontroller: [
        { id: "foto_belagg", text: "Photograph pads and discs on every wheel", krav: "foto" },
        { id: "belaggtjocklek", text: "Measure pad thickness", krav: "matvarde" },
        { id: "skivtjocklek", text: "Measure disc thickness and compare with the minimum", krav: "matvarde" },
        { id: "lackage", text: "Check hoses, pipes and calipers for leaks", krav: "kommentar" },
      ],
    },
    {
      id: "matningar",
      rubrik: "Measurements",
      kontroller: [
        { id: "skivkast", text: "Measure disc runout with a dial gauge", krav: "matvarde" },
        { id: "tjockleksvariation", text: "Measure disc thickness variation", krav: "matvarde" },
        { id: "vatska", text: "Measure the brake fluid's boiling point or water content", krav: "matvarde" },
        { id: "okens_rorlighet", text: "Check that calipers and slide pins move freely", krav: "kommentar" },
      ],
    },
    {
      id: "system",
      rubrik: "System and ABS",
      kontroller: [
        { id: "dtc", text: "Read fault codes from the ABS control unit", krav: "foto" },
        { id: "hjulgivare", text: "Check the wheel speed sensor signals", krav: "matvarde" },
        { id: "bromsprov", text: "Perform a brake test on a test bench — photograph the report", krav: "foto" },
      ],
    },
  ],
};

export const STYRNING_FJADRING = {
  id: "styrning_fjadring",
  namn: "Steering and suspension",
  omrade: "Chassis",
  nyckelord: ["drar åt", "styrning", "ratt", "glapp", "stötdämpar", "fjäder", "fjädr", "hjulinställning", "spårar", "gungar", "knäpper i kurva", "servostyrning", "pulls", "steering", "steering wheel", "play", "damper", "shock absorber", "spring", "suspension", "wheel alignment", "tracking", "wallow", "clunk in corners", "power steering"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verify the symptom",
      fragor: [
        {
          id: "karaktar",
          text: "How does the fault present?",
          svarstyp: "val",
          val: ["Pulls to one side", "Play in the steering wheel", "Abnormal noise", "Poor road feel", "Uneven tyre wear", "Wallows or bounces"],
        },
        { id: "underlag", text: "Does it appear on a particular surface or in a particular corner?", svarstyp: "text" },
        { id: "handelse", text: "Has the vehicle struck something or hit a kerb?", svarstyp: "text" },
      ],
    },
    {
      id: "visuell",
      rubrik: "Visual inspection",
      kontroller: [
        { id: "foto_slitage", text: "Photograph the tyres' wear pattern", krav: "foto" },
        { id: "dampare", text: "Check dampers for leakage", krav: "kommentar" },
        { id: "damask", text: "Check boots on track rod ends and drive joints", krav: "kommentar" },
      ],
    },
    {
      id: "glapp",
      rubrik: "Play check",
      beskrivning: "Performed with the wheel unloaded. Document where the play is, not only that it exists.",
      kontroller: [
        { id: "hjullager", text: "Check wheel bearing play", krav: "kommentar" },
        { id: "styrleder", text: "Check track rod ends and ball joints", krav: "kommentar" },
        { id: "bussningar", text: "Check bushings", krav: "kommentar" },
        { id: "kuggstang", text: "Check the rack and the track rod ends", krav: "kommentar" },
      ],
    },
    {
      id: "installning",
      rubrik: "Wheel alignment",
      kontroller: [
        { id: "matning", text: "Measure wheel alignment — photograph the report before adjustment", krav: "foto" },
        { id: "avvikelse", text: "Document deviations from the manufacturer's values", krav: "matvarde" },
      ],
    },
  ],
};

export const KYLSYSTEM = {
  id: "kylsystem",
  namn: "Cooling system and overheating",
  omrade: "Engine",
  nyckelord: ["överhett", "koka", "kylvätska", "temperatur", "termostat", "kylare", "vattenpump", "värme i kupén", "expansionskärl", "overheat", "boiling", "coolant", "temperature", "thermostat", "radiator", "water pump", "cabin heat", "expansion tank"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verify the symptom",
      fragor: [
        {
          id: "nar",
          text: "When does the temperature rise?",
          svarstyp: "val",
          val: ["At idle", "At low speed", "At high speed", "Under load or on a hill", "Always"],
        },
        { id: "kylvatskeforlust", text: "Is coolant being lost? How much and how often?", svarstyp: "text" },
        { id: "varme", text: "Does the cabin heater work?", svarstyp: "janej" },
      ],
    },
    {
      id: "visuell",
      rubrik: "Visual inspection",
      kontroller: [
        { id: "niva", text: "Check the coolant level cold — photograph the expansion tank", krav: "foto" },
        { id: "lackage", text: "Check for visible leaks at hoses, radiator and pump", krav: "kommentar" },
        { id: "kylarpaket", text: "Check the radiator pack for blockage", krav: "foto" },
      ],
    },
    {
      id: "matningar",
      rubrik: "Measurements",
      kontroller: [
        { id: "trycktest", text: "Pressure test the cooling system", krav: "matvarde" },
        { id: "lock", text: "Pressure test the expansion tank cap", krav: "matvarde" },
        { id: "temperatur", text: "Measure inlet and outlet temperature at the radiator with an IR thermometer", krav: "matvarde" },
        { id: "flakt", text: "Check that the cooling fan starts at the correct temperature", krav: "kommentar" },
        { id: "givare", text: "Compare the control unit's temperature value with the measured one", krav: "matvarde" },
      ],
    },
    {
      id: "packning",
      rubrik: "Cylinder head gasket",
      beskrivning: "Performed when coolant is lost without an external leak.",
      kontroller: [
        { id: "avgastest", text: "Exhaust gas test in the coolant (CO2 test)", krav: "foto" },
        { id: "kompression_kyl", text: "Check the pressurisation of the cooling system with the engine running", krav: "kommentar" },
      ],
    },
  ],
};

export const DRIVLINA = {
  id: "drivlina",
  namn: "Transmission and driveline",
  omrade: "Driveline",
  nyckelord: ["växellåda", "växlar", "koppling", "automatlåda", "rycker vid växling", "slir", "drivknut", "kardan", "differential", "kärvar i växeln", "gearbox", "transmission", "shift", "clutch", "automatic", "jerks when shifting", "slip", "drive joint", "propshaft", "sticks in gear"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verify the symptom",
      fragor: [
        {
          id: "karaktar",
          text: "How does the fault present?",
          svarstyp: "val",
          val: ["Slips", "Jerks when shifting", "Will not engage a gear", "Abnormal noise", "Vibration under acceleration", "Leakage"],
        },
        { id: "vaxel", text: "Which gear or engine speed?", svarstyp: "text" },
        { id: "kall_varm", text: "Cold or warm transmission?", svarstyp: "val", val: ["Cold", "Warm", "No difference"] },
      ],
    },
    {
      id: "visuell",
      rubrik: "Visual inspection",
      kontroller: [
        { id: "olja", text: "Check the oil level and the oil's condition — photograph", krav: "foto" },
        { id: "lackage", text: "Check for leaks at seals and the sump", krav: "kommentar" },
        { id: "fasten", text: "Check the transmission mounts", krav: "kommentar" },
      ],
    },
    {
      id: "matningar",
      rubrik: "Measurements and readout",
      kontroller: [
        { id: "dtc", text: "Read fault codes from the transmission control unit", krav: "foto" },
        { id: "adaptioner", text: "Document adaptation values and clutch wear", krav: "matvarde" },
        { id: "oljetemp", text: "Measure oil temperature during the road test", krav: "matvarde" },
      ],
    },
    {
      id: "provkorning",
      rubrik: "Road test",
      kontroller: [
        { id: "vaxlingspunkter", text: "Document shift points and behaviour", krav: "kommentar" },
        { id: "belastning", text: "Road test under the load where the fault appears", krav: "kommentar" },
      ],
    },
  ],
};

export const AVGAS_EMISSION = {
  id: "avgas_emission",
  namn: "Exhaust system and emissions",
  omrade: "Engine",
  nyckelord: ["partikelfilt", "dpf", "adblue", "katalysator", "lambda", "avgas", "emission", "rökutveckling", "svart rök", "blå rök", "os", "egr", "regenerer", "utsläpp", "particulate filt", "catalyst", "exhaust", "smoke", "black smoke", "blue smoke", "regenerat"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verify the symptom",
      fragor: [
        {
          id: "karaktar",
          text: "How does the fault present?",
          svarstyp: "val",
          val: ["Warning lamp", "Smoke", "Power limitation", "Odour", "Failed inspection"],
        },
        { id: "rokfarg", text: "If smoke — what colour and when?", svarstyp: "text" },
        { id: "korprofil", text: "Describe the vehicle's usage profile (mostly short or long journeys)?", svarstyp: "text" },
      ],
    },
    {
      id: "avlasning",
      rubrik: "Readout",
      kontroller: [
        { id: "dtc", text: "Read fault codes — photograph the diagnostic screen", krav: "foto" },
        { id: "sotmangd", text: "Read the calculated and measured soot load in the particulate filter", krav: "matvarde" },
        { id: "regenerering", text: "Document the number and outcome of the most recent regenerations", krav: "kommentar" },
        { id: "lambda", text: "Read the lambda sensor signals before and after the catalyst", krav: "matvarde" },
      ],
    },
    {
      id: "matningar",
      rubrik: "Measurements",
      kontroller: [
        { id: "mottryck", text: "Measure exhaust back pressure", krav: "matvarde" },
        { id: "differenstryck", text: "Measure differential pressure across the particulate filter", krav: "matvarde" },
        { id: "adblue_niva", text: "Check AdBlue level and quality where fitted", krav: "matvarde" },
        { id: "egr", text: "Check the EGR valve's function and position", krav: "matvarde" },
      ],
    },
    {
      id: "orsak",
      rubrik: "Underlying cause",
      beskrivning: "A blocked filter is usually a consequence, not the cause. Document what produced the soot.",
      kontroller: [
        { id: "grundorsak", text: "Check injection, turbocharger and air flow", krav: "kommentar" },
        { id: "korstrackor", text: "Assess whether the usage profile allows regeneration", krav: "kommentar" },
      ],
    },
  ],
};

export const KLIMAT = {
  id: "klimat",
  namn: "Climate system",
  omrade: "Comfort",
  nyckelord: ["ac", "luftkonditionering", "klimatanläggning", "kyler inte", "kompressor", "köldmedi", "imma", "immig", "fläkt", "lukt i kupén", "värmepaket", "air conditioning", "climate", "no cooling", "compressor", "refrigerant", "misting", "fan", "smell in the cabin", "heater matrix"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verify the symptom",
      fragor: [
        {
          id: "karaktar",
          text: "How does the fault present?",
          svarstyp: "val",
          val: ["No cooling at all", "Cools poorly", "Cools intermittently", "Abnormal noise", "Odour", "Misting on the windows"],
        },
        { id: "sidor", text: "Does it differ between the right and left sides?", svarstyp: "janej" },
        { id: "service", text: "When was the AC last serviced?", svarstyp: "text" },
      ],
    },
    {
      id: "visuell",
      rubrik: "Visual inspection",
      kontroller: [
        { id: "kondensor", text: "Photograph the condenser — check for blockage and damage", krav: "foto" },
        { id: "kupefilter", text: "Check the cabin filter", krav: "foto" },
        { id: "kompressor_rem", text: "Check the compressor drive and the magnetic clutch", krav: "kommentar" },
      ],
    },
    {
      id: "matningar",
      rubrik: "Measurements",
      kontroller: [
        { id: "tryck", text: "Measure high and low pressure at a known ambient temperature", krav: "matvarde" },
        { id: "utblastemp", text: "Measure the outlet temperature at the centre vent", krav: "matvarde" },
        { id: "mangd", text: "Weigh the refrigerant recovered when evacuating", krav: "matvarde" },
        { id: "lackagesok", text: "Trace the leak with tracer gas or UV", krav: "kommentar" },
      ],
    },
    {
      id: "styrning",
      rubrik: "Steering",
      kontroller: [
        { id: "dtc", text: "Read fault codes from the climate control unit", krav: "foto" },
        { id: "spjall", text: "Check the movement of the flap actuators", krav: "kommentar" },
      ],
    },
  ],
};

export const HOGVOLT = {
  id: "hogvolt",
  namn: "High-voltage system — electric and hybrid",
  omrade: "High voltage",
  nyckelord: ["högvolt", "elbil", "hybrid", "traktionsbatteri", "hv", "laddning av bil", "räckvidd", "laddbox", "orange kabel", "sköldpadda", "pulls", "steering", "steering wheel", "play", "damper", "shock absorber", "spring", "suspension", "wheel alignment", "tracking", "wallow", "clunk in corners", "power steering", "high voltage", "high-voltage", "ev", "electric vehicle", "traction battery", "charging the car", "range", "wallbox", "orange cable", "turtle"],
  steg: [
    {
      id: "sakerhet",
      rubrik: "Safety — performed first",
      beskrivning:
        "High-voltage systems can be lethal. No work on the system begins until the steps below are documented. Requires authorisation for work on high-voltage systems.",
      fragor: [
        { id: "behorighet", text: "Are you authorised to work on high-voltage systems?", svarstyp: "janej" },
        { id: "avstangt", text: "Is the vehicle de-energised per the manufacturer's procedure?", svarstyp: "janej" },
      ],
      kontroller: [
        { id: "service_disconnect", text: "Document that the service disconnect is removed and secured", krav: "foto" },
        { id: "vantetid", text: "Document the waiting time per the manufacturer's instruction", krav: "kommentar" },
        { id: "spanningsfrihet", text: "Measure and document the absence of voltage before any work", krav: "matvarde" },
        { id: "skyddsutrustning", text: "Document the protective equipment used and the area cordoned off", krav: "foto" },
      ],
    },
    {
      id: "symptom",
      rubrik: "Verify the symptom",
      fragor: [
        {
          id: "karaktar",
          text: "How does the fault present?",
          svarstyp: "val",
          val: ["Will not charge", "Reduced range", "Power limitation", "Varningsmeddelande", "The vehicle will not start"],
        },
        { id: "laddtyp", text: "At which charge type does the fault appear (AC, DC, which charge point)?", svarstyp: "text" },
        { id: "temperatur", text: "At what ambient and battery temperature?", svarstyp: "text" },
      ],
    },
    {
      id: "avlasning",
      rubrik: "Readout",
      beskrivning: "Performed with a diagnostic tool — no intervention in the system is required.",
      kontroller: [
        { id: "dtc", text: "Read fault codes from every high-voltage control unit", krav: "foto" },
        { id: "soh", text: "Read the battery's state of health (SOH) and state of charge (SOC)", krav: "matvarde" },
        { id: "cellspanning", text: "Read cell voltages and document the largest deviation", krav: "matvarde" },
        { id: "isolationsvarde", text: "Read the system's insulation value", krav: "matvarde" },
        { id: "temperaturer", text: "Read the battery temperature sensors", krav: "matvarde" },
      ],
    },
    {
      id: "laddning",
      rubrik: "Charging chain",
      kontroller: [
        { id: "laddkabel", text: "Check the charging cable and connector — photograph the pins", krav: "foto" },
        { id: "laddlogg", text: "Read the charging history and the reasons for interruptions", krav: "kommentar" },
        { id: "extern", text: "Test against another charge point to rule out an external cause", krav: "kommentar" },
      ],
    },
  ],
};

export const DIAGNOS_NATVERK = {
  id: "diagnos_natverk",
  namn: "Fault codes and communication",
  omrade: "Diagnostics",
  nyckelord: ["felkod", "dtc", "can", "canbuss", "kommunikationsfel", "ingen kontakt", "styrenhet", "obd", "diagnos", "flera lampor", "fault code", "can bus", "communication fault", "no communication", "control unit", "ecu", "several lamps"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verify the symptom",
      fragor: [
        {
          id: "omfattning",
          text: "How many systems are affected?",
          svarstyp: "val",
          val: ["One control unit", "Several control units", "The whole vehicle", "The diagnostic tool only"],
        },
        { id: "nar", text: "Did the fault appear after work, a battery change or an update?", svarstyp: "text" },
      ],
    },
    {
      id: "grund",
      rubrik: "Basic preconditions",
      beskrivning: "Communication faults are more often due to supply and earth than to the control unit.",
      kontroller: [
        { id: "batteri", text: "Measure battery voltage during the readout", krav: "matvarde" },
        { id: "obd_matning", text: "Measure supply and earth at the diagnostic socket", krav: "matvarde" },
        { id: "sakringar", text: "Check the fuses for the control units concerned", krav: "kommentar" },
      ],
    },
    {
      id: "buss",
      rubrik: "Bus measurement",
      kontroller: [
        { id: "terminering", text: "Measure the bus termination resistance with the system de-energised", krav: "matvarde" },
        { id: "bussignal", text: "Measure the CAN signal with an oscilloscope — photograph the trace", krav: "foto" },
        { id: "avdelning", text: "Split the bus to localize the disturbing node", krav: "kommentar" },
      ],
    },
    {
      id: "koder",
      rubrik: "Fault codes in context",
      beskrivning: "A fault code points to a circuit, not to a broken component. Read every system before any code is cleared.",
      kontroller: [
        { id: "helavlasning", text: "Read every control unit — photograph the list", krav: "foto" },
        { id: "frysdata", text: "Document the freeze frame data before clearing", krav: "kommentar" },
        { id: "efter_radering", text: "Clear, road test, and document which codes returned", krav: "kommentar" },
      ],
    },
  ],
};

export const LACKAGE = {
  id: "lackage",
  namn: "Leakage",
  omrade: "General",
  nyckelord: ["läck", "läckage", "oljefläck", "dropp", "vatten i bilen", "fukt", "blöt matta", "oljeförbrukning", "leak", "leakage", "oil stain", "drip", "water in the car", "damp", "wet carpet", "oil consumption"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verify the symptom",
      fragor: [
        {
          id: "vatska",
          text: "Which fluid is suspected?",
          svarstyp: "val",
          val: ["Engine oil", "Coolant", "Transmission oil", "Brake fluid", "Fuel", "Water or condensation", "Unknown"],
        },
        { id: "mangd", text: "How much and how often?", svarstyp: "text" },
        { id: "plats", text: "Where on the ground is the stain relative to the vehicle?", svarstyp: "text" },
      ],
    },
    {
      id: "visuell",
      rubrik: "Localization",
      beskrivning: "Clean first. An old leak hides where the new one comes from.",
      kontroller: [
        { id: "foto_fore", text: "Photograph the area before cleaning", krav: "foto" },
        { id: "rengoring", text: "Clean the area and document that it is dry", krav: "foto" },
        { id: "provkorning", text: "Road test, or let it run, and photograph where the fluid appears", krav: "foto" },
      ],
    },
    {
      id: "metod",
      rubrik: "Leak tracing",
      kontroller: [
        { id: "uv", text: "Leak test with UV dye where applicable", krav: "kommentar" },
        { id: "trycktest", text: "Pressure test the system", krav: "matvarde" },
        { id: "niva", text: "Measure the change in level over time", krav: "matvarde" },
      ],
    },
  ],
};

export const MISSLJUD = {
  id: "missljud",
  namn: "Abnormal noise",
  omrade: "General",
  nyckelord: ["missljud", "ljud", "knack", "gnissel", "gnissl", "vinande", "brumm", "skram", "väsande", "tjut", "noise", "sound", "knock", "squeak", "squeal", "whine", "drone", "rattle", "hiss", "screech"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verify the symptom",
      beskrivning: "An abnormal noise that has not been reproduced cannot be repaired. Record it.",
      fragor: [
        {
          id: "karaktar",
          text: "What is the character of the noise?",
          svarstyp: "val",
          val: ["Knock", "Squeal", "Whine", "Drone", "Rattle", "Hissing", "Screech"],
        },
        {
          id: "nar",
          text: "When is it heard?",
          svarstyp: "val",
          val: ["On starting", "At idle", "While driving", "Under braking", "When cornering", "Over bumps"],
        },
        { id: "beroende", text: "Does the noise follow engine speed or road speed?", svarstyp: "val", val: ["Engine speed", "Road speed", "Neither"] },
        { id: "temperatur", text: "Any difference cold versus warm?", svarstyp: "text" },
      ],
    },
    {
      id: "inspelning",
      rubrik: "Document the noise",
      beskrivning: "Video with sound is evidence. A description in text is not.",
      kontroller: [
        { id: "video", text: "Record the noise on video under the conditions in which it occurs", krav: "foto" },
        { id: "forhallanden", text: "Document road speed, engine speed and surface during the recording", krav: "kommentar" },
      ],
    },
    {
      id: "lokalisering",
      rubrik: "Localization",
      kontroller: [
        { id: "stetoskop", text: "Localize with a stethoscope or sound probe", krav: "kommentar" },
        { id: "avlastning", text: "Check whether the noise changes when unloaded or loaded", krav: "kommentar" },
        { id: "uteslutning", text: "Document which sources were ruled out, and how", krav: "kommentar" },
      ],
    },
  ],
};

export const ADAS = {
  id: "adas",
  namn: "Driver assistance and calibration",
  omrade: "Diagnostics",
  nyckelord: ["adas", "kamera", "radar", "filhållning", "adaptiv farthållare", "kalibrer", "vindruta", "parkeringssensor", "döda vinkeln", "nödbroms", "camera", "lane keep", "adaptive cruise", "calibrat", "windscreen", "windshield", "parking sensor", "blind spot", "emergency brak"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verify the symptom",
      fragor: [
        {
          id: "funktion",
          text: "Which function is faulty?",
          svarstyp: "val",
          val: ["Lane keeping", "Adaptive cruise control", "Automatic emergency braking", "Blind spot", "Parking aid", "Reversing camera"],
        },
        { id: "ingrepp", text: "Have the windscreen, body or suspension been worked on recently?", svarstyp: "text" },
        { id: "forhallanden", text: "Does the fault appear in particular weather or light?", svarstyp: "text" },
      ],
    },
    {
      id: "forutsattningar",
      rubrik: "Preconditions for calibration",
      beskrivning:
        "A calibration performed under the wrong preconditions produces a fault that looks repaired. Document that the requirements are met before it is carried out.",
      kontroller: [
        { id: "dtc", text: "Read fault codes from the control units concerned", krav: "foto" },
        { id: "hjulinstallning", text: "Check wheel alignment — rear axle tracking affects the camera", krav: "matvarde" },
        { id: "dacktryck", text: "Check tyre pressure and ride height", krav: "matvarde" },
        { id: "sikt", text: "Check the camera's and radar's field of view for dirt or damage", krav: "foto" },
        { id: "yta", text: "Document that the calibration area meets the requirements for flatness and lighting", krav: "foto" },
      ],
    },
    {
      id: "kalibrering",
      rubrik: "Calibration",
      kontroller: [
        { id: "utford", text: "Perform the calibration by the manufacturer's method — photograph the result", krav: "foto" },
        { id: "provkorning", text: "Road test and verify the function under the conditions in which the fault appeared", krav: "kommentar" },
      ],
    },
  ],
};

export const GENERISK = {
  id: "generisk",
  namn: "General structured diagnosis",
  omrade: "General",
  nyckelord: [],
  steg: [
    {
      id: "symptom",
      rubrik: "Verify the symptom",
      fragor: [
        { id: "reproducerbart", text: "Can the fault be reproduced?", svarstyp: "janej" },
        {
          id: "nar",
          text: "When does the fault appear?",
          svarstyp: "val",
          val: ["Always", "Intermittently", "Only while running", "Only when starting"],
        },
        {
          id: "var",
          text: "Where is the fault experienced?",
          svarstyp: "val",
          val: ["Front", "Rear", "Right", "Left", "Engine and power source", "Cabin and driver's position", "Unknown"],
        },
        {
          id: "hur",
          text: "How is the fault experienced?",
          svarstyp: "val",
          val: ["Shakes or vibrates", "Abnormal noise (knock, squeal, whine)", "Jerking", "Loses power", "Stalls completely", "Other"],
        },
        { id: "forlopp", text: "Describe the sequence when the fault occurs", svarstyp: "text" },
        { id: "forandring", text: "Has anything changed recently (service, repair, environment)?", svarstyp: "text" },
      ],
    },
    {
      id: "visuell",
      rubrik: "Visual inspection",
      kontroller: [
        { id: "foto_objekt", text: "Photograph the object and the area concerned", krav: "foto" },
        { id: "skador", text: "Check for visible damage, leaks or loose connections", krav: "kommentar" },
        { id: "typskylt", text: "Document the type plate or marking", krav: "foto" },
      ],
    },
    {
      id: "grundkontroller",
      rubrik: "Basic checks",
      kontroller: [
        {
          id: "matning",
          text: "Take basic measurements (voltage, pressure, temperature — whatever is relevant)",
          krav: "matvarde",
        },
        { id: "sakringar", text: "Check fuses and protective devices", krav: "kommentar" },
        { id: "anslutningar", text: "Check connectors and terminations", krav: "kommentar" },
      ],
    },
    {
      id: "funktionstest",
      rubrik: "Function test",
      kontroller: [{ id: "test", text: "Perform a function test and document the result", krav: "kommentar" }],
    },
  ],
};

// Ordningen styr bara hur de visas. Valet görs på nyckelord, inte på
// position — GENERISK ligger sist eftersom den är fallback.
export const ALLA_METODIKER = [
  VIBRATION,
  BROMSAR,
  STYRNING_FJADRING,
  ELSYSTEM,
  START_LADDNING,
  MOTOR_DRIFT,
  KYLSYSTEM,
  DRIVLINA,
  AVGAS_EMISSION,
  KLIMAT,
  HOGVOLT,
  DIAGNOS_NATVERK,
  LACKAGE,
  MISSLJUD,
  ADAS,
  GENERISK,
];
