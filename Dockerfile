# --- deps ---
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json yarn.lock* ./
RUN npm install

# --- build ---
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Frontend bundle + backend TypeScript compilation
RUN npx webpack --mode production && npm run build-site

# --- runtime ---
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/backend-compiled ./backend-compiled
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/backend/views ./src/backend/views
COPY --from=build /app/package.json ./package.json

EXPOSE 3377
CMD ["node", "backend-compiled/backend/app.js"]
