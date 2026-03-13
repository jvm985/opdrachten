#!/bin/bash

echo "🔄 Pulling latest code from GitHub..."
git pull origin main

# 1. Install local dependencies for testing
echo "📦 Installing dependencies for testing..."
npm run install-all

# 2. Run API and UI Tests
echo "🧪 Running tests..."
cd server && NODE_ENV=test npm test && cd ..
node e2e_test.js

if [ $? -ne 0 ]; then
  echo "❌ Tests failed! Deployment aborted."
  exit 1
fi

echo "🚀 Starting Ubuntu Docker Deployment..."

# 3. Build frontends
echo "🏗️ Building frontends..."
npm run build --prefix client-teacher
npm run build --prefix client-student

# 4. Build and start Backend in Docker
echo "🐳 Starting Backend Docker container..."
sudo docker-compose up -d --build

# 5. Seed the database (runs inside the container)
echo "🌱 Seeding database..."
sudo docker exec -it exam-api npm run seed

echo "✅ Deployment finished successfully!"
echo ""
echo "🖥️  NGINX STEPS:"
echo "1. Edit nginx/*.conf to set the correct 'root' paths."
echo "2. sudo cp nginx/*.conf /etc/nginx/sites-available/"
echo "3. sudo ln -s /etc/nginx/sites-available/*.conf /etc/nginx/sites-enabled/"
echo "4. sudo nginx -t && sudo systemctl reload nginx"
