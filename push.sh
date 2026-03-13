#!/bin/bash

# Zorg dat we op de 'main' branch zitten (modern standard)
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" == "master" ]; then
    echo "🔀 Branch hernoemen van master naar main..."
    git branch -M main
fi

# Voeg alle bestanden toe
echo "📦 Bestanden klaarmaken..."
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

# Push naar GitHub
echo "🚀 Pushen naar GitHub..."
git push -u origin main

echo "✅ Klaar!"
