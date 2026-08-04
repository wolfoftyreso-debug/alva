# Plattformstjänsten — självhostad backend (auth, händelse-API, delning).
FROM node:22-alpine

WORKDIR /app
COPY plattform/package.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
# Byggkontexten är felsokning/services, så den delade
# observationsmodulen kan hämtas utan att dupliceras.
COPY gemensam/observation.mjs ./
COPY plattform/server.mjs plattform/bilagor.mjs plattform/openapi.yaml plattform/ecm-regler.json plattform/integrationer.json ./

ENV NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
HEALTHCHECK CMD wget -qO- http://127.0.0.1:8080/halsa || exit 1
CMD ["node", "server.mjs"]
