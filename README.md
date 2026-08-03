# Semantika

**Think Beyond Thought.**

The world's first NeuroSemantic conversation platform. Semantika helps people
explore how they create meaning, interpret their experiences, and communicate
with themselves and others — through structured conversations inspired by
neurosemantic principles.

## Brand

- **Core promise** — Discover the meaning behind your thinking.
- **Mission** — Helping people create better meaning.
- **Vision** — To make NeuroSemantic thinking accessible to everyone.

**Positioning.** Semantika is not therapy, not self-help, and not a course.
It is an intelligent reflection partner that uses neurosemantic models to
help the user explore thinking patterns, communication, and perspective.
Instead of quick advice, Semantika starts by helping the user explore how
they interpret their situation — supporting reflection and
perspective-taking, not delivering finished answers.

**Honest claims.** Neurosemantics and NLP are presented as inspiration and
models for reflection, never as scientifically proven methods. This is
enforced in the system instructions and the knowledge base; copy in the app
and the stores must follow the same rule.

**Tone.** Never judging, dramatic, overenthusiastic, or preaching. Always
calm, curious, clear, respectful, structured, thoughtful.

**Design.** Scandinavian, clinical, quiet, precise, minimal. Off-white
background, near-black text, one dark blue-green accent. Generous white
space. No animations, no gradients.

## System overview

```
apps/mobile      Expo / React Native app (two views: Chat, Paywall)
services/api     One Lambda backend (chat, usage, subscription verification)
infra            AWS CDK stack (the entire cloud environment)
db/migrations    SQL schema (two tables: users, usage)
```

A new developer should understand the whole system in under an hour. Every
piece exists for a reason; if a feature does not make the core product better,
it is not built.

### Request flow

1. The user lands directly in the chat — no registration before the first
   question. Guests are identified by an app-generated device id
   (`POST /guest/chat`); dynamic conversation starters come from
   `GET /suggestions` (both public routes). The suggestions live in
   `services/api/suggestions.json` and can be updated with a deploy — no
   app release needed.
2. Requests go through **API Gateway** to the single **Lambda**; signed-in
   users use `POST /chat` with a **Cognito** JWT (Apple / Google / email via
   the hosted UI).
3. The Lambda calls the **OpenAI Responses API** with the Markdown knowledge
   base (`services/api/knowledge/`) as system instructions. The model
   returns structured output: a reply plus an `analysis_ready` flag.
4. Sign-in happens at the paywall, since a purchase must attach to an
   account. Usage counters live in **PostgreSQL** (Aurora Serverless v2).

### The intelligent paywall

The paywall is not a hardcoded message count. Free conversations run in
_discovery mode_: the model asks relevant follow-up questions, names
patterns, shows understanding, and builds toward an analysis — without
delivering the full solution. When the problem is described, the information
is sufficient, and a concrete action plan is ready, the model signals
`analysis_ready`, writes a calm transition ("…I have a concrete strategy I
would recommend. Continue with Premium to see the analysis and the
recommended steps."), and the conversation pauses.

The instructions explicitly forbid manufactured urgency, emotional pressure,
fake readiness, and stopping mid-answer — Premium should feel like the
natural continuation of an already valuable dialogue.

On unlock, the app resends the transcript; premium mode then delivers the
full analysis, recommended strategies and concrete exercises immediately,
and the dialogue continues without restriction.

A generous `MESSAGE_CAP` (default 200 per 30 days) exists purely as an
abuse backstop for the free tier — it is not the paywall.

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

1. Put values into the `semantika/app` secret in Secrets Manager:
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

- All traffic over HTTPS. Account routes require a Cognito JWT; the two
  public routes (`/suggestions`, `/guest/chat`) carry no account data and
  are bounded by the free-tier message cap.
- Secrets live in AWS Secrets Manager only — no API keys in the client.
- The Lambda runs in private subnets; the database is not publicly reachable.

## Product philosophy

People grow when they become more aware of how they create meaning,
interpret their experiences, and shape their decisions. Semantika helps the
user ask better questions, discover new perspectives, and reflect on their
own thinking.

Every free user should leave the app feeling that the system understood
their situation, that a concrete analysis is ready, and that the next step
is available in Premium — never that they were held back by an artificial
interruption.

Every new feature must justify itself. The allowed AWS surface is
API Gateway, Lambda, Cognito, S3, Secrets Manager and CloudWatch — and V1
does not even need S3. No Redis, no Kubernetes, no Kafka, no Elasticsearch,
no queues, no microservices. One backend. Maximal simplicity.
