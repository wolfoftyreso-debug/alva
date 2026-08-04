// Metodikbiblioteket.
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

import type { Metodik } from "./metodik";

export const VIBRATION: Metodik = {
  id: "vibration",
  namn: "Vibration under körning",
  omrade: "Hjul och balans",
  nyckelord: ["vibration", "vibrer", "skak", "obalans", "ojämn gång", "rattvibration"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verifiera symptom",
      fragor: [
        { id: "hastighetsberoende", text: "Är vibrationen hastighetsberoende?", svarstyp: "janej" },
        { id: "var", text: "Var känns vibrationen?", svarstyp: "val", val: ["I ratten", "I stolen", "I hela bilen"] },
        {
          id: "nar",
          text: "När uppstår vibrationen?",
          svarstyp: "val",
          val: ["Vid acceleration", "Vid jämn fart", "Vid inbromsning", "Alltid under körning"],
        },
        { id: "intervall", text: "Försvinner den över eller under ett visst hastighetsintervall?", svarstyp: "text" },
      ],
    },
    {
      id: "visuell",
      rubrik: "Visuell kontroll",
      beskrivning: "Fotografera samtliga hjul. Skilj på observation och slutsats.",
      kontroller: [
        { id: "foto_vf", text: "Fotografera vänster framhjul", krav: "foto" },
        { id: "foto_hf", text: "Fotografera höger framhjul", krav: "foto" },
        { id: "foto_vb", text: "Fotografera vänster bakhjul", krav: "foto" },
        { id: "foto_hb", text: "Fotografera höger bakhjul", krav: "foto" },
        { id: "dot", text: "Dokumentera DOT-/tillverkningsdatum", krav: "kommentar" },
        { id: "slitage", text: "Kontrollera däckslitage och slitagemönster", krav: "kommentar" },
      ],
    },
    {
      id: "kontroller",
      rubrik: "Mätningar",
      kontroller: [
        { id: "lufttryck", text: "Kontrollera lufttryck", krav: "matvarde" },
        { id: "hjulmoment", text: "Kontrollera hjulmoment", krav: "matvarde" },
        { id: "kast", text: "Kontrollera radial- och sidokast", krav: "matvarde" },
        { id: "balansering", text: "Kontrollera hjulbalansering", krav: "kommentar" },
        { id: "bussningar", text: "Kontrollera bussningar och leder", krav: "kommentar" },
      ],
    },
    {
      id: "provkorning",
      rubrik: "Provkörning",
      beskrivning: "Verifiera under provkörning:",
      kontroller: [
        { id: "pk_hastighet", text: "Hastighet där vibration uppstår", krav: "kommentar" },
        { id: "pk_acc", text: "Förändring vid acceleration", krav: "kommentar" },
        { id: "pk_motorbroms", text: "Förändring vid motorbroms", krav: "kommentar" },
        { id: "pk_kurva", text: "Förändring vid kurvtagning", krav: "kommentar" },
        { id: "pk_var", text: "Om vibration känns i ratt eller kaross", krav: "kommentar" },
      ],
    },
  ],
};

export const ELSYSTEM: Metodik = {
  id: "elsystem",
  namn: "Elsystem och strömförsörjning",
  omrade: "El",
  nyckelord: ["relä", "rela", "säkring", "elektr", "spänning", "volt", "lampa", "belysning", "ström", "kortslut", "kabel", "kabla", "kontaktdon", "jordfel"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verifiera symptom",
      fragor: [
        { id: "reproducerbart", text: "Går felet att reproducera?", svarstyp: "janej" },
        {
          id: "omfattning",
          text: "Är funktionen helt död eller delvis fungerande?",
          svarstyp: "val",
          val: ["Helt död", "Delvis fungerande", "Intermittent"],
        },
        { id: "funktion", text: "Vilken funktion saknas eller felar?", svarstyp: "text" },
        { id: "forandring", text: "Har något åtgärdats eller förändrats nyligen?", svarstyp: "text" },
      ],
    },
    {
      id: "visuell",
      rubrik: "Visuell kontroll",
      kontroller: [
        { id: "foto_komponent", text: "Fotografera komponenten och dess anslutningar", krav: "foto" },
        { id: "skador", text: "Kontrollera synliga skador, korrosion och lösa kontaktdon", krav: "kommentar" },
      ],
    },
    {
      id: "matningar",
      rubrik: "Mätningar",
      beskrivning: "Mät under belastning. En spänning utan last säger nästan ingenting om en dålig förbindelse.",
      kontroller: [
        { id: "batterispanning", text: "Mät batterispänning", krav: "matvarde" },
        { id: "sakringar", text: "Kontrollera berörda säkringar", krav: "kommentar" },
        { id: "matningsspanning", text: "Mät matningsspänning vid komponenten under last", krav: "matvarde" },
        { id: "jord", text: "Mät spänningsfall mot jord under last", krav: "matvarde" },
      ],
    },
    {
      id: "rela",
      rubrik: "Relä och styrsignal",
      kontroller: [
        { id: "rela_klick", text: "Kontrollera om reläet klickar vid aktivering", krav: "kommentar" },
        { id: "styrsignal", text: "Mät styrsignal till reläet", krav: "matvarde" },
      ],
    },
    {
      id: "funktionstest",
      rubrik: "Funktionstest",
      kontroller: [{ id: "test", text: "Genomför funktionstest och dokumentera resultatet", krav: "kommentar" }],
    },
  ],
};

