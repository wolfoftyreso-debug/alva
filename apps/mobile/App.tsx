import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import type { ChatMessage } from './src/api/client';
import { ChatScreen } from './src/screens/ChatScreen';
import { PaywallScreen } from './src/screens/PaywallScreen';

/**
 * Two views, no navigation library. The user lands directly in the chat —
 * no registration before the first question. The backend decides the paywall
 * moment (the analysis is ready); after unlock the conversation continues
 * with the full analysis delivered immediately.
 */
export default function App() {
  const [view, setView] = useState<'chat' | 'paywall'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [paywalled, setPaywalled] = useState(false);
  const [deliverAnalysis, setDeliverAnalysis] = useState(false);

  return (
    <>
      <StatusBar style="dark" />
      {view === 'chat' && (
        <ChatScreen
          messages={messages}
          setMessages={setMessages}
          paywalled={paywalled}
          onPaywallTriggered={() => setPaywalled(true)}
          onContinueWithPremium={() => setView('paywall')}
          deliverAnalysis={deliverAnalysis}
          onAnalysisDelivered={() => setDeliverAnalysis(false)}
        />
      )}
      {view === 'paywall' && (
        <PaywallScreen
          onSubscribed={() => {
            setPaywalled(false);
            setDeliverAnalysis(true);
            setView('chat');
          }}
          onDismiss={() => setView('chat')}
        />
      )}
    </>
  );
}
