# Grimr Frontend

Next.js frontend für die Grimr Metal Community App mit Dark/Occult Theme.

## 🚀 Setup

### Voraussetzungen
- Node.js 18+ 
- npm oder yarn

### Installation

1. **Node.js installieren** (falls noch nicht vorhanden):
   ```bash
   # Download von https://nodejs.org/
   # Oder mit Homebrew (falls installiert):
   brew install node
   ```

2. **Dependencies installieren**:
   ```bash
   cd frontend
   npm install
   ```

3. **Environment Variables**:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Bearbeite `.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. **Development Server starten**:
   ```bash
   npm run dev
   ```

   Frontend läuft auf: http://localhost:3000

---

## 📁 Projektstruktur

```
frontend/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root Layout mit Dark Theme
│   ├── page.tsx           # Home Page
│   ├── globals.css        # Global Styles (Tailwind + Custom)
│   ├── auth/              # Auth Pages
│   │   ├── login/
│   │   └── register/
│   └── profile/           # User Profile Page
├── lib/                   # Utilities & API Client
│   └── api.ts            # Axios API Client
├── components/            # Reusable React Components
├── public/               # Static Assets
├── tailwind.config.ts    # Tailwind Config (Dark Theme)
└── package.json
```

---

## 🎨 Design System

### Farben (Dark/Occult Theme)

```typescript
'grim-black': '#0A0A0A',        // Main Background
'deep-charcoal': '#1C1C1E',     // Cards, Containers
'iron-gray': '#333333',         // Borders
'stone-gray': '#888888',        // Secondary Text
'silver-text': '#EAEAEA',       // Primary Text
'ghost-white': '#F9F9F9',       // Headings
'occult-crimson': '#8D021F',    // Primary CTA
'whisper-green': '#2E6B3A',     // Success
'shadow-gold': '#B8860B',       // Premium/Badges
'blood-red': '#9A031E',         // Errors
```

### Typografie

- **Headings**: IM Fell DW Pica (Serif) - Church-like aesthetic
- **Body**: Roboto (Sans-serif) - Readability

---

## 🔌 API Integration

Das Frontend kommuniziert mit dem FastAPI Backend auf `localhost:8000`.

### Verfügbare Endpoints:

```typescript
// Auth
authAPI.register({ handle, email, password, country, city })
authAPI.login({ email, password })

// User
userAPI.getMe()
userAPI.getUser(userId)
```

### Authentication

JWT Token wird in `localStorage` gespeichert:
```typescript
localStorage.setItem('access_token', token)
```

Axios Interceptor fügt Token automatisch zu Requests hinzu.

---

## 📄 Verfügbare Pages

### 1. Home (`/`)
- Landing Page mit CTA
- Features Overview
- Links zu Login/Register

### 2. Register (`/auth/register`)
- User Registration Form
- Validierung (handle, email, password)
- Auto-Login nach Registrierung

### 3. Login (`/auth/login`)
- Login Form
- JWT Token Storage
- Redirect zu Profile

### 4. Profile (`/profile`)
- User Profile Display
- Connected Accounts Status
- Logout Functionality
- Protected Route (requires auth)

---

## 🛠️ Development

### Commands

```bash
# Development Server
npm run dev

# Production Build
npm run build

# Start Production Server
npm start

# Linting
npm run lint
```

### Hot Reload

Next.js unterstützt Hot Module Replacement (HMR). Änderungen werden sofort im Browser sichtbar.

---

## 🚧 TODO / Nächste Schritte

- [ ] Spotify OAuth Integration
- [ ] Metal-ID Card Component
- [ ] Discover/Compatibility Map
- [ ] Event Discovery Page
- [ ] Album Review Feed
- [ ] Dark Theme Refinements
- [ ] Loading States & Skeletons
- [ ] Error Boundaries
- [ ] Responsive Mobile Design

---

## 🤘 Grimr Design Philosophy

**"Church-like feeling but more occult"**

- Dark, atmospheric UI
- Serif fonts for gravitas
- Crimson accents for passion
- Minimal, purposeful animations
- Authentic to Metal culture
- No corporate feel

---

## 📚 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **State**: React Hooks (useState, useEffect)
- **Routing**: Next.js App Router
- **Fonts**: Google Fonts (IM Fell DW Pica, Roboto)

---

## 🆘 Troubleshooting

### Port bereits belegt
```bash
# Ändere Port in package.json
"dev": "next dev -p 3001"
```

### API Connection Failed
- Prüfe ob Backend läuft: `curl http://localhost:8000/health`
- Prüfe `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:8000`

### Node.js nicht gefunden
```bash
# Installiere Node.js
# Download: https://nodejs.org/
```

---

**Happy Coding! 🤘**

