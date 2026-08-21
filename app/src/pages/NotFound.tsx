// Sidan som inte fanns.
//
// Den här filen var en kvarleva från mallen produkten en gång byggdes
// ur: värdtemats tokens (`bg-muted`, `text-primary`), ett rått
// `<a href="/">` som bryter i hash-routerläge, en console.error vid
// varje visning — och ordet "Oops", som står i ALVA:s egen lista över
// förbjudna ord (systemet rapporterar tillstånd, det tilltalar inte
// användaren). En 404 är dessutom den sida en besökare möter när något
// ANNAT gått fel, vilket gör den till ett dåligt ställe att vara slarvig.

import { Link, useLocation } from "react-router-dom";
import { Block, Etikett, FARG, Rubrik } from "@/alva/komponenter";
import { Ram } from "./alva/Ram";

const NotFound = () => {
  const plats = useLocation();

  return (
    <Ram>
      <div className="mx-auto max-w-[1040px] px-6 py-12">
        <Etikett>404</Etikett>
        <div className="mt-2 mb-2">
          <Rubrik niva={1}>The page does not exist</Rubrik>
        </div>
        <p className="mb-8 max-w-[680px] text-[14px] leading-[22px]" style={{ color: FARG.steel }}>
          Nothing is served at <span className="font-mono text-[13px]">{plats.pathname}</span>. The address may be
          mistyped, or the page may have been moved.
        </p>

        <Block rubrik="Where to go instead">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[14px]">
            <Link to="/alva" style={{ color: FARG.blue }}>
              Start page
            </Link>
            <Link to="/felsokning" style={{ color: FARG.blue }}>
              Diagnostics
            </Link>
            <Link to="/alva/logga-in" style={{ color: FARG.blue }}>
              Sign in
            </Link>
          </div>
        </Block>
      </div>
    </Ram>
  );
};

export default NotFound;
