# Spotify API Compliance & DSGVO

## Übersicht

Dieses Dokument beschreibt die Compliance-Maßnahmen für die Spotify-Integration in Grimr, um die Spotify Developer Terms, DSGVO und Best Practices einzuhalten.

## 1. Rechtsgrundlage & Transparenz

### OAuth Consent
- **Minimale Scopes:** Nur die absolut notwendigen Scopes werden angefordert
  - `user-read-recently-played` - Für Backfill
  - `user-read-currently-playing` - Für Now Playing
  - `user-read-playback-state` - Für Playback Status
  - `user-top-read` - Für Top Artists (optional)
  - `user-library-read` - Für Saved Tracks (optional)

- **Kein Zugriff auf:**
  - Playlists bearbeiten
  - Playback steuern
  - Private Daten ohne Consent

### Transparenz
- Klare Erklärung beim OAuth-Flow: "Was wird getrackt?"
- Privacy Policy mit Spotify-Klauseln
- EULA mit Spotify als Drittbegünstigtem

## 2. Datenschutz & Löschung

### Datenminimierung
- **Nur speichern was nötig ist:**
  - Track-Metadaten (Name, Artist, Album, Duration)
  - Play-Events (Timestamp, Duration Played)
  - Aggregierte Statistiken (Top Artists, Play Count)

- **NICHT speichern:**
  - Audio-Dateien
  - Vollständige Playlists (nur Referenzen)
  - Private Session-Daten
  - Unnötige Personendaten

### Provenienz & Tracking
Jeder Datensatz hat:
```cypher
{
  source: "spotify",           // Quelle
  ingested_at: datetime(),     // Wann importiert
  played_at: datetime(),       // Wann abgespielt
  user_id: "uuid"             // Wem gehört es
}
```

### Disconnect & Delete (DSGVO Art. 17)

**Automatisierte Löschung bei Disconnect:**

1. **Sofort löschen:**
   - OAuth Tokens (Access + Refresh)
   - Spotify User ID
   - Verbindungsstatus

2. **Innerhalb 24h löschen:**
   - Alle Play-Events mit `source="spotify"`
   - Alle Track/Artist/Album-Daten, die nur von diesem User stammen
   - Aggregierte Statistiken

3. **Behalten (anonymisiert):**
   - Aggregierte App-Metriken (ohne Personenbezug)
   - Anonymisierte Genre-Statistiken für Matching

**Implementierung:**
```python
async def disconnect_and_delete_spotify_data(user_id: str):
    """
    DSGVO-konform: Löscht alle Spotify-Daten eines Users
    """
    # 1. Tokens löschen
    delete_spotify_tokens(user_id)
    
    # 2. Play-Events löschen
    delete_plays_by_source(user_id, source="spotify")
    
    # 3. Orphaned Tracks/Artists löschen
    delete_orphaned_spotify_entities()
    
    # 4. Audit-Log
    log_data_deletion(user_id, "spotify", timestamp=now())
```

## 3. Verbotene Nutzung

### ❌ NICHT erlaubt:

1. **Kein ML/AI-Training:**
   - Spotify-Daten dürfen NICHT für ML-Modelle verwendet werden
   - Keine Feature-Extraktion aus Spotify-Content
   - Kein Training auf Spotify-Metadaten

2. **Kein Ad-Tech Transfer:**
   - Spotify-Daten dürfen NICHT an Werbenetzwerke weitergegeben werden
   - Keine Weitergabe an Ad-Exchanges
   - Keine Monetarisierung durch Spotify-Daten

3. **Kein Ripping/Download:**
   - Keine Funktionen zum Speichern von Audio
   - Keine Funktionen zum Download von Tracks
   - Kein permanentes Caching von Audio-Inhalten

4. **Keine Daten auf Vorrat:**
   - Keine permanenten Datenbanken aus Spotify-Content
   - Regelmäßige Aktualisierung (nicht älter als 30 Tage)
   - Löschung veralteter Daten

### ✅ Erlaubt:

1. **Temporäres Caching:**
   - Metadaten (Track-Namen, Artist-Namen) für 30 Tage
   - Cover-Bilder für 7 Tage (mit CDN-Header)
   - Aggregierte Statistiken

2. **Eigene Daten:**
   - User-Interaktionen (Likes, Comments, Gruppenbeitritte)
   - App-spezifische Metriken
   - Nicht-Spotify-Quellen (Bandsintown, Discogs, etc.)

## 4. Architektur & Datenmodell

### Event-Log (Append-Only)
```cypher
(:Play {
  id: uuid,
  user_id: uuid,
  track_id: uuid,
  played_at: datetime,
  duration_played_ms: int,
  source: "spotify",           // Provenienz
  confidence: float,
  ingested_at: datetime,       // Audit-Trail
  dedup_key: sha256            // Idempotenz
})
```

### Abgeleitete Metriken (Aggregiert)
```cypher
(:UserStats {
  user_id: uuid,
  total_plays: int,
  top_genres: [string],
  last_updated: datetime,
  data_sources: ["spotify", "lastfm"]  // Transparenz
})
```

### Löschpfade
```cypher
// Disconnect & Delete
MATCH (u:User {id: $user_id})-[:PLAYED]->(p:Play {source: "spotify"})
DETACH DELETE p

MATCH (u:User {id: $user_id})
SET u.spotify_access_token = null,
    u.spotify_refresh_token = null,
    u.spotify_user_id = null,
    u.spotify_connected_at = null

// Orphaned Entities löschen
MATCH (t:Track)
WHERE NOT (t)<-[:OF_TRACK]-(:Play)
DETACH DELETE t
```

