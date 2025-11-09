# Album Cover Implementation

## Übersicht

Spotify Album-Cover werden jetzt automatisch in der "Recently Played" Timeline angezeigt.

## Implementierung

### 1. Backend: Album Repository (`spotify_repository.py`)

**Änderung:** `create_or_update_album()` Methode erweitert um `image_url` Parameter.

```python
def create_or_update_album(
    self,
    spotify_id: str,
    name: str,
    release_date: Optional[str] = None,
    album_type: Optional[str] = None,
    total_tracks: Optional[int] = None,
    image_url: Optional[str] = None  # ← NEU
) -> str:
```

**Neo4j Cypher:**
- `ON CREATE SET a.image_url = $image_url`
- `ON MATCH SET a.image_url = $image_url`

### 2. Backend: Scrobble Service (`spotify_scrobble_service.py`)

**Änderung:** Album-Cover URL aus Spotify-Response extrahieren.

```python
# Extract album cover URL from Spotify images
# Spotify provides images in descending size order: [large, medium, small]
# We prefer medium size (640x640) for better balance of quality and performance
images = album.get("images", [])
image_url = None
if len(images) > 1:
    image_url = images[1]["url"]  # Medium size (640x640)
elif len(images) > 0:
    image_url = images[0]["url"]  # Fallback to largest if only one available

self.repository.create_or_update_album(
    spotify_id=album["id"],
    name=album["name"],
    release_date=album.get("release_date"),
    album_type=album.get("album_type"),
    total_tracks=album.get("total_tracks"),
    image_url=image_url  # ← NEU
)
```

### 3. Backend: Timeline API (`spotify.py`)

**Bereits vorhanden:** Die Timeline-Query gibt bereits `al.image_url as album_image` zurück.

```cypher
OPTIONAL MATCH (t)-[:ON_ALBUM]->(al:Album)
RETURN al.image_url as album_image
```

### 4. Frontend: Profile Page (`profile/page.tsx`)

**Bereits vorhanden:** Das Frontend rendert bereits Album-Cover, wenn verfügbar.

```tsx
<ListItemAvatar>
  {item.album?.image_url ? (
    <Avatar
      variant="rounded"
      src={item.album.image_url}
      alt={item.album.name}
      sx={{ width: 56, height: 56 }}
    />
  ) : (
    <Avatar variant="rounded" sx={{ width: 56, height: 56 }}>
      <MusicNote />
    </Avatar>
  )}
</ListItemAvatar>
```

## Bildgrößen

Spotify liefert Album-Cover in 3 Größen:
- **Large:** 640x640px (images[0])
- **Medium:** 300x300px (images[1]) ← **Wir verwenden diese**
- **Small:** 64x64px (images[2])

**Warum Medium?**
- Gute Balance zwischen Qualität und Performance
- Passt perfekt für die Timeline-Anzeige (56x56px Avatar)
- Reduziert Bandbreite im Vergleich zu Large

## Datenfluss

1. **Spotify Polling Service** ruft alle 5 Minuten `recently_played` ab
2. **Scrobble Service** verarbeitet Tracks und extrahiert Album-Cover URLs
3. **Repository** speichert Album-Cover URL in Neo4j (`Album.image_url`)
4. **Timeline API** liefert Album-Cover URL an Frontend
5. **Frontend** zeigt Album-Cover in der Timeline an

## Vorteile

✅ **Keine zusätzlichen API-Calls:** Cover-URLs werden beim normalen Scrobbling extrahiert  
✅ **Gecacht in DB:** Schneller Zugriff, keine wiederholten Spotify-Anfragen  
✅ **Automatisch aktualisiert:** Bei jedem neuen Track wird das Cover gespeichert  
✅ **Funktioniert für alle User:** Auch andere User sehen die Cover in öffentlichen Profilen  
✅ **Fallback vorhanden:** Wenn kein Cover verfügbar → MusicNote Icon

## Testing

1. Verbinde Spotify-Account
2. Höre Musik auf Spotify
3. Warte 5 Minuten (oder triggere manuellen Sync)
4. Öffne Profil → "Recently Played" sollte Album-Cover anzeigen

## Nächste Schritte (Optional)

- [ ] Album-Cover auch in "Top Artists" anzeigen (Artist-Bilder)
- [ ] Album-Cover in Search Results
- [ ] Lazy Loading für Album-Cover (Performance-Optimierung)
- [ ] Placeholder während Cover lädt

## Technische Details

**Datenbank:** Neo4j  
**Property:** `Album.image_url` (String, Optional)  
**Format:** Spotify CDN URL (HTTPS)  
**Beispiel:** `https://i.scdn.co/image/ab67616d00001e02...`

**Spotify API Dokumentation:**  
https://developer.spotify.com/documentation/web-api/reference/get-recently-played

