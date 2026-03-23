#!/bin/bash

echo "🔄 Pulling latest code from GitHub..."
# Opmerking: git reset wordt nu al aangeroepen door full_deploy.sh

echo "🏗 Building frontends inside temporary Docker container..."
# Gebruik een Node container om de build te doen zodat de 'dist' mappen op de server worden ververst
sudo docker run --rm -v $(pwd):/app -w /app node:22-alpine sh -c "npm run install-all --silent && npm run build --silent"

echo "🐳 Restarting Docker containers (Safe mode)..."
# Stop en verwijder containers geforceerd om 'ContainerConfig' bug te voorkomen
sudo docker-compose down --remove-orphans
sudo docker rm -f exam-api exam-frontend || true

# Start alles schoon op
sudo docker-compose up -d --build

echo "✅ Deployment finished successfully!"
echo "🚀 De app is nu live op https://docent.irishof.cloud"
