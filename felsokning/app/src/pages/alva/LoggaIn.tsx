// Inloggning.
//
// Användarnamn, lösenord, organisation. Ingen social inloggning, ingen
// "kom ihåg mig", ingen illustration. Ett industrisystem frågar vem du
// är och i vilken organisation — inte om du vill fortsätta med Google.

import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Block, Etikett, FARG, Knapp, Rubrik } from "@/alva/komponenter";
import { Ram } from "./Ram";

const FALT = [
  { namn: "organisation", etikett: "Organization", typ: "text" },
  { namn: "anvandarnamn", etikett: "Username", typ: "text" },
  { namn: "losenord", etikett: "Password", typ: "password" },
];

export default function LoggaIn() {
  const navigera = useNavigate();
  const [fel, setFel] = useState("");

  const skicka = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (!data.get("organisation") || !data.get("anvandarnamn")) {
      // Statusspråket gäller även fel: ett konstaterande, inte en ursäkt.
      setFel("Authentication incomplete. Organization and username required.");
      return;
    }
    navigera("/alva/portal");
  };

  return (
    <Ram>
      <div className="mx-auto max-w-[440px] px-6 py-24">
        <Etikett>Access</Etikett>
        <div className="mt-2 mb-8">
          <Rubrik niva={1}>Login</Rubrik>
        </div>

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
                  autoComplete={f.typ === "password" ? "current-password" : "username"}
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
            <Knapp type="submit">Sign in</Knapp>
            <a href="/alva/ansokan" className="text-[12px] uppercase tracking-[0.08em]" style={{ color: FARG.steel }}>
              Forgot password
            </a>
          </div>
        </form>
      </div>
    </Ram>
  );
}
