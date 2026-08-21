// Delade UI-komponenter för Guidad Felsökning.
//
// ---- Ett system, inte två -----------------------------------------------
//
// Det här filhuvudet beskrev tidigare en egen designfilosofi: "industriellt
// verkstadsverktyg i ETKA-tradition" med egen palett, eget snitt och egen
// rytm. Den beskrivningen var inte fel i sak — men den var en ANDRA
// beskrivning, vid sidan av ALVA-SPEC-001, och två designsystem i samma
// produkt blir aldrig lika. De blev det inte heller: portalen höll åtta
// färger, arbetsvyn fyrtiosju.
//
// Skillnaden syntes värst i typsnittet. Arbetsvyn låg utanför `.alva-yta`
// och ärvde därför värdapplikationens antikva — samma fynd som en gång
// gjordes om portalen, fast här hade det stått kvar. En tekniker som
// klickar från portalen in i ett ärende bytte alltså både färg och
// bokstavsform, och läste det som två produkter.
//
// Komponenterna nedan bär nu ALVA:s språk: FARG-paletten, 8 px-rutnätet,
// versala sektionsetiketter, inga skuggor, ingen rörelse.
//
// ---- Det som ändå skiljer, och varför ------------------------------------
//
// STORLEK. Knappar och träffytor är större här än i portalen. Det är inte
// en annan estetik utan ett annat bruk: portalen läses vid ett skrivbord,
// arbetsvyn används med handskar bredvid ett fordon. Måtten följer samma
// rutnät, de är bara fler steg på det.
//
// TÄTHET. Arbetsvyn visar mer per skärm. Samma skäl: teknikern ska se
// ärendets tillstånd utan att bläddra.

import { Link } from "react-router-dom";
import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from "react";
import { lagringsfel, paLagringsfel } from "./lagring";
import type { Tillforlitlighet } from "./domain";
import { TILLFORLITLIGHET_LABEL } from "./domain";
import { MikrofonKnapp } from "./Mikrofon";
import { IkonPunkt } from "./ikoner";
import { Etikett, FARG } from "@/alva/komponenter";
import { ALVA } from "@/alva/system";

/**
 * Säger ifrån när lagringen inte tar emot.
 *
 * Tyst dataförlust är det värsta utfallet i en append-only-logg: appen
 * fungerar, arbetet syns på skärmen, och vid nästa omladdning är allt
 * sedan senaste lyckade skrivning borta. Bilagor bäddas in som data-URL
 * i lokalt läge, så en video plus några foton räcker för att fylla
 * kvoten. Raden nedan är därför inte en artighet utan en varning: allt
 * som står på skärmen finns fortfarande, men det är inte sparat.
 */
function Lagringsvarning() {
  const fel = useSyncExternalStore(paLagringsfel, lagringsfel, () => null);
  if (!fel) return null;
  return (
    <p
      className="mx-auto max-w-3xl border-b px-4 py-2 text-[12px] font-semibold print:hidden"
      style={{ background: FARG.background, borderColor: FARG.varning, color: FARG.varning }}
      role="status"
    >
      {fel === "full"
        ? "Local storage is full — the work on screen is NOT saved. Export or sync the case, then free up space before continuing."
        : "Local storage is unavailable — the work on screen is NOT saved. Sign in to sync, or export the case before closing this window."}
    </p>
  );
}

