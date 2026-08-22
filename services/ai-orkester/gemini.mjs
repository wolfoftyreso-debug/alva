// Bildanalys via Gemini (ALVA-SPEC-072).
//
// ---- Varför en egen klient ---------------------------------------------
//
// Orkestern talar med Claude genom Anthropics SDK. För Gemini räcker ett
// HTTP-anrop, och tjänsten körs som pod: ett beroende till är en
// angreppsyta, en licens och en uppgraderingsskyldighet till. Anropet är
// tio rader — det är billigare att äga dem än att importera dem.
//
// ---- Vad kommentaren ÄR, och inte --------------------------------------
//
// En bevisbild är evidens. Modellens kommentar under den är INTE evidens,
// och får aldrig se ut som det. Hela systemet är byggt på att observation
// och slutsats hålls isär — en modell som skriver "bromsskivan är skev"
// under ett foto har flyttat en gissning till bevisplats, och det är
// precis den sortens glidning ALVA finns för att förhindra.
//
// Därför är kontraktet snävt:
//   · modellen beskriver vad som SYNS, inte vad som är fel,
//   · den får säga att bilden inte går att bedöma — det är ett giltigt och
//     ofta det ärligaste svaret,
//   · svaret bär alltid modellnamnet, så läsaren vet vem som talar,
//   · den bedöms aldrig av grinden och kan inte höja säkerhetstaket.
//
// Kommentaren skrivs INTE till den förseglade loggen under utvärderingen.
// Loggen är append-only: det som skrivs dit går inte att ta tillbaka, och
// man lägger inte modellutdata i ett bevismaterial medan man fortfarande
// utvärderar om det är till nytta.

// Basadressen går att peka om (GEMINI_BAS): regionala slutpunkter, en
// proxy i drift, och en stubbe i provet — routningen ska gå att pröva utan
// att nå ett riktigt nät.
const STANDARD_BAS = "https://generativelanguage.googleapis.com/v1beta/models";
const bas = () => (process.env.GEMINI_BAS || STANDARD_BAS).replace(/\/$/, "");

/** Standardmodell: snabb, ser bra, billig nog för en kommentar per bild. */
export const STANDARDMODELL = "gemini-3.6-flash";

/** Kommentaren hålls kort med flit — en rad under en bild, inte en uppsats. */
export const MAX_KOMMENTAR = 320;

// Modellen tänker före svaret och tankarna räknas mot maxOutputTokens. En
// snäv budget klipper svaret (finishReason MAX_TOKENS): anropet ser lyckat
// ut och kommentaren blir tom. Utrymmet är därför tilltaget trots att
// svaret är två meningar.

export const BILDANALYS_REGLER = `Du kommenterar ett foto som en fordonstekniker tagit som underlag i en felsökning.

Absoluta regler:
- Beskriv vad som SYNS i bilden. Ställ ingen diagnos och slå inte fast något fel.
- Hitta aldrig på detaljer. Ser du inte något tillräckligt tydligt, säg det.
- "Går inte att bedöma på den här bilden" är ett fullgott och ofta det ärligaste svaret.
- Skriv EN kommentar på högst två meningar, som ska stå under bilden.
- Skriv på samma språk som kontrollens text.
- Peka gärna ut var i bilden det du beskriver finns, om det går.

Du är ett andra par ögon, inte en bedömare. Teknikern äger slutsatsen.`;

const SVARSSCHEMA = {
  type: "object",
  properties: {
    kommentar: { type: "string" },
    // Modellens egen läs-säkerhet. Låg konfidens är information, inte ett fel.
    konfidens: { type: "number" },
  },
  required: ["kommentar"],
};

/**
 * Delar upp en data-URL i mediatyp och base64.
 * Gemini tar emot jpeg, png, webp och heic — samma bilder en telefon ger.
 * SVG och andra vektorformat avvisas: de är inte fotografier.
 */
export function delaDataUrl(dataUrl) {
  const m =
    typeof dataUrl === "string"
      ? dataUrl.match(/^data:(image\/(?:jpeg|jpg|png|webp|heic|heif));base64,([A-Za-z0-9+/=]+)$/)
      : null;
  return m ? { mediatyp: m[1] === "image/jpg" ? "image/jpeg" : m[1], data: m[2] } : null;
}

/** Bygger anropets kropp. Bilden först, frågan efter — som i ett samtal. */
export function byggBegaran({ mediatyp, data, prompt, maxTokens = 1024 }) {
  return {
    system_instruction: { parts: [{ text: BILDANALYS_REGLER }] },
    contents: [
      {
        role: "user",
        parts: [{ inline_data: { mime_type: mediatyp, data } }, { text: prompt }],
      },
    ],
    generationConfig: {
      maxOutputTokens: maxTokens,
      // Låg temperatur: en bildkommentar ska vara återgivande, inte kreativ.
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: SVARSSCHEMA,
    },
  };
}

/**
 * Läser svaret. Returnerar null i stället för att kasta — en utebliven
 * kommentar får aldrig stoppa felsökningen. Bilden står kvar; det är den
 * som är underlaget.
 */
export function lasSvar(json) {
  // Bara `thought: true` markerar en TANKEDEL. `thoughtSignature` sitter på
  // SVARSDELEN också — den är en kontinuitetssignatur, inte en markör för
  // resonemang. Att filtrera på den kastade bort själva svaret och gav en
  // tom kommentar fast anropet lyckats.
  const delar = (json?.candidates?.[0]?.content?.parts ?? []).filter((p) => p?.thought !== true);
  const text = delar.map((p) => p?.text ?? "").join("").trim();
  if (!text) return null;
  let tolkat;
  try {
    tolkat = JSON.parse(text);
  } catch {
    // Modellen svarade i klartext trots schemat. Texten duger som kommentar.
    tolkat = { kommentar: text };
  }
  const kommentar = String(tolkat?.kommentar ?? "").trim();
  if (!kommentar) return null;
  const konfidens = Number(tolkat?.konfidens);
  return {
    kommentar: kommentar.length > MAX_KOMMENTAR ? `${kommentar.slice(0, MAX_KOMMENTAR - 1)}…` : kommentar,
    ...(Number.isFinite(konfidens) ? { konfidens: Math.min(1, Math.max(0, konfidens)) } : {}),
  };
}

/**
 * Kommenterar en bild. Kastar aldrig: allt som går fel blir null, och
 * anroparen visar bilden utan kommentar.
 *
 * @param nyckel   GEMINI_API_KEY
 * @param bild     data-URL (jpeg/png/webp/heic)
 * @param prompt   kontrollens text och sammanhang
 * @param modell   modellnamn
 * @param hamtare  injiceras i test
 */
export async function analyseraBild(nyckel, { bild, prompt, modell = STANDARDMODELL, maxTokens }, hamtare = fetch) {
  if (!nyckel) return null;
  const delar = delaDataUrl(bild);
  if (!delar) return null;
  try {
    const res = await hamtare(`${bas()}/${encodeURIComponent(modell)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": nyckel },
      body: JSON.stringify(byggBegaran({ ...delar, prompt, maxTokens })),
    });
    if (!res.ok) return null;
    const läst = lasSvar(await res.json());
    return läst ? { ...läst, modell } : null;
  } catch {
    return null;
  }
}
