// ALVA-SPEC-001 · Felgräns.
//
// En enda skadad post — en händelse vars fält inte har den form vyn
// väntar sig — fick tidigare hela verktyget att vitskärma, eftersom
// ingen felgräns fanns. I en produkt som är teknikerns arbetsyta mitt i
// ett ärende, och samtidigt kundens och försäkringsbolagets insyn via
// delningslänken, är en vit skärm det värsta utfallet: arbetet ser
// förlorat ut och delningen ser återkallad ut, fastän underlaget finns.
//
// Felgränsen fångar renderingsfel och visar en lugn, märkt yta i stället
// — på designsystemets villkor, med status i ord och utan att påstå att
// något är förlorat. Loggen i storen och på servern är orörd; det är
// visningen som fallerade, och en omladdning räcker oftast.

import { Component, type ErrorInfo, type ReactNode } from "react";

const FARG = { graphite: "#1B1E22", steel: "#4D5662", lightSteel: "#D7DCE2", background: "#F6F7F8", blue: "#005CA9" };

export class Felgrans extends Component<{ children: ReactNode }, { fel: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { fel: false };
  }

  static getDerivedStateFromError(): { fel: boolean } {
    return { fel: true };
  }

  componentDidCatch(fel: Error, info: ErrorInfo): void {
    // Renderingsfel loggas till konsolen för diagnos — aldrig till
    // användaren som en stack. Ingen extern rapportering: felet kan bära
    // ärendedata.
    console.error("Renderingsfel fångat av felgränsen:", fel, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.fel) return this.props.children;
    return (
      <div
        className="alva-yta min-h-screen text-[13px]"
        style={{ background: FARG.background, color: FARG.graphite }}
      >
        <div className="mx-auto max-w-3xl px-4 py-16">
          <div className="border bg-white p-8" style={{ borderColor: FARG.lightSteel }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: FARG.steel }}>
              Display error
            </p>
            <h1 className="mt-2 text-[20px] font-semibold" style={{ color: FARG.graphite }}>
              The view could not be rendered
            </h1>
            <p className="mt-4 leading-[22px]" style={{ color: FARG.steel }}>
              The case record is intact — this is a display fault, not lost data. Reload the page to try again. If it
              persists, note what you were doing and contact the workshop.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 border px-4 py-2 text-[13px] font-semibold"
              style={{ borderColor: FARG.blue, color: FARG.blue, background: FARG.background }}
            >
              Reload the page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
