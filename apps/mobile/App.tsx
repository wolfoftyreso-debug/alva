import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { getAccessToken } from './src/auth/session';
import { ChatScreen } from './src/screens/ChatScreen';
import { PaywallScreen } from './src/screens/PaywallScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';

type View = 'loading' | 'welcome' | 'chat' | 'paywall';

/**
 * Three views, no navigation library. The backend decides when the paywall
 * appears (HTTP 402 on /chat).
 */
export default function App() {
  const [view, setView] = useState<View>('loading');

  useEffect(() => {
    getAccessToken().then((token) => setView(token ? 'chat' : 'welcome'));
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      {view === 'welcome' && <WelcomeScreen onSignedIn={() => setView('chat')} />}
      {view === 'chat' && <ChatScreen onLimitReached={() => setView('paywall')} />}
      {view === 'paywall' && <PaywallScreen onSubscribed={() => setView('chat')} />}
    </>
  );
}
