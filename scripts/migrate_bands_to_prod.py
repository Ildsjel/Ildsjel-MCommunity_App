"""
Migrate Band catalogue from local Neo4j → production Neo4j Aura.

Migrates: Genre, Tag, Band, Release nodes + TAGGED_WITH and HAS_RELEASE relationships.
Uses MERGE so it's safe to re-run (idempotent).

Release safety rule
───────────────────
Releases can have AlbumReviews written against them in production.
To prevent data loss, Release nodes that already exist in production are
NEVER overwritten — only new releases (created locally but not yet in
production) are pushed.  This means:

  • Band nodes  → always upserted (local is source of truth)
  • Genre/Tag   → always upserted (local is source of truth)
  • Release     → ON CREATE only — existing prod releases are left untouched

Usage:
    python3 scripts/migrate_bands_to_prod.py \\
        --prod-uri  "neo4j+s://xxxx.databases.neo4j.io" \\
        --prod-user "neo4j" \\
        --prod-pass "YOUR_AURA_PASSWORD"

Local Neo4j is read from backend/.env automatically.
"""
import argparse
import sys

from neo4j import GraphDatabase

# ── Config ────────────────────────────────────────────────────────────────────

LOCAL_URI  = "bolt://localhost:7687"
LOCAL_USER = "neo4j"
LOCAL_PASS = "grimr_dev_password"   # from backend/.env

BATCH = 500   # nodes per write transaction


# ── Helpers ───────────────────────────────────────────────────────────────────

def chunks(lst, n):
    for i in range(0, len(lst), n):
        yield lst[i:i + n]


def count(driver, label):
    with driver.session() as s:
        return s.run(f"MATCH (n:{label}) RETURN count(n) AS c").single()["c"]


def prod_ids(driver, label):
    """Return the set of IDs already present in production for a given label."""
    with driver.session() as s:
        rows = s.run(f"MATCH (n:{label}) RETURN n.id AS id").data()
    return {r["id"] for r in rows if r["id"]}


# ── Migration steps ───────────────────────────────────────────────────────────

def migrate_genres(src, dst):
    print("Migrating Genre nodes…")
    with src.session() as s:
        rows = s.run("MATCH (g:Genre) RETURN g").data()
    nodes = [dict(r["g"]) for r in rows]
    print(f"  Found {len(nodes)} genres locally")
    with dst.session() as s:
        for batch in chunks(nodes, BATCH):
            s.run("""
                UNWIND $batch AS g
                MERGE (n:Genre {id: g.id})
                SET n.slug = g.slug,
                    n.name = g.name,
                    n.category = g.category
            """, batch=batch)
    print(f"  ✅ Genres done")


def migrate_tags(src, dst):
    print("Migrating Tag nodes…")
    with src.session() as s:
        rows = s.run("MATCH (t:Tag) RETURN t").data()
    nodes = [dict(r["t"]) for r in rows]
    print(f"  Found {len(nodes)} tags locally")
    with dst.session() as s:
        for batch in chunks(nodes, BATCH):
            s.run("""
                UNWIND $batch AS t
                MERGE (n:Tag {id: t.id})
                SET n.slug     = t.slug,
                    n.name     = t.name,
                    n.category = t.category
            """, batch=batch)
    print(f"  ✅ Tags done")


def migrate_bands(src, dst):
    print("Migrating Band nodes…")
    with src.session() as s:
        rows = s.run("MATCH (b:Band) RETURN b").data()
    nodes = [dict(r["b"]) for r in rows]
    print(f"  Found {len(nodes)} bands locally")
    total = 0
    with dst.session() as s:
        for batch in chunks(nodes, BATCH):
            s.run("""
                UNWIND $batch AS b
                MERGE (n:Band {id: b.id})
                SET n.slug           = b.slug,
                    n.name           = b.name,
                    n.status         = b.status,
                    n.country        = b.country,
                    n.country_code   = b.country_code,
                    n.formed         = b.formed,
                    n.logo_url       = b.logo_url,
                    n.image_url      = b.image_url,
                    n.description    = b.description,
                    n.created_at     = b.created_at,
                    n.updated_at     = b.updated_at,
                    n.created_by_id  = b.created_by_id,
                    n.updated_by_id  = b.updated_by_id
            """, batch=batch)
            total += len(batch)
            print(f"  … {total}/{len(nodes)}")
    print(f"  ✅ Bands done")


