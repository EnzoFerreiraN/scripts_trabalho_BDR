# ── Frontend Dockerfile (multi-stage) ────────────────────────────────────────
# Stage 1: Build React/Vite
# Stage 2: Servir com nginx + proxy reverso para o backend
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Serve ───────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Remover config padrão do nginx
RUN rm /etc/nginx/conf.d/default.conf

# Template processado com envsubst no startup pelo nginx Docker entrypoint
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copiar os assets estáticos do build
COPY --from=builder /app/dist /usr/share/nginx/html

# Entrypoint customizado: extrai o DNS do resolv.conf e delega ao nginx oficial
COPY nginx-entrypoint.sh /nginx-entrypoint.sh
RUN chmod +x /nginx-entrypoint.sh

ENTRYPOINT ["/nginx-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
