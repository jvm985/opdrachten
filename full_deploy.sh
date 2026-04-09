#!/bin/bash

# Dummy change om tool te callen (ik ga hierna ssh gebruiken)
SERVER="docent.irishof.cloud"
USER="joachim"
REMOTE_PATH="/opt/irishof/7-opdrachten"

echo "🧪 1. Lokale validatie starten..."

# TypeScript checks
echo "   - Checking TypeScript (Clients)..."
(pushd client-teacher && npx tsc --noEmit && popd) || { echo "❌ TS Error in Teacher Client"; exit 1; }
(pushd client-student && npx tsc --noEmit && popd) || { echo "❌ TS Error in Student Client"; exit 1; }

# API Tests
echo "   - Running API Tests..."
cd server
NODE_ENV=test npm test || { echo "❌ API Tests failed"; exit 1; }
cd ..

echo "✅ Validatie succesvol!"

echo "📦 2. Lokale wijzigingen klaarmaken..."
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

echo "🚀 3. Pushen naar GitHub..."
git push origin main

echo "🌐 4. Verbinding maken met productie server ($SERVER)..."
ssh $USER@$SERVER "cd $REMOTE_PATH && sudo git fetch origin && sudo git reset --hard origin/main && ./deploy.sh"

echo "✨ 5. Full Deploy voltooid!"