export const START_LADDNING: Metodik = {
  id: "start_laddning",
  namn: "Start- och laddningssystem",
  omrade: "El",
  nyckelord: ["startar inte", "startproblem", "startmotor", "generator", "laddning", "batteriet dör", "urladdat", "batterilampa", "drar inte runt", "klick vid start"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verifiera symptom",
      fragor: [
        {
          id: "beteende",
          text: "Vad händer vid startförsök?",
          svarstyp: "val",
          val: ["Ingenting alls", "Ett klick", "Drar runt långsamt", "Drar runt normalt men tänder inte", "Startar ibland"],
        },
        { id: "kallt_varmt", text: "Uppträder felet kallt, varmt eller alltid?", svarstyp: "val", val: ["Kallt", "Varmt", "Alltid"] },
        { id: "stillestand", text: "Hur länge har fordonet stått mellan försöken?", svarstyp: "text" },
        { id: "laddat", text: "Har batteriet laddats eller bytts nyligen?", svarstyp: "text" },
      ],
    },
    {
      id: "batteri",
      rubrik: "Batteriets kondition",
      beskrivning: "Ett svagt batteri ger följdfel i hela fordonet. Uteslut det först.",
      kontroller: [
        { id: "vilospanning", text: "Mät vilospänning efter minst en timmes vila", krav: "matvarde" },
        { id: "batteritest", text: "Belastningstest — fotografera testarens resultat", krav: "foto" },
        { id: "poler", text: "Kontrollera polskor och jordflätor", krav: "kommentar" },
      ],
    },
    {
      id: "start",
      rubrik: "Startsystem",
      kontroller: [
        { id: "startspanning", text: "Mät spänning vid startmotorn under startförsök", krav: "matvarde" },
        { id: "spanningsfall_plus", text: "Mät spänningsfall i plusledningen under start", krav: "matvarde" },
        { id: "spanningsfall_jord", text: "Mät spänningsfall i jordledningen under start", krav: "matvarde" },
        { id: "startsignal", text: "Kontrollera styrsignal till startrelä", krav: "matvarde" },
      ],
    },
    {
      id: "laddning",
      rubrik: "Laddningssystem",
      kontroller: [
        { id: "laddspanning", text: "Mät laddspänning vid tomgång och vid förhöjt varvtal", krav: "matvarde" },
        { id: "rippel", text: "Mät rippel från generatorn", krav: "matvarde" },
        { id: "rem", text: "Kontrollera drivrem och spänning", krav: "kommentar" },
      ],
    },
    {
      id: "krypstrom",
      rubrik: "Krypström",
      beskrivning: "Endast relevant när batteriet laddar ur under stillestånd.",
      kontroller: [
        { id: "vilostrom", text: "Mät viloström efter att fordonet somnat", krav: "matvarde" },
        { id: "sakringsdrag", text: "Lokalisera krets genom successiv säkringsurtagning", krav: "kommentar" },
      ],
    },
  ],
};

export const MOTOR_DRIFT: Metodik = {
  id: "motor_drift",
  namn: "Motorgång och effekt",
  omrade: "Motor",
  nyckelord: ["ryck", "tappar kraft", "effektbrist", "misständ", "ojämn tomgång", "tomgång", "motorlampa", "kraftlös", "hack", "går på tre"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verifiera symptom",
      fragor: [
        {
          id: "nar",
          text: "När uppträder felet?",
          svarstyp: "val",
          val: ["Vid kallstart", "Vid tomgång", "Under belastning", "Vid visst varvtal", "Alltid"],
        },
        { id: "varvtal", text: "Vid vilket varvtal eller vilken last?", svarstyp: "text" },
        { id: "varningslampa", text: "Lyser eller blinkar motorlampan?", svarstyp: "val", val: ["Lyser fast", "Blinkar", "Slocknad"] },
        { id: "brankslebyte", text: "Har bränsle tankats eller service utförts strax innan?", svarstyp: "text" },
      ],
    },
    {
      id: "felkoder",
      rubrik: "Felkoder och mätdata",
      beskrivning: "Läs innan något demonteras. En felkod pekar på en krets, inte på en trasig komponent.",
      kontroller: [
        { id: "dtc", text: "Läs felkoder — fotografera diagnosskärmen", krav: "foto" },
        { id: "frysdata", text: "Dokumentera frysramsdata för koden", krav: "kommentar" },
        { id: "misstandning", text: "Läs misständningsräknare per cylinder", krav: "matvarde" },
        { id: "branslekorrigering", text: "Läs kort- och långtidsbränslekorrigering", krav: "matvarde" },
      ],
    },
    {
      id: "mekanik",
      rubrik: "Motorns grundkondition",
      beskrivning: "Utan grundkondition är alla givarvärden svåra att tolka.",
      kontroller: [
        { id: "kompression", text: "Mät kompression eller relativ kompression", krav: "matvarde" },
        { id: "vevhustryck", text: "Kontrollera vevhustryck", krav: "kommentar" },
        { id: "insugslackage", text: "Kontrollera insugssystemet för falskluft", krav: "kommentar" },
      ],
    },
    {
      id: "tandning_bransle",
      rubrik: "Tändning och bränsle",
      kontroller: [
        { id: "tandstift", text: "Kontrollera tändstift — fotografera samtliga", krav: "foto" },
        { id: "spolar", text: "Mät tändspolarnas resistans eller byt mellan cylindrar", krav: "matvarde" },
        { id: "bransletryck", text: "Mät bränsletryck under belastning", krav: "matvarde" },
        { id: "insprutare", text: "Kontrollera insprutarnas returmängd eller styrning", krav: "matvarde" },
      ],
    },
    {
      id: "provkorning",
      rubrik: "Provkörning med loggning",
      kontroller: [
        { id: "logg", text: "Logga mätdata under körning där felet uppträder", krav: "foto" },
        { id: "reproducerat", text: "Dokumentera under vilka förhållanden felet uppträdde", krav: "kommentar" },
      ],
    },
  ],
};

