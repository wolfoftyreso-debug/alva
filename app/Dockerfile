# Guidad Felsökning — webbklienten som statisk SPA bakom nginx (oprivilegierad).
# Vite-variabler bakas in vid byggtillfället — skicka som build args.

FROM node:22-alpine AS bygg
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_AI_ORKESTER_URL
ARG VITE_PLATTFORM_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID \
    VITE_AI_ORKESTER_URL=$VITE_AI_ORKESTER_URL \
    VITE_PLATTFORM_URL=$VITE_PLATTFORM_URL
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=bygg /app/dist /usr/share/nginx/html
EXPOSE 8080
