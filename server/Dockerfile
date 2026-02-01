FROM node:24-bullseye

# Set working directory
WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    curl \
    make \
    g++ \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Copy package files from server directory
COPY server/package*.json ./

# Install dependencies (native modules built in container)
RUN npm install

# Copy server source code (excluding node_modules via .dockerignore)
COPY server/ ./

# Copy client build (pre-built on host)
COPY client/dist ./client/dist

# Build TypeScript
RUN npm run build

# Default command
CMD ["npm", "start"]
