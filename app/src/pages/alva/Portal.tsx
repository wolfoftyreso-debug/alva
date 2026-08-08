// Kundportalen.
//
// Ingen välkomsthälsning, ingen aktivitetsström, ingen graf som rör sig.
// Portalen redovisar organisationens tillstånd i namngivna fält, på
// samma sätt som en instrumentpanel gör. Den som öppnar den vill veta
// tre saker: är licensen giltig, fungerar systemet, och vad har hänt.

import { Link } from "react-router-dom";
import { PLATTFORMSVERSION, arendebeteckning } from "@/alva/system";
import { Demonstration, Block, Etikett, FARG, Falt, Knapp, Rubrik, Statusmärke, Tabell } from "@/alva/komponenter";
import { MEDDELANDE } from "@/alva/sprak";
import { Ram } from "./Ram";

export default function Portal() {
  return (
    <Ram portal>
      <div className="mx-auto max-w-[1040px] px-6 py-12">
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <Etikett>Organization</Etikett>
            <div className="mt-2">
              <Rubrik niva={1}>Dashboard</Rubrik>
            </div>
          </div>
          <span className="font-mono text-[11px]" style={{ color: FARG.steel }}>
            ALVA-ORG-0142
          </span>
        </div>

        <Demonstration>
          The figures on this page are fixed example values, and the organization is not a real one.
          Analysis is the exception: it is computed from the cases you create under Diagnostics.
        </Demonstration>

        <div className="grid gap-6 md:grid-cols-2">
          <Block rubrik="Status" beteckning="ALVA-REP-0001">
            <Falt etikett="Organization">
              <Statusmärke status="complete" />
            </Falt>
            <Falt etikett="License">Platform + 12 user licenses</Falt>
            <Falt etikett="Active users">12 of 12</Falt>
            <Falt etikett="Platform version">{PLATTFORMSVERSION}</Falt>
            <Falt etikett="Quarterly report">
              <Statusmärke status="pending" />
            </Falt>
          </Block>

          <Block rubrik="System notices" beteckning="ALVA-TB-0007">
            <Falt etikett="Knowledge sources">{MEDDELANDE.kalla_ansluten}</Falt>
            <Falt etikett="Rule package">Signature verified.</Falt>
            <Falt etikett="Restore verification">Last performed on build. Passed.</Falt>
            <Falt etikett="Retention">Cases scheduled per case type.</Falt>
          </Block>
        </div>

        <Block rubrik="Recent diagnostics" beteckning="ALVA-DOC-002">
          <Tabell
            kolumner={["Case", "Object", "Phase", "Status", "Closed"]}
            rader={[
              [
                <span key="a" className="font-mono text-[11px]">
                  {arendebeteckning(91821)}
                </span>,
                "Volvo XC60 D4",
                "Action",
                <Statusmärke key="s" status="complete" />,
                "2026-08-04",
              ],
              [
                <span key="b" className="font-mono text-[11px]">
                  {arendebeteckning(91820)}
                </span>,
                "Volkswagen Passat 2.0 TDI",
                "Verification",
                <Statusmärke key="s" status="in_progress" />,
                "—",
              ],
              [
                <span key="c" className="font-mono text-[11px]">
                  {arendebeteckning(91819)}
                </span>,
                "Scania R450",
                "Localization",
                <Statusmärke key="s" status="blocked" />,
                "—",
              ],
            ]}
          />
          <div className="mt-6">
            <Link to="/felsokning">
              <Knapp>Open diagnostics</Knapp>
            </Link>
          </div>
        </Block>

        {/* Platshållare. Att visa tomma nyckeltal vore att lova något
            som inte finns; att inte visa dem vore att dölja riktningen.
            Fälten redovisas med status NOT APPLICABLE tills det finns
            underlag för dem. */}
        <Block rubrik="Performance analytics" beteckning="ALVA-REP-0100">
          <p className="mb-4 text-[13px] leading-[20px]" style={{ color: FARG.steel }}>
            Available from Phase 3. Metrics are derived from verified outcomes only; a case closed without
            confirmed root cause contributes nothing.
          </p>
          <Tabell
            kolumner={["Metric", "Basis", "Status"]}
            rader={[
              ["Diagnostic accuracy", "Confirmed vs. hypothesized causes", <Statusmärke key="1" status="not_applicable" />],
              ["Completion time", "Case duration by phase", <Statusmärke key="2" status="not_applicable" />],
              ["Verification ratio", "Cases with confirmed root cause", <Statusmärke key="3" status="not_applicable" />],
              ["Common fault categories", "Root cause distribution", <Statusmärke key="4" status="not_applicable" />],
              ["Knowledge development", "Documents and coverage", <Statusmärke key="5" status="not_applicable" />],
              ["Procedure adoption", "Exemption rate per step", <Statusmärke key="6" status="not_applicable" />],
            ]}
          />
        </Block>
      </div>
    </Ram>
  );
}
