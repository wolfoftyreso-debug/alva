// ALVA:s komponentbibliotek.
//
// Ett bibliotek, två användningar: den publika webbplatsen och det
// inloggade gränssnittet. Besökaren ska aldrig märka att den lämnat
// marknadswebben när den loggar in, eftersom den inte har gjort det —
// det är samma system, samma typografi, samma rutnät, samma ord.
//
// Regler som gäller varje komponent här:
//
//   Rutnät      8 px, undantagslöst. Ett rutnät med undantag är inget.
//   Färg        Nästan monokromt. ALVA Blue bara för aktivt steg,
//               verifierad status och markerad komponent — aldrig som
//               dekoration.
//   Rörelse     Ingen. En animation som inte bär information är brus i
//               ett utrymme där teknikern redan har för mycket brus.
//   Ikoner      ✓ ○ □ → och inget annat. Inga emojier, inga
//               illustrationer.
//   Rubriker    VERSALER. Sektionsrubriker är etiketter, inte meningar.

import type { ReactNode } from "react";
import { type Fas, FASER, fasDefinition } from "./system";
import { STATUS, type Status } from "./sprak";

// ---- Färg -------------------------------------------------------------

export const FARG = {
  graphite: "#1B1E22",
  steel: "#4D5662",
  lightSteel: "#D7DCE2",
  background: "#F6F7F8",
  blue: "#005CA9",
  white: "#FFFFFF",

  // ---- Allvarlighetsgrad ----------------------------------------------
  //
  // Semantik, inte accent. Blått är ytans enda accent och ska förbli det;
  // de här två säger något annat — att något är förfallet respektive
  // stoppat — och den skillnaden får inte bäras av enbart text.
  //
  // Oxidtonerna är de som redan används i felsökningsgränssnittet för
  // återkallat och spärrat. Att införa nya nyanser för samma betydelse
  // hade gett systemet två språk för samma sak.
  varning: "#8A5A00",
  stoppat: "#8B1A1A",
} as const;

// ---- Typografi --------------------------------------------------------

/**
 * Sektionsetikett. Versaler, spärrad, liten. Detta är hur ett tekniskt
 * dokument märker upp ett fält — inte hur en rubrik i en artikel ser ut.
 */
export function Etikett({ children, ton = "steel" }: { children: ReactNode; ton?: "steel" | "blue" | "graphite" }) {
  const färg = ton === "blue" ? FARG.blue : ton === "graphite" ? FARG.graphite : FARG.steel;
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: färg }}>
      {children}
    </div>
  );
}

export function Rubrik({ children, niva = 2 }: { children: ReactNode; niva?: 1 | 2 | 3 }) {
  const storlek = niva === 1 ? "text-[32px] leading-[40px]" : niva === 2 ? "text-[22px] leading-[32px]" : "text-[16px] leading-[24px]";
  const Tagg = (niva === 1 ? "h1" : niva === 2 ? "h2" : "h3") as "h1";
  return (
    <Tagg className={`${storlek} font-semibold uppercase tracking-[0.02em]`} style={{ color: FARG.graphite }}>
      {children}
    </Tagg>
  );
}

// ---- Ikoner -----------------------------------------------------------
//
// Fyra tecken. En status som inte går att uttrycka med dem är en status
// som inte är genomtänkt.

export type Ikon = "klar" | "pagaende" | "vantar" | "nasta";

const IKONTECKEN: Record<Ikon, string> = {
  klar: "✓",
  pagaende: "○",
  vantar: "□",
  nasta: "→",
};

export function Symbol({ ikon, ton }: { ikon: Ikon; ton?: string }) {
  return (
    <span aria-hidden="true" className="inline-block w-4 text-center font-normal" style={{ color: ton ?? FARG.steel }}>
      {IKONTECKEN[ikon]}
    </span>
  );
}

// ---- Status -----------------------------------------------------------

const STATUSFARG: Record<Status, string> = {
  pending: FARG.steel,
  in_progress: FARG.blue,
  complete: FARG.graphite,
  passed: FARG.blue,
  failed: FARG.graphite,
  blocked: FARG.graphite,
  incomplete: FARG.steel,
  not_applicable: FARG.steel,
};

