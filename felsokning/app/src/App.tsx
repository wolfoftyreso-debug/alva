import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Account from "./pages/Account";
import AccountConfirmation from "./pages/AccountConfirmation";
import Contact from "./pages/Contact";
import Admin from "./pages/Admin";
import FAQ from "./pages/FAQ";
import OrderConfirmation from "./pages/OrderConfirmation";
import ChangeSubscription from "./pages/ChangeSubscription";
import Arendelista from "./pages/felsokning/Arendelista";
import NyttArende from "./pages/felsokning/NyttArende";
import ArendeSida from "./pages/felsokning/ArendeSida";
import DelatArende from "./pages/felsokning/DelatArende";
import PublikDelning from "./pages/felsokning/PublikDelning";
import Oversikt from "./pages/felsokning/Oversikt";
import Installningar from "./pages/felsokning/Installningar";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

const queryClient = new QueryClient();

// Hash-baserad routing för miljöer utan SPA-rewrites (t.ex. förhandsvisning
// på en statisk sida). Standard är vanlig historik-routing.
//
// Historik-routing kräver att sidan serveras från roten: ligger den under
// en sökväg matchar ingen route och besökaren får 404-sidan. I
// förhandsvisningsläge går routingen därför via hash — då spelar
// sökvägen ingen roll — och startsidan är Guidad Felsökning i stället för
// värdapplikationens startsida.
const forhandsvisning = !!import.meta.env.VITE_HASH_ROUTER;
const Router = forhandsvisning ? HashRouter : BrowserRouter;

function AppContent() {
  return (
    <Router>
      <PaymentTestModeBanner />
      <Routes>
        <Route path="/" element={forhandsvisning ? <Arendelista /> : <Index />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/account" element={<Account />} />
        <Route path="/account/confirmation" element={<AccountConfirmation />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/order-confirmation" element={<OrderConfirmation />} />
        <Route path="/account/change-subscription" element={<ChangeSubscription />} />
        <Route path="/felsokning" element={<Arendelista />} />
        <Route path="/felsokning/nytt" element={<NyttArende />} />
        <Route path="/felsokning/arende/:id" element={<ArendeSida />} />
        <Route path="/felsokning/dela/:id" element={<DelatArende />} />
        <Route path="/felsokning/delad/:kod" element={<PublikDelning />} />
        <Route path="/felsokning/oversikt" element={<Oversikt />} />
        <Route path="/felsokning/installningar" element={<Installningar />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
