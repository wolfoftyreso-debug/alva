# Launch checklist — closed beta

The path from this repo to 20–50 test users. Everything below is
configuration and store work; the code is done (see Definition of Done in
the README).

## 1. AWS

- [ ] `cd infra && npx cdk bootstrap` (once per account/region).
- [ ] `npx cdk deploy` — note the outputs: `ApiUrl`, `UserPoolId`,
      `UserPoolClientId`, `CognitoDomain`.
- [ ] Fill the `semantika/app` secret in Secrets Manager:
      `OPENAI_API_KEY` (required for chat), `APPLE_SHARED_SECRET` and
      `GOOGLE_SERVICE_ACCOUNT_JSON` (required before purchases work).
- [ ] Run `db/migrations/001_init.sql` against the Aurora cluster
      (credentials in the RDS-managed secret; connect via a bastion or the
      RDS query editor).
- [ ] Smoke test: `curl <ApiUrl>/suggestions` returns the starter list.

## 2. Sign-in

- [ ] Email sign-in works out of the box (Cognito hosted UI).
- [ ] Apple: create a Services ID + key in the Apple Developer portal, then
      redeploy with CDK context `appleTeamId`, `appleKeyId`,
      `applePrivateKeySecretName`.
- [ ] Google: create an OAuth client in Google Cloud, then redeploy with
      `googleClientId`, `googleClientSecret`.
- [ ] For the beta, email-only is acceptable — Apple/Google can land in a
      later build. Note: Apple's review requires Sign in with Apple if
      other third-party logins are offered, so enable it before public
      App Store release.

## 3. App configuration

- [ ] Put the CDK outputs into `apps/mobile/app.json` → `extra`
      (`apiUrl`, `cognitoDomain`, `cognitoClientId`).
- [ ] Keep product ids as `semantika_monthly` / `semantika_yearly`.

## 4. Stores

- [ ] App Store Connect: create the app (bundle id `com.semantika.app`),
      add auto-renewable subscriptions `semantika_monthly` ($5.99/month)
      and `semantika_yearly` ($49.99/year) in one subscription group.
      Generate the App-Specific Shared Secret → `APPLE_SHARED_SECRET`.
- [ ] Play Console: create the app (package `com.semantika.app`), add the
      two subscriptions with the same ids and prices. Create a service
      account with Play Developer API access → its JSON key becomes
      `GOOGLE_SERVICE_ACCOUNT_JSON`.
- [ ] Store copy follows the honest-claims rule: inspiration, not proven
      effects. Positioning: reflection partner — not therapy.

## 5. Builds

- [ ] `cd apps/mobile && npx eas build --profile preview --platform all`
      (in-app purchases require a real build, not Expo Go).
- [ ] iOS: distribute via TestFlight (internal, then external testers).
- [ ] Android: distribute via Play Console internal testing track.
- [ ] Purchases in test: use TestFlight sandbox accounts / Play license
      testers — no real charges.

## 6. CI/CD

- [ ] Create the GitHub OIDC deploy role in AWS; set repo secret
      `AWS_DEPLOY_ROLE_ARN` (and optionally the `AWS_REGION` variable).
- [ ] Merge this branch to `main` — CI runs lint/typecheck/tests,
      `deploy.yml` deploys the stack automatically.

## 7. The beta itself (20–50 users)

Measure before building anything new:

- **Do they come back?** — active users over time (`usage` activity).
- **How deep do dialogues go?** — `messages_used` distribution.
- **When do they upgrade?** — `subscription` transitions relative to
  `created_at`.
- **Which starter questions create value?** — conversations are never
  stored, so ask the testers directly (short interviews or a 3-question
  survey beats analytics here).

Exit criteria for V1 → V2 decisions: a clear picture of retention, dialogue
depth, upgrade timing, and which conversation types resonate. Only then
open the Version 2 list.