/**
 * Status anges alltid med ord, aldrig enbart med färg. En tekniker med
 * nedsatt färgseende ska kunna skilja PASSED från FAILED — och den som
 * läser en utskrift i svartvitt likaså.
 */
export function Statusmärke({ status }: { status: Status }) {
  const ram = status === "failed" || status === "blocked";
  return (
    <span
      className="inline-block border px-2 py-[2px] text-[11px] font-semibold uppercase tracking-[0.08em]"
      style={{
        color: STATUSFARG[status],
        borderColor: ram ? FARG.graphite : FARG.lightSteel,
        background: FARG.white,
      }}
    >
      {STATUS[status]}
    </span>
  );
}

// ---- Datablock --------------------------------------------------------

/**
 * Ett fält med etikett och värde. Grunden i varje ALVA-skärm: systemet
 * redovisar tillstånd i namngivna fält i stället för i löpande text.
 */
export function Falt({ etikett, children }: { etikett: string; children: ReactNode }) {
  return (
    <div className="border-t py-2" style={{ borderColor: FARG.lightSteel }}>
      <Etikett>{etikett}</Etikett>
      <div className="mt-2 text-[14px] leading-[20px]" style={{ color: FARG.graphite }}>
        {children}
      </div>
    </div>
  );
}

export function Block({ children, rubrik, beteckning }: { children: ReactNode; rubrik?: string; beteckning?: string }) {
  return (
    <section className="mb-6 border bg-white" style={{ borderColor: FARG.lightSteel }}>
      {(rubrik || beteckning) && (
        <header
          className="flex items-baseline justify-between border-b px-4 py-2"
          style={{ borderColor: FARG.lightSteel, background: FARG.background }}
        >
          {rubrik && <Rubrik niva={3}>{rubrik}</Rubrik>}
          {beteckning && <span className="font-mono text-[11px]" style={{ color: FARG.steel }}>{beteckning}</span>}
        </header>
      )}
      <div className="px-4 py-2">{children}</div>
    </section>
  );
}

/**
 * Demonstrationsmärkning.
 *
 * QUALITY-AUDIT-2 · m-9. Inloggningen ser ut som en inloggning men
 * autentiserar ingenting, och kontoansökan skickar ingenting. Två
 * personer i rad har försökt använda dem på riktigt — vilket är precis
 * vad fyndet förutsade: en yta som ser färdig ut planerar man efter.
 *
 * Integrationssidan märker redan en profil `draft` tills den körts mot
 * leverantören, med motiveringen att en lista där allt ser färdigt ut är
 * den snabbaste vägen till ett misslyckat införande. Samma måttstock
 * gäller här. Rutan säger vad som INTE sker, inte vad som kommer att ske
 * någon gång — ett löfte vore samma fel i ny form.
 */
export function Demonstration({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6 border-l-2 px-4 py-4" style={{ borderColor: FARG.graphite, background: FARG.white }}>
      <Etikett ton="graphite">Demonstration</Etikett>
      <p className="mt-2 max-w-[680px] text-[13px] leading-[20px]" style={{ color: FARG.graphite }}>
        {children}
      </p>
    </div>
  );
}

// ---- Fasindikator -----------------------------------------------------

/**
 * ALVA-modellen som ett tillstånd, inte som en illustration. Den visar
 * var i metoden arbetet befinner sig — vilket är den enda frågan en
 * tekniker som återupptar ett ärende faktiskt har.
 */
