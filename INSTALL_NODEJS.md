# Node.js Installation für Grimr Frontend

## 🚀 Installation auf macOS

### Option 1: Offizieller Installer (Empfohlen)

1. **Download Node.js**:
   - Gehe zu https://nodejs.org/
   - Lade die **LTS Version** (Long Term Support) herunter
   - Aktuell: Node.js 20.x LTS

2. **Installer ausführen**:
   - Öffne die heruntergeladene `.pkg` Datei
   - Folge den Installationsanweisungen
   - Standard-Einstellungen sind OK

3. **Installation prüfen**:
   ```bash
   node --version   # Sollte v20.x.x zeigen
   npm --version    # Sollte v10.x.x zeigen
   ```

---

### Option 2: Homebrew

Falls du Homebrew installieren möchtest:

1. **Homebrew installieren**:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Node.js installieren**:
   ```bash
   brew install node
   ```

3. **Installation prüfen**:
   ```bash
   node --version
   npm --version
   ```

---

## 📦 Frontend starten (nach Node.js Installation)

```bash
# 1. In Frontend-Verzeichnis wechseln
cd /Users/johanneshonscheid/Metal_Community_App/frontend

# 2. Dependencies installieren
npm install

# 3. Environment Variables kopieren
cp .env.local.example .env.local

# 4. Development Server starten
npm run dev
```

**Frontend läuft dann auf:** http://localhost:3000

---

## ✅ Was du dann testen kannst

1. **Home Page**: http://localhost:3000
2. **Register**: http://localhost:3000/auth/register
3. **Login**: http://localhost:3000/auth/login
4. **Profile**: http://localhost:3000/profile (nach Login)

---

## 🆘 Troubleshooting

### "command not found: node" nach Installation

Schließe das Terminal und öffne es neu. Dann:
```bash
node --version
```

### Port 3000 bereits belegt

Ändere den Port:
```bash
npm run dev -- -p 3001
```

### npm install schlägt fehl

Lösche `node_modules` und versuche es erneut:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Nächste Schritte nach Installation

1. Frontend starten (`npm run dev`)
2. Backend läuft bereits (Docker)
3. Registriere einen Test-User
4. Teste Login & Profile Page
5. Entwickle weiter: Metal-ID, Discover, etc.

**Happy Coding! 🤘**

