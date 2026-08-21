// <html lang> följer det valda språket (QUALITY-AUDIT m-6 · WCAG 3.1.1).
//
// index.html står på lang="en". ALVA är tiospråkigt, och axe-testet
// bredvid renderar enskilda komponenter — det ser aldrig att hela sidans
// språkattribut satt kvar på engelska när innehållet bytte till tyska
// eller rumänska. En skärmläsare väljer röst och uttal ur lang; blir det
// kvar på "en" läses nio av tio språk med engelskt uttal. Det här testet
// låser att attributet flyttar med språkvalet.
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { sattWebbSprak, useDokumentSprak } from "../../alva/webbsprak";

function Prov() {
  useDokumentSprak();
  return null;
}

afterEach(() => {
  try {
    localStorage.clear();
  } catch {
    // Privat läge kan neka — minnet nollställs av nästa sattWebbSprak.
  }
});

describe("dokumentets språkattribut", () => {
  it("sätts vid montering och följer varje efterföljande språkval", () => {
    act(() => {
      sattWebbSprak("sv");
    });
    render(<Prov />);
    expect(document.documentElement.lang).toBe("sv");

    act(() => {
      sattWebbSprak("de");
    });
    expect(document.documentElement.lang).toBe("de");

    act(() => {
      sattWebbSprak("ro");
    });
    expect(document.documentElement.lang).toBe("ro");
  });
});