export const BROMSAR: Metodik = {
  id: "bromsar",
  namn: "Bromssystem",
  omrade: "Chassi",
  nyckelord: ["broms", "bromspedal", "skevhet", "gnisslar vid inbromsning", "abs", "bromsvätska", "handbroms", "drar snett vid inbromsning"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verifiera symptom",
      fragor: [
        {
          id: "karaktar",
          text: "Hur yttrar sig felet?",
          svarstyp: "val",
          val: ["Skevhet/pulsering", "Missljud", "Lång pedalväg", "Mjuk pedal", "Drar åt sidan", "Bromsen ligger på"],
        },
        { id: "nar", text: "Vid vilken hastighet och bromskraft?", svarstyp: "text" },
        { id: "varningslampa", text: "Lyser broms- eller ABS-varning?", svarstyp: "janej" },
        { id: "senaste", text: "När byttes bromskomponenter senast?", svarstyp: "text" },
      ],
    },
    {
      id: "visuell",
      rubrik: "Visuell kontroll",
      kontroller: [
        { id: "foto_belagg", text: "Fotografera belägg och skivor på samtliga hjul", krav: "foto" },
        { id: "belaggtjocklek", text: "Mät beläggtjocklek", krav: "matvarde" },
        { id: "skivtjocklek", text: "Mät skivtjocklek och jämför med minmått", krav: "matvarde" },
        { id: "lackage", text: "Kontrollera slangar, rör och ok för läckage", krav: "kommentar" },
      ],
    },
    {
      id: "matningar",
      rubrik: "Mätningar",
      kontroller: [
        { id: "skivkast", text: "Mät skivkast med mätklocka", krav: "matvarde" },
        { id: "tjockleksvariation", text: "Mät tjockleksvariation på skivan", krav: "matvarde" },
        { id: "vatska", text: "Mät bromsvätskans kokpunkt eller vatteninnehåll", krav: "matvarde" },
        { id: "okens_rorlighet", text: "Kontrollera okens och styrbultarnas rörlighet", krav: "kommentar" },
      ],
    },
    {
      id: "system",
      rubrik: "System och ABS",
      kontroller: [
        { id: "dtc", text: "Läs felkoder ur ABS-styrenheten", krav: "foto" },
        { id: "hjulgivare", text: "Kontrollera hjulhastighetsgivarnas signal", krav: "matvarde" },
        { id: "bromsprov", text: "Utför bromsprov i provbänk — fotografera protokollet", krav: "foto" },
      ],
    },
  ],
};

