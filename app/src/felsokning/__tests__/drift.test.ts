// Driftenheternas kontrakt.
//
// Systemd-enheterna i infra/systemd är driftens verkställighet av två
// regler som annars bara är prosa: fakturering och gallring KÖRS, och
// hemligheter bor i miljöfilen — aldrig i en enhet. Kopians enhet bar
// skarpa nycklar i klartext; det felet får inte gå att begå igen utan
// att sviten faller.

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ROT = "../infra/systemd";
const ENHETER = ["alva-fakturering", "alva-gallring"] as const;

describe("de schemalagda jobben är verkliga", () => {
  it.each(ENHETER)("%s har service och timer", (namn) => {
    expect(existsSync(`${ROT}/${namn}.service`)).toBe(true);
    expect(existsSync(`${ROT}/${namn}.timer`)).toBe(true);
  });

  it.each(ENHETER)("%s pekar på ett jobb som finns i plattformen", (namn) => {
    const enhet = readFileSync(`${ROT}/${namn}.service`, "utf8");
    const jobb = enhet.match(/ExecStart=\/usr\/bin\/node (\S+\.mjs)/)?.[1];
    expect(jobb, "ExecStart ska köra en .mjs med node").toBeTruthy();
    expect(existsSync(`../services/plattform/${jobb}`), jobb).toBe(true);
  });

  it.each(ENHETER)("%s bär inga hemligheter — miljöfilen gör det", (namn) => {
    const enhet = readFileSync(`${ROT}/${namn}.service`, "utf8");
    expect(enhet).toContain("EnvironmentFile=/etc/alva/miljo");
    // Inga inbäddade värden av det slag kopian läckte.
    expect(enhet).not.toMatch(/Environment=.*(NYCKEL|SECRET|PASSWORD|API_KEY|DATABASE_URL)/);
  });

  it.each(ENHETER)("%s-timern tar igen missade körningar", (namn) => {
    const timer = readFileSync(`${ROT}/${namn}.timer`, "utf8");
    expect(timer).toContain("OnCalendar=");
    expect(timer).toContain("Persistent=true");
  });

  it("faktureringsjobbet kan torrköras — det står i driftdokumentet också", () => {
    expect(readFileSync("../services/plattform/manadsfakturering.mjs", "utf8")).toContain("torrkor");
    expect(readFileSync("../docs/DRIFT-EC2.md", "utf8")).toContain("--torrkor");
  });
});
