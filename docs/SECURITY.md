# Sicherheits-Features

## Übersicht

Die Grimr-App implementiert robuste Sicherheitsmaßnahmen für die Authentifizierung und den Schutz von Nutzerdaten.

## Implementierte Features

### 1. E-Mail-Verifikation ✅

**Funktionsweise:**
- Bei der Registrierung wird ein Verifikations-Token generiert (UUID)
- Token wird in der Datenbank gespeichert mit Ablaufdatum (24h)
- Verifikations-E-Mail wird an den Nutzer gesendet
- Account ist inaktiv (`is_active=false`, `email_verified=false`) bis zur Verifikation
- Nach Klick auf den Verifikations-Link wird der Account aktiviert

**Endpoints:**
- `POST /api/v1/auth/register` - Registrierung mit E-Mail-Versand
- `POST /api/v1/auth/verify-email` - E-Mail-Verifikation

**Frontend-Seiten:**
- `/auth/register` - Registrierung
- `/auth/verify-email?token=...` - Verifikations-Seite

### 2. Passwort-Validierung ✅

**Anforderungen:**
- Mindestens 8 Zeichen
- Mindestens 1 Großbuchstabe
- Mindestens 1 Kleinbuchstabe
- Mindestens 1 Zahl
- Mindestens 1 Sonderzeichen

**Implementierung:**
- Pydantic-Validator in `user_models.py`
- Validierung erfolgt vor der Registrierung
- Fehlerhafte Passwörter werden mit detaillierter Fehlermeldung abgelehnt

### 3. Rate Limiting ✅

**Implementiert mit slowapi:**

| Endpoint | Limit | Zweck |
|----------|-------|-------|
| `POST /auth/register` | 5/Stunde | Verhindert Spam-Registrierungen |
| `POST /auth/login` | 10/Minute | Schutz vor Brute-Force-Angriffen |
| `POST /auth/request-password-reset` | 3/Stunde | Verhindert E-Mail-Bombing |

**Funktionsweise:**
- Rate Limiting basiert auf IP-Adresse
- Bei Überschreitung: HTTP 429 (Too Many Requests)
- Automatische Zurücksetzung nach Zeitablauf

### 4. Account-Aktivierung ✅

**Workflow:**
1. Nutzer registriert sich → Account wird erstellt mit `is_active=false`
2. E-Mail-Verifikation erforderlich
3. Nach Verifikation: `is_active=true`, `email_verified=true`
4. Login nur möglich mit aktiviertem Account

**Login-Checks:**
- E-Mail muss verifiziert sein
- Account muss aktiv sein
- Passwort muss korrekt sein

### 5. Passwort-Reset ✅

**Funktionsweise:**
- Nutzer fordert Reset an → E-Mail mit Token wird gesendet
- Token ist 1 Stunde gültig
- Nutzer setzt neues Passwort mit Token
- Token wird nach Verwendung gelöscht

**Sicherheitsmaßnahmen:**
- Keine Preisgabe, ob E-Mail existiert (verhindert E-Mail-Enumeration)
- Token ist nur einmal verwendbar
- Kurze Gültigkeitsdauer (1h)

**Endpoints:**
- `POST /api/v1/auth/request-password-reset` - Reset anfordern
- `POST /api/v1/auth/reset-password` - Passwort zurücksetzen

**Frontend-Seiten:**
- `/auth/reset-password` - Reset-Anfrage
- `/auth/reset-password/confirm?token=...` - Neues Passwort setzen

## Passwort-Hashing

**Verwendete Technologie:**
- bcrypt mit automatischem Salting
- Kostenparameter: Standard (12 Runden)

**Implementierung:**
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Hash password
hashed = pwd_context.hash(plain_password)

# Verify password
is_valid = pwd_context.verify(plain_password, hashed_password)
```

## JWT-Tokens

**Konfiguration:**
- Algorithmus: HS256
- Ablaufzeit: 30 Minuten (konfigurierbar)
- Payload: `user_id`, `email`

**Verwendung:**
- Token wird bei Login generiert
- Token muss im Authorization-Header mitgesendet werden: `Bearer <token>`
- Token wird im Frontend im localStorage gespeichert

## E-Mail-Service

**Konfiguration (`.env`):**
```bash
SMTP_ENABLED=false  # true für Produktion
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_smtp_username
SMTP_PASSWORD=your_smtp_password
SMTP_FROM_EMAIL=noreply@grimr.app
SMTP_USE_TLS=true
FRONTEND_URL=http://localhost:3000

