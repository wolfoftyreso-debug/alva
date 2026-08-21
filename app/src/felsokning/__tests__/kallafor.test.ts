// @vitest-environment node
// Åtkomstloggens källa får inte gå att förfalska.
//
// X-Forwarded-For byggs uppifrån: en klient kan prependa falska värden.
// På den publika sessionslösa vägen lät det vem som helst skriva vem som
// helst i loggen över "vem läste en kunds uppgifter". Källan härleds nu
// utifrån antalet BETRODDA proxyhopp, och utan en sådan konfiguration
// litar tjänsten bara på den direkta motparten.

import { describe, expect, it, beforeEach, afterEach } from "vitest";

const req = (xff: string | undefined, socket: string) => ({
  headers: xff === undefined ? {} : { "x-forwarded-for": xff },
  socket: { remoteAddress: socket },
});

import { kallaFor } from "../../../../services/plattform/server.mjs";

describe("åtkomstloggens källa", () => {
  const original = process.env.BETRODDA_PROXYHOPP;
  afterEach(() => {
    if (original === undefined) delete process.env.BETRODDA_PROXYHOPP;
    else process.env.BETRODDA_PROXYHOPP = original;
  });

  it("utan betrodd proxy litar den bara på motparten, aldrig på headern", () => {
    delete process.env.BETRODDA_PROXYHOPP;
    expect(kallaFor(req("1.2.3.4", "10.0.0.9"))).toBe("10.0.0.9");
  });

  it("med ett betrott hopp tas adressen ett steg från höger, inte det klientstyrda första", () => {
    process.env.BETRODDA_PROXYHOPP = "1";
    // Klienten prependar "9.9.9.9" (förfalskning); ingressen la till den äkta.
    expect(kallaFor(req("9.9.9.9, 203.0.113.7", "10.0.0.1"))).toBe("203.0.113.7");
  });

  it("faller tillbaka på motparten när kedjan är kortare än antalet hopp", () => {
    process.env.BETRODDA_PROXYHOPP = "2";
    expect(kallaFor(req("203.0.113.7", "10.0.0.1"))).toBe("10.0.0.1");
  });
});
