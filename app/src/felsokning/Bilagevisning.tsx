// Visar en bilaga oavsett om innehållet ligger inbäddat i händelsen
// (äldre ärenden, lokalt läge) eller hämtas som referens.

import { useEffect, useState } from "react";
import type { Bilaga } from "./domain";
import { hamtaBilaga } from "./bilagor";

function useKalla(bilaga: Bilaga, delningskod?: string): string | null | "laddar" {
  const [kalla, setKalla] = useState<string | null | "laddar">("laddar");
  const id = bilaga.bilagaId ?? bilaga.dataUrl?.slice(0, 64) ?? "";

  useEffect(() => {
    let aktuell = true;
    setKalla("laddar");
    hamtaBilaga(bilaga, delningskod)
      .then((url) => aktuell && setKalla(url))
      .catch(() => aktuell && setKalla(null));
    return () => {
      aktuell = false;
    };
    // Bilagan identifieras av sitt id — objektet självt byts vid varje
    // omrendering utan att innehållet ändrats.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, delningskod]);

  return kalla;
}

function Platshallare({ text }: { text: string }) {
  return (
    <p className="border border-dashed border-[#D7DCE2] bg-[#F6F7F8] p-4 text-[12px] text-[#4D5662]">
      {text}
    </p>
  );
}

export function Bild({
  bilaga,
  alt,
  className,
  delningskod,
}: {
  bilaga: Bilaga;
  alt: string;
  className?: string;
  delningskod?: string;
}) {
  const kalla = useKalla(bilaga, delningskod);
  if (kalla === "laddar") return <Platshallare text="Retrieving image …" />;
  // Ärligt om att bilden inte gick att hämta, i stället för en trasig
  // bildikon som lämnar teknikern i tvivel om vad som dokumenterats.
  if (!kalla) return <Platshallare text="The image could not be retrieved." />;
  return <img src={kalla} alt={alt} className={className} />;
}

export function Klipp({
  bilaga,
  className,
  delningskod,
}: {
  bilaga: Bilaga;
  className?: string;
  delningskod?: string;
}) {
  const kalla = useKalla(bilaga, delningskod);
  if (kalla === "laddar") return <Platshallare text="Retrieving video …" />;
  if (!kalla) return <Platshallare text="The video could not be retrieved." />;
  return <video src={kalla} controls className={className} />;
}

/**
 * En kommentar under en bevisbild (ALVA-SPEC-072, utvärdering).
 *
 * Kommentaren är ett ANDRA PAR ÖGON, aldrig evidens. Den är därför
 * visuellt underordnad bilden, bär alltid modellens namn, och skrivs inte
 * till den förseglade loggen — append-only betyder att det som skrivs dit
 * inte går att ta tillbaka, och man lägger inte modellutdata i ett
 * bevismaterial medan man fortfarande utvärderar om det är till nytta.
 *
 * Uteblir kommentaren visas ingenting alls. Bilden är underlaget.
 */
export function Bildkommentar({
  bilaga,
  kontroll,
  sprak,
  delningskod,
}: {
  bilaga: Bilaga;
  kontroll: string;
  sprak?: string;
  delningskod?: string;
}) {
  const kalla = useKalla(bilaga, delningskod);
  const [svar, setSvar] = useState<{ kommentar: string; konfidens?: number; modell: string } | null>(null);
  const [laddar, setLaddar] = useState(false);

  useEffect(() => {
    if (typeof kalla !== "string" || !kalla.startsWith("data:image/")) return;
    let aktuell = true;
    setLaddar(true);
    import("./ai")
      .then((m) => m.kommenteraBild(kalla, kontroll, sprak))
      .then((r) => aktuell && setSvar(r))
      .catch(() => aktuell && setSvar(null))
      .finally(() => aktuell && setLaddar(false));
    return () => {
      aktuell = false;
    };
  }, [kalla, kontroll, sprak]);

  if (laddar) {
    return <p className="mt-2 text-[11px] text-[#4D5662]">Reading the image…</p>;
  }
  if (!svar) return null;

  return (
    <p className="mt-2 border-l-2 border-[#D7DCE2] pl-2 text-[12px] leading-[17px] text-[#4D5662]">
      <span className="mr-2 font-semibold uppercase tracking-[0.06em] text-[#4D5662]">
        AI · {svar.modell}
      </span>
      {svar.kommentar}
      {typeof svar.konfidens === "number" && (
        <span className="ml-2 text-[#4D5662]">({Math.round(svar.konfidens * 100)}% read confidence)</span>
      )}
      <span className="mt-2 block text-[10px] uppercase tracking-[0.06em] text-[#4D5662]">
        Comment, not evidence — the photograph is the record
      </span>
    </p>
  );
}