EMAIL_VERIFICATION_EXPIRE_HOURS=24
PASSWORD_RESET_EXPIRE_HOURS=1
```

**Entwicklungsmodus:**
- `SMTP_ENABLED=false`: E-Mails werden nur geloggt, nicht versendet
- Verifikations-Token wird in der Konsole ausgegeben

**Produktionsmodus:**
- `SMTP_ENABLED=true`: E-Mails werden tatsächlich versendet
- Empfohlen: Gmail, SendGrid, AWS SES, etc.

## Neo4j Datenbank-Schema

**User-Node mit Sicherheits-Properties:**
```cypher
CREATE (u:User {
    id: "uuid",
    handle: "username",
    email: "user@example.com",
    password_hash: "bcrypt_hash",
    
    // Sicherheits-Felder
    email_verified: false,
    is_active: false,
    verification_token: "uuid",
    verification_token_expires: "ISO-datetime",
    reset_token: "uuid",
    reset_token_expires: "ISO-datetime",
    
    // Weitere Felder...
    created_at: datetime(),
    last_login_at: datetime()
})
```

## Best Practices

### ✅ Implementiert

1. **Passwort-Hashing** mit bcrypt
2. **E-Mail-Verifikation** vor Account-Aktivierung
3. **Rate Limiting** für Auth-Endpoints
4. **JWT-Tokens** mit Ablaufzeit
5. **Passwort-Komplexitätsanforderungen**
6. **Sichere Passwort-Reset-Funktion**
7. **Keine E-Mail-Enumeration** (gleiche Antwort für existierende/nicht-existierende E-Mails)

### 🔜 Zukünftige Verbesserungen

1. **2FA (Two-Factor Authentication)**
2. **Session Management** (Token-Invalidierung)
3. **IP-basierte Anomalie-Erkennung**
4. **Account-Sperrung** nach mehreren fehlgeschlagenen Login-Versuchen
5. **HTTPS-Only** in Produktion
6. **CSRF-Protection** für State-Changing Operations
7. **Content Security Policy (CSP)**

## Testing

### Manueller Test-Workflow

1. **Registrierung:**
   ```bash
   curl -X POST http://localhost:8000/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "handle": "testuser",
       "email": "test@example.com",
       "password": "Test123!@#",
       "country": "Germany",
       "city": "Berlin"
     }'
   ```

2. **E-Mail-Verifikation:**
   - Token aus Logs kopieren
   - `POST /api/v1/auth/verify-email` mit Token

3. **Login:**
   ```bash
   curl -X POST http://localhost:8000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "Test123!@#"
     }'
   ```

4. **Passwort-Reset:**
   - `POST /api/v1/auth/request-password-reset`
   - Token aus Logs kopieren
   - `POST /api/v1/auth/reset-password` mit Token und neuem Passwort

## Fehlerbehandlung

**HTTP-Statuscodes:**
- `200 OK` - Erfolgreiche Operation
- `201 Created` - Registrierung erfolgreich
- `400 Bad Request` - Validierungsfehler, ungültiger Token
- `401 Unauthorized` - Falsche Credentials
- `403 Forbidden` - E-Mail nicht verifiziert, Account inaktiv
- `429 Too Many Requests` - Rate Limit überschritten
- `500 Internal Server Error` - Server-Fehler

## Monitoring & Logging

**Empfohlene Logs:**
- Fehlgeschlagene Login-Versuche
- Rate Limit-Überschreitungen
- Passwort-Reset-Anfragen
- Account-Aktivierungen

**Datenschutz:**
- Niemals Passwörter loggen
- Tokens nur in Entwicklung loggen
- Sensible Daten anonymisieren

## Compliance

**DSGVO-Konformität:**
- Nutzer kann Account löschen (TODO)
- Datenexport möglich (TODO)
- Einwilligung für Analytics (`consent_analytics`)
- Transparente Datenverarbeitung

---

**Letzte Aktualisierung:** November 2025  
**Version:** 0.1.0

