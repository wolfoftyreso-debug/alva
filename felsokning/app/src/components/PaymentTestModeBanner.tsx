import { useLocation } from "react-router-dom";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  const { pathname } = useLocation();
  // Guidad Felsökning har inga betalningar — bannern gäller bara butiken.
  if (pathname.startsWith("/felsokning")) {
    return null;
  }
  if (!clientToken) {
    return (
      <div className="w-full bg-red-100 border-b border-red-300 px-4 py-2 text-center text-sm text-red-800">
        Skarpa betalningar är inte konfigurerade. Slutför go-live i Payments-fliken.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full bg-orange-100 border-b border-orange-300 px-4 py-2 text-center text-sm text-orange-800">
        Alla betalningar i förhandsvisningen är i testläge. Använd kort <strong>4242 4242 4242 4242</strong>, valfritt framtida datum och CVC.
      </div>
    );
  }
  return null;
}
