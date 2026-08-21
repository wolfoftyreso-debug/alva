# AI-orkestern — plattformens AI-endpoint som pod.
FROM node:22-alpine

WORKDIR /app
# Låsfilen följer med: npm install löser om beroenden vid varje bygge,
# så två bilder av samma commit kunde få olika versioner. npm ci
# bygger exakt det låsfilen säger — samma regel som rot-Dockerfilen.
COPY ai-orkester/package.json ai-orkester/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
# Byggkontexten är services, så den delade
# observationsmodulen kan hämtas utan att dupliceras.
COPY gemensam/observation.mjs ./
COPY ai-orkester/server.mjs ./

ENV NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
HEALTHCHECK CMD wget -qO- http://127.0.0.1:8080/halsa || exit 1
CMD ["node", "server.mjs"]
