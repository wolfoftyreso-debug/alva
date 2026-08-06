// Portalens spärr (revision 2, m-9).
//
// Anmärkningen var att en inloggning som ser ut att autentisera ger
// portalen bakom den en auktoritet den inte har. Rättelsen är att spärren
// blir verklig där det finns något att spärra mot.
//
// Är plattformen konfigurerad krävs en giltig session; utan den skickas
// besökaren till inloggningen. Är den inte konfigurerad finns ingen
// session att kräva, och portalen är då uttryckligen en demonstration —
// märkt som en sådan på varje vy, inte förklädd till en spärr som ändå
// släpper igenom alla.
//
// Sessionen läses ur localStorage vid varje navigering i stället för att
// hållas i en context: en token som återkallats i en annan flik ska sluta
// gälla här också, och plattformFetch rensar den vid 401.

import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { plattformAktiv, plattformKonto } from "@/felsokning/plattform";

export function Portalvakt({ children }: { children: ReactNode }) {
  const plats = useLocation();
  if (plattformAktiv() && !plattformKonto()) {
    // `replace`: den spärrade vyn ska inte ligga kvar i historiken, så
    // bakåtknappen efter inloggning inte leder tillbaka till spärren.
    return <Navigate to="/alva/logga-in" replace state={{ fran: plats.pathname }} />;
  }
  return <>{children}</>;
}
