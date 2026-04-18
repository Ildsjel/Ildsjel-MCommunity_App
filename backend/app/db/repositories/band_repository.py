import uuid
from datetime import datetime, timezone
from typing import Optional, List


class BandRepository:
    def __init__(self, session):
        self.session = session

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    # ── Bands ───────────────────────────────────────────────────────────────

    async def create_band(self, data: dict, created_by_id: str) -> dict:
        band_id = str(uuid.uuid4())
        now = self._now()
        genre_ids = data.pop("genre_ids", [])
        tag_ids = data.pop("tag_ids", [])

        await self.session.run(
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
            await self.session.run(
                """
                MATCH (b:Band {id: $band_id})
                UNWIND $genre_ids AS gid
                MATCH (g:Genre {id: gid})
                MERGE (b)-[:TAGGED_WITH]->(g)
                """,
                band_id=band_id, genre_ids=genre_ids,
            )

        if tag_ids:
            await self.session.run(
                """
                MATCH (b:Band {id: $band_id})
                UNWIND $tag_ids AS tid
                MATCH (t:Tag {id: tid})
                MERGE (b)-[:TAGGED_WITH]->(t)
                """,
                band_id=band_id, tag_ids=tag_ids,
            )

        return await self.get_band(band_id)

    async def get_band(self, band_id: str) -> Optional[dict]:
        result = await self.session.run(
            """
            MATCH (b:Band {id: $id})
            OPTIONAL MATCH (b)-[:HAS_RELEASE]->(r:Release)
            OPTIONAL MATCH (r)-[:HAS_TRACK]->(t:Track)
            OPTIONAL MATCH (b)-[:TAGGED_WITH]->(g:Genre)
            OPTIONAL MATCH (b)-[:TAGGED_WITH]->(tag:Tag)
            RETURN b,
                   collect(DISTINCT {id: r.id, slug: r.slug, title: r.title, type: r.type,
                                     year: r.year, label: r.label, status: r.status,
                                     band_id: r.band_id}) AS releases,
                   collect(DISTINCT {id: g.id, slug: g.slug, name: g.name}) AS genres,
                   collect(DISTINCT {id: tag.id, slug: tag.slug, name: tag.name, category: tag.category}) AS tags
            """,
            id=band_id,
        )
        record = await result.single()
        if not record:
            return None
        return self._band_record_to_dict(record)

    async def get_band_by_slug(self, slug: str) -> Optional[dict]:
        result = await self.session.run(
            """
            MATCH (b:Band {slug: $slug})
            OPTIONAL MATCH (b)-[:HAS_RELEASE]->(r:Release)
            OPTIONAL MATCH (r)-[:HAS_TRACK]->(t:Track)
            OPTIONAL MATCH (b)-[:TAGGED_WITH]->(g:Genre)
            OPTIONAL MATCH (b)-[:TAGGED_WITH]->(tag:Tag)
            RETURN b,
                   collect(DISTINCT {id: r.id, slug: r.slug, title: r.title, type: r.type,
                                     year: r.year, label: r.label, status: r.status,
                                     band_id: r.band_id}) AS releases,
                   collect(DISTINCT {id: g.id, slug: g.slug, name: g.name}) AS genres,
                   collect(DISTINCT {id: tag.id, slug: tag.slug, name: tag.name, category: tag.category}) AS tags
            """,
            slug=slug,
        )
        record = await result.single()
        if not record:
            return None
        return self._band_record_to_dict(record)

    async def list_bands(self, status: Optional[str] = None, skip: int = 0, limit: int = 50) -> List[dict]:
        where = "WHERE b.status = $status" if status else ""
        result = await self.session.run(
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
            status=status, skip=skip, limit=limit,
        )
        return [self._band_record_to_dict(r) for r in await result.fetch(limit)]

    async def update_band(self, band_id: str, data: dict, updated_by_id: str) -> Optional[dict]:
        genre_ids = data.pop("genre_ids", None)
        tag_ids = data.pop("tag_ids", None)

        set_clauses = ", ".join(f"b.{k} = ${k}" for k in data if data[k] is not None)
        if set_clauses:
            await self.session.run(
                f"MATCH (b:Band {{id: $id}}) SET {set_clauses}, b.updated_by_id = $updated_by_id, b.updated_at = $now",
                id=band_id, updated_by_id=updated_by_id, now=self._now(), **data,
            )

        if genre_ids is not None:
            await self.session.run(
                "MATCH (b:Band {id: $id})-[r:TAGGED_WITH]->(g:Genre) DELETE r", id=band_id,
            )
            if genre_ids:
                await self.session.run(
                    """
                    MATCH (b:Band {id: $band_id})
                    UNWIND $genre_ids AS gid MATCH (g:Genre {id: gid})
                    MERGE (b)-[:TAGGED_WITH]->(g)
                    """,
                    band_id=band_id, genre_ids=genre_ids,
                )

        if tag_ids is not None:
            await self.session.run(
                "MATCH (b:Band {id: $id})-[r:TAGGED_WITH]->(t:Tag) DELETE r", id=band_id,
            )
            if tag_ids:
                await self.session.run(
                    """
                    MATCH (b:Band {id: $band_id})
                    UNWIND $tag_ids AS tid MATCH (t:Tag {id: tid})
                    MERGE (b)-[:TAGGED_WITH]->(t)
                    """,
                    band_id=band_id, tag_ids=tag_ids,
                )

        return await self.get_band(band_id)

    async def delete_band(self, band_id: str) -> bool:
        result = await self.session.run(
            """
            MATCH (b:Band {id: $id})
            OPTIONAL MATCH (b)-[:HAS_RELEASE]->(r:Release)-[:HAS_TRACK]->(t:Track)
            DETACH DELETE b, r, t
            RETURN count(b) AS deleted
            """,
            id=band_id,
        )
        record = await result.single()
        return (record["deleted"] > 0) if record else False

    # ── Releases ────────────────────────────────────────────────────────────

    async def create_release(self, band_id: str, data: dict) -> dict:
        release_id = str(uuid.uuid4())
        now = self._now()
        tracks = data.pop("tracks", [])

        await self.session.run(
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
            await self.session.run(
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

        return await self.get_release(release_id)

    async def get_release(self, release_id: str) -> Optional[dict]:
        result = await self.session.run(
            """
            MATCH (r:Release {id: $id})
            OPTIONAL MATCH (r)-[:HAS_TRACK]->(t:Track)
            RETURN r, collect(t {.id, .number, .title, .duration, .lyrics}) AS tracks
            ORDER BY t.number
            """,
            id=release_id,
        )
        record = await result.single()
        if not record:
            return None
        return self._release_record_to_dict(record)

    async def delete_release(self, release_id: str) -> bool:
        result = await self.session.run(
            """
            MATCH (r:Release {id: $id})
            OPTIONAL MATCH (r)-[:HAS_TRACK]->(t:Track)
            DETACH DELETE r, t
            RETURN count(r) AS deleted
            """,
            id=release_id,
        )
        record = await result.single()
        return (record["deleted"] > 0) if record else False

    # ── Genres ──────────────────────────────────────────────────────────────

    async def create_genre(self, data: dict) -> dict:
        genre_id = str(uuid.uuid4())
        parent_id = data.pop("parent_id", None)

        await self.session.run(
            "CREATE (g:Genre {id: $id, slug: $slug, name: $name, description: $description})",
            id=genre_id, description=data.get("description"), **{k: v for k, v in data.items() if k != "description"},
        )

        if parent_id:
            await self.session.run(
                "MATCH (g:Genre {id: $id}), (p:Genre {id: $parent_id}) CREATE (g)-[:CHILD_OF]->(p)",
                id=genre_id, parent_id=parent_id,
            )

        return await self.get_genre(genre_id)

    async def get_genre(self, genre_id: str) -> Optional[dict]:
        result = await self.session.run(
            """
            MATCH (g:Genre {id: $id})
            OPTIONAL MATCH (g)-[:CHILD_OF]->(p:Genre)
            OPTIONAL MATCH (c:Genre)-[:CHILD_OF]->(g)
            RETURN g, p.id AS parent_id, collect(c {.id, .slug, .name}) AS children
            """,
            id=genre_id,
        )
        record = await result.single()
        return self._genre_record_to_dict(record) if record else None

    async def list_genres(self) -> List[dict]:
        result = await self.session.run(
            """
            MATCH (g:Genre)
            OPTIONAL MATCH (g)-[:CHILD_OF]->(p:Genre)
            OPTIONAL MATCH (c:Genre)-[:CHILD_OF]->(g)
            RETURN g, p.id AS parent_id, collect(c {.id, .slug, .name}) AS children
            ORDER BY g.name
            """
        )
        return [self._genre_record_to_dict(r) for r in await result.fetch(500)]

    async def update_genre(self, genre_id: str, data: dict) -> Optional[dict]:
        parent_id = data.pop("parent_id", ...)

        set_parts = {k: v for k, v in data.items() if v is not None}
        if set_parts:
            set_clause = ", ".join(f"g.{k} = ${k}" for k in set_parts)
            await self.session.run(
                f"MATCH (g:Genre {{id: $id}}) SET {set_clause}", id=genre_id, **set_parts,
            )

        if parent_id is not ...:
            await self.session.run(
                "MATCH (g:Genre {id: $id})-[r:CHILD_OF]->() DELETE r", id=genre_id,
            )
            if parent_id:
                await self.session.run(
                    "MATCH (g:Genre {id: $id}), (p:Genre {id: $parent_id}) CREATE (g)-[:CHILD_OF]->(p)",
                    id=genre_id, parent_id=parent_id,
                )

        return await self.get_genre(genre_id)

    async def delete_genre(self, genre_id: str) -> bool:
        result = await self.session.run(
            "MATCH (g:Genre {id: $id}) DETACH DELETE g RETURN count(g) AS deleted",
            id=genre_id,
        )
        record = await result.single()
        return (record["deleted"] > 0) if record else False

    # ── Tags ────────────────────────────────────────────────────────────────

    async def create_tag(self, data: dict) -> dict:
        tag_id = str(uuid.uuid4())
        await self.session.run(
            "CREATE (t:Tag {id: $id, slug: $slug, name: $name, category: $category})",
            id=tag_id, **data,
        )
        return {"id": tag_id, **data}

    async def list_tags(self, category: Optional[str] = None) -> List[dict]:
        where = "WHERE t.category = $category" if category else ""
        result = await self.session.run(
            f"MATCH (t:Tag) {where} RETURN t ORDER BY t.category, t.name",
            category=category,
        )
        return [dict(r["t"]) for r in await result.fetch(500)]

    async def update_tag(self, tag_id: str, data: dict) -> Optional[dict]:
        set_parts = {k: v for k, v in data.items() if v is not None}
        if not set_parts:
            return None
        set_clause = ", ".join(f"t.{k} = ${k}" for k in set_parts)
        result = await self.session.run(
            f"MATCH (t:Tag {{id: $id}}) SET {set_clause} RETURN t", id=tag_id, **set_parts,
        )
        record = await result.single()
        return dict(record["t"]) if record else None

    async def delete_tag(self, tag_id: str) -> bool:
        result = await self.session.run(
            "MATCH (t:Tag {id: $id}) DETACH DELETE t RETURN count(t) AS deleted", id=tag_id,
        )
        record = await result.single()
        return (record["deleted"] > 0) if record else False

    async def merge_tags(self, source_id: str, target_id: str) -> bool:
        """Reattaches all TAGGED_WITH relationships from source to target, then deletes source."""
        result = await self.session.run(
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
        record = await result.single()
        return (record["deleted"] > 0) if record else False

    # ── Helpers ─────────────────────────────────────────────────────────────

    def _band_record_to_dict(self, record) -> dict:
        b = dict(record["b"])
        releases_raw = record.get("releases", []) or []
        genres_raw = record.get("genres", []) or []
        tags_raw = record.get("tags", []) or []
        releases = [r for r in releases_raw if r.get("id")]
        genres = [g for g in genres_raw if g.get("id")]
        tags = [t for t in tags_raw if t.get("id")]
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
