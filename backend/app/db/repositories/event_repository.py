import uuid
from datetime import datetime, timezone
from typing import Optional, List


class EventRepository:
    def __init__(self, session):
        self.session = session

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def list_upcoming(self, user_id: str, today_str: str) -> List[dict]:
        result = self.session.run(
            """
            MATCH (e:Event) WHERE e.date >= $today
            OPTIONAL MATCH (h:Band)-[:HEADLINES]->(e)
            OPTIONAL MATCH (s:Band)-[:SUPPORTS]->(e)
            OPTIONAL MATCH (me:User {id: $user_id})-[:FRIEND_REQUEST {status: 'accepted'}]-(f:User)-[:INTERESTED_IN]->(e)
            OPTIONAL MATCH (meInt:User {id: $user_id})-[:INTERESTED_IN]->(e)
            OPTIONAL MATCH (:User {id: $user_id})-[:FAVOURITE_BAND]->(fb:Band)-[:HEADLINES|SUPPORTS]->(e)
            WITH e, h,
                 collect(DISTINCT CASE WHEN s IS NOT NULL THEN {id: s.id, name: s.name, slug: s.slug} END) AS supporting,
                 collect(DISTINCT CASE WHEN f IS NOT NULL THEN {id: f.id, handle: f.handle, profile_image_url: f.profile_image_url} END) AS friends_interested,
                 max(CASE WHEN meInt IS NOT NULL THEN 1 ELSE 0 END) > 0 AS is_interested,
                 count(DISTINCT fb) AS taste_bands_count
            RETURN e.id AS id, e.title AS title, e.date AS date, e.venue AS venue,
                   e.city AS city, e.country AS country, e.country_code AS country_code,
                   e.ticket_url AS ticket_url,
                   CASE WHEN h IS NOT NULL THEN {id: h.id, name: h.name, slug: h.slug} END AS headliner,
                   supporting, friends_interested, is_interested, taste_bands_count
            ORDER BY e.date ASC
            """,
            today=today_str,
            user_id=user_id,
        )
        rows = []
        for record in result:
            row = dict(record)
            # Filter None values injected by Cypher CASE WHEN in collect()
            row["supporting"] = [x for x in row.get("supporting", []) if x is not None]
            row["friends_interested"] = [x for x in row.get("friends_interested", []) if x is not None]
            rows.append(row)
        return rows

    def get_event(self, event_id: str, user_id: str) -> Optional[dict]:
        result = self.session.run(
            """
            MATCH (e:Event {id: $event_id})
            OPTIONAL MATCH (h:Band)-[:HEADLINES]->(e)
            OPTIONAL MATCH (s:Band)-[:SUPPORTS]->(e)
            OPTIONAL MATCH (me:User {id: $user_id})-[:FRIEND_REQUEST {status: 'accepted'}]-(f:User)-[:INTERESTED_IN]->(e)
            OPTIONAL MATCH (meInt:User {id: $user_id})-[:INTERESTED_IN]->(e)
            OPTIONAL MATCH (:User {id: $user_id})-[:FAVOURITE_BAND]->(fb:Band)-[:HEADLINES|SUPPORTS]->(e)
            WITH e, h,
                 collect(DISTINCT CASE WHEN s IS NOT NULL THEN {id: s.id, name: s.name, slug: s.slug} END) AS supporting,
                 collect(DISTINCT CASE WHEN f IS NOT NULL THEN {id: f.id, handle: f.handle, profile_image_url: f.profile_image_url} END) AS friends_interested,
                 max(CASE WHEN meInt IS NOT NULL THEN 1 ELSE 0 END) > 0 AS is_interested,
                 count(DISTINCT fb) AS taste_bands_count
            RETURN e.id AS id, e.title AS title, e.date AS date, e.venue AS venue,
                   e.city AS city, e.country AS country, e.country_code AS country_code,
                   e.ticket_url AS ticket_url,
                   CASE WHEN h IS NOT NULL THEN {id: h.id, name: h.name, slug: h.slug} END AS headliner,
                   supporting, friends_interested, is_interested, taste_bands_count
            """,
            event_id=event_id,
            user_id=user_id,
        )
        record = result.single()
        if not record:
            return None
        row = dict(record)
        row["supporting"] = [x for x in row.get("supporting", []) if x is not None]
        row["friends_interested"] = [x for x in row.get("friends_interested", []) if x is not None]
        return row

    def create_event(self, data: dict) -> dict:
        event_id = str(uuid.uuid4())
        now = self._now()
        headliner_band_id = data.pop("headliner_band_id", None)
        supporting_band_ids = data.pop("supporting_band_ids", [])

        self.session.run(
            """
            CREATE (e:Event {
                id: $id, title: $title, date: $date,
                venue: $venue, city: $city, country: $country,
                country_code: $country_code, ticket_url: $ticket_url,
                source: 'manual', created_at: $now, updated_at: $now
            })
            """,
            id=event_id,
            now=now,
            **data,
        )

        if headliner_band_id:
            self.session.run(
                "MATCH (b:Band {id: $bid}), (e:Event {id: $eid}) MERGE (b)-[:HEADLINES]->(e)",
                bid=headliner_band_id,
                eid=event_id,
            )

        for bid in supporting_band_ids:
            self.session.run(
                "MATCH (b:Band {id: $bid}), (e:Event {id: $eid}) MERGE (b)-[:SUPPORTS]->(e)",
                bid=bid,
                eid=event_id,
            )

        return self.get_event(event_id, "system")

    def toggle_interest(self, user_id: str, event_id: str) -> bool:
        check = self.session.run(
            "MATCH (u:User {id: $uid})-[r:INTERESTED_IN]->(e:Event {id: $eid}) RETURN r",
            uid=user_id,
            eid=event_id,
        )
        if check.single():
            self.session.run(
                "MATCH (u:User {id: $uid})-[r:INTERESTED_IN]->(e:Event {id: $eid}) DELETE r",
                uid=user_id,
                eid=event_id,
            )
            return False
        else:
            self.session.run(
                "MATCH (u:User {id: $uid}), (e:Event {id: $eid}) CREATE (u)-[:INTERESTED_IN {created_at: $now}]->(e)",
                uid=user_id,
                eid=event_id,
                now=self._now(),
            )
            return True
