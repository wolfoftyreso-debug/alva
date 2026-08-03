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

export interface Me {
  subscriptionStatus: 'free' | 'active';
  messagesUsed: number;
  freeMessageLimit: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new ApiError(401, 'not_signed_in');

  const response = await fetch(`${appConfig.apiUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
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

export function fetchMe(): Promise<Me> {
  return request<Me>('/me');
}

export function sendChat(messages: ChatMessage[]): Promise<{ reply: string }> {
  return request<{ reply: string }>('/chat', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  });
}

export function verifyPurchase(body: {
  platform: 'ios' | 'android';
  productId: string;
  receipt: string;
}): Promise<{ subscriptionStatus: 'free' | 'active' }> {
  return request('/subscription/verify', { method: 'POST', body: JSON.stringify(body) });
}
