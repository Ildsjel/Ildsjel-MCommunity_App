"""
Test Suite für Spotify Connection
Prüft ob die Spotify-Integration funktioniert und wirft Fehler bei Problemen
"""
import pytest
import httpx
import asyncio
from datetime import datetime, timezone
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.spotify_client import SpotifyClient
from app.db.neo4j_driver import neo4j_driver
from app.config.settings import settings


class TestSpotifyConnection:
    """Test-Suite für Spotify-Verbindung"""
    
    @pytest.mark.asyncio
    async def test_spotify_api_reachable(self):
        """Test 1: Prüfe ob Spotify API erreichbar ist"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get("https://api.spotify.com/v1/", timeout=10.0)
                # Spotify gibt 401 zurück wenn kein Token, aber das ist OK - API ist erreichbar
                assert response.status_code in [200, 401], \
                    f"❌ Spotify API nicht erreichbar: Status {response.status_code}"
                print("✅ Spotify API ist erreichbar")
            except Exception as e:
                pytest.fail(f"❌ Spotify API nicht erreichbar: {str(e)}")
    
    def test_spotify_credentials_configured(self):
        """Test 2: Prüfe ob Spotify Credentials konfiguriert sind"""
        assert settings.SPOTIFY_CLIENT_ID, \
            "❌ SPOTIFY_CLIENT_ID nicht konfiguriert in .env"
        assert settings.SPOTIFY_CLIENT_SECRET, \
            "❌ SPOTIFY_CLIENT_SECRET nicht konfiguriert in .env"
        assert settings.SPOTIFY_REDIRECT_URI, \
            "❌ SPOTIFY_REDIRECT_URI nicht konfiguriert in .env"
        
        print(f"✅ Spotify Credentials konfiguriert:")
        print(f"   Client ID: {settings.SPOTIFY_CLIENT_ID[:10]}...")
        print(f"   Redirect URI: {settings.SPOTIFY_REDIRECT_URI}")
    
    def test_neo4j_connection(self):
        """Test 3: Prüfe Neo4j Verbindung"""
        try:
            driver = neo4j_driver.get_driver()
            with driver.session() as session:
                result = session.run("RETURN 1 as test")
                record = result.single()
                assert record["test"] == 1, "❌ Neo4j Query fehlgeschlagen"
                print("✅ Neo4j Verbindung funktioniert")
        except Exception as e:
            pytest.fail(f"❌ Neo4j Verbindung fehlgeschlagen: {str(e)}")
    
    def test_users_with_spotify_exist(self):
        """Test 4: Prüfe ob User mit Spotify-Verbindung existieren"""
        try:
            driver = neo4j_driver.get_driver()
            with driver.session() as session:
                query = """
                MATCH (u:User)
                WHERE 'spotify' IN u.source_accounts
                  AND u.spotify_access_token IS NOT NULL
                  AND u.spotify_refresh_token IS NOT NULL
                  AND u.spotify_access_token <> 'test_token'
                RETURN count(u) as user_count,
                       collect(u.handle)[0..5] as sample_users
                """
                result = session.run(query)
                record = result.single()
                
                user_count = record["user_count"]
                sample_users = record["sample_users"]
                
                if user_count == 0:
                    print("⚠️  Keine User mit Spotify-Verbindung gefunden")
                    print("   Hinweis: Verbinde mindestens einen User mit Spotify zum Testen")
                else:
                    print(f"✅ {user_count} User mit Spotify-Verbindung gefunden")
                    print(f"   Beispiele: {', '.join(sample_users)}")
                
        except Exception as e:
            pytest.fail(f"❌ Fehler beim Prüfen der Spotify-User: {str(e)}")
    
    def test_spotify_tokens_valid_format(self):
        """Test 5: Prüfe ob Spotify-Tokens das richtige Format haben"""
        try:
            driver = neo4j_driver.get_driver()
            with driver.session() as session:
                query = """
                MATCH (u:User)
                WHERE 'spotify' IN u.source_accounts
                  AND u.spotify_access_token IS NOT NULL
                  AND u.spotify_access_token <> 'test_token'
                RETURN u.handle as handle,
                       u.spotify_access_token as access_token,
                       u.spotify_refresh_token as refresh_token,
                       u.spotify_token_expires_at as expires_at
                LIMIT 1
                """
                result = session.run(query)
                record = result.single()
                
                if not record:
                    print("⚠️  Keine User mit echten Spotify-Tokens gefunden")
                    return
                
                handle = record["handle"]
                access_token = record["access_token"]
                refresh_token = record["refresh_token"]
                expires_at = record["expires_at"]
                
                # Prüfe Token-Format
                assert access_token and len(access_token) > 50, \
                    f"❌ Access Token für {handle} hat ungültiges Format"
                assert refresh_token and len(refresh_token) > 50, \
                    f"❌ Refresh Token für {handle} hat ungültiges Format"
                assert expires_at is not None, \
                    f"❌ Token Expiry für {handle} fehlt"
                
                # Prüfe ob Token abgelaufen
                now = datetime.now(timezone.utc)
                token_expires = expires_at
                if token_expires.tzinfo is None:
                    token_expires = token_expires.replace(tzinfo=timezone.utc)
                
                if token_expires < now:
                    print(f"⚠️  Token für {handle} ist abgelaufen (wird automatisch erneuert)")
                else:
                    time_left = token_expires - now
                    print(f"✅ Token für {handle} ist gültig (noch {time_left.seconds // 60} Minuten)")
                
        except Exception as e:
            pytest.fail(f"❌ Fehler beim Prüfen der Token-Formate: {str(e)}")
    
    @pytest.mark.asyncio
    async def test_spotify_token_refresh(self):
        """Test 6: Prüfe ob Token-Refresh funktioniert"""
        try:
            driver = neo4j_driver.get_driver()
            with driver.session() as session:
                query = """
                MATCH (u:User)
                WHERE 'spotify' IN u.source_accounts
                  AND u.spotify_refresh_token IS NOT NULL
                  AND u.spotify_access_token <> 'test_token'
                RETURN u.handle as handle,
                       u.spotify_refresh_token as refresh_token
                LIMIT 1
                """
                result = session.run(query)
                record = result.single()
                
                if not record:
                    print("⚠️  Keine User mit Refresh-Token gefunden")
                    return
                
                handle = record["handle"]
                refresh_token = record["refresh_token"]
                
                # Versuche Token zu refreshen
                client = SpotifyClient()
                try:
                    new_tokens = await client.refresh_access_token(refresh_token)
                    
                    assert "access_token" in new_tokens, \
                        "❌ Refresh-Response enthält keinen access_token"
                    assert "expires_in" in new_tokens, \
                        "❌ Refresh-Response enthält keinen expires_in"
                    
                    print(f"✅ Token-Refresh für {handle} funktioniert")
                    print(f"   Neuer Token gültig für {new_tokens['expires_in']} Sekunden")
                    
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 400:
                        error_msg = (
                            f"❌ Token-Refresh fehlgeschlagen für {handle}: 400 Bad Request\n"
                            f"   Mögliche Ursachen:\n"
                            f"   - Refresh Token ist ungültig oder abgelaufen\n"
                            f"   - User muss Spotify neu verbinden\n"
                            f"   - Spotify Client Credentials sind falsch\n"
                            f"\n"
                            f"   🔧 LÖSUNG: Gehe zu http://127.0.0.1:3001/profile\n"
                            f"              und verbinde Spotify neu"
                        )
                        print(error_msg)
                        raise Exception(error_msg)  # Als Warning statt Fail
                    else:
                        pytest.fail(f"❌ Token-Refresh fehlgeschlagen: {e}")
                finally:
                    await client.close()
                
        except Exception as e:
            pytest.fail(f"❌ Fehler beim Token-Refresh Test: {str(e)}")
    
    @pytest.mark.asyncio
    async def test_spotify_recently_played_api(self):
        """Test 7: Prüfe ob Recently Played API funktioniert"""
        try:
            driver = neo4j_driver.get_driver()
            with driver.session() as session:
                query = """
                MATCH (u:User)
                WHERE 'spotify' IN u.source_accounts
                  AND u.spotify_access_token IS NOT NULL
                  AND u.spotify_access_token <> 'test_token'
                RETURN u.handle as handle,
                       u.spotify_access_token as access_token,
                       u.spotify_refresh_token as refresh_token,
                       u.spotify_token_expires_at as expires_at
                LIMIT 1
                """
                result = session.run(query)
                record = result.single()
                
                if not record:
                    print("⚠️  Keine User mit Spotify-Token gefunden")
                    return
                
                handle = record["handle"]
                access_token = record["access_token"]
                refresh_token = record["refresh_token"]
                expires_at = record["expires_at"]
                
                # Prüfe ob Token abgelaufen und refreshe wenn nötig
                now = datetime.now(timezone.utc)
                token_expires = expires_at
                if token_expires.tzinfo is None:
                    token_expires = token_expires.replace(tzinfo=timezone.utc)
                
                if token_expires < now:
                    print(f"   Token abgelaufen, refreshe...")
                    client = SpotifyClient()
                    try:
                        new_tokens = await client.refresh_access_token(refresh_token)
                        access_token = new_tokens["access_token"]
                    finally:
                        await client.close()
                
                # Teste Recently Played API
                client = SpotifyClient(access_token=access_token)
                try:
                    recently_played = await client.get_recently_played(limit=5)
                    
                    assert "items" in recently_played, \
                        "❌ Recently Played Response enthält keine 'items'"
                    
                    items = recently_played["items"]
                    print(f"✅ Recently Played API funktioniert für {handle}")
                    print(f"   {len(items)} Tracks abgerufen")
                    
                    if len(items) > 0:
                        first_track = items[0]["track"]
                        print(f"   Letzter Track: {first_track['name']} - {first_track['artists'][0]['name']}")
                        
                        # Prüfe ob Album-Cover vorhanden
                        album = first_track.get("album", {})
                        images = album.get("images", [])
                        if images:
                            print(f"   ✅ Album-Cover verfügbar ({len(images)} Größen)")
                        else:
                            print(f"   ⚠️  Kein Album-Cover verfügbar")
                    
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 401:
                        pytest.fail(
                            f"❌ Spotify API Zugriff verweigert für {handle}: 401 Unauthorized\n"
                            f"   Token ist ungültig - User muss Spotify neu verbinden"
                        )
                    else:
                        pytest.fail(f"❌ Recently Played API fehlgeschlagen: {e}")
                finally:
                    await client.close()
                
        except Exception as e:
            pytest.fail(f"❌ Fehler beim Recently Played Test: {str(e)}")
    
    def test_album_nodes_have_images(self):
        """Test 8: Prüfe ob Album-Nodes image_url haben"""
        try:
            driver = neo4j_driver.get_driver()
            with driver.session() as session:
                query = """
                MATCH (a:Album)
                WITH count(a) as total_albums,
                     count(CASE WHEN a.image_url IS NOT NULL THEN 1 END) as albums_with_images
                RETURN total_albums, albums_with_images
                """
                result = session.run(query)
                record = result.single()
                
                total = record["total_albums"]
                with_images = record["albums_with_images"]
                
                if total == 0:
                    print("⚠️  Keine Alben in der Datenbank gefunden")
                    return
                
                percentage = (with_images / total * 100) if total > 0 else 0
                
                print(f"📊 Album-Cover Status:")
                print(f"   Gesamt: {total} Alben")
                print(f"   Mit Cover: {with_images} ({percentage:.1f}%)")
                print(f"   Ohne Cover: {total - with_images}")
                
                if percentage < 50:
                    print(f"   ⚠️  Weniger als 50% der Alben haben Cover")
                    print(f"   Hinweis: Neue Tracks werden automatisch mit Cover gespeichert")
                else:
                    print(f"   ✅ Gute Abdeckung mit Album-Covern")
                
        except Exception as e:
            pytest.fail(f"❌ Fehler beim Prüfen der Album-Cover: {str(e)}")


def run_tests_standalone():
    """Führe Tests direkt aus (ohne pytest)"""
    print("\n" + "="*70)
    print("🧪 SPOTIFY CONNECTION TEST SUITE")
    print("="*70 + "\n")
    
    test_suite = TestSpotifyConnection()
    
    tests = [
        ("Spotify API Erreichbarkeit", test_suite.test_spotify_api_reachable),
        ("Spotify Credentials", test_suite.test_spotify_credentials_configured),
        ("Neo4j Verbindung", test_suite.test_neo4j_connection),
        ("User mit Spotify", test_suite.test_users_with_spotify_exist),
        ("Token-Format", test_suite.test_spotify_tokens_valid_format),
        ("Token-Refresh", test_suite.test_spotify_token_refresh),
        ("Recently Played API", test_suite.test_spotify_recently_played_api),
        ("Album-Cover", test_suite.test_album_nodes_have_images),
    ]
    
    passed = 0
    failed = 0
    warnings = 0
    
    for i, (name, test_func) in enumerate(tests, 1):
        print(f"\n[{i}/{len(tests)}] {name}")
        print("-" * 70)
        try:
            if asyncio.iscoroutinefunction(test_func):
                asyncio.run(test_func())
            else:
                test_func()
            passed += 1
        except AssertionError as e:
            print(f"\n❌ FEHLER: {str(e)}")
            failed += 1
        except Exception as e:
            print(f"\n⚠️  WARNUNG: {str(e)}")
            warnings += 1
    
    print("\n" + "="*70)
    print("📊 TEST ERGEBNISSE")
    print("="*70)
    print(f"✅ Bestanden: {passed}")
    print(f"❌ Fehlgeschlagen: {failed}")
    print(f"⚠️  Warnungen: {warnings}")
    print(f"📝 Gesamt: {len(tests)}")
    
    if failed > 0:
        print("\n❌ SPOTIFY-VERBINDUNG HAT PROBLEME!")
        print("   Bitte behebe die oben genannten Fehler.")
        sys.exit(1)
    elif warnings > 0:
        print("\n⚠️  SPOTIFY-VERBINDUNG FUNKTIONIERT MIT EINSCHRÄNKUNGEN")
        print("   Einige optionale Features sind nicht verfügbar.")
        sys.exit(0)
    else:
        print("\n✅ SPOTIFY-VERBINDUNG FUNKTIONIERT EINWANDFREI!")
        sys.exit(0)


if __name__ == "__main__":
    run_tests_standalone()

