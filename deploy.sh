#!/bin/bash

echo "🔄 Pulling latest code from GitHub..."
# Opmerking: git reset wordt nu al aangeroepen door full_deploy.sh

echo "🐳 Restarting Docker containers (Safe mode)..."
# Stop en verwijder containers geforceerd om 'ContainerConfig' bug te voorkomen
sudo docker-compose down --remove-orphans
sudo docker rm -f exam-api exam-frontend || true

# Start alles schoon op
sudo docker-compose up -d --build

echo "✅ Deployment finished successfully!"
echo "🚀 De app is nu live op https://docent.irishof.cloud"
