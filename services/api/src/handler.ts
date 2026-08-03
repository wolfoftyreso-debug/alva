import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { generateReply, type ChatMessage } from './chat.js';
import { config } from './config.js';
import { getOrCreateUser, getUsage, incrementUsage, resetUsage, type UserRow } from './db.js';
import { verifyAndApplyPurchase } from './subscription/index.js';
import type { VerifyPurchaseRequest } from './subscription/types.js';
import { canSendMessage, shouldResetUsage } from './usage.js';
import suggestionsFile from '../suggestions.json';

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

interface Identity {
  sub: string;
  email: string;
  provider: string;
}

/** Reads the Cognito JWT claims on authorized routes; null on public routes. */
function identityFromEvent(event: APIGatewayProxyEventV2): Identity | null {
  const authorizer = (
    event.requestContext as {
      authorizer?: { jwt?: { claims?: Record<string, unknown> } };
    }
  ).authorizer;
  const claims = authorizer?.jwt?.claims;
  if (!claims) return null;
  const sub = String(claims.sub ?? '');
  if (!sub) return null;
  const email = String(claims.email ?? '');
  // Cognito sets an `identities` claim for federated sign-ins (Apple/Google).
  const identities = String(claims.identities ?? '');
  const provider = identities.includes('SignInWithApple')
    ? 'apple'
    : identities.includes('Google')
      ? 'google'
      : 'email';
  return { sub, email, provider };
}

async function currentUsage(user: UserRow) {
  let usage = await getUsage(user.id);
  if (shouldResetUsage(usage.last_reset, new Date(), config.usageResetDays)) {
    await resetUsage(user.id);
    usage = await getUsage(user.id);
  }
  return usage;
}

async function handleMe(user: UserRow): Promise<APIGatewayProxyResultV2> {
  const usage = await currentUsage(user);
  return json(200, {
    subscriptionStatus: user.subscription,
    messagesUsed: usage.messages_used,
    messageCap: config.messageCap,
  });
}

/**
 * The paywall is intelligent: no hardcoded message count. In free mode the
 * model works in discovery (follow-up questions, patterns, understanding)
 * and signals `analysisReady` when a concrete, valuable answer could be
 * delivered — that is the paywall moment, returned as `paywall: true`.
 * Premium mode delivers the full analysis, including immediately after
 * unlock (the transcript then ends with the assistant's transition message).
 */
async function handleChat(
  user: UserRow,
  body: string | undefined,
): Promise<APIGatewayProxyResultV2> {
  const premium = user.subscription === 'active';
  const parsed = body ? (JSON.parse(body) as { messages?: ChatMessage[] }) : {};
  const messages = parsed.messages ?? [];
  const last = messages[messages.length - 1];
  const validLast =
    last &&
    typeof last.content === 'string' &&
    last.content.trim() &&
    (last.role === 'user' || (premium && last.role === 'assistant'));
  if (!validLast) {
    return json(400, { error: 'messages must end with a non-empty user message' });
  }

  const usage = await currentUsage(user);
  if (!canSendMessage(usage.messages_used, user.subscription, config.messageCap)) {
    return json(402, { error: 'message_cap_reached' });
  }

  const result = await generateReply(messages, premium ? 'premium' : 'free');
  await incrementUsage(user.id);
  return json(200, { reply: result.reply, paywall: result.analysisReady });
}

async function handleVerifyPurchase(
  user: UserRow,
  body: string | undefined,
): Promise<APIGatewayProxyResultV2> {
  const parsed = body ? (JSON.parse(body) as Partial<VerifyPurchaseRequest>) : {};
  if (
    (parsed.platform !== 'ios' && parsed.platform !== 'android') ||
    typeof parsed.productId !== 'string' ||
    typeof parsed.receipt !== 'string'
  ) {
    return json(400, { error: 'platform, productId and receipt are required' });
  }
  const status = await verifyAndApplyPurchase(user.id, parsed as VerifyPurchaseRequest);
  return json(200, { subscriptionStatus: status });
}

/** Guests chat before signing in, identified by an app-generated device id. */
async function handleGuestChat(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const deviceId = event.headers?.['x-device-id'] ?? '';
  if (!/^[0-9a-fA-F-]{8,64}$/.test(deviceId)) {
    return json(400, { error: 'a valid X-Device-Id header is required' });
  }
  const user = await getOrCreateUser(`guest:${deviceId}`, '', 'guest');
  return handleChat(user, event.body);
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const route = `${event.requestContext.http.method} ${event.rawPath}`;

    // Public routes (no sign-in before the first question).
    if (route === 'GET /suggestions') {
      return json(200, { suggestions: suggestionsFile.suggestions });
    }
    if (route === 'POST /guest/chat') {
      return await handleGuestChat(event);
    }

    // Authorized routes (Cognito JWT, enforced by API Gateway).
    const identity = identityFromEvent(event);
    if (!identity) return json(401, { error: 'unauthorized' });
    const user = await getOrCreateUser(identity.sub, identity.email, identity.provider);

    switch (route) {
      case 'GET /me':
        return await handleMe(user);
      case 'POST /chat':
        return await handleChat(user, event.body);
      case 'POST /subscription/verify':
        return await handleVerifyPurchase(user, event.body);
      default:
        return json(404, { error: 'not_found' });
    }
  } catch (error) {
    // Log without request payloads: no conversation content ends up in logs.
    console.error('request_failed', error instanceof Error ? error.message : 'unknown');
    return json(500, { error: 'internal_error' });
  }
}
