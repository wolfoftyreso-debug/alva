// @vitest-environment node
// Routningen genom den RIKTIGA orkestern (ALVA-SPEC-072).
//
// Enhetstesterna prövar Gemini-modulen isolerat. Det som INTE syns där är
// om /api/ai faktiskt skickar bildanalysen till Gemini i stället för till
// Claude, om nyckeln hamnar rätt, och om felvägarna leder någonstans
// vettigt. Därför en riktig HTTP-rundtur mot en stubbad modell.
import { createServer, type Server } from "node:http";
import { createHmac } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const HEM = "provhemlighet";
const STUB_PORT = 4396;
const ORK_PORT = 4397;
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";

let stub: Server;
let orkester: Server;
let sistaBegaran: Record<string, never> | null = null;
let sistNyckel: string | undefined;

const token = (() => {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const h = b64({ alg: "HS256", typ: "JWT" });
  const n = b64({ sub: "u1", org: "o1", exp: Math.floor(Date.now() / 1000) + 600 });
  return `${h}.${n}.${createHmac("sha256", HEM).update(`${h}.${n}`).digest("base64url")}`;
})();

const anropa = (kropp: unknown, t = token) =>
  fetch(`http://127.0.0.1:${ORK_PORT}/api/ai`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${t}` },
    body: JSON.stringify(kropp),
  });

beforeAll(async () => {
  process.env.JWT_SECRET = HEM;
  process.env.GEMINI_API_KEY = "provnyckel";
  process.env.GEMINI_BAS = `http://127.0.0.1:${STUB_PORT}/v1beta/models`;

  stub = createServer((q, r) => {
    const bitar: Buffer[] = [];
    q.on("data", (d) => bitar.push(d as Buffer));
    q.on("end", () => {
      sistaBegaran = JSON.parse(Buffer.concat(bitar).toString());
      sistNyckel = q.headers["x-goog-api-key"] as string;
      r.writeHead(200, { "content-type": "application/json" });
      r.end(
        JSON.stringify({
          candidates: [
            { content: { parts: [{ text: JSON.stringify({ kommentar: "Ojämnt slitage på inre kanten.", konfidens: 0.66 }) }] } },
          ],
        }),
      );
    });
  });
  await new Promise<void>((r) => stub.listen(STUB_PORT, r));

  const { skapaServer } = await import("../../../../services/ai-orkester/server.mjs");
  orkester = skapaServer();
  await new Promise<void>((r) => orkester.listen(ORK_PORT, r));
});

afterAll(() => {
  orkester?.close();
  stub?.close();
});

describe("bildanalysen går till Gemini genom /api/ai", () => {
  it("svarar med kommentaren, konfidensen och modellnamnet", async () => {
    const r = await anropa({ uppgift: "bildanalys", prompt: "Check the tyre wear", bild: PNG });
    expect(r.status).toBe(200);
    const j = (await r.json()) as { modell: string; svar: { kommentar: string; konfidens: number } };
    expect(j.svar.kommentar).toBe("Ojämnt slitage på inre kanten.");
    expect(j.svar.konfidens).toBe(0.66);
    // Läsaren måste kunna se VEM som talar.
    expect(j.modell).toMatch(/^gemini/);
  });

  it("skickar bilden som inline_data med systemreglerna, och nyckeln i huvudet", async () => {
    await anropa({ uppgift: "bildanalys", prompt: "p", bild: PNG });
    const b = sistaBegaran as unknown as {
      contents: { parts: { inline_data?: { mime_type: string } }[] }[];
      system_instruction: { parts: { text: string }[] };
    };
    expect(b.contents[0].parts[0].inline_data?.mime_type).toBe("image/png");
    expect(b.system_instruction.parts[0].text).toMatch(/Ställ ingen diagnos/);
    // Nyckeln får aldrig hamna i adressen — den skulle följa med i varje logg.
    expect(sistNyckel).toBe("provnyckel");
  });

  it("en vektorbild avvisas vid formatkontrollen, före modellen", async () => {
    const r = await anropa({ uppgift: "bildanalys", prompt: "p", bild: "data:image/svg+xml;base64,AAAA" });
    expect(r.status).toBe(400);
  });

  it("utan giltig token nekas anropet", async () => {
    expect((await anropa({ uppgift: "bildanalys", prompt: "p", bild: PNG }, "trams")).status).toBe(401);
  });

  it("utan Gemini-nyckel svarar tjänsten avstängd — felsökningen står aldrig på en modell", async () => {
    const kvar = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const r = await anropa({ uppgift: "bildanalys", prompt: "p", bild: PNG });
    const j = (await r.json()) as { avstangd?: boolean };
    process.env.GEMINI_API_KEY = kvar;
    expect(r.status).toBe(503);
    expect(j.avstangd).toBe(true);
  });
});