export const STYRNING_FJADRING: Metodik = {
  id: "styrning_fjadring",
  namn: "Styrning och fjädring",
  omrade: "Chassi",
  nyckelord: ["drar åt", "styrning", "ratt", "glapp", "stötdämpar", "fjäder", "fjädr", "hjulinställning", "spårar", "gungar", "knäpper i kurva", "servostyrning"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verifiera symptom",
      fragor: [
        {
          id: "karaktar",
          text: "Hur yttrar sig felet?",
          svarstyp: "val",
          val: ["Drar åt sidan", "Glapp i ratten", "Missljud", "Dålig vägkänsla", "Ojämnt däckslitage", "Gungar/studsar"],
        },
        { id: "underlag", text: "Uppträder det på visst underlag eller i viss kurva?", svarstyp: "text" },
        { id: "handelse", text: "Har fordonet kört på något eller varit i kontakt med trottoarkant?", svarstyp: "text" },
      ],
    },
    {
      id: "visuell",
      rubrik: "Visuell kontroll",
      kontroller: [
        { id: "foto_slitage", text: "Fotografera däckens slitagemönster", krav: "foto" },
        { id: "dampare", text: "Kontrollera dämpare för läckage", krav: "kommentar" },
        { id: "damask", text: "Kontrollera damasker på styrleder och drivknutar", krav: "kommentar" },
      ],
    },
    {
      id: "glapp",
      rubrik: "Glappkontroll",
      beskrivning: "Utförs med hjulet avlastat. Dokumentera var glappet finns, inte bara att det finns.",
      kontroller: [
        { id: "hjullager", text: "Kontrollera hjullagerspel", krav: "kommentar" },
        { id: "styrleder", text: "Kontrollera styr- och bärleder", krav: "kommentar" },
        { id: "bussningar", text: "Kontrollera bussningar", krav: "kommentar" },
        { id: "kuggstang", text: "Kontrollera kuggstång och styrstagsändar", krav: "kommentar" },
      ],
    },
    {
      id: "installning",
      rubrik: "Hjulinställning",
      kontroller: [
        { id: "matning", text: "Mät hjulinställning — fotografera protokollet före justering", krav: "foto" },
        { id: "avvikelse", text: "Dokumentera avvikelser mot tillverkarens värden", krav: "matvarde" },
      ],
    },
  ],
};

export const KYLSYSTEM: Metodik = {
  id: "kylsystem",
  namn: "Kylsystem och överhettning",
  omrade: "Motor",
  nyckelord: ["överhett", "koka", "kylvätska", "temperatur", "termostat", "kylare", "vattenpump", "värme i kupén", "expansionskärl"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verifiera symptom",
      fragor: [
        {
          id: "nar",
          text: "När stiger temperaturen?",
          svarstyp: "val",
          val: ["Vid tomgång", "I låg fart", "I hög fart", "Vid belastning/backe", "Alltid"],
        },
        { id: "kylvatskeforlust", text: "Förloras kylvätska? Hur mycket och hur ofta?", svarstyp: "text" },
        { id: "varme", text: "Fungerar kupévärmen?", svarstyp: "janej" },
      ],
    },
    {
      id: "visuell",
      rubrik: "Visuell kontroll",
      kontroller: [
        { id: "niva", text: "Kontrollera kylvätskenivå kall — fotografera expansionskärlet", krav: "foto" },
        { id: "lackage", text: "Kontrollera synligt läckage vid slangar, kylare och pump", krav: "kommentar" },
        { id: "kylarpaket", text: "Kontrollera kylarpaketet för igensättning", krav: "foto" },
      ],
    },
    {
      id: "matningar",
      rubrik: "Mätningar",
      kontroller: [
        { id: "trycktest", text: "Trycktesta kylsystemet", krav: "matvarde" },
        { id: "lock", text: "Trycktesta expansionskärlets lock", krav: "matvarde" },
        { id: "temperatur", text: "Mät temperatur in och ut ur kylaren med IR-termometer", krav: "matvarde" },
        { id: "flakt", text: "Kontrollera att kylfläkten startar vid rätt temperatur", krav: "kommentar" },
        { id: "givare", text: "Jämför styrenhetens temperaturvärde med uppmätt", krav: "matvarde" },
      ],
    },
    {
      id: "packning",
      rubrik: "Topplockspackning",
      beskrivning: "Görs när kylvätska förloras utan yttre läckage.",
      kontroller: [
        { id: "avgastest", text: "Avgastest i kylvätskan (CO2-test)", krav: "foto" },
        { id: "kompression_kyl", text: "Kontrollera trycksättning av kylsystemet vid motorgång", krav: "kommentar" },
      ],
    },
  ],
};

export const DRIVLINA: Metodik = {
  id: "drivlina",
  namn: "Växellåda och drivlina",
  omrade: "Drivlina",
  nyckelord: ["växellåda", "växlar", "koppling", "automatlåda", "rycker vid växling", "slir", "drivknut", "kardan", "differential", "kärvar i växeln"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verifiera symptom",
      fragor: [
        {
          id: "karaktar",
          text: "Hur yttrar sig felet?",
          svarstyp: "val",
          val: ["Slirar", "Rycker vid växling", "Går inte i växel", "Missljud", "Vibration vid acceleration", "Läckage"],
        },
        { id: "vaxel", text: "Vilken växel eller vilket varvtal?", svarstyp: "text" },
        { id: "kall_varm", text: "Kall eller varm låda?", svarstyp: "val", val: ["Kall", "Varm", "Ingen skillnad"] },
      ],
    },
    {
      id: "visuell",
      rubrik: "Visuell kontroll",
      kontroller: [
        { id: "olja", text: "Kontrollera oljenivå och oljans skick — fotografera", krav: "foto" },
        { id: "lackage", text: "Kontrollera läckage vid tätningar och sump", krav: "kommentar" },
        { id: "fasten", text: "Kontrollera växellådsfästen", krav: "kommentar" },
      ],
    },
    {
      id: "matningar",
      rubrik: "Mätningar och avläsning",
      kontroller: [
        { id: "dtc", text: "Läs felkoder ur växellådsstyrenheten", krav: "foto" },
        { id: "adaptioner", text: "Dokumentera adaptionsvärden och kopplingsslitage", krav: "matvarde" },
        { id: "oljetemp", text: "Mät oljetemperatur under provkörning", krav: "matvarde" },
      ],
    },
    {
      id: "provkorning",
      rubrik: "Provkörning",
      kontroller: [
        { id: "vaxlingspunkter", text: "Dokumentera växlingspunkter och beteende", krav: "kommentar" },
        { id: "belastning", text: "Provkör under belastning där felet uppträder", krav: "kommentar" },
      ],
    },
  ],
};

