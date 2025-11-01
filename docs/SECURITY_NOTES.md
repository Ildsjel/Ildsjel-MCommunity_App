# Security Notes

## Passwort-Sicherheit

### ⚠️ Passwörter in DevTools sichtbar

**Problem:**  
Bei Login/Register sind Passwörter im Request-Body sichtbar (Browser DevTools → Network Tab).

**Warum ist das so?**  
- HTTP POST sendet Daten im Body (Standard für OAuth/Login)
- Browser DevTools zeigen alle Requests
- In **Development** (HTTP) ist der Traffic unverschlüsselt

**Ist das ein Problem?**  
- **In Development (localhost):** Akzeptabel, da lokaler Traffic
- **In Production:** MUSS HTTPS verwendet werden!

**Lösung für Production:**
```nginx
# HTTPS erzwingen
server {
    listen 80;
    server_name grimr.app;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name grimr.app;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Moderne SSL-Konfiguration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

**Best Practices:**
1. ✅ Passwörter werden serverseitig gehasht (bcrypt)
2. ✅ Passwörter werden NIE in Logs gespeichert
3. ✅ Passwörter werden NIE in der Datenbank im Klartext gespeichert
4. ⚠️ HTTPS in Production PFLICHT
5. ⚠️ Keine Passwörter in URLs (Query-Parameter)
6. ✅ Rate Limiting gegen Brute-Force

### 🔒 Was wir bereits tun:

- **bcrypt Hashing:** Passwörter werden mit bcrypt gehasht (12 Runden)
- **Salting:** Automatisch durch bcrypt
- **Rate Limiting:** 10 Login-Versuche/Minute
- **Passwort-Komplexität:** Min. 8 Zeichen, Groß-/Kleinbuchstaben, Zahlen, Sonderzeichen
- **Token-basierte Auth:** JWT mit Ablaufzeit (30 Min)

### 📝 Für Production-Deployment:

**Checkliste:**
- [ ] HTTPS konfiguriert (Let's Encrypt)
- [ ] HSTS Header aktiviert
- [ ] Secure Cookies (`Secure`, `HttpOnly`, `SameSite`)
- [ ] CSP (Content Security Policy) Header
- [ ] Rate Limiting in Production aktiviert
- [ ] Monitoring für fehlgeschlagene Logins
- [ ] 2FA implementieren (optional)

## Dev-Mode Helper

### `/api/v1/auth/dev/verify-user`

**Zweck:** Schnelles Verifizieren von Test-Usern im Development

**Nur verfügbar wenn:** `ENVIRONMENT=dev`

**Verwendung:**
```bash
curl -X POST "http://localhost:8000/api/v1/auth/dev/verify-user?email=test@example.com"
```

**⚠️ WICHTIG:** Dieser Endpoint MUSS in Production deaktiviert/entfernt werden!

## Token-Sicherheit

### JWT Tokens

**Speicherung:**
- **Development:** localStorage (einfach, aber XSS-anfällig)
- **Production:** HttpOnly Cookies (sicherer)

**Best Practices:**
```typescript
// Production: Cookies statt localStorage
// Backend setzt Cookie:
response.set_cookie(
    key="access_token",
    value=token,
    httponly=True,  // Nicht von JS lesbar
    secure=True,    // Nur über HTTPS
    samesite="strict",  // CSRF-Schutz
    max_age=1800    // 30 Minuten
)

// Frontend: Kein localStorage mehr nötig
// Cookie wird automatisch mitgesendet
```

## API-Sicherheit

### CORS

**Development:**
```python
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]
```

**Production:**
```python
ALLOWED_ORIGINS = [
    "https://grimr.app",
    "https://www.grimr.app"
]
```

### Rate Limiting

**Implementiert:**
- Register: 5/Stunde
- Login: 10/Minute
- Password Reset: 3/Stunde

**Production:** Redis-basiertes Rate Limiting für verteilte Systeme

## Datenbank-Sicherheit

### Neo4j

**Development:**
```
NEO4J_PASSWORD=password  # Schwach, nur für Dev
```

**Production:**
```
NEO4J_PASSWORD=<starkes-passwort-min-32-zeichen>
NEO4J_URI=bolt+s://production-host:7687  # TLS
```

**Best Practices:**
- Starke Passwörter (min. 32 Zeichen)
- TLS für Neo4j-Verbindung
- Firewall: Nur Backend darf auf Neo4j zugreifen
- Regelmäßige Backups
- Verschlüsselung at rest

## Secrets Management

### ⚠️ NIEMALS committen:

- `.env` Dateien
- API Keys
- Passwörter
- Private Keys
- OAuth Secrets

### Production Secrets:

**Empfohlen:**
- AWS Secrets Manager
- HashiCorp Vault
- Kubernetes Secrets
- Environment Variables (bei Cloud-Providern)

**Nicht empfohlen:**
- Hardcoded in Code
- In Git committed
- In Logs ausgegeben

## Monitoring & Alerts

### Was monitoren:

- Fehlgeschlagene Login-Versuche
- Rate Limit-Überschreitungen
- Ungewöhnliche API-Zugriffe
- DSGVO-Löschanfragen
- Token-Refresh-Fehler

### Alerts einrichten:

```python
# Beispiel: Alert bei >100 fehlgeschlagenen Logins/Stunde
if failed_logins_per_hour > 100:
    send_alert("Possible brute force attack detected")
```

## Incident Response

### Bei Sicherheitsvorfall:

1. **Sofort:**
   - Betroffene Tokens invalidieren
   - Betroffene User benachrichtigen
   - Logs sichern

2. **Innerhalb 24h:**
   - Ursache identifizieren
   - Patch deployen
   - Alle User zum Passwort-Reset auffordern

3. **Innerhalb 72h:**
   - DSGVO-Meldung (falls personenbezogene Daten betroffen)
   - Post-Mortem erstellen
   - Präventionsmaßnahmen implementieren

## Compliance

### DSGVO

- ✅ Recht auf Löschung (Art. 17)
- ✅ Recht auf Auskunft (Art. 15)
- ✅ Datenminimierung (Art. 5)
- ✅ Zweckbindung (Art. 5)
- ⚠️ Privacy Policy (TODO)
- ⚠️ Datenschutzbeauftragter (ab 20 Mitarbeiter)

### Spotify API

- ✅ Minimale Scopes
- ✅ Kein ML-Training
- ✅ Kein Ad-Tech Transfer
- ✅ Disconnect & Delete
- ⚠️ Extended Access (für Scale-Up)

---

**Letzte Aktualisierung:** November 2025  
**Version:** 1.0  
**Nächste Review:** Vor Production-Launch

