// Egen ikongrafik — enkla industriella linjeikoner (stroke: currentColor)
// i stället för emojis. Håller hela gränssnittet i samma dämpade,
// professionella ton oavsett plattform och typsnitt.

import type { ReactNode } from "react";

function Ikon({ children, storlek = 14 }: { children: ReactNode; storlek?: number }) {
  return (
    <svg
      width={storlek}
      height={storlek}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block align-[-2px]"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IkonKamera({ storlek }: { storlek?: number }) {
  return (
    <Ikon storlek={storlek}>
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </Ikon>
  );
}

export function IkonSok({ storlek }: { storlek?: number }) {
  return (
    <Ikon storlek={storlek}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 21 21" />
    </Ikon>
  );
}

export function IkonLank({ storlek }: { storlek?: number }) {
  return (
    <Ikon storlek={storlek}>
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M8 16l-2.5 2.5a3.5 3.5 0 0 1-5-5v0L3 11" transform="translate(3 -1)" />
      <path d="M13 5l2.5-2.5a3.5 3.5 0 0 1 5 5L18 10" transform="translate(0 2)" />
    </Ikon>
  );
}

export function IkonDiagram({ storlek }: { storlek?: number }) {
  return (
    <Ikon storlek={storlek}>
      <path d="M3 3v18h18" />
      <path d="M7 15v3M12 10v8M17 6v12" />
    </Ikon>
  );
}

export function IkonKugghjul({ storlek }: { storlek?: number }) {
  return (
    <Ikon storlek={storlek}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
    </Ikon>
  );
}

export function IkonCheck({ storlek }: { storlek?: number }) {
  return (
    <Ikon storlek={storlek}>
      <path d="M4 12.5 9.5 18 20 6" />
    </Ikon>
  );
}

export function IkonKryss({ storlek }: { storlek?: number }) {
  return (
    <Ikon storlek={storlek}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Ikon>
  );
}

export function IkonVarning({ storlek }: { storlek?: number }) {
  return (
    <Ikon storlek={storlek}>
      <path d="M12 3 2.5 20h19L12 3z" />
      <path d="M12 9.5V14M12 16.8v.2" />
    </Ikon>
  );
}

export function IkonMik({ storlek }: { storlek?: number }) {
  return (
    <Ikon storlek={storlek}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
    </Ikon>
  );
}

export function IkonUppdatera({ storlek }: { storlek?: number }) {
  return (
    <Ikon storlek={storlek}>
      <path d="M20 5v5h-5" />
      <path d="M4 19v-5h5" />
      <path d="M19.5 10a8 8 0 0 0-14-3.5M4.5 14a8 8 0 0 0 14 3.5" />
    </Ikon>
  );
}

export function IkonKlocka({ storlek }: { storlek?: number }) {
  return (
    <Ikon storlek={storlek}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </Ikon>
  );
}

// Statuspunkt (ersätter 🟢🟡🔴): fylld cirkel i angiven färg.
export function IkonPunkt({ farg, storlek = 10 }: { farg: string; storlek?: number }) {
  return (
    <svg width={storlek} height={storlek} viewBox="0 0 10 10" className="inline-block" aria-hidden="true">
      <circle cx="5" cy="5" r="4.5" fill={farg} />
    </svg>
  );
}
