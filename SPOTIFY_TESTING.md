# Spotify Connection Testing

## Übersicht

Automatisierte Test-Suite zur Überprüfung der Spotify-Integration. Testet alle kritischen Komponenten und wirft Fehler bei Problemen.

## Test-Kategorien

### 1. **Spotify API Erreichbarkeit** ✅
- Prüft ob Spotify API erreichbar ist
- Timeout: 10 Sekunden
- Erwartet: Status 200 oder 401 (401 ist OK ohne Token)

### 2. **Spotify Credentials** 🔑
- Prüft ob `SPOTIFY_CLIENT_ID` konfiguriert ist
- Prüft ob `SPOTIFY_CLIENT_SECRET` konfiguriert ist
- Prüft ob `SPOTIFY_REDIRECT_URI` konfiguriert ist
- Zeigt erste 10 Zeichen der Client ID zur Verifikation

### 3. **Neo4j Verbindung** 🗄️
- Testet Datenbankverbindung
- Führt Test-Query aus
- Kritisch für alle weiteren Tests

### 4. **User mit Spotify** 👥
- Zählt User mit aktiver Spotify-Verbindung
- Zeigt Beispiel-User
- Warnung wenn keine User verbunden

### 5. **Token-Format** 📝
- Prüft ob Access/Refresh Tokens gültige Länge haben
- Prüft ob Token-Expiry gesetzt ist
- Zeigt verbleibende Token-Gültigkeit
- Warnt bei abgelaufenen Tokens

### 6. **Token-Refresh** 🔄
- Testet ob Token-Refresh funktioniert
- Ruft Spotify Token-Endpoint auf
- **KRITISCH:** Wirft Fehler bei 400 Bad Request
- Gibt Lösungsvorschläge bei Problemen

### 7. **Recently Played API** 🎵
- Testet Spotify Recently Played Endpoint
- Refresht Token automatisch wenn abgelaufen
- Zeigt letzten abgespielten Track
- Prüft ob Album-Cover verfügbar sind

### 8. **Album-Cover in DB** 🖼️
- Zählt Alben mit/ohne Cover
- Zeigt Prozentsatz der Abdeckung
- Warnt bei < 50% Abdeckung

---

## Ausführung

### Option 1: Mit Docker (Empfohlen)

```bash
# Einfache Ausführung
./test_spotify.sh

# Oder manuell
docker exec grimr_backend python tests/test_spotify_connection.py
```

### Option 2: Mit pytest (Detailliert)

```bash
# Im Docker Container
docker exec grimr_backend python -m pytest tests/test_spotify_connection.py -v

# Mit ausführlicher Ausgabe
docker exec grimr_backend python -m pytest tests/test_spotify_connection.py -v --tb=long

# Nur bestimmte Tests
docker exec grimr_backend python -m pytest tests/test_spotify_connection.py::TestSpotifyConnection::test_spotify_api_reachable -v
```

### Option 3: Standalone (Ohne Docker)

```bash
# Direkt auf dem Host (benötigt Python 3.11+)
python3 test_spotify_standalone.py
```

---

## Ausgabe-Format

### ✅ Erfolgreicher Test
```
[1/8] Spotify API Erreichbarkeit
----------------------------------------------------------------------
✅ Spotify API ist erreichbar
```

### ❌ Fehlgeschlagener Test
```
[6/8] Token-Refresh
----------------------------------------------------------------------
❌ Token-Refresh fehlgeschlagen für grimr: 400 Bad Request
   Mögliche Ursachen:
   - Refresh Token ist ungültig oder abgelaufen
   - User muss Spotify neu verbinden
   - Spotify Client Credentials sind falsch
   
   🔧 LÖSUNG: Gehe zu http://127.0.0.1:3001/profile
              und verbinde Spotify neu
```

### ⚠️ Warnung
```
[4/8] User mit Spotify
----------------------------------------------------------------------
⚠️  Keine User mit Spotify-Verbindung gefunden
   Hinweis: Verbinde mindestens einen User mit Spotify zum Testen
```

---

## Exit Codes

- **0**: Alle Tests bestanden ✅
- **1**: Mindestens ein Test fehlgeschlagen ❌

---

## Häufige Fehler & Lösungen

### ❌ Token-Refresh fehlgeschlagen: 400 Bad Request

**Problem:** Refresh Token ist ungültig oder abgelaufen

**Lösung:**
1. Gehe zu http://127.0.0.1:3001/profile
2. Trenne Spotify-Verbindung
3. Verbinde Spotify neu
4. Führe Test erneut aus

