#!/bin/bash

# Logs Viewer Script
# Easy access to container logs

# Colors
BLUE='\033[0;34m'
NC='\033[0m'

SERVICE=$1

if [ -z "$SERVICE" ]; then
    echo -e "${BLUE}Usage:${NC} $0 [service] [options]"
    echo ""
    echo "Services: app, mysql, nginx, client, certbot"
    echo ""
    echo "Examples:"
    echo "  $0 app              # Show all app logs"
    echo "  $0 app -f           # Follow app logs"
    echo "  $0 app --tail 100   # Show last 100 lines"
    echo "  $0 nginx -f         # Follow nginx logs"
    echo ""
    echo "Show all services:"
    echo "  $0 all -f"
    exit 1
fi

if [ "$SERVICE" = "all" ]; then
    docker-compose -f docker-compose.prod.yml logs ${@:2}
else
    docker-compose -f docker-compose.prod.yml logs $SERVICE ${@:2}
fi
