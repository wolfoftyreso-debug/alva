// ALVA-PROC-0050 · Supportärenden.
//
// Listan över organisationens anmälningar. Själva anmälandet sker inte
// här utan i ärendet där felet uppstod — se Felanmalan i felsökningsvyn.
// En anmälningsknapp som bara finns i en portalvy nås aldrig av den som
// står med händerna i en bil.

import { useEffect, useState } from "react";
import { STATUSAR, TYPER } from "../../../../services/gemensam/support.mjs";
import { hamtaSupport, plattformAktiv, type Supportarende } from "@/felsokning/plattform";
import { Block, Demonstration, Etikett, FARG, Rubrik, Statusmärke, Tabell } from "@/alva/komponenter";
import { Ram } from "./Ram";

const STATUSAV: Record<string, "passed" | "pending" | "failed" | "not_applicable"> = {
  mottagen: "pending",
  under_arbete: "pending",
  atgardad: "passed",
  stangd: "not_applicable",
};

const STATUSTEXT: Record<string, string> = {
  mottagen: "Received",
  under_arbete: "In progress",
  atgardad: "Resolved",
  stangd: "Closed",
};

// Vad som visas när ingen plattform är konfigurerad. Exemplet är märkt.
const EXEMPEL: Supportarende[] = [
  {
    id: "demo-1",
    beteckning: "ALVA-SUP-0001",
    arende_id: "ALVA-CASE-91821",
    typ: "felanmalan",
    rubrik: "Measurement step will not accept a value from the pressure tester",
    beskrivning:
      "The check asks for a reading in bar. Entering 2,4 is rejected as invalid; entering 2.4 is accepted. The workshop uses a comma.",
    sammanhang: { metodik: "vibration", steg: "4", plattform: "ALVA 1.0" },
    status: "atgardad",
    skapad: "2026-08-04T09:12:00Z",
    anmald_av: "Anna",
    inlagg: [],
  },
];

export default function Support() {
  const skarpt = plattformAktiv();
  const [arenden, setArenden] = useState<Supportarende[] | null>(null);
  const [fel, setFel] = useState("");

  useEffect(() => {
    if (!skarpt) return;
    let avbruten = false;
    hamtaSupport()
      .then((a) => !avbruten && setArenden(a))
      .catch((orsak) => !avbruten && setFel(orsak instanceof Error ? orsak.message : String(orsak)));
    return () => {
      avbruten = true;
    };
  }, [skarpt]);

  // Misslyckad hämtning visar felet, aldrig exemplet: data som ser äkta
  // ut men inte är det är värre än ett synligt fel.
  const lista = skarpt ? arenden : EXEMPEL;

  return (
    <Ram portal>
      <div className="mx-auto max-w-[1040px] px-6 py-12">
        <Etikett>Support</Etikett>
        <div className="mt-2 mb-2">
          <Rubrik niva={1}>Reported issues</Rubrik>
        </div>
        <p className="mb-8 max-w-[680px] text-[14px] leading-[22px]" style={{ color: FARG.steel }}>
          Every case carries a report button. A report filed from the case brings its own context —
          methodology, step, platform version, trace id — so the first reply can be an answer rather
          than a question.
        </p>

        {!skarpt && (
          <Demonstration>
            The entry below is an example. Connected to a platform instance this page lists the
            organization&rsquo;s own reports.
          </Demonstration>
        )}

        <Block rubrik="Reports" beteckning="ALVA-PROC-0050">
          {fel ? (
            <p className="text-[13px]" style={{ color: FARG.steel }}>
              Reports could not be retrieved: {fel}
            </p>
          ) : !lista ? (
            <p className="text-[13px]" style={{ color: FARG.steel }}>
              Retrieving reports.
            </p>
          ) : lista.length === 0 ? (
            <p className="text-[13px]" style={{ color: FARG.steel }}>
              Nothing has been reported.
            </p>
          ) : (
            <Tabell
              kolumner={["Reference", "Kind", "Subject", "Case", "Status"]}
              rader={lista.map((s) => [
                <span key="b" className="font-mono text-[12px]">
                  {s.beteckning}
                </span>,
                <span key="t" className="text-[12px]" style={{ color: FARG.steel }}>
                  {(TYPER as { id: string; rubrik: string }[]).find((t) => t.id === s.typ)?.rubrik ?? s.typ}
                </span>,
                <span key="r">
                  <span className="font-semibold">{s.rubrik}</span>
                  <span className="mt-2 block text-[12px] leading-[19px]" style={{ color: FARG.steel }}>
                    {Object.entries(s.sammanhang ?? {})
                      .map(([n, v]) => `${n}: ${v}`)
                      .join(" · ")}
                  </span>
                </span>,
                <span key="a" className="font-mono text-[11px]" style={{ color: FARG.steel }}>
                  {s.arende_id ?? "—"}
                </span>,
                <span key="s" className="flex flex-wrap items-center gap-2">
                  <Statusmärke status={STATUSAV[s.status] ?? "pending"} />
                  <span className="text-[11px] uppercase tracking-[0.08em]" style={{ color: FARG.steel }}>
                    {STATUSTEXT[s.status] ?? s.status}
                  </span>
                </span>,
              ])}
            />
          )}
        </Block>

        <Block rubrik="States" beteckning="ALVA-PROC-0050">
          <p className="mb-4 max-w-[680px] text-[13px] leading-[21px]" style={{ color: FARG.steel }}>
            A report is never edited. Replies and state changes are separate entries, and the state is
            derived from them — so the record can still answer how long a fault was known about.
          </p>
          <Tabell
            kolumner={["State", "Meaning"]}
            rader={(STATUSAR as string[]).map((s) => [
              <span key="s" className="font-semibold">
                {STATUSTEXT[s] ?? s}
              </span>,
              <span key="m" className="text-[12px]" style={{ color: FARG.steel }}>
                {s === "mottagen"
                  ? "Filed. This is the state a report has the moment it exists — nothing has to be written for it to be true."
                  : s === "under_arbete"
                    ? "Support has taken it on."
                    : s === "atgardad"
                      ? "Fixed, and the fix is out."
                      : "Closed. A closed report can be reopened — which happens when the fault turns out not to be gone."}
              </span>,
            ])}
          />
        </Block>
      </div>
    </Ram>
  );
}
