FROM node:20-alpine

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json* ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source files
COPY server/ ./server/
COPY src/ ./src/
COPY public/ ./public/
COPY index.html ./
COPY tsconfig.json tsconfig.node.json ./
COPY vite.config.ts ./
COPY tailwind.config.js postcss.config.js ./

# Build the frontend
RUN npm run build

# Expose port
EXPOSE 5000

# Start the Express server (which serves built frontend)
CMD ["node", "server/server.js"]