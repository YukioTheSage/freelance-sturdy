#!/bin/bash

# Quick Update Script - Use this after initial deployment
# This script pulls latest code and rebuilds containers

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}[INFO]${NC} Pulling latest changes..."
git pull origin main

echo -e "${BLUE}[INFO]${NC} Rebuilding containers..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo -e "${BLUE}[INFO]${NC} Restarting services..."
docker-compose -f docker-compose.prod.yml up -d

echo -e "${BLUE}[INFO]${NC} Cleaning up old images..."
docker image prune -f

echo -e "${GREEN}[SUCCESS]${NC} Update completed!"
docker-compose -f docker-compose.prod.yml ps