**Ursachen:**
- Spotify-App wurde in Spotify Developer Console geändert
- Refresh Token ist älter als 1 Jahr
- Client Credentials sind falsch

---

### ⚠️ Keine User mit Spotify-Verbindung

**Problem:** Keine User haben Spotify verbunden

**Lösung:**
1. Registriere einen User
2. Gehe zu Profil
3. Verbinde Spotify
4. Führe Test erneut aus

---

### ❌ Neo4j Verbindung fehlgeschlagen

**Problem:** Datenbank nicht erreichbar

**Lösung:**
```bash
# Prüfe ob Neo4j läuft
docker ps | grep neo4j

# Starte Neo4j wenn nicht läuft
docker-compose -f devops/docker/docker-compose.yml up -d neo4j

# Prüfe Logs
docker logs grimr_neo4j
```

---

### ❌ Spotify API nicht erreichbar

**Problem:** Netzwerk-Problem oder Spotify ist down

**Lösung:**
1. Prüfe Internet-Verbindung
2. Prüfe https://status.spotify.com
3. Prüfe Firewall-Einstellungen
4. Warte und versuche später erneut

---

## Integration in CI/CD

### GitHub Actions

```yaml
name: Spotify Integration Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Start Services
        run: docker-compose -f devops/docker/docker-compose.yml up -d
      - name: Wait for Services
        run: sleep 10
      - name: Run Spotify Tests
        run: ./test_spotify.sh
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-push

echo "🧪 Running Spotify Connection Tests..."
./test_spotify.sh

if [ $? -ne 0 ]; then
    echo "❌ Tests failed! Push aborted."
    exit 1
fi

echo "✅ Tests passed! Proceeding with push."
```

---

## Entwicklung

### Neue Tests hinzufügen

```python
def test_my_new_feature(self):
    """Test X: Beschreibung"""
    try:
        # Test-Logik
        assert condition, "❌ Fehlermeldung"
        print("✅ Test erfolgreich")
    except Exception as e:
        pytest.fail(f"❌ Fehler: {str(e)}")
```

### Tests lokal ausführen

```bash
# Mit pytest
cd backend
python -m pytest tests/test_spotify_connection.py -v

# Standalone
python tests/test_spotify_connection.py
```

---

## Monitoring

### Automatische Ausführung

Empfehlung: Führe Tests automatisch aus:

1. **Täglich** via Cron:
   ```bash
   0 9 * * * cd /path/to/app && ./test_spotify.sh
   ```

2. **Nach jedem Deployment**:
   ```bash
   docker-compose up -d
   sleep 10
   ./test_spotify.sh
   ```

3. **Bei jedem Backend-Restart**:
   ```bash
   docker-compose restart backend
   sleep 5
   ./test_spotify.sh
   ```

---

## Metriken

Die Tests sammeln folgende Metriken:

- ✅ **Bestanden**: Anzahl erfolgreicher Tests
- ❌ **Fehlgeschlagen**: Anzahl fehlgeschlagener Tests
- ⚠️ **Warnungen**: Anzahl nicht-kritischer Probleme
- 📊 **Album-Cover Abdeckung**: % der Alben mit Cover
- 👥 **Aktive User**: Anzahl User mit Spotify-Verbindung
- ⏱️ **Token-Gültigkeit**: Verbleibende Zeit bis Token-Ablauf

---

## Troubleshooting

### Tests hängen

```bash
# Timeout nach 30 Sekunden
timeout 30 ./test_spotify.sh
```

### Detaillierte Logs

```bash
# Mit pytest
docker exec grimr_backend python -m pytest tests/test_spotify_connection.py -v -s --tb=long

# Standalone mit Debug
docker exec grimr_backend python tests/test_spotify_connection.py 2>&1 | tee test_output.log
```

### Docker-Probleme

```bash
# Container neu starten
docker-compose -f devops/docker/docker-compose.yml restart backend

# Logs prüfen
docker logs grimr_backend --tail 50

# In Container einloggen
docker exec -it grimr_backend bash
cd /app
python tests/test_spotify_connection.py
```

---

## Weitere Informationen

- **Spotify API Docs**: https://developer.spotify.com/documentation/web-api
- **Neo4j Docs**: https://neo4j.com/docs/
- **pytest Docs**: https://docs.pytest.org/

---

## Support

Bei Problemen:
1. Prüfe die Logs: `docker logs grimr_backend`
2. Führe Tests mit `-v` Flag aus für Details
3. Prüfe `.env` Datei auf korrekte Spotify Credentials
4. Stelle sicher, dass Redirect URI in Spotify Developer Console korrekt ist

