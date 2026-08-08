// Metodikbiblioteket — typad återexport av den delade datan.
//
// Innehållet ligger i services/gemensam/metodiker.mjs eftersom servern
// måste kunna utvärdera kvalitetsgrindens metodikrader. Grinden fanns
// tidigare bara i webbläsaren, vilket gjorde hela ECM till ett råd i
// stället för en spärr (docs/QUALITY-AUDIT.md, C-2).
//
// Tre regler gäller alla metodiker där:
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

import * as delade from "../../../services/gemensam/metodiker.mjs";
import type { Metodik } from "./metodik";

export const VIBRATION = delade.VIBRATION as Metodik;
export const BROMSAR = delade.BROMSAR as Metodik;
export const STYRNING_FJADRING = delade.STYRNING_FJADRING as Metodik;
export const ELSYSTEM = delade.ELSYSTEM as Metodik;
export const START_LADDNING = delade.START_LADDNING as Metodik;
export const MOTOR_DRIFT = delade.MOTOR_DRIFT as Metodik;
export const KYLSYSTEM = delade.KYLSYSTEM as Metodik;
export const DRIVLINA = delade.DRIVLINA as Metodik;
export const AVGAS_EMISSION = delade.AVGAS_EMISSION as Metodik;
export const KLIMAT = delade.KLIMAT as Metodik;
export const HOGVOLT = delade.HOGVOLT as Metodik;
export const DIAGNOS_NATVERK = delade.DIAGNOS_NATVERK as Metodik;
export const LACKAGE = delade.LACKAGE as Metodik;
export const MISSLJUD = delade.MISSLJUD as Metodik;
export const ADAS = delade.ADAS as Metodik;
export const GENERISK = delade.GENERISK as Metodik;

export const ALLA_METODIKER = delade.ALLA_METODIKER as Metodik[];
