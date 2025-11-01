#!/usr/bin/env python3
"""
Script to create 50 test users with diverse data for search testing
"""
import random
import uuid
from datetime import datetime, timedelta
from neo4j import GraphDatabase
import bcrypt

# Neo4j connection
NEO4J_URI = "bolt://neo4j:7687"  # Use container name when running in Docker
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "grimr_dev_password"

# Test data
CITIES = [
    ("Berlin", "Germany"),
    ("Hamburg", "Germany"),
    ("Munich", "Germany"),
    ("Cologne", "Germany"),
    ("Frankfurt", "Germany"),
    ("Stuttgart", "Germany"),
    ("Düsseldorf", "Germany"),
    ("Leipzig", "Germany"),
    ("Dresden", "Germany"),
    ("Hannover", "Germany"),
    ("Oslo", "Norway"),
    ("Stockholm", "Sweden"),
    ("Copenhagen", "Denmark"),
    ("Helsinki", "Finland"),
    ("Amsterdam", "Netherlands"),
    ("Rotterdam", "Netherlands"),
    ("Brussels", "Belgium"),
    ("Vienna", "Austria"),
    ("Zurich", "Switzerland"),
    ("London", "UK"),
]

METAL_ARTISTS = [
    ("Metallica", ["thrash metal", "heavy metal"], 95),
    ("Iron Maiden", ["heavy metal", "nwobhm"], 92),
    ("Black Sabbath", ["heavy metal", "doom metal"], 90),
    ("Slayer", ["thrash metal", "speed metal"], 88),
    ("Megadeth", ["thrash metal", "speed metal"], 87),
    ("Judas Priest", ["heavy metal", "speed metal"], 89),
    ("Pantera", ["groove metal", "thrash metal"], 86),
    ("Opeth", ["progressive metal", "death metal"], 82),
    ("Gojira", ["progressive metal", "death metal"], 80),
    ("Mastodon", ["progressive metal", "sludge metal"], 79),
    ("Tool", ["progressive metal", "alternative metal"], 88),
    ("Meshuggah", ["djent", "progressive metal"], 75),
    ("Deathspell Omega", ["black metal", "atmospheric black metal"], 65),
    ("Mgła", ["black metal"], 70),
    ("Behemoth", ["black metal", "death metal"], 78),
    ("Darkthrone", ["black metal"], 72),
    ("Emperor", ["black metal", "symphonic black metal"], 74),
    ("Mayhem", ["black metal"], 76),
    ("Burzum", ["black metal", "atmospheric black metal"], 68),
    ("Immortal", ["black metal"], 73),
    ("Cannibal Corpse", ["death metal", "brutal death metal"], 77),
    ("Death", ["death metal", "progressive metal"], 85),
    ("Morbid Angel", ["death metal"], 76),
    ("Obituary", ["death metal"], 74),
    ("Carcass", ["death metal", "grindcore"], 72),
    ("At The Gates", ["melodic death metal"], 75),
    ("In Flames", ["melodic death metal"], 78),
    ("Dark Tranquillity", ["melodic death metal"], 76),
    ("Amon Amarth", ["melodic death metal", "viking metal"], 81),
    ("Arch Enemy", ["melodic death metal"], 77),
    ("Electric Wizard", ["doom metal", "stoner metal"], 71),
    ("Sleep", ["doom metal", "stoner metal"], 73),
    ("Candlemass", ["doom metal"], 70),
    ("My Dying Bride", ["doom metal", "death doom"], 68),
    ("Paradise Lost", ["doom metal", "gothic metal"], 72),
    ("Nightwish", ["symphonic metal", "power metal"], 84),
    ("Epica", ["symphonic metal"], 79),
    ("Sabaton", ["power metal"], 82),
    ("Blind Guardian", ["power metal"], 80),
    ("Helloween", ["power metal"], 78),
]

FIRST_NAMES = [
    "Max", "Lars", "Erik", "Bjorn", "Klaus", "Hans", "Sven", "Olaf", "Thorsten", "Jens",
    "Anna", "Emma", "Lisa", "Sarah", "Nina", "Julia", "Katrin", "Petra", "Anja", "Heike",
    "Marco", "Stefan", "Michael", "Thomas", "Andreas", "Christian", "Daniel", "Martin", "Peter", "Frank",
    "Maria", "Sophie", "Laura", "Marie", "Hannah", "Lena", "Mia", "Emily", "Lea", "Charlotte",
]

