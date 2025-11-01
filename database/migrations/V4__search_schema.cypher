// ============================================
// V4: Profile Search Schema
// ============================================
// Adds full-text indexes, privacy settings,
// and optimizations for profile search
// ============================================

// ============================================
// 1. ADD PRIVACY/DISCOVERABILITY FIELDS TO USER
// ============================================

// Add privacy fields to existing users (defaults)
MATCH (u:User)
WHERE u.discoverable_by_name IS NULL
SET u.discoverable_by_name = true,
    u.discoverable_by_music = true,
    u.city_visible = 'city';

// ============================================
// 2. FULL-TEXT SEARCH INDEXES
// ============================================

// Create full-text index for user names and handles
CREATE FULLTEXT INDEX user_name_search IF NOT EXISTS
FOR (u:User)
ON EACH [u.handle, u.email];

// Create full-text index for artist names
CREATE FULLTEXT INDEX artist_name_search IF NOT EXISTS
FOR (a:Artist)
ON EACH [a.name];

// Create full-text index for genre names
CREATE FULLTEXT INDEX genre_name_search IF NOT EXISTS
FOR (g:Genre)
ON EACH [g.name];

// ============================================
// 3. INDEXES FOR SEARCH PERFORMANCE
// ============================================

// Index for privacy filtering
CREATE INDEX user_discoverable_name IF NOT EXISTS
FOR (u:User) ON (u.discoverable_by_name);

CREATE INDEX user_discoverable_music IF NOT EXISTS
FOR (u:User) ON (u.discoverable_by_music);

// Index for location-based search
CREATE INDEX user_city IF NOT EXISTS
FOR (u:User) ON (u.city);

CREATE INDEX user_country IF NOT EXISTS
FOR (u:User) ON (u.country);

// Index for activity tracking
CREATE INDEX user_last_active IF NOT EXISTS
FOR (u:User) ON (u.last_active_at);

// ============================================
// 4. GENRE NODES (for music-based search)
// ============================================

// Create Genre constraint
CREATE CONSTRAINT genre_name_unique IF NOT EXISTS
FOR (g:Genre) REQUIRE g.name IS UNIQUE;

// Sample metal genres (will be populated from artist data)
MERGE (g1:Genre {name: "black metal"})
MERGE (g2:Genre {name: "death metal"})
MERGE (g3:Genre {name: "thrash metal"})
MERGE (g4:Genre {name: "doom metal"})
MERGE (g5:Genre {name: "heavy metal"})
MERGE (g6:Genre {name: "progressive metal"})
MERGE (g7:Genre {name: "atmospheric black metal"})
MERGE (g8:Genre {name: "melodic death metal"})
MERGE (g9:Genre {name: "power metal"})
MERGE (g10:Genre {name: "metalcore"});

// ============================================
// 5. AGGREGATED RELATIONSHIPS FOR FAST SEARCH
// ============================================

// Create aggregated LISTENS_TO relationships
// (User)-[:LISTENS_TO {play_count}]->(Artist)
// This is computed from Play data for faster search

MATCH (u:User)-[:PLAYED]->(p:Play)-[:OF_TRACK]->(t:Track)<-[:PERFORMED]-(a:Artist)
WITH u, a, COUNT(p) as play_count
WHERE play_count >= 3  // Only create relationship if user has played artist at least 3 times
MERGE (u)-[r:LISTENS_TO]->(a)
SET r.play_count = play_count,
    r.last_updated = datetime();

// Link artists to genres (from Spotify genre data)
MATCH (a:Artist)
WHERE a.genres IS NOT NULL AND size(a.genres) > 0
UNWIND a.genres as genre_name
MERGE (g:Genre {name: toLower(genre_name)})
MERGE (a)-[:TAGGED_AS]->(g);

// ============================================
// 6. ACTIVITY TRACKING
// ============================================

// Add last_active_at to users (will be updated by app)
MATCH (u:User)
WHERE u.last_active_at IS NULL
SET u.last_active_at = datetime();

// ============================================
// 7. COMPATIBILITY SCORE CACHE (optional)
// ============================================

// For production: Create a materialized compatibility matrix
// (User)-[:COMPATIBLE_WITH {score, artists_overlap, genres_overlap}]->(User)
// This would be computed periodically (e.g., nightly batch job)
// For MVP, we'll compute on-the-fly

// ============================================
// 8. DOCUMENTATION
// ============================================

// New User Properties:
// - discoverable_by_name: bool (default true) - Can be found by name/handle search
// - discoverable_by_music: bool (default true) - Can be found by artist/genre search
// - city_visible: string (default "city") - "city" = show exact city, "region" = show region only, "hidden" = don't show location
// - last_active_at: datetime - Last activity timestamp for ranking

// New Relationships:
// (User)-[:LISTENS_TO {play_count, last_updated}]->(Artist)
// (Artist)-[:TAGGED_AS]->(Genre)

// Full-Text Indexes:
// - user_name_search: Search users by handle/email
// - artist_name_search: Search artists by name
// - genre_name_search: Search genres by name

// Performance Indexes:
// - user_discoverable_name, user_discoverable_music: Privacy filtering
// - user_city, user_country: Location-based search
// - user_last_active: Activity ranking

