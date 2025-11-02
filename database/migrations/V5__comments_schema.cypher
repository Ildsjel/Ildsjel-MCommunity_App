// Migration V5: Image Comments Schema
// Adds support for comments on gallery images

// Create Comment nodes with constraints
CREATE CONSTRAINT comment_id_unique IF NOT EXISTS
FOR (c:Comment) REQUIRE c.id IS UNIQUE;

CREATE INDEX comment_created_at IF NOT EXISTS
FOR (c:Comment) ON (c.created_at);

// Create relationship indexes for efficient queries
CREATE INDEX comment_on_image IF NOT EXISTS
FOR ()-[r:COMMENTED_ON]-() ON (r.created_at);

// Sample Comment node structure:
// (:Comment {
//   id: "uuid",
//   content: "Rich text content with <strong>formatting</strong> and 🤘 emoticons",
//   created_at: datetime,
//   updated_at: datetime (optional),
//   is_edited: boolean
// })

// Relationships:
// (:User)-[:WROTE]->(:Comment)-[:COMMENTED_ON]->(:GalleryImage)

