"""
Name normalisation helpers for band/artist deduplication.

Normalisation rules (v1 — string matching):
  1. Strip leading/trailing whitespace
  2. Lowercase
  3. Collapse any run of internal whitespace to a single space

This deliberately matches how Last.fm sync stores `name_normalized`
(``name.lower().strip()``) while also handling the common "amon  amarth"
double-space edge-case from external sources.

>>> normalize_for_matching("Amon Amarth")
'amon amarth'
>>> normalize_for_matching("  amon  amarth  ")
'amon amarth'
>>> normalize_for_matching("METALLICA")
'metallica'
"""

import re


def normalize_for_matching(name: str) -> str:
    """Return a normalised form of *name* suitable for deduplication matching.

    Steps: strip → lowercase → collapse internal whitespace.
    Intentionally keeps non-ASCII / diacritic characters so that
    "Mgła" stays "mgła" and doesn't spuriously collapse with unrelated names.
    """
    if not name:
        return ""
    n = name.strip().lower()
    # Collapse any run of whitespace (spaces, tabs, non-breaking spaces …)
    n = re.sub(r"\s+", " ", n)
    return n
