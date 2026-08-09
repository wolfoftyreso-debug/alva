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

## How to build

All three deployables are containers with Dockerfiles in the repo.
Use ONE tag for all three (the git SHA). The registry has immutable
tags — never reuse a tag.

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

For a quick static preview without backends (demo data, hash routing):

    cd app && npm ci
    VITE_HASH_ROUTER=1 VITE_SUPABASE_URL="https://preview.invalid" \
      VITE_SUPABASE_PUBLISHABLE_KEY="preview" npm run build
    # serve app/dist/ as a static site — any host, no rewrites needed

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
