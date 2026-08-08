// ALVA-PROC-0002 · Abonnemang.
//
// Vyn har en sak att göra rätt före allt annat: om något är obetalt ska
// beskedet stå överst, säga vad som händer och när, och säga att läsning
// och export aldrig påverkas. Ett varningsbesked som gömmer sig under
// prisplanerna är inget besked.

import { useEffect, useState } from "react";
import { NIVAER, RESPITDAGAR } from "../../../../services/gemensam/abonnemang.mjs";
import { formateraBelopp } from "../../../../services/gemensam/fakturering.mjs";
import { hamtaAbonnemang, plattformAktiv, sattFakturaepost, sattNiva, type Abonnemang as AbonnemangsData } from "@/felsokning/plattform";
import { Block, Demonstration, Etikett, FARG, Knapp, Rubrik, Tabell, Textfalt } from "@/alva/komponenter";
import { Ram } from "./Ram";

interface Niva {
  id: string;
  namn: string;
  basavgift: number | null;
  anvandaravgift: number | null;
  maxAnvandare: number | null;
  text: string;
  ingar: string[];
  saknas: string[];
}

const EXEMPEL: AbonnemangsData = {
  niva: "free",
  nivanamn: "Free",
  tillstand: "aktiv",
  dagarKvar: null,
  aldsta: null,
  besked: null,
  fakturaepost: null,
  registrerad: "2026-08-01T09:00:00Z",
  senast_fakturerad: null,
  behorighet: { lasa: true, exportera: true, nyttArende: true, dokumentera: true, avsluta: true },
};

