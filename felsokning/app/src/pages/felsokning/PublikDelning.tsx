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
  niva?: "kund" | "partner" | "intern";
}

const NIVA_NOTIS: Record<string, string> = {
  kund: "Read-only live view from the workshop — the page updates automatically as new information is recorded.",
  partner:
    "Read-only live view (partner level) — includes technical hypotheses, clearly marked as unverified. Updates automatically.",
  intern: "Read-only live view (internal level) — full visibility of the case. Updates automatically.",
};

async function hamtaDelat(kod: string): Promise<{ arende: Arende; niva: string } | undefined> {
  const { plattformAktiv, PLATTFORM_URL } = await import("@/felsokning/plattform");
  let data: unknown;
  if (plattformAktiv()) {
    // Självhostat: publik delningsendpoint i plattformstjänsten.
    const res = await fetch(`${PLATTFORM_URL}/api/delad/${kod}`);
    if (!res.ok) return undefined;
    data = await res.json();
  } else {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: rpcData, error } = await (supabase as unknown as {
      rpc: (fn: string, args: object) => Promise<{ data: unknown; error: unknown }>;
    }).rpc("hamta_delat_arende", { kod });
    if (error || !rpcData) return undefined;
    data = rpcData;
  }
  const svar = data as DelatSvar;
  return {
    niva: svar.niva ?? "kund",
    arende: {
      id: svar.arende.id,
      nummer: svar.arende.nummer,
      skapad: new Date(svar.arende.skapad).toISOString(),
      handelser: svar.handelser.map((rad) => ({
        id: rad.id,
        tidpunkt: new Date(rad.tidpunkt).toISOString(),
        anvandare: rad.anvandare,
        handelse: rad.handelse,
      })),
    },
  };
}

export default function PublikDelning() {
  const { kod } = useParams<{ kod: string }>();
  const [arende, setArende] = useState<Arende | undefined>();
  const [niva, setNiva] = useState<string>("kund");
  const [status, setStatus] = useState<"laddar" | "klar" | "saknas">("laddar");
  const [nu, setNu] = useState(() => new Date().toISOString());

  useEffect(() => {
    if (!kod) return;
    let aktiv = true;
    const hamta = async () => {
      try {
        const resultat = await hamtaDelat(kod);
        if (!aktiv) return;
        setArende(resultat?.arende);
        if (resultat) setNiva(resultat.niva);
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
      <FelsokningSkal rubrik="Shared case">
        <Panel>
          <p className="text-[14px] text-[#333333]">
            {status === "laddar"
              ? "Retrieving the case …"
              : "The case is not available. Check the link with the workshop — the share may have been revoked."}
          </p>
        </Panel>
      </FelsokningSkal>
    );
  }

  // Kunden kan svara på ett åtgärdsförslag direkt i sin länk. Endast
  // kundnivån får svara — servern gör samma kontroll igen.
  const skickaBeslut =
    niva === "kund" && kod
      ? async (beslut: "godkant" | "avbojt", kommentar: string) => {
          const { plattformAktiv, PLATTFORM_URL } = await import("@/felsokning/plattform");
          if (!plattformAktiv()) return "The decision cannot be given here — contact the workshop.";
          try {
            const res = await fetch(`${PLATTFORM_URL}/api/delad/${kod}/beslut`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ beslut, kommentar }),
            });
            if (!res.ok) {
              const data = (await res.json().catch(() => ({}))) as { error?: string };
              return data.error ?? "The decision could not be recorded — try again.";
            }
            // Hämta om direkt så kvittensen syns.
            const uppdaterat = await hamtaDelat(kod);
            if (uppdaterat) setArende(uppdaterat.arende);
            return null;
          } catch {
            return "The decision could not be sent — check the connection.";
          }
        }
      : undefined;

  return (
    <DelatArendeVy
      arende={arende}
      nu={nu}
      notis={NIVA_NOTIS[niva] ?? NIVA_NOTIS.kund}
      redanFiltrerad
      vidBeslut={skickaBeslut}
      delningskod={kod}
    />
  );
}
