#!/bin/bash

# Spotify Connection Test Script
# Testet ob die Spotify-Integration funktioniert

set -e

echo "🧪 Spotify Connection Test"
echo "=========================="
echo ""

# Check if backend container is running
if ! docker ps | grep -q grimr_backend; then
    echo "❌ Backend Container läuft nicht!"
    echo "   Starte mit: docker-compose -f devops/docker/docker-compose.yml up -d"
    exit 1
fi

echo "✅ Backend Container läuft"
echo ""

# Run tests inside Docker container
echo "🔍 Führe Tests aus..."
echo ""

docker exec grimr_backend python -m pytest tests/test_spotify_connection.py -v --tb=short

# Alternative: Run standalone test
# docker exec grimr_backend python tests/test_spotify_connection.py

echo ""
echo "✅ Test abgeschlossen!"

