#!/bin/bash
# Installeer dependencies als ze er nog niet zijn
npm install

# Start alles tegelijk
fuser -k 3001/tcp
npm run dev
