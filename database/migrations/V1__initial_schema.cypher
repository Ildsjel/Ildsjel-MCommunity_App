// Grimr - Initial Neo4j Schema
// Version: V1
// Description: Creates core nodes, relationships, constraints, and indexes

// ========================================
// CONSTRAINTS (Unique IDs)
// ========================================

CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT artist_id IF NOT EXISTS FOR (a:Artist) REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT album_id IF NOT EXISTS FOR (al:Album) REQUIRE al.id IS UNIQUE;
CREATE CONSTRAINT genre_id IF NOT EXISTS FOR (g:Genre) REQUIRE g.id IS UNIQUE;
CREATE CONSTRAINT event_id IF NOT EXISTS FOR (e:Event) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT venue_id IF NOT EXISTS FOR (v:Venue) REQUIRE v.id IS UNIQUE;
CREATE CONSTRAINT review_id IF NOT EXISTS FOR (r:Review) REQUIRE r.id IS UNIQUE;
CREATE CONSTRAINT group_id IF NOT EXISTS FOR (gr:Group) REQUIRE gr.id IS UNIQUE;
CREATE CONSTRAINT post_id IF NOT EXISTS FOR (p:Post) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT badge_id IF NOT EXISTS FOR (b:Badge) REQUIRE b.id IS UNIQUE;

// ========================================
// INDEXES (Performance Optimization)
// ========================================

// User Indexes
CREATE INDEX user_handle IF NOT EXISTS FOR (u:User) ON (u.handle);
CREATE INDEX user_email IF NOT EXISTS FOR (u:User) ON (u.email);
CREATE INDEX user_location IF NOT EXISTS FOR (u:User) ON (u.lat, u.lon);
CREATE INDEX user_created_at IF NOT EXISTS FOR (u:User) ON (u.created_at);

// Artist Indexes
CREATE INDEX artist_name IF NOT EXISTS FOR (a:Artist) ON (a.name);
CREATE INDEX artist_encyclopedia_metallum_id IF NOT EXISTS FOR (a:Artist) ON (a.encyclopedia_metallum_id);

// Album Indexes
CREATE INDEX album_title IF NOT EXISTS FOR (al:Album) ON (al.title);
CREATE INDEX album_discogs_id IF NOT EXISTS FOR (al:Album) ON (al.discogs_id);
CREATE INDEX album_spotify_id IF NOT EXISTS FOR (al:Album) ON (al.spotify_id);

// Genre Indexes
CREATE INDEX genre_name IF NOT EXISTS FOR (g:Genre) ON (g.name);

// Event Indexes
CREATE INDEX event_start_ts IF NOT EXISTS FOR (e:Event) ON (e.start_ts);
CREATE INDEX event_location IF NOT EXISTS FOR (e:Event) ON (e.lat, e.lon);
CREATE INDEX event_status IF NOT EXISTS FOR (e:Event) ON (e.status);

// Venue Indexes
CREATE INDEX venue_name IF NOT EXISTS FOR (v:Venue) ON (v.name);
CREATE INDEX venue_city IF NOT EXISTS FOR (v:Venue) ON (v.city);

// Review & Post Indexes (for moderation)
CREATE INDEX review_status IF NOT EXISTS FOR (r:Review) ON (r.status);
CREATE INDEX post_status IF NOT EXISTS FOR (p:Post) ON (p.status);

