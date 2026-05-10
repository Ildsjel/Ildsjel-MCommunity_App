import uuid
from datetime import datetime, timezone
from typing import Optional, List


class EventRepository:
    def __init__(self, session):
        self.session = session

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def list_upcoming(self, user_id: str, today_str: str,
                      skip: int = 0, limit: int = 1000) -> List[dict]:
        """
        Return upcoming events with all signals needed for ranking.
        Deduplication is ensured by aggregating headliners into a list —
        if an event has multiple HEADLINES edges (rare but possible from TM),
        we take the first alphabetically rather than returning duplicate rows.
        """
        result = self.session.run(
            """
            MATCH (e:Event) WHERE e.date >= $today
            OPTIONAL MATCH (h:Band)-[:HEADLINES]->(e)
            OPTIONAL MATCH (s:Band)-[:SUPPORTS]->(e)
            OPTIONAL MATCH (me:User {id: $user_id})-[:FRIEND_REQUEST {status: 'accepted'}]-(f:User)
                           -[:INTERESTED_IN]->(e)
            OPTIONAL MATCH (meInt:User {id: $user_id})-[:INTERESTED_IN]->(e)
            // taste: headliner vs support split
            OPTIONAL MATCH (:User {id: $user_id})-[:FAVOURITE_BAND]->(hfb:Band)-[:HEADLINES]->(e)
            OPTIONAL MATCH (:User {id: $user_id})-[:FAVOURITE_BAND]->(sfb:Band)-[:SUPPORTS]->(e)
            WITH e,
                 // Collect ALL headliners; take [0] to get one canonical headliner per event
                 [x IN collect(DISTINCT CASE WHEN h IS NOT NULL
                      THEN {id: h.id, name: h.name, slug: h.slug} END)
                  WHERE x IS NOT NULL] AS headliners,
                 [x IN collect(DISTINCT CASE WHEN s IS NOT NULL
                      THEN {id: s.id, name: s.name, slug: s.slug} END)
                  WHERE x IS NOT NULL] AS supporting,
                 [x IN collect(DISTINCT CASE WHEN f IS NOT NULL
                      THEN {id: f.id, handle: f.handle,
                            profile_image_url: f.profile_image_url} END)
                  WHERE x IS NOT NULL] AS friends_interested,
                 max(CASE WHEN meInt IS NOT NULL THEN 1 ELSE 0 END) > 0 AS is_interested,
                 count(DISTINCT hfb) AS taste_headliner_count,
                 count(DISTINCT sfb) AS taste_support_count
            RETURN e.id AS id, e.title AS title, e.date AS date, e.venue AS venue,
                   e.city AS city, e.country AS country, e.country_code AS country_code,
                   e.ticket_url AS ticket_url,
                   e.lat AS lat, e.lon AS lon,
                   headliners[0] AS headliner,
                   supporting, friends_interested, is_interested,
                   taste_headliner_count, taste_support_count
            ORDER BY e.date ASC
            SKIP $skip LIMIT $limit
            """,
            today=today_str,
            user_id=user_id,
            skip=skip,
            limit=limit,
        )
        rows = []
        for record in result:
            row = dict(record)
            rows.append(row)
        return rows

    def count_upcoming(self, today_str: str) -> int:
        result = self.session.run(
            "MATCH (e:Event) WHERE e.date >= $today RETURN count(e) AS cnt",
            today=today_str,
        )
        rec = result.single()
        return rec["cnt"] if rec else 0

    def get_event(self, event_id: str, user_id: str) -> Optional[dict]:
        result = self.session.run(
            """
            MATCH (e:Event {id: $event_id})
            OPTIONAL MATCH (h:Band)-[:HEADLINES]->(e)
            OPTIONAL MATCH (s:Band)-[:SUPPORTS]->(e)
            OPTIONAL MATCH (me:User {id: $user_id})-[:FRIEND_REQUEST {status: 'accepted'}]-(f:User)
                           -[:INTERESTED_IN]->(e)
            OPTIONAL MATCH (meInt:User {id: $user_id})-[:INTERESTED_IN]->(e)
            OPTIONAL MATCH (:User {id: $user_id})-[:FAVOURITE_BAND]->(hfb:Band)-[:HEADLINES]->(e)
            OPTIONAL MATCH (:User {id: $user_id})-[:FAVOURITE_BAND]->(sfb:Band)-[:SUPPORTS]->(e)
            WITH e,
                 [x IN collect(DISTINCT CASE WHEN h IS NOT NULL
                      THEN {id: h.id, name: h.name, slug: h.slug} END)
                  WHERE x IS NOT NULL] AS headliners,
                 [x IN collect(DISTINCT CASE WHEN s IS NOT NULL
                      THEN {id: s.id, name: s.name, slug: s.slug} END)
                  WHERE x IS NOT NULL] AS supporting,
                 [x IN collect(DISTINCT CASE WHEN f IS NOT NULL
                      THEN {id: f.id, handle: f.handle,
                            profile_image_url: f.profile_image_url} END)
                  WHERE x IS NOT NULL] AS friends_interested,
                 max(CASE WHEN meInt IS NOT NULL THEN 1 ELSE 0 END) > 0 AS is_interested,
                 count(DISTINCT hfb) AS taste_headliner_count,
                 count(DISTINCT sfb) AS taste_support_count
            RETURN e.id AS id, e.title AS title, e.date AS date, e.venue AS venue,
                   e.city AS city, e.country AS country, e.country_code AS country_code,
                   e.ticket_url AS ticket_url,
                   e.lat AS lat, e.lon AS lon,
                   headliners[0] AS headliner,
                   supporting, friends_interested, is_interested,
                   taste_headliner_count, taste_support_count
            """,
            event_id=event_id,
            user_id=user_id,
        )
        record = result.single()
        if not record:
            return None
        return dict(record)

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
                "MATCH (u:User {id: $uid}), (e:Event {id: $eid})"
                " CREATE (u)-[:INTERESTED_IN {created_at: $now}]->(e)",
                uid=user_id,
                eid=event_id,
                now=self._now(),
            )
            return True
