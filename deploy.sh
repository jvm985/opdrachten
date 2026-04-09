#!/bin/bash

echo "🔄 Pulling latest code from GitHub..."
# Opmerking: git reset wordt nu al aangeroepen door full_deploy.sh

echo "🏗 Building frontends inside temporary Docker container..."
# Verwijder oude dist folders om zeker te zijn van een schone build op de host
sudo rm -rf client-teacher/dist client-student/dist
# Gebruik een Node container om de build te doen zodat de 'dist' mappen op de server worden ververst
sudo docker run --rm -v $(pwd):/app -w /app node:22-alpine sh -c "npm run install-all --silent && npm run build --silent"

echo "🐳 Restarting Docker containers (Modern Docker Compose)..."
# Gebruik de moderne 'docker compose' in plaats van 'docker-compose'
sudo docker compose down --remove-orphans
sudo docker compose up -d --build

echo "✅ Deployment finished successfully!"
echo "🚀 De app is nu live op https://docent.irishof.cloud"
