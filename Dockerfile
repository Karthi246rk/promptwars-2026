# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Install root dependencies
COPY package.json ./
RUN npm install

# Build client
COPY client/package.json client/
RUN cd client && npm install
COPY client/ client/
RUN cd client && npm run build

# Build server
COPY server/package.json server/
RUN cd server && npm install
COPY server/ server/
RUN cd server && npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

# Copy server build and dependencies
COPY --from=builder /app/server/package.json server/
RUN cd server && npm install --production
COPY --from=builder /app/server/dist server/dist/
COPY --from=builder /app/server/data server/data/

# Copy client build
COPY --from=builder /app/client/dist client/dist/

# Copy root package.json
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/dist/index.js"]
