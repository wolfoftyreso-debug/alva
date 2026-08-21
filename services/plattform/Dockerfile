# Plattformstjänsten — självhostad backend (auth, händelse-API, delning).
FROM node:22-alpine

WORKDIR /app
# Låsfilen följer med: npm install löser om beroenden vid varje bygge,
# så två bilder av samma commit kunde få olika versioner. npm ci
# bygger exakt det låsfilen säger — samma regel som rot-Dockerfilen.
COPY plattform/package.json plattform/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
# Byggkontexten är services, så den delade
# observationsmodulen kan hämtas utan att dupliceras.
COPY gemensam/observation.mjs ./
# Servern importerar hela sin modulflora från ./ — listan var tidigare
# fem filer och containern hade kraschat på första importen av t.ex.
# grind.mjs. Kopiera allt den faktiskt läser.
COPY plattform/*.mjs plattform/openapi.yaml plattform/ecm-regler.json plattform/integrationer.json ./
COPY plattform/sprak ./sprak

ENV NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
HEALTHCHECK CMD wget -qO- http://127.0.0.1:8080/halsa || exit 1
CMD ["node", "server.mjs"]
