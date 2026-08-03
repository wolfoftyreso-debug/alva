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

**Design.** Clinical, Scandinavian, quiet, intelligent, premium, minimal.
Off-white background, near-black text, one dark blue-green accent. Generous
white space. No animations, no gradients. The rule: if something can be
removed without reducing user value, remove it.

**Product principle.** One user. One conversation. One analysis. One
recommendation. That is the whole product.

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
   base (`services/api/knowledge/`) as system instructions: neurosemantic
   models, communication models, the conversation guide, reflection
   exercises, and a question library. V1 invests in prompt design quality,
   not infrastructure complexity. The model returns structured output: a
   reply plus an `analysis_ready` flag.
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
absolute minimum: `users` (id, email, auth_provider, subscription,
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
interpret their experiences, and shape their decisions. Some users come
seeking change, structure or guidance; others are simply curious and want
to develop. Semantika never assumes the user is struggling — it starts from
the assumption that they want to grow, and meets them where they are.

**Human Experience Doctrine.** Every user should feel seen, respected,
understood, capable, and hopeful. The system must never create dependency
or give the impression that it alone has the answers; its purpose is to
strengthen the user's own ability to reflect and decide.

**Conversation philosophy.** Every conversation moves through four steps:
_acknowledge_ (show the meaning was understood, not just the words),
_explore_ (discover new perspectives together — no interrogating, no
over-analyzing), _lift_ (name resources and strengths with concrete,
credible praise — never generic compliments), and _challenge_ (leave the
user with at least one new thought, question, model, or direction).

**Personality.** A very experienced coach, a calm mentor, a skilled
teacher, a wise conversation partner — never a therapist, a salesperson, a
preacher, or a guru. Warmth, curiosity and structure over stage energy.

**Educational philosophy.** Semantika does not just answer — it teaches the
user how to reflect: to think more clearly, communicate better, understand
their own reactions, and ask better questions. Success means the user
gradually needs the tool less, because they build skills of their own.

Every free user should leave the app feeling that the system understood
their situation, that a concrete analysis is ready, and that the next step
is available in Premium — never that they were held back by an artificial
interruption.

Every new feature must justify itself. The allowed AWS surface is
API Gateway, Lambda, Cognito, S3, Secrets Manager and CloudWatch — and V1
does not even need S3. No Redis, no Kubernetes, no Kafka, no Elasticsearch,
no queues, no microservices. One backend. Maximal simplicity.

## Definition of Done

Version 1 is done when a user can:

1. Open the app.
2. Start a conversation immediately.
3. Feel seen and understood.
4. Receive a number of well-considered follow-up questions.
5. Reach a natural premium boundary.
6. Buy Premium.
7. Continue the conversation.

If a feature does not help the user reflect better, it is not built.
Version 1 must be small, fast, stable, and easy to maintain.

## Roadmap

Build a strong core product first; only then build around it.

- **Version 1 (this repo)** — Person ↔ Semantika. Nothing else.
- **Version 2 (not now)** — journal, saved insights, community, certified
  coaches, courses, voice conversations. None of these are built in V1.

**Next step: a closed beta.** Put V1 in the hands of 20–50 test users
before adding anything. The minimal data model already answers several of
the key questions — how many come back (`usage.last_reset` vs activity),
how deep dialogues go (`messages_used`), and when users upgrade
(`subscription` transitions). Which starter questions create the most value
requires asking testers directly, since conversations are never stored.
Anything beyond that must justify itself against the privacy rule.
