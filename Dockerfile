# ── Stage 1: Build React frontend ────────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --silent
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Run Node.js backend ─────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Copy backend
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production --silent

COPY backend/ ./backend/

# Copy built frontend from Stage 1
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Cloud Run uses PORT env variable
ENV NODE_ENV=production
EXPOSE 8080

WORKDIR /app/backend
CMD ["node", "server.js"]
