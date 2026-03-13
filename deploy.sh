#!/bin/bash

echo "🚀 Starting Ubuntu Docker Deployment..."

# 1. Install dependencies and build frontends
echo "📦 Building frontends..."
npm run install-all
npm run build --prefix client-teacher
npm run build --prefix client-student

# 2. Build and start Backend in Docker
echo "🐳 Starting Backend Docker container..."
sudo docker-compose up -d --build

# 3. Seed the database (runs inside the container)
echo "🌱 Seeding database..."
sudo docker exec -it exam-api npm run seed

echo "✅ Deployment finished!"
echo ""
echo "🖥️  NGINX STEPS:"
echo "1. Edit nginx/*.conf to set the correct 'root' paths."
echo "2. sudo cp nginx/*.conf /etc/nginx/sites-available/"
echo "3. sudo ln -s /etc/nginx/sites-available/*.conf /etc/nginx/sites-enabled/"
echo "4. sudo nginx -t && sudo systemctl reload nginx"
