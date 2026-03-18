#!/bin/bash

# Configuratie
SERVER="docent.irishof.cloud"
USER="joachim"
REMOTE_PATH="/home/joachim/apps/opdrachten"

echo "📦 1. Lokale wijzigingen klaarmaken..."
git add .

# Vraag om een commit bericht, of gebruik een standaard
if [ -z "$1" ]; then
    read -p "📝 Voer een commit bericht in (leeg voor 'Update'): " MESSAGE
    if [ -z "$MESSAGE" ]; then
        MESSAGE="Update: $(date +'%Y-%m-%d %H:%M:%S')"
    fi
else
    MESSAGE="$1"
fi

# Commit de wijzigingen
git commit -m "$MESSAGE"

echo "🚀 2. Pushen naar GitHub..."
git push origin main

echo "🌐 3. Verbinding maken met productie server ($SERVER)..."
ssh $USER@$SERVER "cd $REMOTE_PATH && sudo ./deploy.sh"

echo "✨ 4. Deploy voltooid!"
