// Publik Live Share-sida: nås via delningskoden utan inloggning.
// Läser genom backend-funktionen hamta_delat_arende (security definer) —
// tabellerna exponeras aldrig, och interna poster är redan bortfiltrerade
// på serversidan. Pollar för liveuppdatering.

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Arende, Handelse } from "@/felsokning/domain";
import { DelatArendeVy } from "@/felsokning/DelatArendeVy";
import { FelsokningSkal, Panel } from "@/felsokning/ui";
import { oversattare } from "../../../../services/gemensam/sprak/index.mjs";
import { useWebbSprak, webbSprak } from "@/alva/webbsprak";

interface DelatSvar {
  arende: { id: string; nummer: number; skapad: string };
  handelser: { id: string; tidpunkt: string; anvandare: string; handelse: Handelse }[];
  niva?: "kund" | "partner" | "intern";
}

// Katalognycklar — DelatArendeVy översätter dem till mottagarens språk.
const NIVA_NOTIS: Record<string, string> = {
  kund: "delning.notis.kund",
  partner: "delning.notis.partner",
  intern: "delning.notis.intern",
};

const fel = (nyckel: string) => (oversattare(webbSprak()) as (n: string) => string)(nyckel);

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
  // Mottagarens språk: eget val → webbläsaren → engelska. Samma kedja
  // som delningsvyn själv, så för-laddningsskärmarna talar samma språk.
  const t = oversattare(useWebbSprak()) as (nyckel: string) => string;

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
      <FelsokningSkal rubrik={t("delning.rubrik.delat")}>
        <Panel>
          <p className="text-[14px] text-[#1B1E22]">
            {status === "laddar" ? t("delning.hamtar") : t("delning.saknas")}
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
          // webbSprak() läses vid anropet — felet följer språkvalet.
          if (!plattformAktiv()) return fel("delning.beslut.fel.plattform");
          try {
            const res = await fetch(`${PLATTFORM_URL}/api/delad/${kod}/beslut`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ beslut, kommentar }),
            });
            if (!res.ok) {
              const data = (await res.json().catch(() => ({}))) as { error?: string };
              return data.error ?? fel("delning.beslut.fel.registrering");
            }
            // Hämta om direkt så kvittensen syns.
            const uppdaterat = await hamtaDelat(kod);
            if (uppdaterat) setArende(uppdaterat.arende);
            return null;
          } catch {
            return fel("delning.beslut.fel.forbindelse");
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
