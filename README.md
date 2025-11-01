# Grimr - Metalheads Connect

**"Letterboxd meets Bandcamp for Metal"**

Grimr ist eine Social-Discovery-Plattform für die Metal-Community. Verbinde deine Musik-Accounts (Spotify, Last.fm, Discogs, Bandcamp), entdecke Metalheads mit ähnlichem Geschmack in deiner Nähe und teile deine Metal-DNA.

---

## 🎸 Features (MVP)

### Milestone 1: Metal-ID + Compatibility Map (P0)
- **Metal-ID Card**: Automatisch generierte Identität basierend auf deinen Top-Künstlern, Genres und Badges
- **Compatibility Matching**: Finde Metalheads mit ähnlichem Geschmack in deiner Nähe
- **Share Metal-DNA**: Teile deine Top-5-Rarest-Albums und Genres

### Milestone 2: Event Layer + Feed (P1)
- **Event Discovery**: Finde Konzerte und Festivals in deiner Nähe
- **Event Groups**: Erstelle oder tritt kleinen Chat-Gruppen für Events bei
- **Album Reviews**: Letterboxd-Style Micro-Reviews mit "Throw Horns" (Like)

---

## 🛠️ Tech Stack

- **Frontend**: Next.js (React), TypeScript, Dark/Occult Theme
- **Backend**: FastAPI (Python), Neo4j (Graph DB)
- **Auth**: JWT, OAuth (Spotify, Last.fm, Discogs, Bandcamp)
- **Deployment**: Docker, Vercel (Frontend), Managed Neo4j

---

## 🚀 Quick Start (Local Development)

### Voraussetzungen
- Docker & Docker Compose
- Python 3.11+
- Node.js 18+

### 1. Repository klonen
```bash
git clone git@github.com:Ildsjel/Ildsjel-MCommunity_App.git
cd Ildsjel-MCommunity_App
```

### 2. Environment Variables einrichten
```bash
cp env.example .env
# .env bearbeiten und API-Keys eintragen
```

### 3. Backend & Neo4j starten (Docker)
```bash
cd devops/docker
docker-compose up -d
```

Neo4j Browser: http://localhost:7474  
Backend API: http://localhost:8000  
API Docs: http://localhost:8000/docs

### 4. Neo4j Schema initialisieren
```bash
# Neo4j Browser öffnen (http://localhost:7474)
# Login: neo4j / grimr_dev_password
# Migrations ausführen:
# Inhalt von database/migrations/V1__initial_schema.cypher kopieren und ausführen
```

### 5. Frontend starten (optional)
```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:3000

---

## 📁 Projektstruktur

```
Metal_Community_App/
├── backend/              # FastAPI Backend
│   ├── app/
│   │   ├── api/v1/      # API Endpoints (auth, users, compatibility, events)
│   │   ├── services/    # Business Logic
│   │   ├── models/      # Pydantic Models
│   │   ├── db/          # Neo4j Driver & Repositories
│   │   ├── auth/        # JWT & Security
│   │   └── config/      # Settings
│   ├── main.py          # FastAPI Entry Point
│   └── requirements.txt
├── frontend/            # Next.js Frontend
│   ├── src/
│   │   ├── pages/       # Next.js Routes
│   │   ├── components/  # React Components
│   │   ├── styles/      # Dark Theme Styling
│   │   └── services/    # API Client
│   └── package.json
├── database/
│   ├── migrations/      # Neo4j Cypher Migrations
│   └── schemas/         # Schema Documentation
├── devops/
│   └── docker/          # Docker Compose & Dockerfiles
├── docs/                # Dokumentation (PRD, Tech Stack, User Flows)
└── README.md
```

---

## 🧪 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Registrierung
- `POST /api/v1/auth/login` - Login

### Users
- `GET /api/v1/users/me` - Eigenes Profil (authentifiziert)
- `GET /api/v1/users/{user_id}` - User-Profil (öffentlich)

### Compatibility (TODO)
- `GET /api/v1/compatibility/matches` - Kompatible User finden

### Events (TODO)
- `GET /api/v1/events` - Events in der Nähe
- `POST /api/v1/events/{event_id}/attend` - Event beitreten

---

## 🎨 Design Principles

- **Dark & Atmospheric**: Dunkles, okkultes Theme ("church-like feeling")
- **Culturally Aligned**: Authentisch für die Metal-Community
- **Performance**: Page Load < 250ms, 10k concurrent users
- **Privacy**: GDPR-compliant, opt-in data usage

---

## 📊 Compatibility Algorithm

Scoring-Formel: `S(u,v) = 100 * [0.45*A + 0.15*G + 0.15*C + 0.15*E + 0.10*P]`

- **A (Artist Overlap)**: Cosine-Similarity auf Top-Artists (gewichtet nach Plays, Recency, Rarity)
- **G (Genre Overlap)**: Hierarchical Jaccard auf Genres
- **C (Collection Affinity)**: Jaccard auf Discogs-Collection (gewichtet nach Rarity)
- **E (Event Cohesion)**: Overlap auf besuchte/geplante Events
- **P (Geo Proximity)**: Haversine-Distance mit Soft-Penalty

---

## 🗺️ Roadmap

- [x] Projektstruktur & Git Setup
- [x] Backend: FastAPI + Neo4j Setup
- [x] Backend: Auth (JWT, User Registration/Login)
- [ ] Backend: Spotify OAuth Integration
- [ ] Backend: Compatibility Matching Engine
- [ ] Frontend: Next.js Setup + Dark Theme
- [ ] Frontend: Auth Flow (Login, Signup)
- [ ] Frontend: Metal-ID Card Component
- [ ] Frontend: Discover/Compatibility Map
- [ ] Alpha Launch (300 users, Reddit/Discord)

---

## 📄 Dokumentation

- **PRD**: `prd.txt` (vollständiges Product Requirements Document)
- **Tech Stack**: Siehe `prd.txt` → Technology Stack
- **Database Schema**: `database/schemas/neo4j_schema_definition.md`
- **User Flows**: Siehe `prd.txt` → User Flow

---

## 🤝 Contributing

Dies ist aktuell ein privates Solo-Projekt. Contributions sind derzeit nicht vorgesehen.

---

## 📧 Kontakt

**Johannes Hönscheid**  
GitHub: [@Ildsjel](https://github.com/Ildsjel)

---

## 📜 Lizenz

Proprietary - Alle Rechte vorbehalten.
