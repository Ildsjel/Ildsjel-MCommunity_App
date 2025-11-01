# Grimr - Nächste Implementierungsschritte

Dieser Dokument beschreibt die nächsten Schritte zur Vervollständigung des MVP.

---

## ✅ Bereits implementiert

- [x] Projektstruktur (Backend, Frontend, Database, DevOps, Docs)
- [x] Backend: FastAPI Setup mit CORS, Health-Check
- [x] Backend: Neo4j Driver & Connection Management
- [x] Backend: JWT Authentication (Token Creation, Verification)
- [x] Backend: User Service (Registration, Login, Profile)
- [x] Backend: User Repository (Neo4j CRUD Operations)
- [x] Backend: API Endpoints (Auth, Users)
- [x] Database: Neo4j Schema (Constraints, Indexes)
- [x] Docker: docker-compose.yml (Neo4j + Backend)
- [x] Documentation: README, SETUP, Schema Definition

---

## 🎯 Milestone 1: Metal-ID + Compatibility Map (P0)

### 1. Spotify OAuth Integration (Priorität: HOCH)

**Backend:**
- [ ] `backend/app/services/music_api_service.py` erstellen
  - Spotify OAuth Flow (Authorization Code Flow)
  - Token Management (Access Token, Refresh Token)
  - Top Artists & Tracks abrufen (Last 90/365 days)
  - Playcount & Timestamp extrahieren

- [ ] `backend/app/api/v1/spotify.py` erstellen
  - `GET /api/v1/spotify/authorize` - Redirect zu Spotify OAuth
  - `GET /api/v1/spotify/callback` - OAuth Callback Handler
  - `POST /api/v1/spotify/sync` - Sync User Data (authentifiziert)

**Neo4j:**
- [ ] `LISTENS_TO` Relationships erstellen
  - User → Artist mit `plays`, `last_play_ts`, `source`, `window`
  - Artist-Nodes anlegen (falls noch nicht vorhanden)

**Environment:**
- [ ] Spotify Developer Account erstellen
- [ ] App registrieren: https://developer.spotify.com/dashboard
- [ ] `SPOTIFY_CLIENT_ID` und `SPOTIFY_CLIENT_SECRET` in `.env` eintragen

**Testing:**
```bash
# 1. Authorize
curl http://localhost:8000/api/v1/spotify/authorize

# 2. Nach Callback: Sync
curl -X POST http://localhost:8000/api/v1/spotify/sync \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 2. Metal-ID Generation (Priorität: HOCH)

**Backend:**
- [ ] `backend/app/services/metal_id_service.py` erstellen
  - Top Artists aggregieren (aus LISTENS_TO)
  - Top Genres ableiten (aus Artist → Genre)
  - Badges berechnen (z. B. "Black Metal Purist" wenn >80% Black Metal)
  - Metal-ID Card Response generieren

- [ ] `backend/app/api/v1/metal_id.py` erstellen
  - `GET /api/v1/metal-id/me` - Eigene Metal-ID Card
  - `GET /api/v1/metal-id/{user_id}` - Metal-ID Card eines Users

**Neo4j Queries:**
```cypher
// Top Artists
MATCH (u:User {id: $user_id})-[l:LISTENS_TO]->(a:Artist)
RETURN a.name, l.plays
ORDER BY l.plays DESC
LIMIT 10

// Top Genres
MATCH (u:User {id: $user_id})-[:LISTENS_TO]->(a:Artist)-[:TAGGED_AS]->(g:Genre)
RETURN g.name, COUNT(*) as count
ORDER BY count DESC
LIMIT 5
```

**Models:**
- [ ] `backend/app/models/metal_id_models.py`
  - `MetalIDCard` (bereits in `user_models.py` vorhanden, erweitern)
  - `Badge`, `TopArtist`, `TopGenre`

---

### 3. Compatibility Matching Engine (Priorität: HOCH)

**Backend:**
- [ ] `backend/app/services/compatibility_service.py` erstellen
  - Artist Overlap (Cosine Similarity) - **45% Gewicht**
  - Genre Overlap (Hierarchical Jaccard) - **15% Gewicht**
  - Geo Proximity (Haversine Distance) - **10% Gewicht**
  - Gesamtscore berechnen: `S(u,v) = 100 * [0.45*A + 0.15*G + 0.10*P]`

- [ ] `backend/app/api/v1/compatibility.py` erstellen
  - `GET /api/v1/compatibility/matches` - Liste kompatibler User
    - Query Params: `radius_km`, `min_score`, `limit`
  - `GET /api/v1/compatibility/{user_id}` - Compatibility mit spezifischem User

**Neo4j Queries:**
```cypher
// Artist Overlap (Cosine Similarity)
MATCH (u1:User {id: $user1_id})-[l1:LISTENS_TO]->(a:Artist)<-[l2:LISTENS_TO]-(u2:User)
WHERE u1 <> u2
WITH u2, 
     SUM(l1.plays * l2.plays) AS dot_product,
     SQRT(SUM(l1.plays^2)) AS norm1,
     SQRT(SUM(l2.plays^2)) AS norm2
RETURN u2.id, dot_product / (norm1 * norm2) AS artist_similarity

