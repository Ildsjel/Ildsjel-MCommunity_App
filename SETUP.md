# Grimr - Setup Guide

Dieser Guide führt dich Schritt für Schritt durch das Setup der Grimr-Entwicklungsumgebung.

---

## 📋 Voraussetzungen

### Software installieren
- **Docker Desktop**: [Download](https://www.docker.com/products/docker-desktop/)
- **Python 3.11+**: [Download](https://www.python.org/downloads/)
- **Node.js 18+**: [Download](https://nodejs.org/)
- **Git**: Bereits installiert ✅

---

## 🚀 Backend Setup (FastAPI + Neo4j)

### 1. Environment Variables einrichten

```bash
cd /Users/johanneshonscheid/Metal_Community_App
cp env.example .env
```

Bearbeite `.env` und setze mindestens:
```bash
SECRET_KEY=dein-sicherer-secret-key-mindestens-32-zeichen-lang
NEO4J_PASSWORD=grimr_dev_password
```

### 2. Docker Container starten

```bash
cd devops/docker
docker-compose up -d
```

Das startet:
- **Neo4j** auf Port 7474 (Browser) und 7687 (Bolt)
- **FastAPI Backend** auf Port 8000

Prüfe den Status:
```bash
docker-compose ps
```

### 3. Neo4j Schema initialisieren

1. Öffne Neo4j Browser: http://localhost:7474
2. Login mit:
   - Username: `neo4j`
   - Password: `grimr_dev_password`
3. Kopiere den Inhalt von `database/migrations/V1__initial_schema.cypher`
4. Füge ihn in den Neo4j Browser ein und führe ihn aus

### 4. Backend testen

API Docs: http://localhost:8000/docs

Teste die Health-Check-Endpoint:
```bash
curl http://localhost:8000/health
```

Erwartete Antwort:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

---

## 🎨 Frontend Setup (Next.js)

### 1. Dependencies installieren

```bash
cd frontend
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env.local
```

Bearbeite `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Development Server starten

```bash
npm run dev
```

Frontend: http://localhost:3000

---

## 🧪 API Testen

### Registrierung

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "handle": "metalhead666",
    "email": "test@grimr.dev",
    "password": "SecurePass123!",
    "country": "Germany",
    "city": "Berlin"
  }'
```

### Login

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@grimr.dev",
    "password": "SecurePass123!"
  }'
```

Kopiere den `access_token` aus der Antwort.

### Eigenes Profil abrufen

```bash
curl http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer DEIN_ACCESS_TOKEN"
```

---

## 🛠️ Entwicklung

### Backend (FastAPI)

Logs anzeigen:
```bash
docker-compose logs -f backend
```

Backend neu starten:
```bash
docker-compose restart backend
```

### Neo4j

Neo4j Browser: http://localhost:7474

Alle User anzeigen:
```cypher
MATCH (u:User) RETURN u LIMIT 10
```

### Frontend (Next.js)

Hot-Reload ist aktiviert. Änderungen werden automatisch übernommen.

---

## 🐛 Troubleshooting

### Neo4j startet nicht

```bash
docker-compose down
docker volume rm docker_neo4j_data docker_neo4j_logs
docker-compose up -d
```

### Backend kann nicht auf Neo4j zugreifen

Prüfe die Logs:
```bash
docker-compose logs neo4j
docker-compose logs backend
```

Stelle sicher, dass `NEO4J_URI` in `.env` korrekt ist:
```bash
NEO4J_URI=bolt://neo4j:7687
```

### Port bereits belegt

Ändere die Ports in `devops/docker/docker-compose.yml`:
```yaml
ports:
  - "8001:8000"  # Backend auf 8001 statt 8000
```

---

## 📦 Nächste Schritte

1. **Spotify OAuth Integration** implementieren
2. **Compatibility Matching Engine** entwickeln
3. **Frontend** aufbauen (Next.js + Dark Theme)
4. **Metal-ID Card Component** erstellen

Siehe `README.md` für die vollständige Roadmap.

---

## 🆘 Support

Bei Fragen oder Problemen:
- Prüfe die Logs: `docker-compose logs`
- Lies die API Docs: http://localhost:8000/docs
- Konsultiere `prd.txt` für Details

Happy Coding! 🤘

