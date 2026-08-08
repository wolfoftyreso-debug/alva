// @vitest-environment node
// Delningsgränsen är en integritetsgräns. Testerna här låser två saker:
// att den är en tillåtelselista (nya händelsetyper är interna tills
// någon aktivt släpper fram dem) och att uppslag mot kundkonfigurerade
// URL:er inte kan användas för att nå klustrets insida.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  DELBART_KUND,
  DELBART_PARTNER,
  ENDAST_INTERNT,
  arPrivatAdress,
  gorUppslag,
  pekarInat,
  synligaTyper,
} from "../../../../services/plattform/server.mjs";

// Alla händelsetyper i domänmodellen — sanningen om vad som kan hamna
// i loggen.
const HANDELSETYPER = [
  ...new Set(
    [...readFileSync("src/felsokning/domain.ts", "utf8").matchAll(/\btyp:\s*"([a-z_]+)"/g)].map((m) => m[1]),
  ),
];

describe("delningsfiltret är en tillåtelselista", () => {
  it("varje händelsetyp i domänmodellen är klassificerad", () => {
    // Fångar den verkliga risken: någon lägger till en händelsetyp och
    // glömmer bestämma om kunden ska se den. Då faller testet i stället
    // för att typen tyst dyker upp i kundens delningslänk.
    const klassificerade = new Set([...DELBART_KUND, ...ENDAST_INTERNT]);
    const oklassificerade = HANDELSETYPER.filter((t) => !klassificerade.has(t));
    expect(oklassificerade, `oklassificerade händelsetyper: ${oklassificerade.join(", ")}`).toEqual([]);
  });

  it("hittar faktiskt domänens händelsetyper", () => {
    // Skyddar testet ovan mot att bli meningslöst om regexen slutar träffa.
    expect(HANDELSETYPER.length).toBeGreaterThan(20);
    expect(HANDELSETYPER).toContain("felorsak");
    expect(HANDELSETYPER).toContain("ai_svar");
  });

  it("arbetsmaterial och arbetsledning lämnar aldrig organisationen", () => {
    for (const intern of ENDAST_INTERNT) {
      expect(DELBART_KUND, intern).not.toContain(intern);
    }
    // Hypoteser är det enda partnern ser utöver kundnivån.
    expect(DELBART_PARTNER).toContain("hypotes");
    expect(DELBART_KUND).not.toContain("hypotes");
    for (const bara of ["kategori_byte", "ai_svar", "ansvarig_satt", "arbetsorder_skannad"]) {
      expect(DELBART_PARTNER, bara).not.toContain(bara);
    }
  });

  it("internnivån filtrerar inte alls", () => {
    expect(synligaTyper("intern")).toBeNull();
    expect(synligaTyper("kund")).toEqual(DELBART_KUND);
    expect(synligaTyper("partner")).toEqual(DELBART_PARTNER);
  });
});

describe("uppslag kan inte riktas mot klustrets insida", () => {
  it("känner igen privata, loopback- och link-local-adresser", () => {
    for (const intern of [
      "127.0.0.1",
      "10.4.2.9",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "169.254.169.254", // molnens metadatatjänst
      "100.64.0.1", // CGNAT
      "0.0.0.0",
      "::1",
      "fd00::1",
      "fe80::1",
      "::ffff:127.0.0.1",
    ]) {
      expect(arPrivatAdress(intern), intern).toBe(true);
    }
    for (const extern of ["8.8.8.8", "51.12.3.4", "172.32.0.1", "192.169.0.1", "2606:4700::1111"]) {
      expect(arPrivatAdress(extern), extern).toBe(false);
    }
  });

  it("stoppar både IP-literaler och namn som resolvar inåt", async () => {
    expect(await pekarInat("http://169.254.169.254/latest/meta-data/")).toBe("169.254.169.254");
    expect(await pekarInat("http://localhost:8080/x")).toBe("localhost");
    // Klustrets egna tjänstenamn slutar på .local och stoppas på namnet,
    // utan att ens behöva slås upp.
    expect(await pekarInat("http://postgres.guidad-felsokning.svc.cluster.local/")).toBe(
      "postgres.guidad-felsokning.svc.cluster.local",
    );
    // Namn som slår upp till en privat adress fångas via uppslaget.
    const falskUppslagare = async () => [{ address: "10.0.0.5", family: 4 }];
    expect(await pekarInat("https://kund.exempel.se/", falskUppslagare)).toBe("10.0.0.5");
    const publikUppslagare = async () => [{ address: "93.184.216.34", family: 4 }];
    expect(await pekarInat("https://kund.exempel.se/", publikUppslagare)).toBeNull();
  });

  it("uppslaget avvisar en intern bas-URL innan något anrop görs", async () => {
    let anropades = false;
    const def = { uppslag: { urlFalt: "bas_url", auth: "bearer", authFalt: "n", svarsfalt: { marke: "make" } } };
    const svar = await gorUppslag(
      def,
      { bas_url: "http://169.254.169.254/{vin}", n: "x" },
      "YV1DZ8256F2123456",
      async () => {
        anropades = true;
        return { ok: true, json: async () => ({ make: "Volvo" }) };
      },
    );
    expect(svar.ok).toBe(false);
    expect(svar.fel).toContain("intern adress");
    expect(anropades, "anropet får inte göras alls").toBe(false);
  });
});
