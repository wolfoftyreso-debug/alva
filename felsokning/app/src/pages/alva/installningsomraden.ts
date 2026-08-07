// Inställningsområdena — en lista, tre användningar: huvudmenyns
// SETTINGS-markering, inställningsraden i ramen och översiktssidan.
// Ligger i egen modul (inte i Ram.tsx) så att ramen förblir en ren
// komponentfil; beskrivningarna finns för att ett namn i en meny säger
// vart man kommer, inte vad man kan uträtta där — och det är det
// senare som avgör om man klickar rätt.

export const INSTALLNINGSVAG = "/alva/portal/installningar";

export const INSTALLNINGAR = [
  {
    till: "/alva/portal/kunskapskallor",
    text: "Knowledge sources",
    beskrivning: "Connect the organization's licensed information sources and validate their coverage.",
  },
  {
    till: "/alva/portal/integration",
    text: "Integration",
    beskrivning: "Interfaces to the workshop's surrounding systems — with validation status stated per profile.",
  },
  {
    till: "/alva/portal/abonnemang",
    text: "Subscription",
    beskrivning: "Plan, user licenses and invoice e-mail. Payment status is stated first.",
  },
  {
    till: "/alva/portal/fakturor",
    text: "Invoices",
    beskrivning: "What the organization pays for, line by line, with the basis for every amount.",
  },
  {
    till: "/alva/portal/support",
    text: "Support",
    beskrivning: "The organization's reported platform issues and their current status.",
  },
];
