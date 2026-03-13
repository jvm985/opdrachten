#!/bin/bash

echo "🔄 Pulling latest code from GitHub..."
git pull origin main

# Gebruik een tijdelijke Node container om te installeren, testen en bouwen
echo "🐳 Running Tests and Building Frontends inside Docker..."
# Verwijder oude node_modules om permissie problemen te voorkomen
sudo rm -rf node_modules server/node_modules client-teacher/node_modules client-student/node_modules

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

echo "🚀 Starting Backend API in Docker Compose..."
sudo docker-compose up -d --build

echo "🌱 Seeding database..."
# Wacht even tot de API container goed is opgestart
sleep 5
sudo docker exec exam-api npm run seed

echo "✅ Deployment finished successfully!"
echo ""
echo "🖥️  NGINX reminder:"
echo "Your host Nginx should point the 'root' directives to the newly built dist folders:"
echo "Docent: $(pwd)/client-teacher/dist"
echo "Student: $(pwd)/client-student/dist"
