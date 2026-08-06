// Inloggning.
//
// Användarnamn, lösenord, organisation. Ingen social inloggning, ingen
// "kom ihåg mig", ingen illustration. Ett industrisystem frågar vem du
// är och i vilken organisation — inte om du vill fortsätta med Google.
//
// ---- Två lägen, och skillnaden döljs aldrig --------------------------
//
// Är plattformen konfigurerad (VITE_PLATTFORM_URL) autentiserar den här
// sidan på riktigt mot /api/auth/logga-in, och portalen är stängd utan
// giltig session. Är den inte det är sidan en demonstration, och det står
// på den.
//
// Revisionens m-9 gällde just det: en inloggning som SÅG ut att
// autentisera gav portalen en auktoritet den inte hade. Rättelsen är inte
// att ta bort skylten utan att göra spärren verklig där det finns något
// att spärra mot.

import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loggaInPlattform, plattformAktiv } from "@/felsokning/plattform";
import { Demonstration, Block, Etikett, FARG, Knapp, Rubrik } from "@/alva/komponenter";
import { Ram } from "./Ram";

const FALT = [
  { namn: "epost", etikett: "Email", typ: "email", komplettering: "username" },
  { namn: "losenord", etikett: "Password", typ: "password", komplettering: "current-password" },
];

export default function LoggaIn() {
  const navigera = useNavigate();
  const [fel, setFel] = useState("");
  const [arbetar, setArbetar] = useState(false);
  const skarpt = plattformAktiv();

  const skicka = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const epost = String(data.get("epost") ?? "").trim();
    const losenord = String(data.get("losenord") ?? "");

    if (!skarpt) {
      // Demonstrationen kräver ingenting, och påstår heller ingenting.
      navigera("/alva/portal");
      return;
    }

    if (!epost || !losenord) {
      // Statusspråket gäller även fel: ett konstaterande, inte en ursäkt.
      setFel("Authentication incomplete. Email and password required.");
      return;
    }

    setArbetar(true);
    setFel("");
    try {
      await loggaInPlattform(epost, losenord);
      navigera("/alva/portal");
    } catch (orsak) {
      // Serverns egen text visas oförändrad. Den vet vad som hände —
      // avstängt konto, spärrat efter för många försök, fel uppgifter —
      // och en omskrivning här skulle bara göra beskedet vagare.
      setFel(orsak instanceof Error ? orsak.message : "Authentication failed.");
    } finally {
      setArbetar(false);
    }
  };

  return (
    <Ram>
      <div className="mx-auto max-w-[440px] px-6 py-24">
        <Etikett>Access</Etikett>
        <div className="mt-2 mb-8">
          <Rubrik niva={1}>Login</Rubrik>
        </div>
        {!skarpt && (
          <Demonstration>
            This login authenticates nothing. Type anything into Email and Password and press Sign in
            — no account is needed, and the portal behind it presents fixed example data. Connected to
            a platform instance this page authenticates against it, and the portal is closed without a
            valid session.
          </Demonstration>
        )}

        <form onSubmit={skicka}>
          <Block>
            {FALT.map((f) => (
              <div key={f.namn} className="border-t py-2 first:border-t-0" style={{ borderColor: FARG.lightSteel }}>
                <label
                  htmlFor={f.namn}
                  className="block text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: FARG.steel }}
                >
                  {f.etikett}
                </label>
                <input
                  id={f.namn}
                  name={f.namn}
                  type={f.typ}
                  autoComplete={f.komplettering}
                  className="mt-2 w-full border px-4 py-2 text-[14px]"
                  style={{ borderColor: FARG.lightSteel, background: FARG.white, color: FARG.graphite }}
                />
              </div>
            ))}
          </Block>

          {fel && (
            <p role="alert" className="mb-4 border px-4 py-2 text-[13px]" style={{ borderColor: FARG.graphite, color: FARG.graphite }}>
              {fel}
            </p>
          )}

          <div className="flex items-center justify-between">
            <Knapp type="submit" disabled={arbetar}>
              {arbetar ? "Signing in" : "Sign in"}
            </Knapp>
            <a href="/alva/ansokan" className="text-[12px] uppercase tracking-[0.08em]" style={{ color: FARG.steel }}>
              Forgot password
            </a>
          </div>
        </form>
      </div>
    </Ram>
  );
}
