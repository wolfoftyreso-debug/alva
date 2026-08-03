import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { generateReply, type ChatMessage } from './chat.js';
import { config } from './config.js';
import { getOrCreateUser, getUsage, incrementUsage, resetUsage, type UserRow } from './db.js';
import { verifyAndApplyPurchase } from './subscription/index.js';
import type { VerifyPurchaseRequest } from './subscription/types.js';
import { canSendMessage, shouldResetUsage } from './usage.js';

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

function identityFromClaims(event: APIGatewayProxyEventV2WithJWTAuthorizer): Identity {
  const claims = event.requestContext.authorizer.jwt.claims;
  const sub = String(claims.sub ?? '');
  if (!sub) throw new Error('JWT is missing a sub claim');
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
    subscriptionStatus: user.subscription_status,
    messagesUsed: usage.messages_used,
    freeMessageLimit: config.freeMessageLimit,
  });
}

async function handleChat(
  user: UserRow,
  body: string | undefined,
): Promise<APIGatewayProxyResultV2> {
  const parsed = body ? (JSON.parse(body) as { messages?: ChatMessage[] }) : {};
  const messages = parsed.messages ?? [];
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'user' || typeof last.content !== 'string' || !last.content.trim()) {
    return json(400, { error: 'messages must end with a non-empty user message' });
  }

  const usage = await currentUsage(user);
  if (!canSendMessage(usage.messages_used, user.subscription_status, config.freeMessageLimit)) {
    return json(402, { error: 'free_limit_reached' });
  }

  const reply = await generateReply(messages);
  await incrementUsage(user.id);
  return json(200, { reply });
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

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> {
  try {
    const identity = identityFromClaims(event);
    const user = await getOrCreateUser(identity.sub, identity.email, identity.provider);
    const route = `${event.requestContext.http.method} ${event.rawPath}`;

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
