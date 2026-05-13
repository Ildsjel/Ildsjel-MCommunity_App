"""
In-memory JWT token blacklist.

Used by POST /auth/logout and DELETE /users/me to immediately revoke tokens
without needing Redis.  Tokens are stored with their expiry timestamp; an
automatic sweep removes expired entries so memory doesn't grow unbounded.

Limitation: the blacklist is process-local.  With multiple workers or after a
server restart, blacklisted tokens become valid again.  Replace with a Redis
SET + EXPIREAT for production multi-process deployments.
"""
import threading
import time
from typing import Dict


class _TokenBlacklist:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        # jti/token_string → unix expiry timestamp
        self._entries: Dict[str, float] = {}

    def add(self, token: str, expires_at: float) -> None:
        """Add a token to the blacklist.  expires_at is a Unix timestamp."""
        self._sweep()
        with self._lock:
            self._entries[token] = expires_at

    def is_revoked(self, token: str) -> bool:
        """Return True when the token is on the blacklist and not yet expired."""
        self._sweep()
        with self._lock:
            exp = self._entries.get(token)
            if exp is None:
                return False
            if time.time() > exp:
                # Already past expiry – no longer needed in the set
                del self._entries[token]
                return False
            return True

    def _sweep(self) -> None:
        """Remove entries whose expiry has already passed."""
        now = time.time()
        with self._lock:
            expired = [t for t, exp in self._entries.items() if now > exp]
            for t in expired:
                del self._entries[t]


# Singleton used by the auth router and jwt_handler
blacklist = _TokenBlacklist()
