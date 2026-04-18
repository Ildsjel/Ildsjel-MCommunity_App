// V6 — Admin roles, invitation tokens, band catalogue, genre ontology, tags
// Run manually against Neo4j: neo4j-shell or cypher-shell

// ── User role field default ─────────────────────────────────────────────────
// Backfill existing users to role 'user'
MATCH (u:User)
WHERE u.role IS NULL
SET u.role = 'user';

// ── Constraints ─────────────────────────────────────────────────────────────
CREATE CONSTRAINT admin_token_id   IF NOT EXISTS FOR (t:AdminToken)  REQUIRE t.id       IS UNIQUE;
CREATE CONSTRAINT admin_token_val  IF NOT EXISTS FOR (t:AdminToken)  REQUIRE t.token    IS UNIQUE;
CREATE CONSTRAINT band_id          IF NOT EXISTS FOR (b:Band)        REQUIRE b.id       IS UNIQUE;
CREATE CONSTRAINT band_slug        IF NOT EXISTS FOR (b:Band)        REQUIRE b.slug     IS UNIQUE;
CREATE CONSTRAINT release_id       IF NOT EXISTS FOR (r:Release)     REQUIRE r.id       IS UNIQUE;
CREATE CONSTRAINT release_slug_band IF NOT EXISTS FOR (r:Release)    REQUIRE (r.id)     IS UNIQUE;
CREATE CONSTRAINT track_id         IF NOT EXISTS FOR (t:Track)       REQUIRE t.id       IS UNIQUE;
CREATE CONSTRAINT genre_id         IF NOT EXISTS FOR (g:Genre)       REQUIRE g.id       IS UNIQUE;
CREATE CONSTRAINT genre_slug       IF NOT EXISTS FOR (g:Genre)       REQUIRE g.slug     IS UNIQUE;
CREATE CONSTRAINT tag_id           IF NOT EXISTS FOR (t:Tag)         REQUIRE t.id       IS UNIQUE;
CREATE CONSTRAINT tag_slug         IF NOT EXISTS FOR (t:Tag)         REQUIRE t.slug     IS UNIQUE;

// ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX user_role          IF NOT EXISTS FOR (u:User)        ON (u.role);
CREATE INDEX band_name          IF NOT EXISTS FOR (b:Band)        ON (b.name);
CREATE INDEX band_country       IF NOT EXISTS FOR (b:Band)        ON (b.country);
CREATE INDEX band_status        IF NOT EXISTS FOR (b:Band)        ON (b.status);
CREATE INDEX release_band_id    IF NOT EXISTS FOR (r:Release)     ON (r.band_id);
CREATE INDEX release_type       IF NOT EXISTS FOR (r:Release)     ON (r.type);
CREATE INDEX release_year       IF NOT EXISTS FOR (r:Release)     ON (r.year);
CREATE INDEX track_release_id   IF NOT EXISTS FOR (t:Track)       ON (t.release_id);
CREATE INDEX genre_name         IF NOT EXISTS FOR (g:Genre)       ON (g.name);
CREATE INDEX tag_name           IF NOT EXISTS FOR (t:Tag)         ON (t.name);
CREATE INDEX tag_category       IF NOT EXISTS FOR (t:Tag)         ON (t.category);
CREATE INDEX admin_token_exp    IF NOT EXISTS FOR (t:AdminToken)  ON (t.expires_at);

// ── Node schemas (documentation) ─────────────────────────────────────────────
// AdminToken { id, token, created_by_id, redeemed_by_id?, created_at, expires_at, note? }
// Band       { id, slug, name, country, country_code, formed, bio, status, created_by_id, updated_by_id, created_at, updated_at }
// Release    { id, slug, band_id, title, type, year, label, status, created_at, updated_at }
// Track      { id, release_id, number, title, duration, lyrics? }
// Genre      { id, slug, name, description?, parent_id? }
// Tag        { id, slug, name, category }

// ── Relationships ─────────────────────────────────────────────────────────────
// (Band)-[:HAS_RELEASE]->(Release)
// (Release)-[:HAS_TRACK]->(Track)
// (Band)-[:TAGGED_WITH]->(Genre)
// (Band)-[:TAGGED_WITH]->(Tag)
// (Genre)-[:CHILD_OF]->(Genre)         // ontology hierarchy
// (User)-[:CREATED_BAND]->(Band)
// (User)-[:UPDATED_BAND]->(Band)
// (User)-[:REDEEMED]->(AdminToken)