export function FelsokningSkal({
  rubrik,
  tillbaka,
  hoger,
  bred,
  children,
}: {
  rubrik: string;
  tillbaka?: { till: string; text: string };
  hoger?: ReactNode;
  bred?: boolean;
  children: ReactNode;
}) {
  const maxBredd = bred ? "max-w-[1240px]" : "max-w-3xl";
  return (
    // `alva-yta` bär typografin ur ALVA-SPEC-001 §6 och håller den skild
    // från värdapplikationens antikva. Utan den klassen ärver arbetsvyn
    // butikens snitt, vilket är exakt vad som hände innan.
    <div
      className="alva-yta felsokning-print min-h-screen text-[13px]"
      style={{ background: FARG.background, color: FARG.graphite }}
    >
      {/* Verktygsraden är vit med en enda linje under, precis som
          portalens sidhuvud. Den var tidigare mörkt marinblå — ett eget
          varumärke inuti varumärket. */}
      <header
        className="sticky top-0 z-20 border-b px-4 print:static"
        style={{ borderColor: FARG.lightSteel, background: FARG.white }}
      >
        <div className={`mx-auto flex min-h-12 ${maxBredd} items-center justify-between gap-4 py-2`}>
          <div className="flex min-w-0 items-center gap-2">
            {/* Ordmärket står först, precis som i portalens sidhuvud.
                Utan det bytte teknikern huvud när den klickade sig från
                portalen in i ett ärende, och två sidhuvuden i rad läses
                som två system. Länken går till översikten och inte till
                portalen: arbetsvyn fungerar i lokalt läge utan session,
                och en länk som studsar till inloggningen vore sämre än
                ingen länk. */}
            <Link
              to="/alva"
              className="hidden text-[14px] font-semibold tracking-[0.02em] sm:inline"
              style={{ color: FARG.graphite }}
            >
              {ALVA.namn}
            </Link>
            <span className="hidden sm:inline" style={{ color: FARG.lightSteel }}>
              /
            </span>
            {tillbaka && (
              <>
                <Link
                  to={tillbaka.till}
                  className="whitespace-nowrap text-[12px] font-semibold uppercase tracking-[0.08em] hover:underline"
                  style={{ color: FARG.steel }}
                >
                  ← {tillbaka.text}
                </Link>
                <span style={{ color: FARG.lightSteel }}>/</span>
              </>
            )}
            <h1
              className="truncate text-[14px] font-semibold uppercase tracking-[0.02em]"
              style={{ color: FARG.graphite }}
            >
              {rubrik}
            </h1>
          </div>
          {hoger}
        </div>
      </header>
      <Lagringsvarning />
      <main className={`mx-auto ${maxBredd} px-4 py-4 pb-20`}>{children}</main>
    </div>
  );
}

/**
 * Modal dialog — tillgänglig på riktigt.
 *
 * Överlämningsdialogen var tidigare ett `fixed inset-0`-lager utan
 * `role="dialog"`, utan `aria-modal`, utan fokusfälla och utan Escape.
 * Bakgrunden förblev alltså tangentbords- och skärmläsarnåbar: en
 * användare kunde tabba ut ur dialogen och arbeta vidare i en vy som
 * visuellt låg bakom ett mörkt lager. Komponenttestet renderade aldrig
 * dialogen, så axe-kontrollen gick grön ändå.
 *
 * Den här komponenten gör det EN gång, rätt:
 *   - role="dialog" + aria-modal + aria-labelledby mot rubriken
 *   - Escape stänger
 *   - fokus flyttas in vid öppning och tillbaka till utlösaren vid stängning
 *   - Tab cirkulerar inom dialogen (fokusfälla)
 *   - klick på bakgrunden stänger, klick i panelen gör det inte
 */
export function Dialog({
  rubrik,
  stang,
  children,
}: {
  rubrik: string;
  stang: () => void;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const rubrikId = useId();

  useEffect(() => {
    const tidigareFokus = document.activeElement as HTMLElement | null;
    const fokuserbara = () => {
      const alla = [
        ...(panel.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ) ?? []),
      ];
      // offsetParent är alltid null i en testmiljö utan layout, så ett
      // filter på synlighet får aldrig tömma listan helt — då hade
      // fokusfällan tystnat just där den prövas.
      const synliga = alla.filter((e) => e.offsetParent !== null);
      return synliga.length > 0 ? synliga : alla;
    };

    fokuserbara()[0]?.focus();

    const vidTangent = (h: KeyboardEvent) => {
      if (h.key === "Escape") {
        h.preventDefault();
        stang();
        return;
      }
      if (h.key !== "Tab") return;
      const element = fokuserbara();
      if (element.length === 0) return;
      const forsta = element[0];
      const sista = element[element.length - 1];
      if (h.shiftKey && document.activeElement === forsta) {
        h.preventDefault();
        sista.focus();
      } else if (!h.shiftKey && document.activeElement === sista) {
        h.preventDefault();
        forsta.focus();
      }
    };

    document.addEventListener("keydown", vidTangent);
    return () => {
      document.removeEventListener("keydown", vidTangent);
      // Fokus tillbaka dit det kom ifrån — annars hamnar tangentbords-
      // användaren överst på sidan efter varje dialog.
      tidigareFokus?.focus?.();
    };
  }, [stang]);

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      onClick={stang}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={rubrikId}
        onClick={(h) => h.stopPropagation()}
        className="max-h-full w-full max-w-2xl overflow-y-auto border p-4"
        style={{ borderColor: FARG.lightSteel, background: FARG.background }}
      >
        <h2 id={rubrikId} className="mb-4 text-[15px] font-semibold">
          {rubrik}
        </h2>
        {children}
      </div>
    </div>
  );
}

