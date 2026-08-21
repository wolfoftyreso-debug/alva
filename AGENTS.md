# AGENTS.md — read before building or deploying

## What this repository is

This repository contains **exactly one product: ALVA**, a professional
platform for guided vehicle diagnostics (Analysis · Localization ·
Verification · Action). There is no other application here. If you
encounter references to a bakery/"konditori" storefront in old commit
history, that is the former host application — it has been removed and
must never be deployed. The root route `/` of the web app renders
ALVA's public site; this is asserted by the test suite.

## Repository map

    app/                  Web client (public site, customer portal, diagnostics tool)
    services/gemensam/    Shared domain code (methodologies, gates, languages)
    services/plattform/   Backend platform service (auth, event API, sharing, invoicing)
    services/ai-orkester/ AI orchestrator service
    infra/aws/            Terraform layer 1 — AWS base (VPC, EKS, Aurora, S3, ECR, KMS)
    infra/terraform/      Terraform layer 2 — workload in the cluster
    deploy/               Zip packaging for staged agent-driven deployment
    docs/                 Documentation and audit history

## How to deploy — one container (recommended)

The whole product runs as ONE server: landing page and app on `/`,
platform API on `/api`, AI orchestrator on `/ai`, health on `/halsa`.
This is the simplest correct deployment and what you should do unless
explicitly asked for the Kubernetes form:

    docker build -t alva .
    docker run -p 8080:8080 alva
    curl -fsS http://127.0.0.1:8080/       | grep ALVA    # landing page
    curl -fsS http://127.0.0.1:8080/api/halsa             # platform API
    curl -fsS http://127.0.0.1:8080/ai/halsa              # orchestrator

The client inside the image is built for same-origin (`/api`, `/ai`) —
no CORS, no extra hosts, one port. Runtime configuration (database,
Anthropic API key, JWT secret, …) is read from environment variables
documented at the top of `services/plattform/server.mjs` and
`services/ai-orkester/server.mjs`; without them the server starts in
demonstration mode, which it states plainly in its startup log and in
the health endpoint:

    curl -fsS http://127.0.0.1:8080/api/halsa
    # {"status":"ok","lage":"drift"}                        configured
    # {"status":"ok","lage":"demonstration","saknar":[...]}  not configured

In demonstration mode every authenticated path answers 503. Check `lage`
after a deploy — a container without `JWT_SECRET` looks healthy and still
refuses every sign-in, which is the most expensive kind of fault to
diagnose in production.

Without Docker: `cd app && npm ci && VITE_PLATTFORM_URL=/api
VITE_AI_ORKESTER_URL=/ai npm run build`, then `npm start` from the
repo root (requires `npm ci` in `services/plattform` and
`services/ai-orkester` first). Verify with `npm run rokprov`.

## Scaled deployment (Kubernetes) — three images

For the full AWS environment in `infra/`, the services run as separate
pods with their own Dockerfiles. Use ONE tag for all three (the git
SHA). The registry has immutable tags — never reuse a tag.

    # 1. Backend platform service        (context: services/)
    docker build -f services/plattform/Dockerfile   -t $REG/felsokning-plattform:$TAG   services/

    # 2. AI orchestrator                 (context: services/)
    docker build -f services/ai-orkester/Dockerfile -t $REG/felsokning-ai-orkester:$TAG services/

    # 3. Web client                      (context: app/)
    #    Vite variables are baked at BUILD time — pass them as build args.
    #    Missing args produce a build that crashes at startup. Never ship it.
    docker build \
      --build-arg VITE_PLATTFORM_URL="https://<platform host>" \
      --build-arg VITE_AI_ORKESTER_URL="https://<orchestrator host>" \
      --build-arg VITE_SUPABASE_URL="<supabase url>" \
      --build-arg VITE_SUPABASE_PUBLISHABLE_KEY="<publishable key>" \
      --build-arg VITE_SUPABASE_PROJECT_ID="<project id>" \
      -t $REG/felsokning-web:$TAG app/

## Deployment order (AWS, full environment)

Follow `deploy/README.md` — the order is not negotiable:

    1. infra/aws         terraform apply    (network, EKS, Aurora, S3, ECR, secrets)
       then: put the Claude API key in Secrets Manager, run
       infra/postgres-init.sql against Aurora, restrict API CIDR,
       confirm the alarm e-mail subscription
    2. build + push the three images (above) — requires the ECR from step 1
    3. infra/terraform   terraform apply    (workload; set bildtagg=$TAG in tfvars)
    4. verify (below)

## How to verify a deployment

    curl -fsS https://<web host>/          | grep -q 'ALVA'      # root shows ALVA
    curl -fsS https://<platform host>/halsa                       # backend healthy
    curl -fsS https://<orchestrator host>/halsa                   # orchestrator healthy

The web root must show ALVA's start page. If you see anything about a
bakery, bread, or a webshop, you have deployed the wrong artifact or
the wrong revision — stop and re-check the checked-out commit.

## Rules

- Tests before build: `cd app && npm ci && npx vitest run` must be green
  (791 tests), `npm run typkontroll` clean.
- Secrets never go into Terraform variables, git, or image layers.
  They live in AWS Secrets Manager only.
- One immutable image tag per build, the same tag across all three
  images and the workload tfvars.
- Do not add analytics, external fonts, CDNs or payment providers.
  The platform is fully self-hosted by design, and the test suite
  enforces several of these absences.
