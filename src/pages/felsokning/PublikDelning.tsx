// Publik Live Share-sida: nås via delningskoden utan inloggning.
// Läser genom backend-funktionen hamta_delat_arende (security definer) —
// tabellerna exponeras aldrig, och interna poster är redan bortfiltrerade
// på serversidan. Pollar för liveuppdatering.

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Arende, Handelse } from "@/felsokning/domain";
import { DelatArendeVy } from "@/felsokning/DelatArendeVy";
import { FelsokningSkal, Panel } from "@/felsokning/ui";

interface DelatSvar {
  arende: { id: string; nummer: number; skapad: string };
  handelser: { id: string; tidpunkt: string; anvandare: string; handelse: Handelse }[];
}

async function hamtaDelat(kod: string): Promise<Arende | undefined> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await (supabase as unknown as {
    rpc: (fn: string, args: object) => Promise<{ data: unknown; error: unknown }>;
  }).rpc("hamta_delat_arende", { kod });
  if (error || !data) return undefined;
  const svar = data as DelatSvar;
  return {
    id: svar.arende.id,
    nummer: svar.arende.nummer,
    skapad: new Date(svar.arende.skapad).toISOString(),
    handelser: svar.handelser.map((rad) => ({
      id: rad.id,
      tidpunkt: new Date(rad.tidpunkt).toISOString(),
      anvandare: rad.anvandare,
      handelse: rad.handelse,
    })),
  };
}

export default function PublikDelning() {
  const { kod } = useParams<{ kod: string }>();
  const [arende, setArende] = useState<Arende | undefined>();
  const [status, setStatus] = useState<"laddar" | "klar" | "saknas">("laddar");
  const [nu, setNu] = useState(() => new Date().toISOString());

  useEffect(() => {
    if (!kod) return;
    let aktiv = true;
    const hamta = async () => {
      try {
        const resultat = await hamtaDelat(kod);
        if (!aktiv) return;
        setArende(resultat);
        setStatus(resultat ? "klar" : "saknas");
        setNu(new Date().toISOString());
      } catch {
        if (aktiv) setStatus("saknas");
      }
    };
    hamta();
    const timer = setInterval(hamta, 20000);
    return () => {
      aktiv = false;
      clearInterval(timer);
    };
  }, [kod]);

  if (status !== "klar" || !arende) {
    return (
      <FelsokningSkal rubrik="Delat ärende">
        <Panel>
          <p className="text-lg text-zinc-300">
            {status === "laddar"
              ? "Hämtar ärendet …"
              : "Ärendet är inte tillgängligt. Kontrollera länken med verkstaden — delningen kan ha stängts av."}
          </p>
        </Panel>
      </FelsokningSkal>
    );
  }

  return (
    <DelatArendeVy
      arende={arende}
      nu={nu}
      notis="Skrivskyddad livevy från verkstaden — sidan uppdateras automatiskt när ny information registreras."
    />
  );
}