def migrate_releases(src, dst):
    """
    Push releases that exist locally but NOT yet in production.

    Releases are NEVER overwritten once in production because they may have
    AlbumReview nodes attached.  Only new releases (absent from prod) are
    created.  Existing prod releases are left completely untouched.
    """
    print("Migrating Release nodes…")
    with src.session() as s:
        rows = s.run("MATCH (r:Release) RETURN r").data()
    local_nodes = [dict(r["r"]) for r in rows]
    print(f"  Found {len(local_nodes)} releases locally")
    if not local_nodes:
        print("  (none — skipping)")
        return

    # Fetch IDs already in production so we never overwrite them
    existing = prod_ids(dst, "Release")
    new_nodes = [n for n in local_nodes if n["id"] not in existing]
    skipped   = len(local_nodes) - len(new_nodes)

    if skipped:
        print(f"  ⚠️  Skipping {skipped} release(s) already in production "
              f"(may have reviews — will not overwrite)")
    if not new_nodes:
        print("  ✅ No new releases to push")
        return

    print(f"  Pushing {len(new_nodes)} new release(s)…")
    with dst.session() as s:
        for batch in chunks(new_nodes, BATCH):
            # ON CREATE SET: only set properties when the node is brand-new.
            # If somehow it already exists, leave it untouched.
            s.run("""
                UNWIND $batch AS r
                MERGE (n:Release {id: r.id})
                ON CREATE SET
                    n.slug       = r.slug,
                    n.title      = r.title,
                    n.type       = r.type,
                    n.year       = r.year,
                    n.status     = r.status,
                    n.band_id    = r.band_id,
                    n.created_at = r.created_at,
                    n.updated_at = r.updated_at
            """, batch=batch)
    print(f"  ✅ Releases done")


def migrate_band_genre_rels(src, dst):
    print("Migrating Band→Genre (TAGGED_WITH) relationships…")
    with src.session() as s:
        rows = s.run("""
            MATCH (b:Band)-[:TAGGED_WITH]->(g:Genre)
            RETURN b.id AS bid, g.id AS gid
        """).data()
    print(f"  Found {len(rows)} Band→Genre relationships")
    with dst.session() as s:
        for batch in chunks(rows, BATCH):
            s.run("""
                UNWIND $batch AS r
                MATCH (b:Band {id: r.bid})
                MATCH (g:Genre {id: r.gid})
                MERGE (b)-[:TAGGED_WITH]->(g)
            """, batch=batch)
    print(f"  ✅ Band→Genre done")


def migrate_band_tag_rels(src, dst):
    print("Migrating Band→Tag (TAGGED_WITH) relationships…")
    with src.session() as s:
        rows = s.run("""
            MATCH (b:Band)-[:TAGGED_WITH]->(t:Tag)
            RETURN b.id AS bid, t.id AS tid
        """).data()
    print(f"  Found {len(rows)} Band→Tag relationships")
    with dst.session() as s:
        for batch in chunks(rows, BATCH):
            s.run("""
                UNWIND $batch AS r
                MATCH (b:Band {id: r.bid})
                MATCH (t:Tag {id: r.tid})
                MERGE (b)-[:TAGGED_WITH]->(t)
            """, batch=batch)
    print(f"  ✅ Band→Tag done")


def migrate_band_release_rels(src, dst):
    print("Migrating Band→Release (HAS_RELEASE) relationships…")
    with src.session() as s:
        rows = s.run("""
            MATCH (b:Band)-[:HAS_RELEASE]->(r:Release)
            RETURN b.id AS bid, r.id AS rid
        """).data()
    print(f"  Found {len(rows)} Band→Release relationships")
    if not rows:
        print("  (none — skipping)")
        return
    with dst.session() as s:
        for batch in chunks(rows, BATCH):
            s.run("""
                UNWIND $batch AS r
                MATCH (b:Band {id: r.bid})
                MATCH (rel:Release {id: r.rid})
                MERGE (b)-[:HAS_RELEASE]->(rel)
            """, batch=batch)
    print(f"  ✅ Band→Release done")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--prod-uri",  required=True)
    parser.add_argument("--prod-user", default="neo4j")
    parser.add_argument("--prod-pass", required=True)
    args = parser.parse_args()

    print(f"Connecting to local Neo4j ({LOCAL_URI})…")
    src = GraphDatabase.driver(LOCAL_URI, auth=(LOCAL_USER, LOCAL_PASS))
    print(f"Connecting to production Neo4j ({args.prod_uri})…")
    dst = GraphDatabase.driver(args.prod_uri, auth=(args.prod_user, args.prod_pass))

    try:
        src.verify_connectivity()
        print("  ✅ Local connection OK")
        dst.verify_connectivity()
        print("  ✅ Production connection OK")
    except Exception as e:
        print(f"  ❌ Connection failed: {e}")
        sys.exit(1)

    migrate_genres(src, dst)
    migrate_tags(src, dst)
    migrate_bands(src, dst)
    migrate_releases(src, dst)
    migrate_band_genre_rels(src, dst)
    migrate_band_tag_rels(src, dst)
    migrate_band_release_rels(src, dst)

    # Summary
    print("\n── Production counts after migration ──")
    for label in ("Band", "Genre", "Tag", "Release"):
        print(f"  {label}: {count(dst, label)}")

    src.close()
    dst.close()
    print("\n🎸 Migration complete!")


if __name__ == "__main__":
    main()