export const AVGAS_EMISSION: Metodik = {
  id: "avgas_emission",
  namn: "Avgassystem och emissioner",
  omrade: "Motor",
  nyckelord: ["partikelfilt", "dpf", "adblue", "katalysator", "lambda", "avgas", "emission", "rökutveckling", "svart rök", "blå rök", "os", "egr", "regenerer", "utsläpp"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verifiera symptom",
      fragor: [
        {
          id: "karaktar",
          text: "Hur yttrar sig felet?",
          svarstyp: "val",
          val: ["Varningslampa", "Rök", "Effektbegränsning", "Lukt", "Underkänd besiktning"],
        },
        { id: "rokfarg", text: "Om rök — vilken färg och när?", svarstyp: "text" },
        { id: "korprofil", text: "Beskriv fordonets körprofil (mest kort- eller långkörning)?", svarstyp: "text" },
      ],
    },
    {
      id: "avlasning",
      rubrik: "Avläsning",
      kontroller: [
        { id: "dtc", text: "Läs felkoder — fotografera diagnosskärmen", krav: "foto" },
        { id: "sotmangd", text: "Läs beräknad och uppmätt sotmängd i partikelfiltret", krav: "matvarde" },
        { id: "regenerering", text: "Dokumentera antal och utfall av senaste regenereringar", krav: "kommentar" },
        { id: "lambda", text: "Läs lambdagivarnas signaler före och efter katalysator", krav: "matvarde" },
      ],
    },
    {
      id: "matningar",
      rubrik: "Mätningar",
      kontroller: [
        { id: "mottryck", text: "Mät avgasmottryck", krav: "matvarde" },
        { id: "differenstryck", text: "Mät differenstryck över partikelfiltret", krav: "matvarde" },
        { id: "adblue_niva", text: "Kontrollera AdBlue-nivå och kvalitet där sådant finns", krav: "matvarde" },
        { id: "egr", text: "Kontrollera EGR-ventilens funktion och läge", krav: "matvarde" },
      ],
    },
    {
      id: "orsak",
      rubrik: "Bakomliggande orsak",
      beskrivning: "Ett igensatt filter är oftast en följd, inte orsaken. Dokumentera vad som skapade sotet.",
      kontroller: [
        { id: "grundorsak", text: "Kontrollera insprutning, turbo och luftflöde", krav: "kommentar" },
        { id: "korstrackor", text: "Bedöm om körprofilen tillåter regenerering", krav: "kommentar" },
      ],
    },
  ],
};

export const KLIMAT: Metodik = {
  id: "klimat",
  namn: "Klimatanläggning",
  omrade: "Komfort",
  nyckelord: ["ac", "luftkonditionering", "klimatanläggning", "kyler inte", "kompressor", "köldmedi", "imma", "immig", "fläkt", "lukt i kupén", "värmepaket"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verifiera symptom",
      fragor: [
        {
          id: "karaktar",
          text: "Hur yttrar sig felet?",
          svarstyp: "val",
          val: ["Kyler inte alls", "Kyler dåligt", "Kyler ibland", "Missljud", "Lukt", "Imma på rutorna"],
        },
        { id: "sidor", text: "Skiljer det mellan höger och vänster sida?", svarstyp: "janej" },
        { id: "service", text: "När utfördes AC-service senast?", svarstyp: "text" },
      ],
    },
    {
      id: "visuell",
      rubrik: "Visuell kontroll",
      kontroller: [
        { id: "kondensor", text: "Fotografera kondensorn — kontrollera igensättning och skador", krav: "foto" },
        { id: "kupefilter", text: "Kontrollera kupéfiltret", krav: "foto" },
        { id: "kompressor_rem", text: "Kontrollera kompressorns drivning och magnetkoppling", krav: "kommentar" },
      ],
    },
    {
      id: "matningar",
      rubrik: "Mätningar",
      kontroller: [
        { id: "tryck", text: "Mät hög- och lågtryck vid känd omgivningstemperatur", krav: "matvarde" },
        { id: "utblastemp", text: "Mät utblåstemperatur vid mittre munstycke", krav: "matvarde" },
        { id: "mangd", text: "Väg upptagen köldmediemängd vid tömning", krav: "matvarde" },
        { id: "lackagesok", text: "Läcksök med spårgas eller UV", krav: "kommentar" },
      ],
    },
    {
      id: "styrning",
      rubrik: "Styrning",
      kontroller: [
        { id: "dtc", text: "Läs felkoder ur klimatstyrenheten", krav: "foto" },
        { id: "spjall", text: "Kontrollera spjällmotorernas rörelse", krav: "kommentar" },
      ],
    },
  ],
};

