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
    <p className="border border-dashed border-[#C6C6C6] bg-[#F7F7F7] p-3 text-[12px] text-[#707070]">
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
  if (kalla === "laddar") return <Platshallare text="Hämtar bild …" />;
  // Ärligt om att bilden inte gick att hämta, i stället för en trasig
  // bildikon som lämnar teknikern i tvivel om vad som dokumenterats.
  if (!kalla) return <Platshallare text="Bilden kunde inte hämtas." />;
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
  if (kalla === "laddar") return <Platshallare text="Hämtar videoklipp …" />;
  if (!kalla) return <Platshallare text="Videoklippet kunde inte hämtas." />;
  return <video src={kalla} controls className={className} />;
}
