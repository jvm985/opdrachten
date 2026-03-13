#!/bin/bash

echo "🚀 Starting Deployment..."

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm run install-all

# 2. Build everything
echo "🏗️ Building frontends and server..."
npm run build

# 3. Initial database setup and seeding
echo "🌱 Seeding database..."
cd server
npm run seed
cd ..

echo "✅ Deployment ready!"
echo ""
echo "🖥️  NGINX SETUP INSTRUCTIONS:"
echo "1. Copy configs: sudo cp nginx/*.conf /etc/nginx/sites-available/"
echo "2. Enable sites: sudo ln -s /etc/nginx/sites-available/*.conf /etc/nginx/sites-enabled/"
echo "3. Test Nginx:   sudo nginx -t"
echo "4. Reload Nginx: sudo systemctl reload nginx"
echo ""
echo "💡 Start the backend server with: npm start"
echo "   (Tip: Use PM2 to keep the backend running: pm2 start npm --name 'exam-backend' -- start)"