export const HOGVOLT: Metodik = {
  id: "hogvolt",
  namn: "Högvoltsystem — elbil och hybrid",
  omrade: "Högvolt",
  nyckelord: ["högvolt", "elbil", "hybrid", "traktionsbatteri", "hv", "laddning av bil", "räckvidd", "laddbox", "orange kabel", "sköldpadda"],
  steg: [
    {
      id: "sakerhet",
      rubrik: "Säkerhet — utförs först",
      beskrivning:
        "Högvoltsystem kan vara livsfarliga. Inget arbete på systemet påbörjas innan stegen nedan är dokumenterade. Kräver behörighet för arbete på högvoltsystem.",
      fragor: [
        { id: "behorighet", text: "Har du behörighet för arbete på högvoltsystem?", svarstyp: "janej" },
        { id: "avstangt", text: "Är fordonet spänningslöst enligt tillverkarens rutin?", svarstyp: "janej" },
      ],
      kontroller: [
        { id: "service_disconnect", text: "Dokumentera att servicebrytaren är urtagen och säkrad", krav: "foto" },
        { id: "vantetid", text: "Dokumentera väntetid enligt tillverkarens anvisning", krav: "kommentar" },
        { id: "spanningsfrihet", text: "Mät och dokumentera spänningsfrihet före ingrepp", krav: "matvarde" },
        { id: "skyddsutrustning", text: "Dokumentera använd skyddsutrustning och avspärrning", krav: "foto" },
      ],
    },
    {
      id: "symptom",
      rubrik: "Verifiera symptom",
      fragor: [
        {
          id: "karaktar",
          text: "Hur yttrar sig felet?",
          svarstyp: "val",
          val: ["Laddar inte", "Kortare räckvidd", "Effektbegränsning", "Varningsmeddelande", "Fordonet startar inte"],
        },
        { id: "laddtyp", text: "Vid vilken laddning uppträder felet (AC, DC, vilken laddpunkt)?", svarstyp: "text" },
        { id: "temperatur", text: "Vid vilken omgivnings- och batteritemperatur?", svarstyp: "text" },
      ],
    },
    {
      id: "avlasning",
      rubrik: "Avläsning",
      beskrivning: "Utförs med diagnosverktyg — inga ingrepp i systemet krävs.",
      kontroller: [
        { id: "dtc", text: "Läs felkoder ur samtliga högvoltstyrenheter", krav: "foto" },
        { id: "soh", text: "Läs batteriets hälsa (SOH) och laddnivå (SOC)", krav: "matvarde" },
        { id: "cellspanning", text: "Läs cellspänningar och dokumentera största avvikelse", krav: "matvarde" },
        { id: "isolationsvarde", text: "Läs systemets isolationsvärde", krav: "matvarde" },
        { id: "temperaturer", text: "Läs batteriets temperaturgivare", krav: "matvarde" },
      ],
    },
    {
      id: "laddning",
      rubrik: "Laddkedjan",
      kontroller: [
        { id: "laddkabel", text: "Kontrollera laddkabel och laddkontakt — fotografera stiften", krav: "foto" },
        { id: "laddlogg", text: "Läs laddhistorik och avbrottsorsaker", krav: "kommentar" },
        { id: "extern", text: "Testa mot annan laddpunkt för att utesluta yttre orsak", krav: "kommentar" },
      ],
    },
  ],
};

