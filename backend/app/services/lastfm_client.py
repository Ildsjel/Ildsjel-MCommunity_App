"""
Last.fm API Client — auth and user data
"""
import hashlib
import httpx
from typing import Optional, Dict, Any


class LastFmClient:
    BASE_URL = "https://ws.audioscrobbler.com/2.0/"
    AUTH_URL = "https://www.last.fm/api/auth/"

    def __init__(self, api_key: str, api_secret: str, session_key: Optional[str] = None):
        self.api_key = api_key
        self.api_secret = api_secret
        self.session_key = session_key
        self.client = httpx.AsyncClient(timeout=30.0)

    def _sign(self, params: Dict[str, str]) -> str:
        filtered = {k: v for k, v in params.items() if k != "format"}
        sig = "".join(f"{k}{v}" for k, v in sorted(filtered.items()))
        return hashlib.md5((sig + self.api_secret).encode("utf-8")).hexdigest()

    def get_auth_url(self, callback_url: str) -> str:
        return f"{self.AUTH_URL}?api_key={self.api_key}&cb={callback_url}"

    async def get_session(self, token: str) -> Dict[str, Any]:
        params = {
            "method": "auth.getSession",
            "api_key": self.api_key,
            "token": token,
        }
        params["api_sig"] = self._sign(params)
        params["format"] = "json"
        r = await self.client.get(self.BASE_URL, params=params)
        r.raise_for_status()
        data = r.json()
        if "error" in data:
            raise Exception(f"Last.fm error {data['error']}: {data.get('message')}")
        return data["session"]

    async def get_user_top_artists(
        self, username: str, period: str = "overall", limit: int = 50
    ) -> Dict[str, Any]:
        r = await self.client.get(
            self.BASE_URL,
            params={
                "method": "user.getTopArtists",
                "user": username,
                "period": period,
                "limit": str(limit),
                "api_key": self.api_key,
                "format": "json",
            },
        )
        r.raise_for_status()
        return r.json()

    async def get_user_top_albums(
        self, username: str, period: str = "overall", limit: int = 50
    ) -> Dict[str, Any]:
        r = await self.client.get(
            self.BASE_URL,
            params={
                "method": "user.getTopAlbums",
                "user": username,
                "period": period,
                "limit": str(limit),
                "api_key": self.api_key,
                "format": "json",
            },
        )
        r.raise_for_status()
        return r.json()

    async def get_user_top_tags(self, username: str, limit: int = 20) -> Dict[str, Any]:
        r = await self.client.get(
            self.BASE_URL,
            params={
                "method": "user.getTopTags",
                "user": username,
                "limit": str(limit),
                "api_key": self.api_key,
                "format": "json",
            },
        )
        r.raise_for_status()
        return r.json()

    async def get_user_info(self, username: str) -> Dict[str, Any]:
        r = await self.client.get(
            self.BASE_URL,
            params={
                "method": "user.getInfo",
                "user": username,
                "api_key": self.api_key,
                "format": "json",
            },
        )
        r.raise_for_status()
        return r.json()

    async def close(self):
        await self.client.aclose()
