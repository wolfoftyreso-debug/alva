// ALVA-SPEC-071 · Säkerhetsnivåns tak.
//
// ---- Bakgrund (panelgranskningen, garantisätet) --------------------------
//
// Säkerhetsnivån i felorsaksanalysen — hög, medel, låg — valdes fritt av
// teknikern. Ett självskattat värde som ser ut som en mätning är värre än
// inget värde: en garantihandläggare kan inte prissätta det, och den som
// har bråttom väljer "hög" av samma skäl som den skriver "klart".
//
// Panelens lösning, som blev regeln här: nivån HÄRLEDS ur underlaget och
// sätter ett TAK. Teknikern kan sänka — den som vet något om fordonets
// historia som underlaget inte visar ska kunna vara ärligt osäker — men
// aldrig höja. Asymmetrin är poängen: ingen kan påstå högre säkerhet än
// evidensen bär, och en sänkning är information i stället för misstanke.
//
// ---- Vad taket räknar på -------------------------------------------------
//
// HÖG kräver att orsakskedjan är sluten i båda ändar: symptomet
// reproducerat (inte "delvis" — delvis är ett annat ord för att felet
// inte är förstått) OCH minst ett spårbart mätvärde (mätdon ur registret,
// alltså E4). En slutsats utan mätning kan vara rätt, men den kan inte
// vara HÖG — det är precis skillnaden mellan att veta och att känna igen.
//
// MEDEL kräver evidens över E1: foto, video eller mätvärde. Enbart
// observationer — teknikerns egna påståenden — bär inte medel.
//
// LÅG är alltid tillåten. Ett golv vore att tvinga fram falsk säkerhet.
//
// Taket är avsiktligt ETT MÅTT PÅ UNDERLAGET, inte på resonemanget.
// Professorssätet varnade för att en formel som räknar foton utger sig
// för att mäta diagnostisk säkerhet — det gör den inte, och det står
// därför i både namn och dokumentation att det är ett TAK, inte ett
// betyg. Formeln säger vad underlaget som mest kan bära; om slutsatsen
// förtjänar det avgörs fortfarande av en människa.

const ORDNING = ["lag", "medel", "hog"];

/** Rangordnar nivåer; okänd nivå räknas som lägst. */
const rang = (niva) => Math.max(0, ORDNING.indexOf(niva));

/**
 * Högsta säkerhetsnivå underlaget bär.
 *
 * @param handelser ärendets händelselogg (klartextform)
 * @returns "hog" | "medel" | "lag"
 */
export function sakerhetstak(handelser) {
  const av = (typ) => handelser.filter((h) => h?.typ === typ);

  const reproducerat = av("reproducering").some((h) => h.status === "ja");
  // Spårbart = mätdonet kommer ur registret. `matdonId` sätts av servern
  // vid uppslaget (TÜV T-2), så fältet går inte att dikta från klienten.
  const sparbartMatvarde = av("matvarde").some((h) => h.matdonId);
  const evidensOverE1 =
    sparbartMatvarde || av("matvarde").length > 0 || av("foto").length > 0 || av("video").length > 0;

  if (reproducerat && sparbartMatvarde) return "hog";
  if (evidensOverE1) return "medel";
  return "lag";
}

/** Är den påstådda nivån inom taket? Sänkning är alltid tillåten. */
export function inomTak(pastadd, tak) {
  return rang(pastadd) <= rang(tak);
}