export function Fasrad({ aktiv, klara = [] }: { aktiv: Fas; klara?: Fas[] }) {
  return (
    <ol className="flex border" style={{ borderColor: FARG.lightSteel }}>
      {FASER.map((f) => {
        const ärAktiv = f.id === aktiv;
        const ärKlar = klara.includes(f.id);
        return (
          <li
            key={f.id}
            aria-current={ärAktiv ? "step" : undefined}
            // `min-w-0` gör att kolumnen får krympa under sitt innehåll.
            // Utan det sköt raden ut hela ärendesidan i sidled på en
            // telefon — och fasindikatorn är det första en tekniker som
            // återupptar ett ärende tittar på.
            className="min-w-0 flex-1 border-r px-2 py-2 last:border-r-0 sm:px-4"
            style={{
              borderColor: FARG.lightSteel,
              background: ärAktiv ? FARG.blue : FARG.white,
              color: ärAktiv ? FARG.white : ärKlar ? FARG.graphite : FARG.steel,
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-[18px] font-semibold leading-none">{f.bokstav}</span>
              <Symbol ikon={ärKlar ? "klar" : ärAktiv ? "pagaende" : "vantar"} ton={ärAktiv ? FARG.white : undefined} />
            </div>
            {/* På en telefon ryms inte LOCALIZATION i en fjärdedels
                skärmbredd, och ett tvingat radbrott mitt i ordet är inte
                tydligare än inget namn alls. Under 640 px bär bokstaven
                och statussymbolen informationen — vilket är precis vad
                A·L·V·A är till för — medan raden ovanför namnger den
                aktiva fasen och dess syfte i klartext. */}
            <div className="mt-2 hidden text-[11px] font-semibold uppercase tracking-[0.08em] sm:block">{f.namn}</div>
            <span className="sr-only">{f.namn}</span>
            <div className="mt-2 hidden text-[11px] leading-[16px] sm:block" style={{ opacity: ärAktiv ? 0.9 : 0.75 }}>
              {f.syfte}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ---- Skärmstruktur ----------------------------------------------------

/**
 * Varje ALVA-skärm har samma struktur, och det är avsiktligt monotont:
 *
 *   SYSTEM → CURRENT STEP → OBJECTIVE → REQUIRED INPUT → RESULT → NEXT ACTION
 *
 * En tekniker som lärt sig läsa en skärm har lärt sig läsa alla. Det är
 * samma princip som gör att en instrumentpanel i ett flygplan går att
 * flytta mellan flygplanstyper.
 */
export interface Procedursteg {
  fas: Fas;
  steg: string;
  syfte: string;
  underlag?: string;
  forvantat?: string;
  resultat?: ReactNode;
  status: Status;
  nasta?: string;
}

export function Procedurvy({
  beteckning: bet,
  steg,
  klaraFaser = [],
  children,
}: {
  beteckning: string;
  steg: Procedursteg;
  klaraFaser?: Fas[];
  children?: ReactNode;
}) {
  const fas = fasDefinition(steg.fas);
  return (
    <div style={{ background: FARG.background }}>
      <div className="mx-auto max-w-[880px] px-6 py-8">
        <div className="mb-6 flex items-baseline justify-between">
          <Etikett ton="graphite">System</Etikett>
          <span className="font-mono text-[11px]" style={{ color: FARG.steel }}>{bet}</span>
        </div>

        <div className="mb-6">
          <Fasrad aktiv={steg.fas} klara={klaraFaser} />
        </div>

        <Block rubrik="Current step">
          <Falt etikett="Phase">
            {fas.namn} — {fas.syfte}
          </Falt>
          <Falt etikett="Step">{steg.steg}</Falt>
          <Falt etikett="Objective">{steg.syfte}</Falt>
          {steg.underlag && <Falt etikett="Input required">{steg.underlag}</Falt>}
          {steg.forvantat && <Falt etikett="Expected value">{steg.forvantat}</Falt>}
          <Falt etikett="Status">
            <Statusmärke status={steg.status} />
          </Falt>
          {steg.resultat && <Falt etikett="Result">{steg.resultat}</Falt>}
          {steg.nasta && (
            <Falt etikett="Next action">
              <span className="inline-flex items-center gap-2">
                <Symbol ikon="nasta" />
                {steg.nasta}
              </span>
            </Falt>
          )}
        </Block>

        {children}
      </div>
    </div>
  );
}

// ---- Interaktion ------------------------------------------------------

export function Knapp({
  children,
  onClick,
  variant = "primar",
  disabled,
  bred = false,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primar" | "sekundar";
  disabled?: boolean;
  /**
   * Fyller sin behållare i stället för att vara innehållsbred.
   *
   * För knappar som står bredvid varandra: två olika breda knappar läser
   * sig som en huvudåtgärd och en eftertanke, oavsett vad de heter. Med
   * lika bredd skiljs vikten av fyllning mot kontur i stället.
   */
  bred?: boolean;
  type?: "button" | "submit";
}) {
  const primär = variant === "primar";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      // `h-full` och inte bara `w-full`: lika breda knappar där den ena
      // texten bryts till två rader blir olika HÖGA, vilket är samma
      // obalans en rad ned. Bägge fyller sin cell.
      className={`border px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.08em] disabled:opacity-40${
        bred ? " h-full w-full" : ""
      }`}
      style={{
        background: primär ? FARG.graphite : FARG.white,
        color: primär ? FARG.white : FARG.graphite,
        borderColor: primär ? FARG.graphite : FARG.steel,
      }}
    >
      {children}
    </button>
  );
}

/**
 * Tabell — med en andra form för smala skärmar.
 *
 * En sexkolumnstabell på en telefon har två utfall, och bägge är dåliga:
 * antingen tvingas hela sidan i sidled, eller så scrollar tabellen inuti
 * sig själv och läsaren ser tre tecken av varje kolumn. Det första är vad
 * som hände här — dokumentet blev 842 px brett på en 390 px-skärm och
 * texten kapades.
 *
 * Under 640 px blir varje rad därför en grupp namngivna fält i stället:
 * kolumnrubriken som etikett, cellen som värde. Det är samma form som
 * `Falt` redan använder, och samma princip som resten av ytan — ett
 * instrumentpanelsblad läser man uppifrån och ner, inte i sidled.
 *
 * Bägge formerna renderas och växlas med bredd, inte med JavaScript. Det
 * håller markeringen fri från tillstånd och fungerar innan skriptet
 * kört.
 */
/**
 * Textfält.
 *
 * Fanns inte förrän nu: inloggningen kodade sitt eget, och nästa vy som
 * behövde ett hade blivit det tredje stället där samma ruta ritas för
 * hand. Tre gånger är där ett designsystem tappas — inte i det stora
 * beslutet utan i den lilla upprepningen.
 */
export function Textfalt({
  label,
  varde,
  andra,
  platshallare,
  typ = "text",
  komplettering,
}: {
  label: string;
  varde: string;
  andra: (v: string) => void;
  platshallare?: string;
  typ?: "text" | "email" | "password";
  komplettering?: string;
}) {
  const id = `f-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[11px] font-semibold uppercase tracking-[0.08em]"
        style={{ color: FARG.steel }}
      >
        {label}
      </label>
      <input
        id={id}
        type={typ}
        value={varde}
        autoComplete={komplettering}
        placeholder={platshallare}
        onChange={(e) => andra(e.target.value)}
        className="mt-2 w-full border px-4 py-2 text-[14px]"
        style={{ borderColor: FARG.lightSteel, background: FARG.white, color: FARG.graphite }}
      />
    </div>
  );
}

export function Tabell({ kolumner, rader }: { kolumner: string[]; rader: ReactNode[][] }) {
  return (
    <>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {kolumner.map((k) => (
                <th
                  key={k}
                  scope="col"
                  className="border-b px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{ borderColor: FARG.lightSteel, color: FARG.steel }}
                >
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rader.map((rad, i) => (
              <tr key={i}>
                {rad.map((cell, j) => (
                  <td
                    key={j}
                    className="border-b px-4 py-2 align-top"
                    style={{ borderColor: FARG.lightSteel, color: FARG.graphite }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sm:hidden">
        {rader.map((rad, i) => (
          <dl
            key={i}
            className="border-b py-2 last:border-b-0"
            style={{ borderColor: FARG.lightSteel }}
          >
            {rad.map((cell, j) => (
              <div key={j} className="mt-2 flex flex-wrap items-baseline gap-2 first:mt-0">
                {/* `min-w` och inte `w`: en etikett som AUTHENTICATION är
                    bredare än 96 px och kan inte brytas, så en fast bredd
                    fick den att spilla ut ur sin ruta och lägga sig ovanpå
                    värdet. Med en minimibredd håller korta etiketter
                    kolumnen, och långa knuffar i stället värdet till nästa
                    rad — behållaren bryter redan. */}
                <dt
                  className="min-w-[96px] shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: FARG.steel }}
                >
                  {kolumner[j]}
                </dt>
                <dd className="m-0 min-w-0 flex-1 text-[13px] leading-[20px]" style={{ color: FARG.graphite }}>
                  {cell}
                </dd>
              </div>
            ))}
          </dl>
        ))}
      </div>
    </>
  );
}
