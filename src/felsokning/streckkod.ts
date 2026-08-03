// QR-, streckkods- och typskyltsläsning för objektidentifiering.
//
// Två vägar, samma resultat:
//   1. Webbläsarens BarcodeDetector (Chrome/Android) läser QR, Code 39/128
//      och Data Matrix direkt ur kameraströmmen — vanligast på typskyltar,
//      VIN-etiketter och maskinmärkning.
//   2. Saknas API:t (t.ex. iOS/Safari) fotograferas typskylten i stället
//      och plattformens bildtolkning läser av den — visual-first: kameran
//      är gränssnittet oavsett vad webbläsaren stöder.
//
// Den avlästa koden klassificeras alltid innan den används, så att rätt
// identifieringsmetod sätts på fordonsobjektet.

export type KodTyp = "VIN" | "Regnr" | "Serienummer";

export interface AvlastKod {
  varde: string;
  typ: KodTyp;
  format?: string;
}

// VIN: 17 tecken, aldrig I, O eller Q (för att inte förväxlas med 1/0).
// Kontrollsiffran (position 9) valideras medvetet inte — den är
// obligatorisk i Nordamerika men följs inte konsekvent i Europa.
const VIN_MONSTER = /^[A-HJ-NPR-Z0-9]{17}$/;
// Svenskt registreringsnummer: ABC123 eller ABC12A (nyare serie).
const REGNR_MONSTER = /^[A-Z]{3}[0-9]{2}[0-9A-Z]$/;

// Normaliserar och klassificerar en avläst kod. QR-koder på fordon och
// maskiner innehåller ofta en URL eller nyckel=värde — då plockas
// identifieraren ut ur innehållet.
export function tolkaKod(ratext: string): AvlastKod | null {
  const text = ratext.trim();
  if (!text) return null;

  // QR med URL eller fält: leta efter vin/regnr i innehållet.
  const vinFalt = text.match(/(?:vin|chassi)[=:/\s]+([A-HJ-NPR-Z0-9]{17})/i);
  if (vinFalt) return { varde: vinFalt[1].toUpperCase(), typ: "VIN" };
  const regnrFalt = text.match(/(?:reg(?:nr)?|plate)[=:/\s]+([A-Za-z]{3}\s?[0-9]{2}[0-9A-Za-z])/i);
  if (regnrFalt) return { varde: regnrFalt[1].replace(/\s/g, "").toUpperCase(), typ: "Regnr" };

  const rent = text.replace(/[\s-]/g, "").toUpperCase();
  if (VIN_MONSTER.test(rent)) return { varde: rent, typ: "VIN" };
  if (REGNR_MONSTER.test(rent)) return { varde: rent, typ: "Regnr" };

  // Allt annat (maskin-/serienummer) tas som det är, men bara om det ser
  // ut som en identifierare — inte som fritext eller en hel URL.
  if (/^[A-Z0-9._/-]{4,40}$/.test(rent) && !/^HTTPS?:/.test(rent)) {
    return { varde: rent, typ: "Serienummer" };
  }
  return null;
}

interface BarcodeDetectorLik {
  detect(kalla: CanvasImageSource): Promise<{ rawValue: string; format?: string }[]>;
}

function detektorKlass(): (new (init?: { formats?: string[] }) => BarcodeDetectorLik) | undefined {
  return (globalThis as { BarcodeDetector?: new (init?: { formats?: string[] }) => BarcodeDetectorLik })
    .BarcodeDetector;
}

export function stodStreckkod(): boolean {
  return !!detektorKlass() && !!navigator.mediaDevices?.getUserMedia;
}

export interface Skanning {
  stoppa: () => void;
}

// Startar kameraströmmen i det angivna video-elementet och anropar
// vidTraff första gången en giltig kod lästs av. Anroparen ansvarar för
// att stoppa skanningen (returvärdet) när panelen stängs.
export async function startaSkanning(
  video: HTMLVideoElement,
  vidTraff: (kod: AvlastKod) => void,
  vidFel?: (meddelande: string) => void,
): Promise<Skanning> {
  const Detektor = detektorKlass();
  if (!Detektor) {
    vidFel?.("Webbläsaren saknar streckkodsläsning — fotografera typskylten i stället.");
    return { stoppa: () => {} };
  }

  // Samlat tillstånd: stoppa() kan då stänga ner även om skanningen
  // avbryts innan kameraströmmen hunnit starta.
  const lage: { aktiv: boolean; strom?: MediaStream; timer?: ReturnType<typeof setInterval> } = { aktiv: true };

  const stoppa = () => {
    lage.aktiv = false;
    if (lage.timer !== undefined) clearInterval(lage.timer);
    lage.strom?.getTracks().forEach((spar) => spar.stop());
  };

  try {
    lage.strom = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    if (!lage.aktiv) {
      lage.strom.getTracks().forEach((spar) => spar.stop());
      return { stoppa };
    }
    video.srcObject = lage.strom;
    // play() väntas medvetet inte in: på vissa enheter resolvar löftet
    // först när första bildrutan kommit, och då skulle avläsningen aldrig
    // starta. Detektorn får helt enkelt tomma rutor tills strömmen är i gång.
    void video.play().catch(() => {});
  } catch {
    vidFel?.("Kameran kunde inte startas — kontrollera behörigheten eller fotografera typskylten.");
    return { stoppa };
  }

  const detektor = new Detektor({ formats: ["qr_code", "code_128", "code_39", "data_matrix", "pdf417"] });
  // Avläsning ~2,5 ggr/sekund räcker gott och håller nere batteridraget.
  lage.timer = setInterval(async () => {
    if (!lage.aktiv) return;
    try {
      const traffar = await detektor.detect(video);
      for (const traff of traffar) {
        const kod = tolkaKod(traff.rawValue);
        if (kod) {
          stoppa();
          vidTraff({ ...kod, format: traff.format });
          return;
        }
      }
    } catch {
      // Enstaka avläsningsfel är normalt — nästa bildruta får försöka.
    }
  }, 400);

  return { stoppa };
}
