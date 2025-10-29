#!/bin/bash

# Freelancing Platform - Production Deployment Script
# This script sets up and deploys the application on a DigitalOcean VPS

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root or with sudo"
    exit 1
fi

# Check if .env.production exists
if [ ! -f .env.production ]; then
    print_error ".env.production file not found!"
    print_info "Please create .env.production from .env.production.example"
    exit 1
fi

print_info "Starting deployment process..."

# Load environment variables
export $(grep -v '^#' .env.production | xargs)

# Check required environment variables
REQUIRED_VARS=("DOMAIN" "DB_ROOT_PASSWORD" "DB_PASSWORD" "JWT_SECRET" "JWT_REFRESH_SECRET" "EMAIL")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Required environment variable $var is not set in .env.production"
        exit 1
    fi
done

# Update system packages
print_info "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install required packages
print_info "Installing required packages..."
sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    ufw \
    fail2ban

# Install Docker if not already installed
if ! command -v docker &> /dev/null; then
    print_info "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    print_success "Docker installed successfully"
else
    print_info "Docker already installed"
fi

# Install Docker Compose if not already installed
if ! command -v docker-compose &> /dev/null; then
    print_info "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installed successfully"
else
    print_info "Docker Compose already installed"
fi

# Configure firewall
print_info "Configuring firewall..."
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
print_success "Firewall configured"

# Configure fail2ban
print_info "Configuring fail2ban..."
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
print_success "fail2ban configured"

# Create necessary directories
print_info "Creating necessary directories..."
mkdir -p certbot/conf certbot/www backups logs

# Replace DOMAIN placeholder in nginx config
print_info "Configuring nginx for domain: $DOMAIN"
sed -i "s/\${DOMAIN}/$DOMAIN/g" nginx/conf.d/app.conf

# Pull latest images and build
print_info "Building Docker images..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Initial setup - HTTP only for Let's Encrypt
print_info "Starting services for initial setup..."
docker-compose -f docker-compose.prod.yml up -d mysql app nginx

# Wait for services to be ready
print_info "Waiting for services to be ready..."
sleep 30

# Initialize database
print_info "Initializing database..."
docker-compose -f docker-compose.prod.yml exec -T app node src/db/init.js || true

# Obtain SSL certificate
print_info "Obtaining SSL certificate from Let's Encrypt..."
docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN || print_warning "SSL certificate setup failed. You can run this manually later."

# Uncomment HTTPS configuration in nginx
if [ -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    print_info "Enabling HTTPS configuration..."
    sed -i 's/# server {/server {/g' nginx/conf.d/app.conf
    sed -i 's/#     /    /g' nginx/conf.d/app.conf
    sed -i 's/# }/}/g' nginx/conf.d/app.conf

    # Restart nginx to apply HTTPS configuration
    docker-compose -f docker-compose.prod.yml restart nginx
    print_success "HTTPS enabled successfully"
else
    print_warning "SSL certificate not found. HTTPS configuration not enabled."
    print_info "You can manually obtain certificate and enable HTTPS later."
fi

# Start all services including certbot renewal
print_info "Starting all services..."
docker-compose -f docker-compose.prod.yml up -d

# Show status
print_info "Checking service status..."
docker-compose -f docker-compose.prod.yml ps

print_success "Deployment completed successfully!"
echo ""
print_info "Your application should now be accessible at:"
echo -e "  ${GREEN}https://$DOMAIN${NC}"
echo ""
print_info "Useful commands:"
echo "  View logs:    docker-compose -f docker-compose.prod.yml logs -f"
echo "  Stop:         docker-compose -f docker-compose.prod.yml down"
echo "  Restart:      docker-compose -f docker-compose.prod.yml restart"
echo "  Backup DB:    ./scripts/backup.sh"
echo ""
print_warning "IMPORTANT: If you're in the docker group for the first time, you may need to log out and back in for changes to take effect."
