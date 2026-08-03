// Formatering och bildhantering — utan React-beroenden.

export function tidKlockslag(iso: string): string {
  return new Date(iso).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

export function tidDatum(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE");
}

// Skalar ner ett foto innan det loggas, så att händelseloggen förblir hanterbar.
export function skalaNerFoto(fil: File, maxSida = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const lasare = new FileReader();
    lasare.onerror = () => reject(new Error("Kunde inte läsa filen"));
    lasare.onload = () => {
      const bild = new Image();
      bild.onerror = () => reject(new Error("Kunde inte tolka bilden"));
      bild.onload = () => {
        const skala = Math.min(1, maxSida / Math.max(bild.width, bild.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bild.width * skala);
        canvas.height = Math.round(bild.height * skala);
        canvas.getContext("2d")!.drawImage(bild, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      bild.src = lasare.result as string;
    };
    lasare.readAsDataURL(fil);
  });
}

// Video läses rå (ingen transkodning i webbläsaren) — därför hård
// storleksgräns: kort och komprimerad klipp, ca 10–15 sekunder.
export const MAX_VIDEO_BYTE = 2_500_000;

export function lasVideo(fil: File): Promise<string> {
  return new Promise((los, avvisa) => {
    if (fil.size > MAX_VIDEO_BYTE) {
      avvisa(new Error("Videon är för stor — spela in ett kort klipp (ca 10–15 sekunder)."));
      return;
    }
    const lasare = new FileReader();
    lasare.onload = () => los(lasare.result as string);
    lasare.onerror = () => avvisa(new Error("Videon kunde inte läsas."));
    lasare.readAsDataURL(fil);
  });
}
