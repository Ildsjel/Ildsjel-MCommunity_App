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

        Returns per-event:
          - headliner, supporting bands
          - my_rsvp  ("interested" | "going" | null)
          - friends_going / friends_interested (avatar lists, friends only)
          - taste_headliner_count / taste_support_count
        """
        result = self.session.run(
            """
            MATCH (e:Event) WHERE e.date >= $today
            OPTIONAL MATCH (h:Band)-[:HEADLINES]->(e)
            OPTIONAL MATCH (s:Band)-[:SUPPORTS]->(e)
            // Friends' RSVPs (all statuses)
            OPTIONAL MATCH (:User {id: $user_id})-[:FRIEND_REQUEST {status: 'accepted'}]-(f:User)
                           -[fRsvp:INTERESTED_IN]->(e)
            // My own RSVP
            OPTIONAL MATCH (:User {id: $user_id})-[myRsvp:INTERESTED_IN]->(e)
            // Taste signals
            OPTIONAL MATCH (:User {id: $user_id})-[:FAVOURITE_BAND]->(hfb:Band)-[:HEADLINES]->(e)
            OPTIONAL MATCH (:User {id: $user_id})-[:FAVOURITE_BAND]->(sfb:Band)-[:SUPPORTS]->(e)
            WITH e,
                 [x IN collect(DISTINCT CASE WHEN h IS NOT NULL
                      THEN {id: h.id, name: h.name, slug: h.slug} END)
                  WHERE x IS NOT NULL] AS headliners,
                 [x IN collect(DISTINCT CASE WHEN s IS NOT NULL
                      THEN {id: s.id, name: s.name, slug: s.slug} END)
                  WHERE x IS NOT NULL] AS supporting,
                 // Friends split by status
                 [x IN collect(DISTINCT CASE WHEN f IS NOT NULL AND fRsvp.status = 'going'
                      THEN {id: f.id, handle: f.handle,
                            profile_image_url: f.profile_image_url} END)
                  WHERE x IS NOT NULL] AS friends_going,
                 [x IN collect(DISTINCT CASE WHEN f IS NOT NULL
                                              AND (fRsvp.status = 'interested'
                                                   OR fRsvp.status IS NULL)
                      THEN {id: f.id, handle: f.handle,
                            profile_image_url: f.profile_image_url} END)
                  WHERE x IS NOT NULL] AS friends_interested,
                 // My RSVP: "going" | "interested" | null
                 max(CASE WHEN myRsvp IS NOT NULL
                      THEN COALESCE(myRsvp.status, 'interested')
                      ELSE null END) AS my_rsvp,
                 count(DISTINCT hfb) AS taste_headliner_count,
                 count(DISTINCT sfb) AS taste_support_count
            RETURN e.id AS id, e.title AS title, e.date AS date, e.venue AS venue,
                   e.city AS city, e.country AS country, e.country_code AS country_code,
                   e.ticket_url AS ticket_url,
                   e.lat AS lat, e.lon AS lon,
                   headliners[0] AS headliner,
                   supporting, friends_going, friends_interested,
                   my_rsvp,
                   taste_headliner_count, taste_support_count
            ORDER BY e.date ASC
            SKIP $skip LIMIT $limit
            """,
            today=today_str,
            user_id=user_id,
            skip=skip,
            limit=limit,
        )
        return [dict(record) for record in result]

    def count_upcoming(self, today_str: str) -> int:
        result = self.session.run(
            "MATCH (e:Event) WHERE e.date >= $today RETURN count(e) AS cnt",
            today=today_str,
        )
        rec = result.single()
        return rec["cnt"] if rec else 0

    def get_event(self, event_id: str, user_id: str) -> Optional[dict]:
        """
        Load a single event with full RSVP data:
          - my_rsvp, friends_going, friends_interested (avatar lists)
          - going_count, interested_count (all users)
        """
        result = self.session.run(
            """
            MATCH (e:Event {id: $event_id})
            OPTIONAL MATCH (h:Band)-[:HEADLINES]->(e)
            OPTIONAL MATCH (s:Band)-[:SUPPORTS]->(e)
            // Friends' RSVPs
            OPTIONAL MATCH (:User {id: $user_id})-[:FRIEND_REQUEST {status: 'accepted'}]-(f:User)
                           -[fRsvp:INTERESTED_IN]->(e)
            // My RSVP
            OPTIONAL MATCH (:User {id: $user_id})-[myRsvp:INTERESTED_IN]->(e)
            // Taste
            OPTIONAL MATCH (:User {id: $user_id})-[:FAVOURITE_BAND]->(hfb:Band)-[:HEADLINES]->(e)
            OPTIONAL MATCH (:User {id: $user_id})-[:FAVOURITE_BAND]->(sfb:Band)-[:SUPPORTS]->(e)
            WITH e,
                 [x IN collect(DISTINCT CASE WHEN h IS NOT NULL
                      THEN {id: h.id, name: h.name, slug: h.slug} END)
                  WHERE x IS NOT NULL] AS headliners,
                 [x IN collect(DISTINCT CASE WHEN s IS NOT NULL
                      THEN {id: s.id, name: s.name, slug: s.slug} END)
                  WHERE x IS NOT NULL] AS supporting,
                 [x IN collect(DISTINCT CASE WHEN f IS NOT NULL AND fRsvp.status = 'going'
                      THEN {id: f.id, handle: f.handle,
                            profile_image_url: f.profile_image_url} END)
                  WHERE x IS NOT NULL] AS friends_going,
                 [x IN collect(DISTINCT CASE WHEN f IS NOT NULL
                                              AND (fRsvp.status = 'interested'
                                                   OR fRsvp.status IS NULL)
                      THEN {id: f.id, handle: f.handle,
                            profile_image_url: f.profile_image_url} END)
                  WHERE x IS NOT NULL] AS friends_interested,
                 max(CASE WHEN myRsvp IS NOT NULL
                      THEN COALESCE(myRsvp.status, 'interested')
                      ELSE null END) AS my_rsvp,
                 count(DISTINCT hfb) AS taste_headliner_count,
                 count(DISTINCT sfb) AS taste_support_count
            // Now add global counts (single event, so extra matches are cheap)
            OPTIONAL MATCH (goingUser:User)-[goR:INTERESTED_IN {status: 'going'}]->(e)
            OPTIONAL MATCH (intUser:User)-[inR:INTERESTED_IN]->(e)
                WHERE inR.status = 'interested' OR inR.status IS NULL
            WITH e, headliners, supporting, friends_going, friends_interested,
                 my_rsvp, taste_headliner_count, taste_support_count,
                 count(DISTINCT goingUser) AS going_count,
                 count(DISTINCT intUser)   AS interested_count
            RETURN e.id AS id, e.title AS title, e.date AS date, e.venue AS venue,
                   e.city AS city, e.country AS country, e.country_code AS country_code,
                   e.ticket_url AS ticket_url,
                   e.lat AS lat, e.lon AS lon,
                   headliners[0] AS headliner,
                   supporting, friends_going, friends_interested,
                   my_rsvp, going_count, interested_count,
                   taste_headliner_count, taste_support_count
            """,
            event_id=event_id,
            user_id=user_id,
        )
        record = result.single()
        if not record:
            return None
        return dict(record)

    def get_event_counts(self, event_id: str) -> dict:
        """Return going_count + interested_count for a single event (used after RSVP toggle)."""
        result = self.session.run(
            """
            MATCH (e:Event {id: $eid})
            OPTIONAL MATCH (goingUser:User)-[:INTERESTED_IN {status: 'going'}]->(e)
            OPTIONAL MATCH (intUser:User)-[inR:INTERESTED_IN]->(e)
                WHERE inR.status = 'interested' OR inR.status IS NULL
            RETURN count(DISTINCT goingUser) AS going_count,
                   count(DISTINCT intUser)   AS interested_count
            """,
            eid=event_id,
        )
        rec = result.single()
        if not rec:
            return {"going_count": 0, "interested_count": 0}
        return {"going_count": rec["going_count"], "interested_count": rec["interested_count"]}

    def get_attendees(self, event_id: str, status: str, requesting_user_id: str) -> List[dict]:
        """
        Return all attendees for a given RSVP status, sorted:
          friends first → shared bands desc → handle asc
        """
        result = self.session.run(
            """
            MATCH (u:User)-[r:INTERESTED_IN]->(e:Event {id: $eid})
            WHERE r.status = $status
               OR ($status = 'interested' AND r.status IS NULL)
            OPTIONAL MATCH (:User {id: $uid})-[fr:FRIEND_REQUEST {status: 'accepted'}]-(u)
            OPTIONAL MATCH (:User {id: $uid})-[:FAVOURITE_BAND]->(mb:Band)<-[:FAVOURITE_BAND]-(u)
            WITH u,
                 count(DISTINCT fr) > 0 AS is_friend,
                 count(DISTINCT mb)     AS shared_bands
            ORDER BY is_friend DESC, shared_bands DESC, u.handle ASC
            RETURN u.id AS id, u.handle AS handle,
                   u.profile_image_url AS profile_image_url,
                   is_friend, shared_bands
            """,
            eid=event_id,
            status=status,
            uid=requesting_user_id,
        )
        return [dict(r) for r in result]

    def set_rsvp(self, user_id: str, event_id: str, status: str) -> Optional[str]:
        """
        Toggle-style RSVP:
          - Same status already set → remove (returns None)
          - Different status set → update (returns new status)
          - No RSVP → create (returns status)

        ``status`` must be "interested" or "going".
        """
        check = self.session.run(
            """
            MATCH (u:User {id: $uid})-[r:INTERESTED_IN]->(e:Event {id: $eid})
            RETURN r.status AS current_status
            """,
            uid=user_id,
            eid=event_id,
        )
        rec = check.single()

        if rec is not None:
            current = rec["current_status"] or "interested"  # legacy null → interested
            if current == status:
                # Toggle off
                self.session.run(
                    "MATCH (u:User {id: $uid})-[r:INTERESTED_IN]->(e:Event {id: $eid}) DELETE r",
                    uid=user_id,
                    eid=event_id,
                )
                return None
            else:
                # Switch status
                self.session.run(
                    """
                    MATCH (u:User {id: $uid})-[r:INTERESTED_IN]->(e:Event {id: $eid})
                    SET r.status = $status, r.updated_at = $now
                    """,
                    uid=user_id,
                    eid=event_id,
                    status=status,
                    now=self._now(),
                )
                return status
        else:
            # No existing RSVP — create
            self.session.run(
                """
                MATCH (u:User {id: $uid}), (e:Event {id: $eid})
                CREATE (u)-[:INTERESTED_IN {status: $status, created_at: $now}]->(e)
                """,
                uid=user_id,
                eid=event_id,
                status=status,
                now=self._now(),
            )
            return status

    # ── Backwards-compat alias ────────────────────────────────────────────────

    def toggle_interest(self, user_id: str, event_id: str) -> bool:
        """Legacy: toggle 'interested' status. True = now interested."""
        result = self.set_rsvp(user_id, event_id, "interested")
        return result is not None

    # ── Write ─────────────────────────────────────────────────────────────────

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