export const DIAGNOS_NATVERK: Metodik = {
  id: "diagnos_natverk",
  namn: "Felkoder och kommunikation",
  omrade: "Diagnos",
  nyckelord: ["felkod", "dtc", "can", "canbuss", "kommunikationsfel", "ingen kontakt", "styrenhet", "obd", "diagnos", "flera lampor"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verifiera symptom",
      fragor: [
        {
          id: "omfattning",
          text: "Hur många system är berörda?",
          svarstyp: "val",
          val: ["En styrenhet", "Flera styrenheter", "Hela fordonet", "Endast diagnosverktyget"],
        },
        { id: "nar", text: "Uppstod felet efter ingrepp, batteribyte eller uppdatering?", svarstyp: "text" },
      ],
    },
    {
      id: "grund",
      rubrik: "Grundförutsättningar",
      beskrivning: "Kommunikationsfel beror oftare på matning och jord än på styrenheten.",
      kontroller: [
        { id: "batteri", text: "Mät batterispänning under avläsning", krav: "matvarde" },
        { id: "obd_matning", text: "Mät matning och jord i diagnosuttaget", krav: "matvarde" },
        { id: "sakringar", text: "Kontrollera säkringar till berörda styrenheter", krav: "kommentar" },
      ],
    },
    {
      id: "buss",
      rubrik: "Bussmätning",
      kontroller: [
        { id: "terminering", text: "Mät bussens termineringsresistans med systemet spänningslöst", krav: "matvarde" },
        { id: "bussignal", text: "Mät CAN-signalen med oscilloskop — fotografera kurvan", krav: "foto" },
        { id: "avdelning", text: "Dela av bussen för att lokalisera störande nod", krav: "kommentar" },
      ],
    },
    {
      id: "koder",
      rubrik: "Felkoder i sammanhang",
      beskrivning: "En felkod pekar på en krets, inte på en trasig komponent. Läs alla system innan någon kod raderas.",
      kontroller: [
        { id: "helavlasning", text: "Läs samtliga styrenheter — fotografera listan", krav: "foto" },
        { id: "frysdata", text: "Dokumentera frysramsdata innan radering", krav: "kommentar" },
        { id: "efter_radering", text: "Radera, provkör och dokumentera vilka koder som återkom", krav: "kommentar" },
      ],
    },
  ],
};

export const LACKAGE: Metodik = {
  id: "lackage",
  namn: "Läckage",
  omrade: "Övrigt",
  nyckelord: ["läck", "läckage", "oljefläck", "dropp", "vatten i bilen", "fukt", "blöt matta", "oljeförbrukning"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verifiera symptom",
      fragor: [
        {
          id: "vatska",
          text: "Vilken vätska misstänks?",
          svarstyp: "val",
          val: ["Motorolja", "Kylvätska", "Växellådsolja", "Bromsvätska", "Bränsle", "Vatten/kondens", "Okänt"],
        },
        { id: "mangd", text: "Hur mycket och hur ofta?", svarstyp: "text" },
        { id: "plats", text: "Var på marken syns fläcken i förhållande till fordonet?", svarstyp: "text" },
      ],
    },
    {
      id: "visuell",
      rubrik: "Lokalisering",
      beskrivning: "Rengör först. Ett gammalt läckage döljer var det nya kommer ifrån.",
      kontroller: [
        { id: "foto_fore", text: "Fotografera området före rengöring", krav: "foto" },
        { id: "rengoring", text: "Rengör området och dokumentera att det är torrt", krav: "foto" },
        { id: "provkorning", text: "Provkör eller låt gå och fotografera var vätskan uppträder", krav: "foto" },
      ],
    },
    {
      id: "metod",
      rubrik: "Läcksökning",
      kontroller: [
        { id: "uv", text: "Läcksök med UV-spårämne där det är tillämpligt", krav: "kommentar" },
        { id: "trycktest", text: "Trycktesta systemet", krav: "matvarde" },
        { id: "niva", text: "Mät nivåförändring över tid", krav: "matvarde" },
      ],
    },
  ],
};

export const MISSLJUD: Metodik = {
  id: "missljud",
  namn: "Missljud",
  omrade: "Övrigt",
  nyckelord: ["missljud", "ljud", "knack", "gnissel", "gnissl", "vinande", "brumm", "skram", "väsande", "tjut"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verifiera symptom",
      beskrivning: "Ett missljud som inte reproducerats går inte att åtgärda. Spela in det.",
      fragor: [
        {
          id: "karaktar",
          text: "Vilken karaktär har ljudet?",
          svarstyp: "val",
          val: ["Knack", "Gnissel", "Vinande", "Brummande", "Skrammel", "Väsande", "Tjut"],
        },
        {
          id: "nar",
          text: "När hörs det?",
          svarstyp: "val",
          val: ["Vid start", "Vid tomgång", "Under körning", "Vid inbromsning", "Vid kurvtagning", "Över ojämnheter"],
        },
        { id: "beroende", text: "Följer ljudet varvtal eller hastighet?", svarstyp: "val", val: ["Varvtal", "Hastighet", "Ingetdera"] },
        { id: "temperatur", text: "Skillnad kallt mot varmt?", svarstyp: "text" },
      ],
    },
    {
      id: "inspelning",
      rubrik: "Dokumentera ljudet",
      beskrivning: "Video med ljud är evidens. En beskrivning i text är det inte.",
      kontroller: [
        { id: "video", text: "Spela in ljudet med video under de förhållanden där det uppträder", krav: "foto" },
        { id: "forhallanden", text: "Dokumentera hastighet, varvtal och underlag vid inspelningen", krav: "kommentar" },
      ],
    },
    {
      id: "lokalisering",
      rubrik: "Lokalisering",
      kontroller: [
        { id: "stetoskop", text: "Lokalisera med stetoskop eller ljudsond", krav: "kommentar" },
        { id: "avlastning", text: "Kontrollera om ljudet ändras vid avlastning eller belastning", krav: "kommentar" },
        { id: "uteslutning", text: "Dokumentera vilka källor som uteslutits och hur", krav: "kommentar" },
      ],
    },
  ],
};

