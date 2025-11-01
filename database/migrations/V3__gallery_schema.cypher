// Gallery Schema Migration
// Adds GalleryImage nodes and relationships

// Create GalleryImage node constraint
CREATE CONSTRAINT gallery_image_id IF NOT EXISTS
FOR (img:GalleryImage) REQUIRE img.id IS UNIQUE;

// Create index on user_id for faster lookups
CREATE INDEX gallery_user_id IF NOT EXISTS
FOR (img:GalleryImage) ON (img.user_id);

// Create index on position for ordering
CREATE INDEX gallery_position IF NOT EXISTS
FOR (img:GalleryImage) ON (img.position);

// Note: User.profile_image_url property already exists in User model
// No additional schema changes needed for avatar functionality