// Nearby Users (Geo Proximity)
MATCH (u1:User {id: $user1_id}), (u2:User)
WHERE u1 <> u2
  AND point.distance(
    point({latitude: u1.lat, longitude: u1.lon}),
    point({latitude: u2.lat, longitude: u2.lon})
  ) / 1000 < $radius_km
RETURN u2.id, 
       point.distance(
         point({latitude: u1.lat, longitude: u1.lon}),
         point({latitude: u2.lat, longitude: u2.lon})
       ) / 1000 AS distance_km
```

**Models:**
- [ ] `backend/app/models/compatibility_models.py`
  - `CompatibilityMatch` (user_id, score, distance_km, shared_artists, shared_genres)
  - `CompatibilityDetail` (breakdown: artist_score, genre_score, geo_score)

---

### 4. Share Metal-DNA (Priorität: MITTEL)

**Backend:**
- [ ] `GET /api/v1/metal-id/share` - Shareable Image/Chart generieren
  - Top 5 Rarest Albums
  - Top Genres Visualization
  - Optional: PIL/Pillow für Image Generation

**Frontend (später):**
- [ ] Share-Button mit Native Share API
- [ ] Preview der generierten Metal-DNA Card

---

## 🎨 Frontend (Next.js)

### 1. Next.js Setup (Priorität: HOCH)

```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --app
```

**Struktur:**
- [ ] `frontend/src/app/` - App Router (Next.js 13+)
- [ ] `frontend/src/components/` - React Components
- [ ] `frontend/src/styles/theme.ts` - Dark Theme Config

**Theme:**
- [ ] Tailwind Config mit Dark Colors (Grim Black, Occult Crimson, etc.)
- [ ] Fonts: IM Fell DW Pica (Headings), Roboto (Body)

---

### 2. Auth Flow (Priorität: HOCH)

- [ ] `frontend/src/app/auth/login/page.tsx` - Login Page
- [ ] `frontend/src/app/auth/register/page.tsx` - Register Page
- [ ] `frontend/src/app/auth/callback/page.tsx` - OAuth Callback (Spotify)
- [ ] `frontend/src/context/AuthContext.tsx` - Auth State Management
- [ ] `frontend/src/services/authService.ts` - API Calls (Login, Register)

**Features:**
- JWT Token in LocalStorage/Cookie speichern
- Protected Routes (Redirect zu /login wenn nicht authentifiziert)
- Logout Functionality

---

### 3. Metal-ID Card Component (Priorität: HOCH)

- [ ] `frontend/src/components/features/metal-id-card/MetalIDCard.tsx`
  - User Avatar/Handle
  - Top Artists Carousel
  - Genres Cloud
  - Badges Section
  - Share Button

- [ ] `frontend/src/app/profile/page.tsx` - Own Profile Page
- [ ] `frontend/src/app/profile/[userId]/page.tsx` - User Profile Page

---

### 4. Discover/Compatibility Map (Priorität: HOCH)

- [ ] `frontend/src/app/discover/page.tsx` - Discover Page
  - List of Compatible Users (Cards)
  - Filter: Distance, Min Score
  - Infinite Scroll / Pagination

- [ ] `frontend/src/components/features/compatibility-map/CompatibilityCard.tsx`
  - User Avatar, Handle, Location
  - Compatibility Score (Circular Meter)
  - Shared Artists/Genres Preview
  - "Throw Horns" Button

---

## 🎯 Milestone 2: Event Layer + Feed (P1)

### 1. Event Discovery (Priorität: MITTEL)

**Backend:**
- [ ] Bandsintown/Songkick API Integration
- [ ] `backend/app/services/event_service.py`
- [ ] `backend/app/api/v1/events.py`

**Frontend:**
- [ ] `frontend/src/app/events/page.tsx` - Events List
- [ ] `frontend/src/app/events/[eventId]/page.tsx` - Event Detail

---

### 2. Album Reviews & Feed (Priorität: MITTEL)

**Backend:**
- [ ] `backend/app/api/v1/albums.py` - Review CRUD
- [ ] `backend/app/api/v1/feed.py` - Feed Aggregation

**Frontend:**
- [ ] `frontend/src/app/feed/page.tsx` - Feed Page
- [ ] Review Form Component
- [ ] "Throw Horns" Interaction

---

## 📊 Testing & Deployment

### Testing
- [ ] Backend: Pytest Unit Tests
- [ ] Frontend: Jest + React Testing Library
- [ ] E2E: Playwright/Cypress

### Deployment
- [ ] Backend: Railway/Render/Fly.io
- [ ] Frontend: Vercel
- [ ] Neo4j: Neo4j Aura (Managed)

---

## 🚀 Alpha Launch (4 Wochen)

- [ ] 300 Beta-Tester rekrutieren (Reddit, Discord)
- [ ] Feedback sammeln
- [ ] Iterate auf Matching-Algorithmus

---

## 📝 Priorisierung für die nächsten 2 Wochen

### Woche 1:
1. Spotify OAuth Integration ✅
2. Metal-ID Generation ✅
3. Compatibility Matching (Artist + Geo) ✅

### Woche 2:
1. Frontend: Next.js Setup + Dark Theme ✅
2. Frontend: Auth Flow (Login, Register) ✅
3. Frontend: Metal-ID Card Component ✅
4. Frontend: Discover Page (Basic) ✅

---

**Nächster Schritt:** Spotify OAuth Integration starten! 🎸

