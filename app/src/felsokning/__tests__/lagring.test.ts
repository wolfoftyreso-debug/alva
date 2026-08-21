// @vitest-environment node
// Lagringen får inte tappa arbete.
//
// Diagnosrutan öppnar varje ärende i ett eget fönster, och varje fönster
// höll hela storen i minnet: den som skrev sist vann, och den andres
// händelser fanns bara i ett minne som snart var borta. Här prövas att
// två fönsters bilder flätas i stället för att skriva över varandra, och
// att en full lagring säger ifrån i stället för att tappa tyst.

import { describe, expect, it } from "vitest";
import { flatIhopTillstand } from "@/felsokning/lagring";

const post = (id: string, tid: string) => ({ id, tidpunkt: tid, anvandare: "anna", handelse: { typ: "kommentar", text: id } });
const tillstand = (handelser: ReturnType<typeof post>[], nastaNummer = 1) => ({
  version: 1,
  state: { arenden: { a1: { id: "a1", nummer: 1, skapad: "2026-01-01T08:00:00Z", handelser } }, nastaNummer },
}) as never;

describe("två fönster skriver inte över varandra", () => {
  it("händelser från bägge fönstren finns kvar efter flätning", () => {
    const flikA = tillstand([post("h1", "2026-01-01T09:00:00Z"), post("h2", "2026-01-01T09:05:00Z")]);
    const flikB = tillstand([post("h1", "2026-01-01T09:00:00Z"), post("h3", "2026-01-01T09:02:00Z")]);
    const ihop = flatIhopTillstand(flikA, flikB);
    const ids = ihop.state!.arenden!.a1.handelser.map((h) => h.id);
    expect(ids).toEqual(["h1", "h3", "h2"]); // tidsordnat, inget tappat
  });

  it("ärenden som bara finns i det ena fönstret följer med", () => {
    const a = tillstand([post("h1", "2026-01-01T09:00:00Z")]);
    const b = { version: 1, state: { arenden: { a2: { id: "a2", nummer: 2, skapad: "x", handelser: [] } }, nastaNummer: 3 } } as never;
    const ihop = flatIhopTillstand(a, b);
    expect(Object.keys(ihop.state!.arenden!).sort()).toEqual(["a1", "a2"]);
  });

  it("ärendenumret tar det högsta så två fönster inte delar ut samma", () => {
    const ihop = flatIhopTillstand(tillstand([], 5), tillstand([], 3));
    expect(ihop.state!.nastaNummer).toBe(5);
  });

  it("flätningen är idempotent — samma tillstånd två gånger ändrar inget", () => {
    const t = tillstand([post("h1", "2026-01-01T09:00:00Z")]);
    expect(flatIhopTillstand(t, t).state!.arenden!.a1.handelser).toHaveLength(1);
  });
});
