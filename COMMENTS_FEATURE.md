# 💬 Kommentar-Feature für Galerie-Bilder

## Übersicht

Nutzer können jetzt Kommentare unter Galerie-Bildern schreiben mit:
- **Rich Text Formatting** (fett, kursiv, unterstrichen, Listen, Links, Code, etc.)
- **Emoticons** 🤘 (Emoji-Picker integriert)
- **Bis zu 5000 Zeichen** (~500 Wörter)

## Features

### ✅ Implementiert

1. **Rich Text Editor**
   - Toolbar mit Formatierungsoptionen (Bold, Italic, Underline, Strike, Blockquote, Code)
   - Listen (geordnet & ungeordnet)
   - Links
   - Emoji-Picker Button
   - Zeichenzähler

2. **Kommentar-Funktionen**
   - Kommentare erstellen
   - Kommentare bearbeiten (nur Autor)
   - Kommentare löschen (Autor oder Bild-Besitzer)
   - Zeitstempel mit "vor X Minuten/Stunden/Tagen"
   - "Bearbeitet"-Badge bei editierten Kommentaren

3. **Berechtigungen**
   - Nur eingeloggte User können kommentieren
   - Autor kann eigene Kommentare bearbeiten & löschen
   - Bild-Besitzer kann alle Kommentare unter seinen Bildern löschen

4. **Integration**
   - Kommentare erscheinen im Fullscreen-Viewer der Galerie
   - Automatisches Nachladen beim Öffnen eines Bildes
   - Responsive Design

## Backend

### API Endpoints

```
POST   /api/v1/comments              - Kommentar erstellen
GET    /api/v1/comments/image/{id}   - Kommentare für Bild abrufen
PUT    /api/v1/comments/{id}         - Kommentar bearbeiten
DELETE /api/v1/comments/{id}         - Kommentar löschen
GET    /api/v1/comments/image/{id}/count - Anzahl Kommentare
```

### Neo4j Schema

```cypher
(:User)-[:WROTE]->(:Comment)-[:COMMENTED_ON]->(:GalleryImage)

Comment {
  id: string (UUID)
  content: string (HTML)
  created_at: datetime
  updated_at: datetime (optional)
  is_edited: boolean
}
```

### Constraints & Indexes

- `comment_id_unique`: Eindeutige Comment-IDs
- `comment_created_at`: Index für Sortierung nach Erstellungsdatum

## Frontend

### Komponenten

1. **`RichTextEditor.tsx`**
   - React Quill Editor mit Custom Toolbar
   - Emoji Picker Integration
   - Zeichenzähler

2. **`ImageComments.tsx`**
   - Kommentar-Liste mit Pagination
   - Kommentar-Formular
   - Edit/Delete Funktionalität
   - Context Menu für Aktionen

3. **`GalleryCarousel.tsx`** (erweitert)
   - Integration der Kommentare im Fullscreen-Viewer
   - Props: `imageOwnerId`, `showComments`

### Dependencies

```json
{
  "react-quill": "^2.0.0",
  "emoji-picker-react": "^4.x",
  "date-fns": "^3.x"
}
```

## Verwendung

### Als Bild-Besitzer

1. Öffne dein Profil
2. Klicke auf ein Bild in der Galerie
3. Scrolle nach unten zu den Kommentaren
4. Schreibe einen Kommentar oder antworte auf bestehende
5. Du kannst alle Kommentare unter deinen Bildern löschen

### Als Besucher

1. Öffne ein Profil
2. Klicke auf ein Bild in der Galerie
3. Lies Kommentare oder schreibe eigene
4. Nutze den Rich Text Editor für Formatierung
5. Füge Emojis über den 😊-Button hinzu

## Technische Details

### Validierung

- **Max. Länge**: 5000 Zeichen (inkl. HTML-Tags)
- **Min. Länge**: 1 Zeichen (ohne HTML)
- **Erlaubte HTML-Tags**: Nur Quill-generierte Tags (sicher)

### Performance

- Kommentare werden lazy geladen (nur beim Öffnen des Bildes)
- Pagination: 50 Kommentare pro Request
- Indexes für schnelle Queries

### Sicherheit

- XSS-Schutz durch Quill (nur erlaubte HTML-Tags)
- Authentifizierung erforderlich für alle Schreiboperationen
- Autorisierung: Nur Autor/Bild-Besitzer kann löschen

## Migration

Die Migration `V5__comments_schema.cypher` wurde bereits ausgeführt:
- ✅ Constraints erstellt
- ✅ Indexes erstellt
- ✅ Schema dokumentiert

## Testing

### Manuell testen

1. Starte die App: `docker-compose up -d`
2. Öffne http://localhost:3000
3. Gehe zu deinem Profil
4. Lade ein Bild hoch (falls noch nicht vorhanden)
5. Klicke auf das Bild
6. Teste Kommentar-Funktionen:
   - Erstellen (mit Formatierung & Emojis)
   - Bearbeiten
   - Löschen

### Testfälle

- [ ] Kommentar mit Text erstellen
- [ ] Kommentar mit Formatierung (fett, kursiv, etc.)
- [ ] Kommentar mit Emoji erstellen
- [ ] Kommentar mit Link erstellen
- [ ] Kommentar bearbeiten
- [ ] Kommentar löschen (als Autor)
- [ ] Kommentar löschen (als Bild-Besitzer)
- [ ] Kommentare anderer User sehen
- [ ] Lange Kommentare (>500 Wörter) werden abgelehnt

## Nächste Schritte (Optional)

- [ ] Antworten auf Kommentare (Threading)
- [ ] Likes für Kommentare
- [ ] Benachrichtigungen bei neuen Kommentaren
- [ ] Kommentar-Suche
- [ ] Kommentar-Moderation (Admin)
- [ ] Spam-Filter

## Support

Bei Problemen:
1. Prüfe Backend-Logs: `docker logs grimr_backend`
2. Prüfe Frontend-Logs: Browser Console
3. Prüfe Neo4j: `docker exec -it grimr_neo4j cypher-shell`

