import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { appConfig } from '../config';
import { getAccessToken } from '../auth/session';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(`API error ${status}: ${code}`);
  }
}

// Mirrors the backend contract in services/api/src/handler.ts.
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatReply {
  reply: string;
  /** True when the backend judged the analysis ready — the paywall moment. */
  paywall: boolean;
}

export interface Me {
  subscriptionStatus: 'free' | 'active';
  messagesUsed: number;
  messageCap: number;
}

const DEVICE_KEY = 'semantika.device';

/** Stable anonymous id so guests can chat before signing in. */
async function getDeviceId(): Promise<string> {
  let id = await SecureStore.getItemAsync(DEVICE_KEY);
  if (!id) {
    id = Crypto.randomUUID();
    await SecureStore.setItemAsync(DEVICE_KEY, id);
  }
  return id;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  headers: Record<string, string> = {},
): Promise<T> {
  const response = await fetch(`${appConfig.apiUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

  if (!response.ok) {
    let code = 'unknown';
    try {
      code = ((await response.json()) as { error?: string }).error ?? 'unknown';
    } catch {
      // keep 'unknown'
    }
    throw new ApiError(response.status, code);
  }
  return (await response.json()) as T;
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  if (!token) throw new ApiError(401, 'not_signed_in');
  return { Authorization: `Bearer ${token}` };
}

export async function fetchSuggestions(): Promise<string[]> {
  const data = await request<{ suggestions: string[] }>('/suggestions');
  return data.suggestions;
}

/** Signed-in users chat via /chat; guests via /guest/chat with a device id. */
export async function sendChat(messages: ChatMessage[]): Promise<ChatReply> {
  const body = { method: 'POST', body: JSON.stringify({ messages }) };
  const token = await getAccessToken();
  if (token) {
    return request<ChatReply>('/chat', body, { Authorization: `Bearer ${token}` });
  }
  return request<ChatReply>('/guest/chat', body, { 'X-Device-Id': await getDeviceId() });
}

export async function fetchMe(): Promise<Me> {
  return request<Me>('/me', {}, await authHeader());
}

export async function verifyPurchase(body: {
  platform: 'ios' | 'android';
  productId: string;
  receipt: string;
}): Promise<{ subscriptionStatus: 'free' | 'active' }> {
  return request(
    '/subscription/verify',
    { method: 'POST', body: JSON.stringify(body) },
    await authHeader(),
  );
}
