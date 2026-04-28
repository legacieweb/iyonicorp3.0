# Stage 1: Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the frontend assets
RUN npm run build

# Stage 2: Production stage
FROM node:20-slim

WORKDIR /app

# Copy package files and install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy built frontend assets from the builder stage
COPY --from=builder /app/dist ./dist

# Copy backend server files
COPY --from=builder /app/server ./server

# Copy public folder (for any static assets needed by server)
COPY --from=builder /app/public ./public

# Expose the application port
EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production

# Start the server
CMD ["node", "server/server.js"]
