// Intern förhandsvisning av Live Share-vyn: läser ur lokala storen och
// uppdateras live medan teknikern arbetar. Den publika delningslänken
// (via delningskod) renderar exakt samma vy.

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { DelatArendeVy } from "@/felsokning/DelatArendeVy";
import { useFelsokning } from "@/felsokning/store";
import { FelsokningSkal } from "@/felsokning/ui";

export default function DelatArende() {
  const { id } = useParams<{ id: string }>();
  const arende = useFelsokning((s) => (id ? s.arenden[id] : undefined));
  const [nu, setNu] = useState(() => new Date().toISOString());

  useEffect(() => {
    const timer = setInterval(() => setNu(new Date().toISOString()), 30000);
    return () => clearInterval(timer);
  }, []);

  if (!arende) {
    return (
      <FelsokningSkal rubrik="Shared case">
        <p className="text-[14px] text-[#1B1E22]">The case is not available.</p>
      </FelsokningSkal>
    );
  }

  return (
    <DelatArendeVy
      arende={arende}
      nu={nu}
      notis="Read-only live view — updates automatically as the workshop records new information. This is the preview; the external share link shows the same view."
    />
  );
}
