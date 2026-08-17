import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// PWA: appen går att installera och tål att nätet försvinner i
// verkstaden. Registreringen är medvetet tyst — bara i produktions-
// bygge, bara i säker kontext, och ett misslyckande (t.ex. i en
// inbäddad förhandsvisning utan service worker-stöd) får aldrig
// synas som fel: sidan fungerar identiskt utan.
if (import.meta.env.PROD && "serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
