FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install nc (netcat) for health checks
RUN apk add --no-cache netcat-openbsd

# Copy package files
COPY package*.json ./

# Install dependencies including dev dependencies
RUN npm install

# Copy source code
COPY . .

# Copy and make entrypoint executable
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Expose port
EXPOSE 3000

# Start the application with entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]
