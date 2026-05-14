"""
Migrate locally-stored band/avatar images to Cloudflare R2 and update Neo4j URLs.

Run AFTER you have set up your R2 bucket and have the credentials handy.

Usage:
    python3 scripts/migrate_images_to_r2.py \
        --account-id  YOUR_CF_ACCOUNT_ID \
        --access-key  YOUR_R2_ACCESS_KEY \
        --secret-key  YOUR_R2_SECRET_KEY \
        --bucket      grimr-media \
        --public-url  https://pub-xxxx.r2.dev \
        --local-dir   /tmp/grimr_uploads \
        --prod-uri    "neo4j+s://ae2fcfce.databases.neo4j.io" \
        --prod-pass   "YOUR_NEO4J_PASSWORD"

The script is idempotent: skips files that already have an https:// URL in Neo4j.
"""
import argparse
import mimetypes
import sys
from pathlib import Path

import boto3
from botocore.config import Config
from neo4j import GraphDatabase

PROD_USER = "neo4j"


def make_client(account_id, access_key, secret_key):
    return boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def upload_file(client, bucket, local_path: Path, key: str) -> str:
    content_type = mimetypes.guess_type(str(local_path))[0] or "image/jpeg"
    with open(local_path, "rb") as f:
        client.upload_fileobj(
            f, bucket, key,
            ExtraArgs={"ContentType": content_type, "CacheControl": "public, max-age=31536000"},
        )
    return key


def migrate(args):
    local_dir = Path(args.local_dir)
    client = make_client(args.account_id, args.access_key, args.secret_key)
    driver = GraphDatabase.driver(args.prod_uri, auth=(PROD_USER, args.prod_pass))

    # ── Band images ────────────────────────────────────────────────────────
    with driver.session() as s:
        bands = s.run("""
            MATCH (b:Band)
            WHERE (b.image_url IS NOT NULL AND NOT b.image_url STARTS WITH 'http')
               OR (b.logo_url  IS NOT NULL AND NOT b.logo_url  STARTS WITH 'http')
            RETURN b.id AS id, b.name AS name, b.image_url AS img, b.logo_url AS logo
        """).data()

    print(f"Bands with local image URLs: {len(bands)}")
    for band in bands:
        bid, name = band["id"], band["name"]

        for field, url in [("image_url", band["img"]), ("logo_url", band["logo"])]:
            if not url or url.startswith("http"):
                continue
            # url looks like /uploads/bands/photos/xxx.jpg
            rel_path = url.lstrip("/uploads/").lstrip("/")  # bands/photos/xxx.jpg
            local_path = local_dir / rel_path
            if not local_path.exists():
                print(f"  ⚠  {name} — local file not found: {local_path}")
                continue
            key = rel_path  # keep same path structure in R2
            upload_file(client, args.bucket, local_path, key)
            new_url = f"{args.public_url.rstrip('/')}/{key}"
            with driver.session() as s:
                s.run(f"MATCH (b:Band {{id: $id}}) SET b.{field} = $url", id=bid, url=new_url)
            print(f"  ✅ {name} — {field}: {new_url}")

    # ── User avatars ───────────────────────────────────────────────────────
    with driver.session() as s:
        users = s.run("""
            MATCH (u:User)
            WHERE u.profile_image_url IS NOT NULL
              AND NOT u.profile_image_url STARTS WITH 'http'
            RETURN u.id AS id, u.handle AS handle, u.profile_image_url AS url
        """).data()

    print(f"\nUsers with local avatar URLs: {len(users)}")
    for user in users:
        rel_path = user["url"].lstrip("/uploads/").lstrip("/")
        local_path = local_dir / rel_path
        if not local_path.exists():
            print(f"  ⚠  {user['handle']} — file not found: {local_path}")
            continue
        key = rel_path
        upload_file(client, args.bucket, local_path, key)
        new_url = f"{args.public_url.rstrip('/')}/{key}"
        with driver.session() as s:
            s.run("MATCH (u:User {id: $id}) SET u.profile_image_url = $url", id=user["id"], url=new_url)
        print(f"  ✅ {user['handle']} avatar → {new_url}")

    driver.close()
    print("\n🎸 Migration complete!")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--account-id",  required=True)
    p.add_argument("--access-key",  required=True)
    p.add_argument("--secret-key",  required=True)
    p.add_argument("--bucket",      required=True)
    p.add_argument("--public-url",  required=True)
    p.add_argument("--local-dir",   default="/tmp/grimr_uploads")
    p.add_argument("--prod-uri",    required=True)
    p.add_argument("--prod-pass",   required=True)
    args = p.parse_args()
    migrate(args)


if __name__ == "__main__":
    main()
