# NeuroSemantics AI

A minimalist mobile app for iOS and Android. The product is one thing only:
an intelligent conversation partner with a specialized knowledge base in
neurosemantics and NLP. No course portal, no CRM, no community.

Design language: calm, simple, clear. Off-white background, near-black text,
one dark blue-green accent. No animations, no gradients.

## System overview

```
apps/mobile      Expo / React Native app (three views: Welcome, Chat, Paywall)
services/api     One Lambda backend (chat, usage, subscription verification)
infra            AWS CDK stack (the entire cloud environment)
db/migrations    SQL schema (two tables: users, usage)
```

A new developer should understand the whole system in under an hour. Every
piece exists for a reason; if a feature does not make the core product better,
it is not built.

### Request flow

1. The app signs in via the **Cognito** hosted UI (Apple / Google / email)
   and receives a JWT.
2. `POST /chat` goes through **API Gateway** (JWT authorizer) to the single
   **Lambda**.
3. The Lambda checks the free-tier quota in **PostgreSQL** (Aurora
   Serverless v2). Over the limit and not subscribed → HTTP 402 → the app
   shows the paywall.
4. Otherwise it calls the **OpenAI Responses API** with the Markdown
   knowledge base (`services/api/knowledge/`) as system instructions and
   returns the reply.

Conversations are never stored server-side; the client holds them in memory
and sends the running transcript with each request. The database stores the
absolute minimum: `users` (id, email, provider, subscription_status,
created_at) and `usage` (messages_used, last_reset). No profiling, no
training on user data. Error logging is anonymized (no message content).

### Payments

Subscription logic is shared (`services/api/src/subscription/`); the payment
provider differs per platform behind one `PaymentProvider` interface:

- **iOS** — In-App Purchase; the backend verifies the app receipt with Apple.
- **Android** — Google Play Billing; the backend verifies the purchase token
  with the Play Developer API.
- **Web (future)** — a Stripe adapter slots into the same interface.

Plans: Monthly and Yearly. Nothing else.

Free tier: `FREE_MESSAGE_LIMIT` messages (default 50 ≈ 5–10 conversations),
resetting every `USAGE_RESET_DAYS` days.

## Getting started

```sh
npm install            # installs all workspaces
npm run lint
npm run typecheck
npm test
```

### Mobile app

```sh
cd apps/mobile
npm start              # Expo dev server
```

Fill in `extra` in `app.json` (API URL, Cognito domain and client id) from
the CDK stack outputs. In-app purchases require a development build
(`expo run:ios` / `expo run:android`), not Expo Go.

### Backend + infrastructure

```sh
cd infra
npx cdk deploy
```

After the first deploy:

1. Put values into the `neurosemantics/app` secret in Secrets Manager:
   `OPENAI_API_KEY`, `APPLE_SHARED_SECRET`, `GOOGLE_SERVICE_ACCOUNT_JSON`.
2. Run `db/migrations/001_init.sql` against the cluster (credentials are in
   the RDS-managed secret).
3. Optional: enable Apple/Google sign-in by passing CDK context
   (`googleClientId`, `googleClientSecret`, `appleTeamId`, `appleKeyId`,
   `applePrivateKeySecretName`). Email sign-in works out of the box.

### CI/CD

GitHub Actions: `ci.yml` lints, type-checks and tests every PR;
`deploy.yml` deploys the CDK stack on every push to `main` (set the
`AWS_DEPLOY_ROLE_ARN` secret for OIDC). Store builds ship via EAS
(`eas build`) when you choose to release.

## Security

- All traffic over HTTPS; every API route requires a Cognito JWT.
- Secrets live in AWS Secrets Manager only — no API keys in the client.
- The Lambda runs in private subnets; the database is not publicly reachable.

## Product philosophy

Every new feature must justify itself. The allowed AWS surface is
API Gateway, Lambda, Cognito, S3, Secrets Manager and CloudWatch — and V1
does not even need S3. No Redis, no Kubernetes, no Kafka, no Elasticsearch,
no queues, no microservices. One backend. Maximal simplicity.
