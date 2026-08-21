// @vitest-environment node
// Kvalitetsgrinden får aldrig kunna brickas av en enda skadad post.
//
// Loggen är append-only: en händelse som accepterats kan inte tas bort,
// bara kommenteras. Ett valfritt fält med fel form (t.ex. ett objekt i
// kommentar) passerade förr granskningen — som bara prövade OBLIGATORISKA
// fält — och fick sedan grinda() att kasta vid varje anrop, så ärendet
// aldrig gick att avsluta. Här låses två spärrar: dörren avvisar
// icke-primitiva valfria fält, och grinden kastar aldrig oavsett.

import { describe, expect, it } from "vitest";
import { granskaHändelse } from "../../../../services/gemensam/handelser.mjs";
import { grinda } from "../../../../services/gemensam/grind.mjs";

describe("granskaHändelse typkontrollerar även valfria fält", () => {
  it("avvisar ett objekt i ett valfritt strängfält", () => {
    expect(granskaHändelse({ typ: "historik_kontrollerad", kontrollerad: false, kommentar: {} })).toContain("fel form");
    expect(granskaHändelse({ typ: "kontroll_utford", stegId: "s", kontrollId: "k", text: "t", resultat: [] })).toContain("fel form");
    expect(granskaHändelse({ typ: "matarstallning", lage: "ingaende", varde: 100, undantag: { a: 1 } })).toContain("fel form");
  });

  it("släpper igenom giltiga primitiver i valfria fält", () => {
    expect(granskaHändelse({ typ: "historik_kontrollerad", kontrollerad: true, kommentar: "kollad" })).toBeNull();
    expect(granskaHändelse({ typ: "reservdel", artikelnummer: "A1", beskrivning: "del", sparad: true })).toBeNull();
  });
});

describe("grinden kastar aldrig — inte ens på en post som slunkit förbi", () => {
  it("ett objekt i kommentar/undantag/resultat kraschar inte grinda()", () => {
    for (const h of [
      { typ: "historik_kontrollerad", kontrollerad: false, kommentar: {} },
      { typ: "kontroll_utford", stegId: "s", kontrollId: "k", text: "t", undantag: 42 },
      { typ: "kontroll_utford", stegId: "s", kontrollId: "k", text: "t", resultat: [1, 2] },
    ]) {
      expect(() => grinda([h], null), JSON.stringify(h)).not.toThrow();
    }
  });
});
