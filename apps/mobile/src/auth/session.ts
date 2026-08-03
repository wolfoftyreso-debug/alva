import {
  AuthRequest,
  exchangeCodeAsync,
  makeRedirectUri,
  refreshAsync,
  type DiscoveryDocument,
} from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { appConfig } from '../config';

WebBrowser.maybeCompleteAuthSession();

export type Provider = 'apple' | 'google' | 'email';

interface StoredSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // epoch ms
}

const STORE_KEY = 'neurosemantics.session';

const discovery: DiscoveryDocument = {
  authorizationEndpoint: `${appConfig.cognitoDomain}/oauth2/authorize`,
  tokenEndpoint: `${appConfig.cognitoDomain}/oauth2/token`,
  revocationEndpoint: `${appConfig.cognitoDomain}/oauth2/revoke`,
};

const redirectUri = makeRedirectUri({ scheme: 'neurosemantics', path: 'redirect' });

/** Maps our provider names to Cognito hosted UI identity providers. */
const IDP: Record<Provider, string | undefined> = {
  apple: 'SignInWithApple',
  google: 'Google',
  email: undefined, // Hosted UI's own email/password form
};

async function persist(session: StoredSession): Promise<void> {
  await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(session));
}

/** Signs in via the Cognito hosted UI with PKCE. Returns the session. */
export async function signIn(provider: Provider): Promise<StoredSession> {
  const request = new AuthRequest({
    clientId: appConfig.cognitoClientId,
    redirectUri,
    scopes: ['openid', 'email'],
    usePKCE: true,
    extraParams: IDP[provider] ? { identity_provider: IDP[provider] as string } : {},
  });

  const result = await request.promptAsync(discovery);
  if (result.type !== 'success' || !result.params.code) {
    throw new Error('Sign-in was cancelled');
  }

  const tokens = await exchangeCodeAsync(
    {
      clientId: appConfig.cognitoClientId,
      code: result.params.code,
      redirectUri,
      extraParams: { code_verifier: request.codeVerifier ?? '' },
    },
    discovery,
  );

  const session: StoredSession = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + (tokens.expiresIn ?? 3600) * 1000,
  };
  await persist(session);
  return session;
}

/** Returns a valid access token, refreshing if needed, or null if signed out. */
export async function getAccessToken(): Promise<string | null> {
  const raw = await SecureStore.getItemAsync(STORE_KEY);
  if (!raw) return null;
  const session = JSON.parse(raw) as StoredSession;

  if (Date.now() < session.expiresAt - 60_000) return session.accessToken;
  if (!session.refreshToken) return null;

  try {
    const tokens = await refreshAsync(
      { clientId: appConfig.cognitoClientId, refreshToken: session.refreshToken },
      discovery,
    );
    const refreshed: StoredSession = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? session.refreshToken,
      expiresAt: Date.now() + (tokens.expiresIn ?? 3600) * 1000,
    };
    await persist(refreshed);
    return refreshed.accessToken;
  } catch {
    await signOut();
    return null;
  }
}

export async function signOut(): Promise<void> {
  await SecureStore.deleteItemAsync(STORE_KEY);
}
