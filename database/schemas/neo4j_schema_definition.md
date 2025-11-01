# Neo4j Schema Definition - Grimr

## Overview
This document defines the complete Neo4j graph database schema for Grimr, including all nodes, relationships, properties, constraints, and indexes.

## Core Entities (Nodes)

### User Node (`:User`)
Represents a Grimr user.

**Properties:**
- `id`: String (UUID) - Primary Key
- `handle`: String - Unique username
- `email`: String - Unique email for authentication
- `password_hash`: String - Hashed password (if self-managed auth)
- `country`: String
- `city`: String
- `lat`: Float - Latitude (obfuscated for privacy)
- `lon`: Float - Longitude (obfuscated for privacy)
- `created_at`: DateTime
- `last_login_at`: DateTime
- `source_accounts`: List[String] - Connected services (e.g., ["spotify", "lastfm"])
- `is_pro`: Boolean - Premium subscription status
- `consent_analytics`: Boolean - GDPR consent for analytics
- `onboarding_complete`: Boolean - Metal-ID setup complete
- `profile_image_url`: String (optional)

### Artist Node (`:Artist`)
Represents a Metal band or artist.

**Properties:**
- `id`: String (UUID) - Primary Key
- `name`: String
- `origin_country`: String (optional)
- `popularity_global`: Float (0-1) - Derived from API data
- `encyclopedia_metallum_id`: String - Encyclopedia Metallum ID
- `last_updated_at`: DateTime - For weekly updates
- `image_url`: String (optional)

### Album Node (`:Album`)
Represents an album.

**Properties:**
- `id`: String (UUID) - Primary Key
- `title`: String
- `year`: Integer
- `discogs_id`: String - Discogs external ID
- `spotify_id`: String - Spotify external ID
- `bandcamp_url`: String - Bandcamp URL
- `rarity_global`: Float (0-1) - Derived from Discogs data
- `last_updated_at`: DateTime
- `cover_image_url`: String (optional)
- `source_urls`: List[Map] - Buy links for partnerships

### Genre Node (`:Genre`)
Represents a Metal genre or subgenre.

**Properties:**
- `id`: String (UUID) - Primary Key
- `name`: String - Unique genre name
- `parent_id`: String (UUID) - Parent genre for hierarchy

### Event Node (`:Event`)
Represents a concert or festival.

**Properties:**
- `id`: String (UUID) - Primary Key
- `name`: String - Event title
- `venue_name`: String
- `start_ts`: DateTime
- `end_ts`: DateTime (optional)
- `lat`: Float - Latitude
- `lon`: Float - Longitude
- `bandsintown_id`: String - Bandsintown external ID
- `songkick_id`: String - Songkick external ID
- `source_platform`: String - e.g., "Bandsintown", "Songkick"
- `affiliate_url`: String - Ticket purchase link
- `created_by_user_id`: String (UUID) - If user-generated
- `status`: String - "Active", "Cancelled", "Past"

### Venue Node (`:Venue`)
Represents a concert venue.

**Properties:**
- `id`: String (UUID) - Primary Key
- `name`: String
- `address`: String
- `city`: String
- `country`: String
- `lat`: Float
- `lon`: Float

### Review Node (`:Review`)
Represents a Letterboxd-style album review.

**Properties:**
- `id`: String (UUID) - Primary Key
- `text`: String - Review content
- `score`: Integer - Rating (1-5 or 1-10)
- `created_at`: DateTime
- `updated_at`: DateTime
- `image_url`: String (optional)
- `status`: String - "PENDING", "APPROVED", "REJECTED"
- `moderated_by_user_id`: String (UUID, optional)
- `moderated_at`: DateTime (optional)
- `moderation_reason`: String (optional)

### Group Node (`:Group`)
Represents event groups or community groups.

**Properties:**
- `id`: String (UUID) - Primary Key
- `name`: String
- `description`: String
- `created_at`: DateTime
- `type`: String - "EVENT" or "GENERAL"
- `event_id`: String (UUID, optional) - Associated event
- `is_public`: Boolean
- `chat_channel_id`: String - Real-time chat integration ID

### Post Node (`:Post`)
Represents feed content.

**Properties:**
- `id`: String (UUID) - Primary Key
- `text`: String - Post content
- `image_url`: String (optional)
- `created_at`: DateTime
- `status`: String - "PENDING", "APPROVED", "REJECTED"
- `moderated_by_user_id`: String (UUID, optional)
- `moderated_at`: DateTime (optional)
- `moderation_reason`: String (optional)

### Badge Node (`:Badge`)
Represents Metal-ID badges.

**Properties:**
- `id`: String (UUID) - Primary Key
- `name`: String - e.g., "Black Metal Purist"
- `description`: String
- `image_url`: String - Badge icon path
- `criteria_query`: String - Cypher query for badge eligibility

## Relationships (Edges)

### Music Identity
- `(:User)-[LISTENS_TO {plays:Int, last_play_ts:DateTime, source:String, window:String}]->(:Artist)`
- `(:User)-[LIKES {source:String, ts:DateTime}]->(:Artist)`
- `(:User)-[LIKES {source:String, ts:DateTime}]->(:Album)`
- `(:User)-[OWNS {format:String, source:String, ts:DateTime}]->(:Album)`
- `(:Album)-[:BY]->(:Artist)`
- `(:Artist)-[:TAGGED_AS]->(:Genre)`
- `(:Genre)-[:IS_CHILD_OF]->(:Genre)`

### Event & Community
- `(:User)-[ATTENDS {ts:DateTime, intent:String}]->(:Event)`
- `(:Event)-[:FEATURES]->(:Artist)`
- `(:Event)-[:AT]->(:Venue)`
- `(:User)-[:CREATED]->(:Event)`
- `(:User)-[:CREATED]->(:Group)`
- `(:User)-[IS_MEMBER_OF {joined_at:DateTime}]->(:Group)`
- `(:Group)-[:FOR_EVENT]->(:Event)`
- `(:User)-[:NEAR {km:Float, updated_at:DateTime}]->(:User)`

### User-Generated Content
- `(:User)-[:WROTE]->(:Review)`
- `(:Review)-[:REVIEWS]->(:Album)`
- `(:User)-[:CREATED]->(:Post)`
- `(:Post)-[:REFERENCES]->(:Album)`
- `(:Post)-[:REFERENCES]->(:Artist)`
- `(:User)-[:THROWS_HORNS {ts:DateTime}]->(:Post)`
- `(:User)-[:THROWS_HORNS {ts:DateTime}]->(:Review)`

### Profile & Badges
- `(:User)-[:HAS_BADGE {awarded_at:DateTime}]->(:Badge)`

## Compatibility Scoring

The compatibility algorithm uses the following data:

1. **Artist Overlap (45%)**: `LISTENS_TO` relationships with plays, recency, and rarity
2. **Genre Overlap (15%)**: `TAGGED_AS` relationships with hierarchical matching
3. **Collection Affinity (15%)**: `OWNS` relationships weighted by rarity
4. **Event Cohesion (15%)**: `ATTENDS` relationships with lineup overlap
5. **Geo Proximity (10%)**: Haversine distance from User lat/lon

## Data Provenance

All relationships include a `source` property to track data origin (e.g., "spotify", "lastfm", "discogs") for debugging and trust.

