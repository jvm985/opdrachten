#!/bin/bash

echo "🔄 Pulling latest code from GitHub..."
git pull origin main

# Gebruik een tijdelijke Node container om te installeren, testen en bouwen
echo "🐳 Running Tests and Building Frontends inside Docker..."

sudo docker run --rm -v $(pwd):/app -w /app node:22-alpine sh -c "
  echo '📦 Installing dependencies...' &&
  npm run install-all &&
  
  echo '🧪 Running API Tests (Direct Node call)...' &&
  cd server && 
  NODE_ENV=test node ./node_modules/jest/bin/jest.js --forceExit && 
  cd .. &&
  
  echo '🏗️ Building frontends...' &&
  npm run build --prefix client-teacher &&
  npm run build --prefix client-student
"

if [ $? -ne 0 ]; then
  echo "❌ Build or Tests failed! Deployment aborted."
  exit 1
fi

echo "🚀 Restarting Docker Containers..."
# Gebruik de moderne 'docker compose' (zonder streepje) en ruim orphans op
sudo docker compose down --remove-orphans
sudo docker compose up -d --build

echo "🌱 Seeding database..."
# Wacht even tot de API container goed is opgestart
sleep 5
# Vind de juiste container naam (zoekt naar iets met 'api' in de huidige project context)
CONTAINER_NAME=$(sudo docker ps --format "{{.Names}}" | grep api | head -n 1)

if [ -z "$CONTAINER_NAME" ]; then
  echo "⚠️  Waarschuwing: API container niet gevonden. Seeding overgeslagen."
else
  echo "📍 Seeding container: $CONTAINER_NAME"
  sudo docker exec "$CONTAINER_NAME" npm run seed
  sudo docker exec "$CONTAINER_NAME" npm run create-demo
  sudo docker exec "$CONTAINER_NAME" npm run import-students
fi

echo "✅ Deployment finished successfully!"
echo "🚀 De app is nu live op https://docent.irishof.cloud"
