#!/bin/bash

# Health Check Script - Check if all services are running properly

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Service Health Check ===${NC}\n"

# Check Docker containers status
echo -e "${BLUE}[INFO]${NC} Checking container status..."
docker-compose -f docker-compose.prod.yml ps
echo ""

# Check MySQL
echo -e "${BLUE}[INFO]${NC} Checking MySQL database..."
if docker-compose -f docker-compose.prod.yml exec -T mysql mysqladmin ping -h localhost --silent; then
    echo -e "${GREEN}✓${NC} MySQL is running"
else
    echo -e "${RED}✗${NC} MySQL is not responding"
fi

# Check API
echo -e "${BLUE}[INFO]${NC} Checking API server..."
if curl -f -s http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}✓${NC} API server is running"
else
    echo -e "${RED}✗${NC} API server is not responding"
fi

# Check Nginx
echo -e "${BLUE}[INFO]${NC} Checking Nginx..."
if curl -f -s http://localhost/health > /dev/null; then
    echo -e "${GREEN}✓${NC} Nginx is running"
else
    echo -e "${RED}✗${NC} Nginx is not responding"
fi

# Check SSL certificate expiration (if exists)
if [ -f "certbot/conf/live/$(grep DOMAIN .env.production | cut -d '=' -f2)/fullchain.pem" ]; then
    DOMAIN=$(grep DOMAIN .env.production | cut -d '=' -f2)
    echo -e "\n${BLUE}[INFO]${NC} Checking SSL certificate..."
    EXPIRY=$(openssl x509 -enddate -noout -in "certbot/conf/live/$DOMAIN/fullchain.pem" | cut -d= -f2)
    echo -e "${GREEN}✓${NC} SSL certificate expires: $EXPIRY"
fi

# Check disk space
echo -e "\n${BLUE}[INFO]${NC} Checking disk space..."
df -h | grep -E '^/dev/' | awk '{print $5 " used on " $6}' | while read line; do
    usage=$(echo $line | cut -d% -f1)
    if [ $usage -gt 80 ]; then
        echo -e "${RED}✗${NC} High disk usage: $line"
    else
        echo -e "${GREEN}✓${NC} Disk usage: $line"
    fi
done

# Check memory usage
echo -e "\n${BLUE}[INFO]${NC} Checking memory usage..."
free -h | grep Mem | awk '{print "Total: " $2 ", Used: " $3 ", Available: " $7}'

# Show recent logs
echo -e "\n${BLUE}[INFO]${NC} Recent error logs (last 10 lines)..."
docker-compose -f docker-compose.prod.yml logs --tail=10 --no-color 2>&1 | grep -i error || echo "No recent errors found"

echo -e "\n${GREEN}Health check completed!${NC}"
