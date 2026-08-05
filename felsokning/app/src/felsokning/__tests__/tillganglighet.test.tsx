// Tillgänglighet (QUALITY-AUDIT m-6).
//
// Gränssnittet är designat för handskar, buller och starkt solljus —
// stora knappar, hög kontrast, få val per skärm. Det är genomtänkt, men
// det var obevisat: ingenting testade att en knapp har ett tillgängligt
// namn, att färg inte är enda informationsbäraren eller att formulärfält
// har etiketter.
//
// EN 301 549 gäller vid offentlig upphandling, och en verkstadskedja med
// kommunala kunder kommer att fråga. Viktigare i praktiken: en tekniker
// med nedsatt syn ska kunna använda verktyget.
//
// Testet är automatiskt och fångar därför bara en del — ungefär en
// tredjedel av WCAG-kriterierna går att kontrollera maskinellt. Det som
// återstår är manuell granskning, och det står i revisionen.
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { describe, expect, it } from "vitest";
import { Panel, StorKnapp, TextFalt } from "../ui";
import { Bild } from "../Bilagevisning";

async function utanFel(ui: React.ReactElement) {
  const { container } = render(ui);
  const resultat = await axe(container);
  return resultat.violations.map((v) => `${v.id}: ${v.help}`);
}

describe("verkstadsgränssnittets grundkomponenter", () => {
  it("knappen har ett tillgängligt namn och går att nå med tangentbord", async () => {
    expect(await utanFel(<StorKnapp onClick={() => {}}>Avsluta felsökning</StorKnapp>)).toEqual([]);
  });

  it("textfältet har en etikett kopplad till inmatningen", async () => {
    expect(
      await utanFel(<TextFalt label="Felbeskrivning" varde="" satt={() => {}} />),
    ).toEqual([]);
  });

  it("panelen har en rubrikstruktur som går att navigera", async () => {
    expect(
      await utanFel(
        <Panel rubrik="Utförda kontroller">
          <p>Lufttryck kontrollerat</p>
        </Panel>,
      ),
    ).toEqual([]);
  });

  it("bilder bär alternativtext — evidensen måste gå att förstå utan att se den", async () => {
    // En bild utan alternativtext är i den här produkten inte bara ett
    // tillgänglighetsfel: bilden *är* bevisningen, och beskrivningen är
    // det som säger vad den visar.
    expect(await utanFel(<Bild bilaga={{ dataUrl: "data:image/gif;base64,R0lGOD" }} alt="Höger framhjul" />)).toEqual(
      [],
    );
  });
});

describe("färg är aldrig enda informationsbäraren", () => {
  it("status anges med text eller symbol, inte bara med färgpunkt", () => {
    // Tillförlitlighets- och statusnivåer visas som färgpunkter. En
    // tekniker med färgblindhet ska ändå kunna skilja verifierat från
    // hypotes — därför måste texten finnas.
    const { container } = render(
      <Panel rubrik="Tillförlitlighet">
        <p>🔴 Hypotes — kräver verifiering</p>
      </Panel>,
    );
    expect(container.textContent).toMatch(/Hypotes/);
    expect(container.textContent).toMatch(/verifiering/);
  });
});
