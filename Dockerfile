# ALVA — hela produkten i EN container.
#
# Detta är den enkla, rekommenderade driftformen: en server som serverar
# landningssidan och klienten på /, plattformens API under /api och
# AI-orkestern under /ai. Bygg, kör, klart:
#
#   docker build -t alva .
#   docker run -p 8080:8080 alva
#
# Klienten byggs här med /api och /ai som standard — samma ursprung,
# ingen CORS. Kubernetes-driften i infra/ kör i stället tjänsterna som
# egna poddar med sina egna Dockerfiler; samma tjänstekod i båda.

FROM node:22-alpine AS klientbygge
WORKDIR /bygge
COPY app/package.json app/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY app/ .
ARG VITE_PLATTFORM_URL=/api
ARG VITE_AI_ORKESTER_URL=/ai
ENV VITE_PLATTFORM_URL=$VITE_PLATTFORM_URL \
    VITE_AI_ORKESTER_URL=$VITE_AI_ORKESTER_URL
RUN npm run build

FROM node:22-alpine
WORKDIR /alva

# Tjänsternas beroenden ur låsfilerna — reproducerbart, utan devpaket.
COPY services/plattform/package.json services/plattform/package-lock.json services/plattform/
RUN npm ci --omit=dev --no-audit --no-fund --prefix services/plattform && npm cache clean --force
COPY services/ai-orkester/package.json services/ai-orkester/package-lock.json services/ai-orkester/
RUN npm ci --omit=dev --no-audit --no-fund --prefix services/ai-orkester && npm cache clean --force

COPY services/ services/
COPY server/ server/
COPY --from=klientbygge /bygge/dist app/dist

ENV NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
HEALTHCHECK CMD wget -qO- http://127.0.0.1:8080/halsa || exit 1
CMD ["node", "server/server.mjs"]
