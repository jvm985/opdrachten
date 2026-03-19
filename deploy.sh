#!/bin/bash

echo "🔄 Pulling latest code from GitHub..."
git pull origin main

echo "🐳 Starting Docker containers..."
sudo docker-compose up -d --build

echo "✅ Deployment finished successfully!"
echo "🚀 De app is nu live op https://docent.irishof.cloud"