export function StorKnapp({
  children,
  onClick,
  variant = "primar",
  disabled,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primar" | "sekundar" | "fara";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  // Samma tre vikter som portalens Knapp: fylld, kontur, och den spärrade
  // varianten i oxidrött. Ingen hovring som byter färg — en yta som
  // ändrar sig när muspekaren råkar passera är rörelse utan innehåll.
  const stil =
    variant === "primar"
      ? { background: FARG.graphite, color: FARG.white, borderColor: FARG.graphite }
      : variant === "fara"
        ? { background: FARG.stoppat, color: FARG.white, borderColor: FARG.stoppat }
        : { background: FARG.white, color: FARG.graphite, borderColor: FARG.steel };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-12 w-full border px-4 py-2 text-[13px] font-semibold tracking-[0.02em] disabled:cursor-not-allowed disabled:opacity-40 print:hidden ${className}`}
      style={stil}
    >
      {children}
    </button>
  );
}

export function Panel({ rubrik, children }: { rubrik?: string; children: ReactNode }) {
  // Samma form som portalens Block: vit ruta, en linje runt, och en
  // rubrikrad i bakgrundstonen. Ingen skugga — ALVA:s ytor ligger i
  // samma plan.
  return (
    <section className="mb-4 border" style={{ borderColor: FARG.lightSteel, background: FARG.white }}>
      {rubrik && (
        <header
          className="border-b px-4 py-2"
          style={{ borderColor: FARG.lightSteel, background: FARG.background }}
        >
          <h2
            className="text-[11px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: FARG.steel }}
          >
            {rubrik}
          </h2>
        </header>
      )}
      <div className="px-4 py-2">{children}</div>
    </section>
  );
}

// Tillförlitlighet anges med ord OCH punkt, aldrig med enbart färg.
// Grönt finns inte i ALVA:s palett: blått bär "verifierat" (se
// STATUSFARG i komponenter.tsx), oxidgult "osäkert", oxidrött "svagt".
const NIVA_FARG: Record<Tillforlitlighet, string> = {
  hog: FARG.blue,
  medel: FARG.varning,
  lag: FARG.stoppat,
};

export function NivaBadge({ niva }: { niva: Tillforlitlighet }) {
  return (
    <span
      className="inline-flex items-center gap-2 whitespace-nowrap text-[12px] font-semibold uppercase tracking-[0.08em]"
      style={{ color: NIVA_FARG[niva] }}
    >
      <IkonPunkt farg={NIVA_FARG[niva]} />
      {TILLFORLITLIGHET_LABEL[niva]}
    </span>
  );
}

export function TextFalt({
  label,
  varde,
  satt,
  platshallare,
  flerRad,
  rost,
  losenord,
}: {
  label: string;
  varde: string;
  satt: (v: string) => void;
  platshallare?: string;
  flerRad?: boolean;
  rost?: boolean;
  losenord?: boolean;
}) {
  // Tal-till-text skriver in i samma redigerbara fält — användaren
  // granskar och bekräftar alltid innan något sparas i loggen.
  const vardeRef = useRef(varde);
  vardeRef.current = varde;
  const klass = "w-full border px-2 py-2 text-[13px] focus:outline-none";
  const stil = { borderColor: FARG.steel, background: FARG.white, color: FARG.graphite };
  return (
    <label className="mb-4 block">
      <span className="mb-2 flex min-h-6 items-center justify-between gap-2">
        <Etikett>{label}</Etikett>
        {rost && (
          <MikrofonKnapp
            paText={(text) => satt(vardeRef.current ? `${vardeRef.current.trimEnd()} ${text}` : text)}
          />
        )}
      </span>
      {flerRad ? (
        <textarea
          value={varde}
          onChange={(e) => satt(e.target.value)}
          placeholder={platshallare}
          rows={3}
          className={klass}
          style={stil}
        />
      ) : (
        <input
          type={losenord ? "password" : "text"}
          value={varde}
          onChange={(e) => satt(e.target.value)}
          placeholder={platshallare}
          className={klass}
          style={stil}
        />
      )}
    </label>
  );
}
