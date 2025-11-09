#!/usr/bin/env python3
"""
Standalone Spotify Connection Test
Kann direkt ausgeführt werden ohne Docker
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Import and run tests
from tests.test_spotify_connection import run_tests_standalone

if __name__ == "__main__":
    run_tests_standalone()

