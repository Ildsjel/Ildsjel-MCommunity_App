import uuid
from datetime import datetime, timezone
from typing import Optional, List


class BandRepository:
    def __init__(self, session):
        self.session = session

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    # ── Bands ───────────────────────────────────────────────────────────────

    def create_band(self, data: dict, created_by_id: str) -> dict:
        band_id = str(uuid.uuid4())
        now = self._now()
        genre_ids = data.pop("genre_ids", [])
        tag_ids = data.pop("tag_ids", [])

        self.session.run(
            """
            CREATE (b:Band {
                id: $id, slug: $slug, name: $name,
                country: $country, country_code: $country_code,
                formed: $formed, bio: $bio,
                status: 'draft',
                created_by_id: $created_by_id, updated_by_id: $created_by_id,
                created_at: $now, updated_at: $now
            })
            """,
            id=band_id, created_by_id=created_by_id, now=now, **data,
        )

        if genre_ids:
            self.session.run(
                """
                MATCH (b:Band {id: $band_id})
                UNWIND $genre_ids AS gid
                MATCH (g:Genre {id: gid})
                MERGE (b)-[:TAGGED_WITH]->(g)
                """,
                band_id=band_id, genre_ids=genre_ids,
            )

        if tag_ids:
            self.session.run(
                """
                MATCH (b:Band {id: $band_id})
                UNWIND $tag_ids AS tid
                MATCH (t:Tag {id: tid})
                MERGE (b)-[:TAGGED_WITH]->(t)
                """,
                band_id=band_id, tag_ids=tag_ids,
            )

        return self.get_band(band_id)

    def get_band(self, band_id: str) -> Optional[dict]:
        result = self.session.run(
            """
            MATCH (b:Band {id: $id})
            OPTIONAL MATCH (b)-[:TAGGED_WITH]->(g:Genre)
            OPTIONAL MATCH (b)-[:TAGGED_WITH]->(tag:Tag)
            WITH b,
                 collect(DISTINCT CASE WHEN g IS NOT NULL THEN {id: g.id, slug: g.slug, name: g.name} END) AS genres,
                 collect(DISTINCT CASE WHEN tag IS NOT NULL THEN {id: tag.id, slug: tag.slug, name: tag.name, category: tag.category} END) AS tags
            OPTIONAL MATCH (b)-[:HAS_RELEASE]->(r:Release)
            WITH b, genres, tags, r
            OPTIONAL MATCH (r)-[:HAS_TRACK]->(t:Track)
            WITH b, genres, tags, r,
                 collect(CASE WHEN t IS NOT NULL THEN {id: t.id, number: t.number, title: t.title, duration: t.duration, lyrics: t.lyrics} END) AS tracks
            WITH b, genres, tags,
                 collect(CASE WHEN r IS NOT NULL THEN {id: r.id, slug: r.slug, title: r.title, type: r.type,
                                                       year: r.year, label: r.label, status: r.status,
                                                       band_id: r.band_id, tracks: tracks}
                         END) AS releases
            RETURN b, genres, tags, releases
            """,
            id=band_id,
        )
        record = result.single()
        if not record:
            return None
        return self._band_record_to_dict(record)

    def get_band_by_slug(self, slug: str) -> Optional[dict]:
        result = self.session.run(
            """
            MATCH (b:Band {slug: $slug})
            OPTIONAL MATCH (b)-[:TAGGED_WITH]->(g:Genre)
            OPTIONAL MATCH (b)-[:TAGGED_WITH]->(tag:Tag)
            WITH b,
                 collect(DISTINCT CASE WHEN g IS NOT NULL THEN {id: g.id, slug: g.slug, name: g.name} END) AS genres,
                 collect(DISTINCT CASE WHEN tag IS NOT NULL THEN {id: tag.id, slug: tag.slug, name: tag.name, category: tag.category} END) AS tags
            OPTIONAL MATCH (b)-[:HAS_RELEASE]->(r:Release)
            WITH b, genres, tags, r
            OPTIONAL MATCH (r)-[:HAS_TRACK]->(t:Track)
            WITH b, genres, tags, r,
                 collect(CASE WHEN t IS NOT NULL THEN {id: t.id, number: t.number, title: t.title, duration: t.duration, lyrics: t.lyrics} END) AS tracks
            WITH b, genres, tags,
                 collect(CASE WHEN r IS NOT NULL THEN {id: r.id, slug: r.slug, title: r.title, type: r.type,
                                                       year: r.year, label: r.label, status: r.status,
                                                       band_id: r.band_id, tracks: tracks}
                         END) AS releases
            RETURN b, genres, tags, releases
            """,
            slug=slug,
        )
        record = result.single()
        if not record:
            return None
        return self._band_record_to_dict(record)

    def list_bands(
        self,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
        query: Optional[str] = None,
    ) -> dict:
        conditions = []
        params: dict = {"skip": skip, "limit": limit}
        if status:
            conditions.append("b.status = $status")
            params["status"] = status
        if query:
            conditions.append("toLower(b.name) CONTAINS toLower($search)")
            params["search"] = query

        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

        bands = self.session.run(
            f"""
            MATCH (b:Band)
            {where}
            OPTIONAL MATCH (b)-[:TAGGED_WITH]->(g:Genre)
            OPTIONAL MATCH (b)-[:TAGGED_WITH]->(tag:Tag)
            RETURN b,
                   [] AS releases,
                   collect(DISTINCT {{id: g.id, slug: g.slug, name: g.name}}) AS genres,
                   collect(DISTINCT {{id: tag.id, slug: tag.slug, name: tag.name, category: tag.category}}) AS tags
            ORDER BY b.name
            SKIP $skip LIMIT $limit
            """,
            **params,
        )
        total_rec = self.session.run(
            f"MATCH (b:Band) {where} RETURN count(b) AS n",
            **{k: v for k, v in params.items() if k not in ("skip", "limit")},
        ).single()
        return {
            "bands": [self._band_record_to_dict(r) for r in bands],
            "total": total_rec["n"] if total_rec else 0,
        }

    def update_band(self, band_id: str, data: dict, updated_by_id: str) -> Optional[dict]:
        genre_ids = data.pop("genre_ids", None)
        tag_ids = data.pop("tag_ids", None)

        set_clauses = ", ".join(f"b.{k} = ${k}" for k in data if data[k] is not None)
        if set_clauses:
            self.session.run(
                f"MATCH (b:Band {{id: $id}}) SET {set_clauses}, b.updated_by_id = $updated_by_id, b.updated_at = $now",
                id=band_id, updated_by_id=updated_by_id, now=self._now(), **data,
            )

        if genre_ids is not None:
            self.session.run(
                "MATCH (b:Band {id: $id})-[r:TAGGED_WITH]->(g:Genre) DELETE r", id=band_id,
            )
            if genre_ids:
                self.session.run(
                    """
                    MATCH (b:Band {id: $band_id})
                    UNWIND $genre_ids AS gid MATCH (g:Genre {id: gid})
                    MERGE (b)-[:TAGGED_WITH]->(g)
                    """,
                    band_id=band_id, genre_ids=genre_ids,
                )

        if tag_ids is not None:
            self.session.run(
                "MATCH (b:Band {id: $id})-[r:TAGGED_WITH]->(t:Tag) DELETE r", id=band_id,
            )
            if tag_ids:
                self.session.run(
                    """
                    MATCH (b:Band {id: $band_id})
                    UNWIND $tag_ids AS tid MATCH (t:Tag {id: tid})
                    MERGE (b)-[:TAGGED_WITH]->(t)
                    """,
                    band_id=band_id, tag_ids=tag_ids,
                )

        return self.get_band(band_id)

    def set_band_image(self, band_id: str, field: str, url: str) -> Optional[dict]:
        self.session.run(
            f"MATCH (b:Band {{id: $id}}) SET b.{field} = $url",
            id=band_id, url=url,
        )
        return self.get_band(band_id)

    def delete_band(self, band_id: str) -> bool:
        result = self.session.run(
            """
            MATCH (b:Band {id: $id})
            OPTIONAL MATCH (b)-[:HAS_RELEASE]->(r:Release)-[:HAS_TRACK]->(t:Track)
            DETACH DELETE b, r, t
            RETURN count(b) AS deleted
            """,
            id=band_id,
        )
        record = result.single()
        return (record["deleted"] > 0) if record else False

    # ── Releases ────────────────────────────────────────────────────────────

    def create_release(self, band_id: str, data: dict) -> dict:
        release_id = str(uuid.uuid4())
        now = self._now()
        tracks = data.pop("tracks", [])

        self.session.run(
            """
            MATCH (b:Band {id: $band_id})
            CREATE (r:Release {
                id: $id, slug: $slug, band_id: $band_id,
                title: $title, type: $type, year: $year, label: $label,
                status: 'published', created_at: $now, updated_at: $now
            })
            CREATE (b)-[:HAS_RELEASE]->(r)
            """,
            id=release_id, band_id=band_id, now=now, **data,
        )

        for track in tracks:
            track_id = str(uuid.uuid4())
            self.session.run(
                """
                MATCH (r:Release {id: $release_id})
                CREATE (t:Track {
                    id: $id, release_id: $release_id,
                    number: $number, title: $title, duration: $duration, lyrics: $lyrics
                })
                CREATE (r)-[:HAS_TRACK]->(t)
                """,
                id=track_id, release_id=release_id,
                number=track["number"], title=track["title"],
                duration=track["duration"], lyrics=track.get("lyrics"),
            )

        return self.get_release(release_id)

    def get_release(self, release_id: str) -> Optional[dict]:
        result = self.session.run(
            """
            MATCH (r:Release {id: $id})
            OPTIONAL MATCH (r)-[:HAS_TRACK]->(t:Track)
            WITH r, t ORDER BY t.number
            RETURN r, collect(CASE WHEN t IS NOT NULL THEN {id: t.id, number: t.number, title: t.title, duration: t.duration, lyrics: t.lyrics} END) AS tracks
            """,
            id=release_id,
        )
        record = result.single()
        if not record:
            return None
        return self._release_record_to_dict(record)

    def get_release_by_slug(self, band_slug: str, release_slug: str) -> Optional[dict]:
        result = self.session.run(
            """
            MATCH (b:Band {slug: $band_slug})-[:HAS_RELEASE]->(r:Release {slug: $release_slug})
            OPTIONAL MATCH (r)-[:HAS_TRACK]->(t:Track)
            WITH b, r, t ORDER BY t.number
            WITH b, r,
                 collect(CASE WHEN t IS NOT NULL THEN {id: t.id, number: t.number, title: t.title, duration: t.duration, lyrics: t.lyrics} END) AS tracks
            RETURN b, r, tracks
            """,
            band_slug=band_slug, release_slug=release_slug,
        )
        record = result.single()
        if not record:
            return None
        b = dict(record["b"])
        r = dict(record["r"])
        tracks = sorted(
            [dict(t) for t in (record.get("tracks") or []) if t and t.get("id")],
            key=lambda x: x.get("number", 0),
        )
        return {
            "band": b,
            "release": {**r, "tracks": tracks},
        }

    def delete_release(self, release_id: str) -> bool:
        result = self.session.run(
            """
            MATCH (r:Release {id: $id})
            OPTIONAL MATCH (r)-[:HAS_TRACK]->(t:Track)
            DETACH DELETE r, t
            RETURN count(r) AS deleted
            """,
            id=release_id,
        )
        record = result.single()
        return (record["deleted"] > 0) if record else False

    # ── Genres ──────────────────────────────────────────────────────────────

    def create_genre(self, data: dict) -> dict:
        genre_id = str(uuid.uuid4())
        parent_id = data.pop("parent_id", None)

        self.session.run(
            "CREATE (g:Genre {id: $id, slug: $slug, name: $name, description: $description})",
            id=genre_id, description=data.get("description"), **{k: v for k, v in data.items() if k != "description"},
        )

        if parent_id:
            self.session.run(
                "MATCH (g:Genre {id: $id}), (p:Genre {id: $parent_id}) CREATE (g)-[:CHILD_OF]->(p)",
                id=genre_id, parent_id=parent_id,
            )

        return self.get_genre(genre_id)

    def get_genre(self, genre_id: str) -> Optional[dict]:
        result = self.session.run(
            """
            MATCH (g:Genre {id: $id})
            OPTIONAL MATCH (g)-[:CHILD_OF]->(p:Genre)
            OPTIONAL MATCH (c:Genre)-[:CHILD_OF]->(g)
            RETURN g, p.id AS parent_id, collect(c {.id, .slug, .name}) AS children
            """,
            id=genre_id,
        )
        record = result.single()
        return self._genre_record_to_dict(record) if record else None

    def list_genres(self) -> List[dict]:
        result = self.session.run(
            """
            MATCH (g:Genre)
            OPTIONAL MATCH (g)-[:CHILD_OF]->(p:Genre)
            OPTIONAL MATCH (c:Genre)-[:CHILD_OF]->(g)
            RETURN g, p.id AS parent_id, collect(c {.id, .slug, .name}) AS children
            ORDER BY g.name
            """
        )
        return [self._genre_record_to_dict(r) for r in result]

    def update_genre(self, genre_id: str, data: dict) -> Optional[dict]:
        parent_id = data.pop("parent_id", ...)

        set_parts = {k: v for k, v in data.items() if v is not None}
        if set_parts:
            set_clause = ", ".join(f"g.{k} = ${k}" for k in set_parts)
            self.session.run(
                f"MATCH (g:Genre {{id: $id}}) SET {set_clause}", id=genre_id, **set_parts,
            )

        if parent_id is not ...:
            self.session.run(
                "MATCH (g:Genre {id: $id})-[r:CHILD_OF]->() DELETE r", id=genre_id,
            )
            if parent_id:
                self.session.run(
                    "MATCH (g:Genre {id: $id}), (p:Genre {id: $parent_id}) CREATE (g)-[:CHILD_OF]->(p)",
                    id=genre_id, parent_id=parent_id,
                )

        return self.get_genre(genre_id)

    def delete_genre(self, genre_id: str) -> bool:
        result = self.session.run(
            "MATCH (g:Genre {id: $id}) DETACH DELETE g RETURN count(g) AS deleted",
            id=genre_id,
        )
        record = result.single()
        return (record["deleted"] > 0) if record else False

    # ── Tags ────────────────────────────────────────────────────────────────

    def create_tag(self, data: dict) -> dict:
        tag_id = str(uuid.uuid4())
        self.session.run(
            "CREATE (t:Tag {id: $id, slug: $slug, name: $name, category: $category})",
            id=tag_id, **data,
        )
        return {"id": tag_id, **data}

    def list_tags(self, category: Optional[str] = None) -> List[dict]:
        where = "WHERE t.category = $category" if category else ""
        result = self.session.run(
            f"MATCH (t:Tag) {where} RETURN t ORDER BY t.category, t.name",
            category=category,
        )
        return [dict(r["t"]) for r in result]

    def update_tag(self, tag_id: str, data: dict) -> Optional[dict]:
        set_parts = {k: v for k, v in data.items() if v is not None}
        if not set_parts:
            return None
        set_clause = ", ".join(f"t.{k} = ${k}" for k in set_parts)
        result = self.session.run(
            f"MATCH (t:Tag {{id: $id}}) SET {set_clause} RETURN t", id=tag_id, **set_parts,
        )
        record = result.single()
        return dict(record["t"]) if record else None

    def delete_tag(self, tag_id: str) -> bool:
        result = self.session.run(
            "MATCH (t:Tag {id: $id}) DETACH DELETE t RETURN count(t) AS deleted", id=tag_id,
        )
        record = result.single()
        return (record["deleted"] > 0) if record else False

    def merge_tags(self, source_id: str, target_id: str) -> bool:
        """Reattaches all TAGGED_WITH relationships from source to target, then deletes source."""
        result = self.session.run(
            """
            MATCH (source:Tag {id: $source_id}), (target:Tag {id: $target_id})
            OPTIONAL MATCH (b:Band)-[r:TAGGED_WITH]->(source)
            WITH source, target, collect(b) AS bands
            FOREACH (band IN bands |
                MERGE (band)-[:TAGGED_WITH]->(target)
            )
            DETACH DELETE source
            RETURN count(source) AS deleted
            """,
            source_id=source_id, target_id=target_id,
        )
        record = result.single()
        return (record["deleted"] > 0) if record else False

    # ── Helpers ─────────────────────────────────────────────────────────────

    def _band_record_to_dict(self, record) -> dict:
        b = dict(record["b"])
        releases_raw = record.get("releases", []) or []
        genres_raw = record.get("genres", []) or []
        tags_raw = record.get("tags", []) or []
        releases = []
        for r in releases_raw:
            if not r or not r.get("id"):
                continue
            r_dict = dict(r)
            tracks_raw = r_dict.pop("tracks", []) or []
            tracks = sorted(
                [dict(t) for t in tracks_raw if t and t.get("id")],
                key=lambda x: x.get("number", 0),
            )
            releases.append({**r_dict, "tracks": tracks})
        genres = [dict(g) for g in genres_raw if g and g.get("id")]
        tags = [dict(t) for t in tags_raw if t and t.get("id")]
        return {**b, "releases": releases, "genres": genres, "tags": tags}

    def _release_record_to_dict(self, record) -> dict:
        r = dict(record["r"])
        tracks = sorted(
            [dict(t) for t in (record.get("tracks") or []) if t.get("id")],
            key=lambda x: x.get("number", 0),
        )
        return {**r, "tracks": tracks}

    def _genre_record_to_dict(self, record) -> dict:
        g = dict(record["g"])
        g["parent_id"] = record.get("parent_id")
        g["children"] = [dict(c) for c in (record.get("children") or []) if c.get("id")]
        return g
