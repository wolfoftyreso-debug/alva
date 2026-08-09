// ALVA — routingen.
//
// Roten ÄR ALVA:s publika webbplats. Det finns ingen annan produkt i
// det här repot: den som bygger appen och lägger den bakom en server
// ska se ALVA på /, utan flaggor och utan att veta något om historiken.
//
// Hash-baserad routing för miljöer utan SPA-rewrites (t.ex. statisk
// förhandsvisning). Standard är vanlig historik-routing; nginx-konfigen
// i docker/ pekar alla vägar mot index.html.

import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import Arendelista from "./pages/felsokning/Arendelista";
import NyttArende from "./pages/felsokning/NyttArende";
import ArendeSida from "./pages/felsokning/ArendeSida";
import DelatArende from "./pages/felsokning/DelatArende";
import PublikDelning from "./pages/felsokning/PublikDelning";
import Oversikt from "./pages/felsokning/Oversikt";
import Installningar from "./pages/felsokning/Installningar";
import AlvaStart from "./pages/alva/Start";
import AlvaAnsokan from "./pages/alva/Ansokan";
import AlvaLoggaIn from "./pages/alva/LoggaIn";
import AlvaPortal from "./pages/alva/Portal";
import AlvaKunskapskallor from "./pages/alva/Kunskapskallor";
import AlvaAnalys from "./pages/alva/Analys";
import AlvaFakturor from "./pages/alva/Fakturor";
import AlvaIntegration from "./pages/alva/Integration";
import AlvaAbonnemang from "./pages/alva/Abonnemang";
import AlvaGarantier from "./pages/alva/Garantier";
import AlvaImpressum from "./pages/alva/Impressum";
import AlvaUtgavor from "./pages/alva/Utgavor";
import AlvaSprak from "./pages/alva/Sprak";
import AlvaForsakring from "./pages/alva/Forsakring";
import AlvaSupport from "./pages/alva/Support";
import AlvaInstallningar from "./pages/alva/Installningar";
import { Portalvakt } from "./pages/alva/Portalvakt";

const Router = import.meta.env.VITE_HASH_ROUTER ? HashRouter : BrowserRouter;

const App = () => (
  <Router>
    <Routes>
      {/* Publika webbplatsen. Roten är startsidan — inget annat. */}
      <Route path="/" element={<AlvaStart />} />
      <Route path="/alva" element={<AlvaStart />} />
      <Route path="/alva/ansokan" element={<AlvaAnsokan />} />
      <Route path="/alva/logga-in" element={<AlvaLoggaIn />} />
      {/* Lagstadgad information. Nås från foten på varje sida — det är
          en del av kravet, inte en placering. */}
      <Route path="/alva/impressum" element={<AlvaImpressum />} />
      <Route path="/alva/utgavor" element={<AlvaUtgavor />} />
      <Route path="/alva/sprak" element={<AlvaSprak />} />
      {/* Portalen är stängd utan giltig plattformssession — se
          Portalvakt. Utan konfigurerad plattform finns ingen session
          att kräva, och vyerna är då märkta som demonstration. */}
      <Route path="/alva/portal" element={<Portalvakt><AlvaPortal /></Portalvakt>} />
      <Route path="/alva/portal/kunskapskallor" element={<Portalvakt><AlvaKunskapskallor /></Portalvakt>} />
      <Route path="/alva/portal/analys" element={<Portalvakt><AlvaAnalys /></Portalvakt>} />
      <Route path="/alva/portal/integration" element={<Portalvakt><AlvaIntegration /></Portalvakt>} />
      <Route path="/alva/portal/fakturor" element={<Portalvakt><AlvaFakturor /></Portalvakt>} />
      <Route path="/alva/portal/abonnemang" element={<Portalvakt><AlvaAbonnemang /></Portalvakt>} />
      <Route path="/alva/portal/garantier" element={<Portalvakt><AlvaGarantier /></Portalvakt>} />
      <Route path="/alva/portal/forsakring" element={<Portalvakt><AlvaForsakring /></Portalvakt>} />
      <Route path="/alva/portal/support" element={<Portalvakt><AlvaSupport /></Portalvakt>} />
      <Route path="/alva/portal/installningar" element={<Portalvakt><AlvaInstallningar /></Portalvakt>} />
      {/* Felsökningsverktyget. */}
      <Route path="/felsokning" element={<Arendelista />} />
      <Route path="/felsokning/nytt" element={<NyttArende />} />
      <Route path="/felsokning/arende/:id" element={<ArendeSida />} />
      <Route path="/felsokning/dela/:id" element={<DelatArende />} />
      <Route path="/felsokning/delad/:kod" element={<PublikDelning />} />
      <Route path="/felsokning/oversikt" element={<Oversikt />} />
      <Route path="/felsokning/installningar" element={<Installningar />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Router>
);

export default App;