export default function Abonnemang() {
  const skarpt = plattformAktiv();
  const [data, setData] = useState<AbonnemangsData | null>(null);
  const [fel, setFel] = useState("");
  const [epost, setEpost] = useState("");
  const [sparat, setSparat] = useState("");

  const ladda = () =>
    hamtaAbonnemang()
      .then((a) => {
        setData(a);
        setEpost(a.fakturaepost ?? "");
      })
      .catch((orsak) => setFel(orsak instanceof Error ? orsak.message : String(orsak)));

  useEffect(() => {
    if (skarpt) void ladda();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skarpt]);

  const a = skarpt ? data : EXEMPEL;

  return (
    <Ram portal>
      <div className="mx-auto max-w-[1040px] px-6 py-12">
        <Etikett>Commercial</Etikett>
        <div className="mt-2 mb-2">
          <Rubrik niva={1}>Subscription</Rubrik>
        </div>
        <p className="mb-8 max-w-[680px] text-[14px] leading-[22px]" style={{ color: FARG.steel }}>
          The account starts on Free and stays there until someone chooses otherwise. No card, no
          up-front payment, no trial that quietly starts costing money. An invoice is issued at
          registration — at zero — because it establishes the series and shows exactly what is not
          being charged for.
        </p>

        {!skarpt && (
          <Demonstration>
            The state below is an example. Connected to a platform instance this page shows the
            organization&rsquo;s own subscription.
          </Demonstration>
        )}

        {fel && (
          <Block rubrik="Status" beteckning="ALVA-PROC-0002">
            <p className="text-[13px]" style={{ color: FARG.steel }}>
              Subscription could not be retrieved: {fel}
            </p>
          </Block>
        )}

        {/* Beskedet överst. Ett varningsbesked under prisplanerna är
            inget besked. */}
        {a?.besked && (
          <div
            className="mb-8 border-l-4 px-6 py-4"
            style={{
              borderColor: a.tillstand === "last" ? FARG.stoppat : FARG.varning,
              background: FARG.white,
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: FARG.steel }}>
              {a.tillstand === "last" ? "Locked" : `${a.dagarKvar} days remaining`}
            </p>
            <p className="mt-2 max-w-[680px] text-[14px] leading-[23px]">{a.besked}</p>
          </div>
        )}

        {a && (
          <Block rubrik="Current" beteckning="ALVA-PROC-0002">
            <Tabell
              kolumner={["Field", "Value"]}
              rader={[
                ["Plan", a.nivanamn],
                ["State", a.tillstand === "aktiv" ? "Active" : a.tillstand === "varning" ? "Past due" : "Locked"],
                ["Started", (a.registrerad ?? "").slice(0, 10)],
                ["Last invoiced", a.senast_fakturerad ?? "Not yet"],
                ["Invoice email", a.fakturaepost || "Not set — invoices are collected from the portal"],
              ].map(([e, v]) => [
                <span key="e" className="font-semibold">
                  {e}
                </span>,
                <span key="v" className="font-mono text-[12px]">
                  {v}
                </span>,
              ])}
            />
          </Block>
        )}

        <Block rubrik="Invoice delivery" beteckning="ALVA-PROC-0001">
          <p className="mb-4 max-w-[680px] text-[13px] leading-[21px]" style={{ color: FARG.steel }}>
            Enter an address to have the PDF sent there, or leave it empty and collect invoices from
            the Invoices page. Both routes lead to the same document — email is an addition, not the
            only way to your own record.
          </p>
          <div className="grid max-w-[420px] gap-4">
            <Textfalt label="Invoice email" varde={epost} andra={setEpost} typ="email" platshallare="faktura@verkstad.se" />
            <div className="flex flex-wrap gap-4">
              <Knapp
                onClick={async () => {
                  setSparat("");
                  try {
                    await sattFakturaepost(epost);
                    await ladda();
                    setSparat(epost ? "Saved." : "Cleared — invoices are collected from the portal.");
                  } catch (orsak) {
                    setSparat(orsak instanceof Error ? orsak.message : String(orsak));
                  }
                }}
              >
                Save
              </Knapp>
            </div>
            {sparat && (
              <p className="text-[13px]" style={{ color: FARG.steel }}>
                {sparat}
              </p>
            )}
          </div>
        </Block>

        <Block rubrik="Plans" beteckning="ALVA-PROC-0002">
          <div className="grid gap-4 sm:grid-cols-2">
            {(NIVAER as Niva[]).map((n) => {
              const vald = a?.niva === n.id;
              return (
                <div
                  key={n.id}
                  className="border p-6"
                  style={{ borderColor: vald ? FARG.graphite : FARG.lightSteel, background: FARG.white }}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[16px] font-semibold">{n.namn}</span>
                    {vald && (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: FARG.blue }}>
                        Current
                      </span>
                    )}
                  </div>
                  <p className="mt-2 font-mono text-[13px]">
                    {n.basavgift === null
                      ? "By agreement"
                      : n.basavgift === 0
                        ? "No charge"
                        : `${formateraBelopp(n.basavgift)} / month + ${formateraBelopp(n.anvandaravgift ?? 0)} per active account`}
                  </p>
                  <p className="mt-2 text-[13px] leading-[21px]" style={{ color: FARG.steel }}>
                    {n.text}
                  </p>
                  <ul className="mt-4 grid gap-2">
                    {n.ingar.map((i) => (
                      <li key={i} className="text-[12px] leading-[19px]">
                        {i}
                      </li>
                    ))}
                    {n.saknas.map((i) => (
                      <li key={i} className="text-[12px] leading-[19px]" style={{ color: FARG.steel }}>
                        Not included: {i}
                      </li>
                    ))}
                  </ul>
                  {skarpt && !vald && (
                    <div className="mt-6">
                      <Knapp
                        variant="sekundar"
                        onClick={async () => {
                          await sattNiva(n.id).catch(() => {});
                          await ladda();
                        }}
                      >
                        Choose {n.namn}
                      </Knapp>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Block>

        {/* Regeln som inte är förhandlingsbar, och som därför står som
            egen ruta i stället för som en rad i finstilten. */}
        <Block rubrik="If an invoice goes unpaid" beteckning="ALVA-PROC-0002">
          <p className="max-w-[680px] text-[14px] leading-[23px]">
            We trust our customers. There is no card on file and nothing is blocked before someone has
            been told. A past-due invoice starts a visible countdown of {RESPITDAGAR} days, after which
            new cases cannot be started.
          </p>
          <p className="mt-4 max-w-[680px] text-[14px] leading-[23px] font-semibold">
            Reading and export are never affected — in any state, for any reason.
          </p>
          <p className="mt-2 max-w-[680px] text-[13px] leading-[21px]" style={{ color: FARG.steel }}>
            That is not generosity. A case log is your evidence in a warranty or insurance dispute
            concerning <em>your</em> customer — a third party with no part in an invoice between us.
            Making that record unreachable would be using someone else&rsquo;s legal position as
            leverage.
          </p>
        </Block>
      </div>
    </Ram>
  );
}