export const ADAS: Metodik = {
  id: "adas",
  namn: "Förarassistans och kalibrering",
  omrade: "Diagnos",
  nyckelord: ["adas", "kamera", "radar", "filhållning", "adaptiv farthållare", "kalibrer", "vindruta", "parkeringssensor", "döda vinkeln", "nödbroms"],
  steg: [
    {
      id: "symptom",
      rubrik: "Verifiera symptom",
      fragor: [
        {
          id: "funktion",
          text: "Vilken funktion felar?",
          svarstyp: "val",
          val: ["Filhållning", "Adaptiv farthållare", "Automatisk nödbroms", "Döda vinkeln", "Parkeringshjälp", "Backkamera"],
        },
        { id: "ingrepp", text: "Har vindruta, kaross eller fjädring åtgärdats nyligen?", svarstyp: "text" },
        { id: "forhallanden", text: "Uppträder felet i visst väder eller ljus?", svarstyp: "text" },
      ],
    },
    {
      id: "forutsattningar",
      rubrik: "Förutsättningar för kalibrering",
      beskrivning:
        "En kalibrering på fel förutsättningar ger ett fel som ser åtgärdat ut. Dokumentera att kraven är uppfyllda innan den utförs.",
      kontroller: [
        { id: "dtc", text: "Läs felkoder ur berörda styrenheter", krav: "foto" },
        { id: "hjulinstallning", text: "Kontrollera hjulinställning — bakaxelns spårning påverkar kameran", krav: "matvarde" },
        { id: "dacktryck", text: "Kontrollera däcktryck och körhöjd", krav: "matvarde" },
        { id: "sikt", text: "Kontrollera kamerans och radarns siktfält för smuts eller skada", krav: "foto" },
        { id: "yta", text: "Dokumentera att kalibreringsytan uppfyller kraven på planhet och ljus", krav: "foto" },
      ],
    },
    {
      id: "kalibrering",
      rubrik: "Kalibrering",
      kontroller: [
        { id: "utford", text: "Utför kalibrering enligt tillverkarens metod — fotografera resultatet", krav: "foto" },
        { id: "provkorning", text: "Provkör och verifiera funktionen under de förhållanden felet uppträdde", krav: "kommentar" },
      ],
    },
  ],
};

export const GENERISK: Metodik = {
  id: "generisk",
  namn: "Generell strukturerad felsökning",
  omrade: "Övrigt",
  nyckelord: [],
  steg: [
    {
      id: "symptom",
      rubrik: "Verifiera symptom",
      fragor: [
        { id: "reproducerbart", text: "Går felet att reproducera?", svarstyp: "janej" },
        {
          id: "nar",
          text: "När uppträder felet?",
          svarstyp: "val",
          val: ["Alltid", "Ibland", "Endast under drift", "Endast vid start"],
        },
        {
          id: "var",
          text: "Var upplevs felet?",
          svarstyp: "val",
          val: ["Fram", "Bak", "Höger", "Vänster", "Motor/drivkälla", "Kupé/förarplats", "Okänt"],
        },
        {
          id: "hur",
          text: "Hur upplevs felet?",
          svarstyp: "val",
          val: ["Skakar/vibrerar", "Missljud (knack/gnissel/vinande)", "Rycker", "Tappar kraft", "Stannar helt", "Annat"],
        },
        { id: "forlopp", text: "Beskriv förloppet när felet uppstår", svarstyp: "text" },
        { id: "forandring", text: "Har något förändrats nyligen (service, reparation, miljö)?", svarstyp: "text" },
      ],
    },
    {
      id: "visuell",
      rubrik: "Visuell kontroll",
      kontroller: [
        { id: "foto_objekt", text: "Fotografera objektet och det berörda området", krav: "foto" },
        { id: "skador", text: "Kontrollera synliga skador, läckage eller lösa anslutningar", krav: "kommentar" },
        { id: "typskylt", text: "Dokumentera typskylt/märkning", krav: "foto" },
      ],
    },
    {
      id: "grundkontroller",
      rubrik: "Grundkontroller",
      kontroller: [
        {
          id: "matning",
          text: "Utför grundläggande mätningar (spänning, tryck, temperatur — det som är relevant)",
          krav: "matvarde",
        },
        { id: "sakringar", text: "Kontrollera säkringar/skydd", krav: "kommentar" },
        { id: "anslutningar", text: "Kontrollera kontaktdon och anslutningar", krav: "kommentar" },
      ],
    },
    {
      id: "funktionstest",
      rubrik: "Funktionstest",
      kontroller: [{ id: "test", text: "Genomför funktionstest och dokumentera resultatet", krav: "kommentar" }],
    },
  ],
};

// Ordningen styr bara hur de visas. Valet görs på nyckelord, inte på
// position — GENERISK ligger sist eftersom den är fallback.
export const ALLA_METODIKER: Metodik[] = [
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