LAST_NAMES = [
    "Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann",
    "Koch", "Bauer", "Richter", "Klein", "Wolf", "Schröder", "Neumann", "Schwarz", "Zimmermann", "Braun",
    "Hartmann", "Lange", "Schmitt", "Werner", "Krause", "Meier", "Lehmann", "Schmid", "Schulze", "Maier",
]

METAL_ADJECTIVES = [
    "Brutal", "Dark", "Grim", "Infernal", "Eternal", "Frozen", "Ancient", "Unholy", "Blackened", "Doomed",
    "Savage", "Vicious", "Morbid", "Cryptic", "Obscure", "Sinister", "Wicked", "Cursed", "Blasphemous", "Demonic",
]

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def generate_handle(first_name: str, last_name: str) -> str:
    """Generate a unique handle"""
    patterns = [
        f"{first_name.lower()}{last_name.lower()[:3]}",
        f"{first_name.lower()[:3]}{last_name.lower()}",
        f"{first_name.lower()}_{last_name.lower()}",
        f"{random.choice(METAL_ADJECTIVES).lower()}{first_name.lower()}",
        f"{first_name.lower()}{random.randint(666, 999)}",
    ]
    return random.choice(patterns)

def create_test_users(driver, num_users=50):
    """Create test users with diverse data"""
    
    print(f"🎸 Creating {num_users} test users...")
    
    # First, ensure all artists exist
    print("📀 Creating artists...")
    with driver.session() as session:
        for artist_name, genres, popularity in METAL_ARTISTS:
            artist_id = str(uuid.uuid4())
            spotify_id = f"spotify_test_{artist_name.lower().replace(' ', '_')}"
            
            session.run("""
                MERGE (a:Artist {spotify_id: $spotify_id})
                ON CREATE SET 
                    a.id = $artist_id,
                    a.name = $artist_name,
                    a.genres = $genres,
                    a.popularity = $popularity,
                    a.created_at = datetime()
                ON MATCH SET
                    a.name = $artist_name,
                    a.genres = $genres,
                    a.popularity = $popularity
            """, artist_id=artist_id, spotify_id=spotify_id, artist_name=artist_name, 
                genres=genres, popularity=popularity)
            
            # Create genre nodes and relationships
            for genre in genres:
                session.run("""
                    MERGE (g:Genre {name: $genre})
                    WITH g
                    MATCH (a:Artist {spotify_id: $spotify_id})
                    MERGE (a)-[:TAGGED_AS]->(g)
                """, genre=genre, spotify_id=spotify_id)
    
    print(f"✅ Created {len(METAL_ARTISTS)} artists")
    
    # Create users
    created_users = []
    
    for i in range(num_users):
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)
        handle = f"{generate_handle(first_name, last_name)}{i}"
        email = f"{handle}@grimr-test.com"
        city, country = random.choice(CITIES)
        
        # Random privacy settings
        discoverable_by_name = random.choice([True, True, True, False])  # 75% true
        discoverable_by_music = random.choice([True, True, True, False])  # 75% true
        city_visible = random.choice(["city", "city", "region", "hidden"])  # 50% city, 25% region, 25% hidden
        
        # Random activity
        days_ago = random.randint(0, 60)
        last_active = datetime.utcnow() - timedelta(days=days_ago)
        
        user_id = str(uuid.uuid4())
        password_hash = hash_password("Test123!@#")
        
        with driver.session() as session:
            # Create user
            session.run("""
                CREATE (u:User {
                    id: $user_id,
                    handle: $handle,
                    email: $email,
                    password_hash: $password_hash,
                    country: $country,
                    city: $city,
                    created_at: datetime(),
                    source_accounts: ['spotify'],
                    is_pro: $is_pro,
                    onboarding_complete: true,
                    email_verified: true,
                    is_active: true,
                    discoverable_by_name: $discoverable_by_name,
                    discoverable_by_music: $discoverable_by_music,
                    city_visible: $city_visible,
                    last_active_at: datetime($last_active),
                    spotify_access_token: 'test_token',
                    spotify_refresh_token: 'test_refresh',
                    spotify_token_expires_at: datetime() + duration({days: 30})
                })
            """, user_id=user_id, handle=handle, email=email, password_hash=password_hash,
                country=country, city=city, is_pro=random.choice([True, False]),
                discoverable_by_name=discoverable_by_name, discoverable_by_music=discoverable_by_music,
                city_visible=city_visible, last_active=last_active.isoformat())
            
            # Select random artists this user listens to (5-15 artists)
            num_artists = random.randint(5, 15)
            user_artists = random.sample(METAL_ARTISTS, num_artists)
            
            for artist_name, genres, _ in user_artists:
                spotify_id = f"spotify_test_{artist_name.lower().replace(' ', '_')}"
                play_count = random.randint(3, 200)
                
                # Create LISTENS_TO relationship
                session.run("""
                    MATCH (u:User {id: $user_id})
                    MATCH (a:Artist {spotify_id: $spotify_id})
                    MERGE (u)-[r:LISTENS_TO]->(a)
                    SET r.play_count = $play_count,
                        r.last_updated = datetime()
                """, user_id=user_id, spotify_id=spotify_id, play_count=play_count)
                
                # Create some Play nodes for activity
                num_plays = min(play_count, random.randint(5, 30))
                for _ in range(num_plays):
                    play_id = str(uuid.uuid4())
                    days_ago = random.randint(0, 30)
                    played_at = datetime.utcnow() - timedelta(days=days_ago, hours=random.randint(0, 23))
                    
                    # Create a dummy track for this artist
                    track_spotify_id = f"track_{spotify_id}_{random.randint(1, 10)}"
                    
                    session.run("""
                        MERGE (t:Track {spotify_id: $track_spotify_id})
                        ON CREATE SET
                            t.id = randomUUID(),
                            t.name = $track_name,
                            t.duration_ms = $duration_ms,
                            t.created_at = datetime()
                        WITH t
                        MATCH (a:Artist {spotify_id: $artist_spotify_id})
                        MERGE (a)-[:PERFORMED]->(t)
                    """, track_spotify_id=track_spotify_id, 
                        track_name=f"{artist_name} - Track {random.randint(1, 10)}",
                        duration_ms=random.randint(180000, 420000),
                        artist_spotify_id=spotify_id)
                    
                    # Create Play node
                    dedup_key = f"{user_id}_{track_spotify_id}_{int(played_at.timestamp())}"
                    
                    session.run("""
                        MATCH (u:User {id: $user_id})
                        MATCH (t:Track {spotify_id: $track_spotify_id})
                        MERGE (p:Play {dedup_key: $dedup_key})
                        ON CREATE SET
                            p.id = $play_id,
                            p.played_at = datetime($played_at),
                            p.duration_played_ms = $duration_ms,
                            p.source = 'spotify',
                            p.confidence = 1.0,
                            p.ingested_at = datetime()
                        WITH p, u, t
                        MERGE (u)-[:PLAYED]->(p)
                        MERGE (p)-[:OF_TRACK]->(t)
                    """, user_id=user_id, track_spotify_id=track_spotify_id, 
                        dedup_key=dedup_key, play_id=play_id, 
                        played_at=played_at.isoformat(),
                        duration_ms=random.randint(180000, 420000))
        
        created_users.append({
            'handle': handle,
            'email': email,
            'city': city,
            'country': country,
            'artists': [a[0] for a in user_artists],
        })
        
        if (i + 1) % 10 == 0:
            print(f"  ✓ Created {i + 1}/{num_users} users...")
    
    print(f"\n✅ Successfully created {len(created_users)} test users!")
    print(f"\n📋 Sample users:")
    for user in random.sample(created_users, min(5, len(created_users))):
        print(f"  • {user['handle']} ({user['city']}, {user['country']})")
        print(f"    Artists: {', '.join(user['artists'][:3])}...")
    
    print(f"\n🔑 All test users have password: Test123!@#")
    print(f"📧 Email format: <handle>@grimr-test.com")
    
    return created_users

def main():
    """Main function"""
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    try:
        # Verify connection
        driver.verify_connectivity()
        print("✅ Connected to Neo4j")
        
        # Create test users
        users = create_test_users(driver, num_users=50)
        
        print(f"\n🎉 Done! You can now test the search feature with {len(users)} users.")
        print(f"\n💡 Try searching for:")
        print(f"  - User names: 'max', 'lars', 'brutal'")
        print(f"  - Artists: 'Metallica', 'Opeth', 'Deathspell Omega'")
        print(f"  - Genres: 'black metal', 'death metal', 'doom metal'")
        
    finally:
        driver.close()

if __name__ == "__main__":
    main()

