// ============================================
// V2: Spotify Integration Schema
// ============================================
// Adds Track, Artist, Album, and Play nodes
// with relationships for scrobbling system
// ============================================

// ============================================
// 1. CONSTRAINTS & INDEXES
// ============================================

// Track constraints
CREATE CONSTRAINT track_id_unique IF NOT EXISTS
FOR (t:Track) REQUIRE t.id IS UNIQUE;

CREATE CONSTRAINT track_spotify_id_unique IF NOT EXISTS
FOR (t:Track) REQUIRE t.spotify_id IS UNIQUE;

// Artist constraints
CREATE CONSTRAINT artist_id_unique IF NOT EXISTS
FOR (a:Artist) REQUIRE a.id IS UNIQUE;

CREATE CONSTRAINT artist_spotify_id_unique IF NOT EXISTS
FOR (a:Artist) REQUIRE a.spotify_id IS UNIQUE;

// Album constraints
CREATE CONSTRAINT album_id_unique IF NOT EXISTS
FOR (a:Album) REQUIRE a.id IS UNIQUE;

CREATE CONSTRAINT album_spotify_id_unique IF NOT EXISTS
FOR (a:Album) REQUIRE a.spotify_id IS UNIQUE;

// Play constraints
CREATE CONSTRAINT play_id_unique IF NOT EXISTS
FOR (p:Play) REQUIRE p.id IS UNIQUE;

CREATE CONSTRAINT play_dedup_key_unique IF NOT EXISTS
FOR (p:Play) REQUIRE p.dedup_key IS UNIQUE;

// Indexes for performance
CREATE INDEX track_name_index IF NOT EXISTS
FOR (t:Track) ON (t.name);

CREATE INDEX artist_name_index IF NOT EXISTS
FOR (a:Artist) ON (a.name);

CREATE INDEX album_name_index IF NOT EXISTS
FOR (a:Album) ON (a.name);

CREATE INDEX play_played_at_index IF NOT EXISTS
FOR (p:Play) ON (p.played_at);

CREATE INDEX play_source_index IF NOT EXISTS
FOR (p:Play) ON (p.source);

// ============================================
// 2. SAMPLE DATA (for testing)
// ============================================

// Create sample track
MERGE (t:Track {
    id: "sample-track-id",
    spotify_id: "sample-spotify-track-id",
    name: "Master of Puppets",
    duration_ms: 515000,
    isrc: "USQX91600037",
    popularity: 85,
    created_at: datetime()
});

// Create sample artist
MERGE (a:Artist {
    id: "sample-artist-id",
    spotify_id: "sample-spotify-artist-id",
    name: "Metallica",
    genres: ["metal", "thrash metal", "heavy metal"],
    popularity: 90,
    created_at: datetime()
});

// Create sample album
MERGE (al:Album {
    id: "sample-album-id",
    spotify_id: "sample-spotify-album-id",
    name: "Master of Puppets",
    release_date: "1986-03-03",
    album_type: "album",
    total_tracks: 8,
    created_at: datetime()
});

// Create relationships
MATCH (t:Track {id: "sample-track-id"})
MATCH (a:Artist {id: "sample-artist-id"})
MATCH (al:Album {id: "sample-album-id"})
MERGE (a)-[:PERFORMED]->(t)
MERGE (t)-[:ON_ALBUM]->(al);

// ============================================
// 3. SCHEMA DOCUMENTATION
// ============================================

// Track Node Properties:
// - id: Internal UUID
// - spotify_id: Spotify Track ID
// - name: Track name
// - duration_ms: Track duration in milliseconds
// - isrc: International Standard Recording Code
// - popularity: Spotify popularity (0-100)
// - created_at: When track was first imported
// - updated_at: Last update timestamp

// Artist Node Properties:
// - id: Internal UUID
// - spotify_id: Spotify Artist ID
// - name: Artist name
// - genres: List of genre strings
// - popularity: Spotify popularity (0-100)
// - created_at: When artist was first imported
// - updated_at: Last update timestamp

// Album Node Properties:
// - id: Internal UUID
// - spotify_id: Spotify Album ID
// - name: Album name
// - release_date: Release date (YYYY-MM-DD)
// - album_type: album, single, compilation
// - total_tracks: Number of tracks
// - created_at: When album was first imported
// - updated_at: Last update timestamp

// Play Node Properties:
// - id: Internal UUID
// - dedup_key: SHA256 hash for deduplication
// - played_at: When track was played (datetime)
// - duration_played_ms: How long it was played
// - source: "spotify", "lastfm", etc.
// - confidence: 0.0-1.0 confidence score
// - context_type: album, playlist, artist, etc.
// - context_uri: Spotify context URI
// - ingested_at: When play was imported

// Relationships:
// (User)-[:PLAYED]->(Play)
// (Play)-[:OF_TRACK]->(Track)
// (Artist)-[:PERFORMED]->(Track)
// (Track)-[:ON_ALBUM]->(Album)
// (User)-[:LISTENS_TO]->(Artist)  // Aggregated relationship
// (User)-[:LIKES]->(Album)  // For favorites

