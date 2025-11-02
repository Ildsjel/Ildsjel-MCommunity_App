# 401 Unauthorized beim PATCH /users/me

## Problem
PATCH-Requests zu `/api/v1/users/me` schlagen mit 401 Unauthorized fehl, obwohl GET-Requests funktionieren.

## Mögliche Ursachen

1. **Token nach Backend-Neustart ungültig**
   - Das Backend wurde mehrmals neu gestartet
   - JWT-Tokens könnten ungültig geworden sein
   
2. **SECRET_KEY geändert**
   - Wenn der SECRET_KEY sich ändert, werden alle Tokens ungültig

## Lösung

### Sofort-Fix: Neu einloggen
1. Logout durchführen
2. Neu einloggen
3. Neuen Token erhalten
4. PATCH sollte funktionieren

### Permanente Lösung: Token-Refresh implementieren
Siehe `backend/app/auth/jwt_handler.py` für Token-Handling.

## Test
```bash
# Prüfe ob Token gültig ist
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/v1/users/me

# Teste PATCH
curl -X PATCH \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"about_me": "Test"}' \
  http://localhost:8000/api/v1/users/me
```

