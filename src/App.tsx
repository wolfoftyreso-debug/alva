import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

const queryClient = new QueryClient();

function AppContent() {
  return (
    <BrowserRouter>
      <PaymentTestModeBanner />
      <Routes>
        <Route path="/" element={<Index />} />
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
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
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