## 5. Caching-Regeln

### Metadaten
- **Speicherdauer:** Max. 30 Tage
- **Aktualisierung:** Bei jedem Play-Event
- **Löschung:** Automatisch nach 30 Tagen ohne Update

### Cover-Bilder
- **Speicherdauer:** Max. 7 Tage
- **CDN:** Mit `Cache-Control: max-age=604800` (7 Tage)
- **Löschung:** Automatisch durch CDN

### Aggregierte Daten
- **Speicherdauer:** Solange User aktiv
- **Aktualisierung:** Bei jedem neuen Play
- **Löschung:** Bei Disconnect

## 6. Compliance-Checkliste

### OAuth & Consent
- [ ] Minimale Scopes implementiert
- [ ] Consent-Screen mit klarer Erklärung
- [ ] Token sicher gespeichert (verschlüsselt in Produktion)
- [ ] Consent-Log für Audit

### Privacy & DSGVO
- [ ] Privacy Policy mit Spotify-Klauseln
- [ ] EULA mit Spotify als Drittbegünstigtem
- [ ] Disconnect-Button prominent platziert
- [ ] Automatische Löschung innerhalb 24h
- [ ] Audit-Log für Löschungen

### Verbotene Nutzung
- [ ] Kein ML-Training auf Spotify-Daten
- [ ] Kein Export an Ad-Netzwerke
- [ ] Keine Rip/Download-Funktionen
- [ ] Keine permanenten Datenbanken

### Caching & Datenfrische
- [ ] Metadaten max. 30 Tage
- [ ] Cover-Bilder max. 7 Tage
- [ ] Automatische Cleanup-Jobs
- [ ] Regelmäßige Aktualisierung

### Monitoring & Enforcement
- [ ] Rate Limit Monitoring
- [ ] Error Handling für 429 (Too Many Requests)
- [ ] Fallback-Flows bei API-Ausfall
- [ ] Logging für Compliance-Audit

### 2025 Zugangsregeln
- [ ] Extended Access nur für Organisationen
- [ ] Quota Management implementiert
- [ ] Scale-Plan für Wachstum
- [ ] Alternative Datenquellen (Fallback)

## 7. UI-Texte für Consent

### OAuth Consent Screen
```
🎵 Spotify verbinden

Grimr möchte auf deine Spotify-Daten zugreifen:
• Aktuell abgespielte Songs
• Kürzlich gehörte Tracks
• Top Artists & Genres

Deine Daten werden nur für folgende Zwecke verwendet:
✓ Generierung deiner Metal-ID
✓ Matching mit anderen Metalheads
✓ Hörstatistiken & Empfehlungen

Deine Daten werden NICHT:
✗ An Dritte verkauft oder weitergegeben
✗ Für Werbung verwendet
✗ Für KI-Training genutzt

Du kannst die Verbindung jederzeit trennen.
Alle Daten werden dann innerhalb von 24h gelöscht.
```

### Disconnect Confirmation
```
⚠️ Spotify-Verbindung trennen?

Folgende Daten werden gelöscht:
• Alle Spotify-Scrobbles
• Top Artists & Genres
• Hörstatistiken

Deine Metal-ID wird neu berechnet basierend auf:
• Anderen verbundenen Quellen (Last.fm, etc.)
• Manuellen Eingaben

Diese Aktion kann nicht rückgängig gemacht werden.
```

## 8. Implementierungs-Checkliste

### Backend
- [x] Minimale Scopes in OAuth
- [x] Token Management mit Refresh
- [x] Provenienz-Felder in allen Entities
- [ ] Disconnect & Delete Endpoint
- [ ] Cleanup-Jobs (30 Tage Metadaten)
- [ ] Audit-Logging

### Frontend
- [x] Consent-Screen mit Erklärung
- [x] Disconnect-Button
- [ ] Lösch-Bestätigung mit Details
- [ ] Privacy Policy Link
- [ ] EULA Acceptance

### Datenbank
- [x] Dedup-Keys für Idempotenz
- [x] Source-Felder für Provenienz
- [ ] Cleanup-Queries
- [ ] Orphaned Entity Detection

### Monitoring
- [ ] Rate Limit Tracking
- [ ] API Error Monitoring
- [ ] Compliance Audit-Log
- [ ] Data Retention Monitoring

## 9. Nächste Schritte

1. **Sofort:**
   - Disconnect & Delete Endpoint implementieren
   - Privacy Policy & EULA erstellen
   - Consent-Texte verbessern

2. **Vor Launch:**
   - Cleanup-Jobs für alte Daten
   - Audit-Logging
   - Compliance-Tests

3. **Nach Launch:**
   - Monitoring Dashboard
   - Regelmäßige Compliance-Audits
   - User-Feedback zu Datenschutz

## 10. Kontakt & Support

Bei Fragen zur Compliance:
- **DSGVO:** Datenschutzbeauftragter (noch zu benennen)
- **Spotify API:** developer.spotify.com/support
- **Legal:** legal@grimr.app (noch einzurichten)

---

**Letzte Aktualisierung:** November 2025  
**Version:** 1.0  
**Status:** In Entwicklung

