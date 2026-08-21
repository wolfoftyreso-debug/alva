// Delningsgränsen, i EN lista.
//
// Servern (services/plattform/server.mjs) håller sanningen: en
// tillåtelselista per nivå, prövad i SQL. Klientens förhandsvisning hade
// en egen, kortare nekalista och visade därför betalare, eskaleringar och
// reservdelar under rubriken "detta är vad kunden ser". Kunden såg dem
// aldrig — men teknikern trodde det, och kunde dra slutsatser om vad som
// redan var kommunicerat.
//
// Listan nedan speglar serverns ENDAST_INTERNT och hålls likadan av ett
// test som läser bägge filerna.

export const ENDAST_INTERNT: string[] = [
  "kategori_byte",
  "hypotes",
  "ai_svar",
  "ansvarig_satt",
  "arbetsorder_skannad",
  "betalare",
  "eskalering",
  "reservdel",
  "metodik_byte",
  "metodik_vald",
];
