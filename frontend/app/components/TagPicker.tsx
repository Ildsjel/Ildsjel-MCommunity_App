'use client'

/**
 * TagPicker — inline tag-selector for the band detail page.
 *
 * Displays a small "＋ TAG" button.  Clicking it opens a search box that
 * filters the full ontology (Genre nodes and Tag nodes).  Selecting an item
 * immediately calls addBandTags and fires onDone so the parent can reload
 * the band.
 *
 * Admin users additionally see a "Create '…'" option when no match is found,
 * which calls the admin API to create a new Tag node and then applies it.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Box } from '@mui/material'
import {
  listGenres,
  listTags,
  flattenGenreTree,
  addBandTags,
  type BandGenre,
  type BandTag,
} from '@/lib/bandsApi'
import { adminAPI } from '@/lib/adminAPI'

// ── Types ─────────────────────────────────────────────────────────────────────

type OntologyKind = 'genre' | 'tag'

interface OntologyItem {
  id: string
  slug: string
  name: string
  kind: OntologyKind
  category?: string // tags only
}

interface TagPickerProps {
  bandId: string
  appliedGenreIds: string[]
  appliedTagIds: string[]
  isAdmin: boolean
  onDone: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

const mono: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.4375rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TagPicker({
  bandId,
  appliedGenreIds,
  appliedTagIds,
  isAdmin,
  onDone,
}: TagPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [ontology, setOntology] = useState<OntologyItem[]>([])
  const [loadingOntology, setLoadingOntology] = useState(false)
  const [applying, setApplying] = useState<string | null>(null) // id of item being applied
  const [applyError, setApplyError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Load ontology once on first open ────────────────────────────────────────
  useEffect(() => {
    if (!open || ontology.length > 0) return
    setLoadingOntology(true)
    Promise.all([listGenres(), listTags()])
      .then(([genreTree, tags]) => {
        const genres: OntologyItem[] = flattenGenreTree(genreTree).map((g: BandGenre) => ({
          id: g.id,
          slug: g.slug,
          name: g.name,
          kind: 'genre' as OntologyKind,
        }))
        const tagItems: OntologyItem[] = tags.map((t: BandTag) => ({
          id: t.id,
          slug: t.slug,
          name: t.name,
          kind: 'tag' as OntologyKind,
          category: t.category,
        }))
        setOntology([...genres, ...tagItems])
      })
      .finally(() => setLoadingOntology(false))
  }, [open, ontology.length])

  // ── Focus input on open ─────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setApplyError(null)
    } else {
      setQuery('')
      setApplyError(null)
    }
  }, [open])

  // ── Close on outside click ───────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // ── Filtered results (exclude already applied) ───────────────────────────────
  const appliedIds = new Set([...appliedGenreIds, ...appliedTagIds])

  const filtered = ontology.filter(
    (item) =>
      !appliedIds.has(item.id) &&
      item.name.toLowerCase().includes(query.toLowerCase()),
  )

  const genres = filtered.filter((i) => i.kind === 'genre')
  const tags = filtered.filter((i) => i.kind === 'tag')

  const showCreateOption =
    isAdmin &&
    query.trim().length >= 2 &&
    !ontology.some((i) => i.name.toLowerCase() === query.toLowerCase())

  // ── Apply a tag ──────────────────────────────────────────────────────────────
  const handleApply = useCallback(
    async (item: OntologyItem) => {
      setApplying(item.id)
      setApplyError(null)
      try {
        if (item.kind === 'genre') {
          await addBandTags(bandId, [item.id], [])
        } else {
          await addBandTags(bandId, [], [item.id])
        }
        setOpen(false)
        onDone()
      } catch (err: unknown) {
        // Check for 401 specifically — token expired or not logged in
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 401) {
          setApplyError('Session expired — please log in again')
        } else {
          setApplyError('Failed to apply tag')
        }
      } finally {
        setApplying(null)
      }
    },
    [bandId, onDone],
  )

  // ── Admin: create new tag and immediately apply it ────────────────────────────
  const handleCreate = useCallback(async () => {
    const name = query.trim()
    if (!name) return
    const slug = slugify(name)
    if (!slug) return
    setApplying('__create__')
    setApplyError(null)
    try {
      const newTag = await adminAPI.createTag({ slug, name, category: 'genre' })
      await addBandTags(bandId, [], [newTag.id])
      setOpen(false)
      onDone()
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        setApplyError('Session expired — please log in again')
      } else {
        setApplyError('Could not create tag')
      }
    } finally {
      setApplying(null)
    }
  }, [bandId, query, onDone])

  // ── Keyboard navigation ───────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false)
    if (e.key === 'Enter' && showCreateOption && filtered.length === 0) {
      e.preventDefault()
      handleCreate()
    }
  }

  // ── Row renderer ──────────────────────────────────────────────────────────────
  const Row = ({ item }: { item: OntologyItem }) => {
    const isBusy = applying === item.id
    return (
      <Box
        component="button"
        onClick={() => handleApply(item)}
        disabled={isBusy}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: isBusy ? 'default' : 'pointer',
          px: 1.25,
          py: 0.625,
          textAlign: 'left',
          '&:hover:not(:disabled)': { backgroundColor: 'rgba(216,207,184,0.06)' },
        }}
      >
        <span style={{
          ...mono,
          fontSize: '0.375rem',
          color: item.kind === 'genre' ? 'var(--accent, #c43a2a)' : 'rgba(154,122,191,0.9)',
          flexShrink: 0,
        }}>
          {item.kind === 'genre' ? '◉' : '◈'}
        </span>
        <span style={{ ...mono, color: 'rgba(236,229,211,0.8)', fontSize: '0.4375rem' }}>
          {item.name}
        </span>
        {item.category && item.kind === 'tag' && (
          <span style={{ ...mono, fontSize: '0.375rem', color: 'var(--muted, #7A756D)', marginLeft: 'auto' }}>
            {item.category}
          </span>
        )}
        {isBusy && (
          <span style={{ ...mono, fontSize: '0.375rem', color: 'var(--muted)', marginLeft: 'auto' }}>…</span>
        )}
      </Box>
    )
  }

  return (
    <Box ref={containerRef} sx={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger button */}
      <Box
        component="button"
        onClick={() => setOpen((o) => !o)}
        sx={{
          background: 'none',
          border: '1px dashed rgba(216,207,184,0.25)',
          borderRadius: '2px',
          px: 0.75,
          height: 18,
          display: 'inline-flex',
          alignItems: 'center',
          cursor: 'pointer',
          ...mono,
          color: 'var(--muted, #7A756D)',
          '&:hover': { borderColor: 'rgba(216,207,184,0.45)', color: 'var(--ink, #ece5d3)' },
          transition: 'color 0.1s, border-color 0.1s',
        }}
      >
        ＋ TAG
      </Box>

      {/* Dropdown */}
      {open && (
        <Box
          sx={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 200,
            width: 220,
            backgroundColor: '#100d16',
            border: '1.5px solid rgba(216,207,184,0.2)',
            borderRadius: '3px',
            boxShadow: '4px 4px 0 rgba(0,0,0,0.6)',
            overflow: 'hidden',
          }}
        >
          {/* Search input */}
          <Box sx={{ px: 1.25, py: 0.875, borderBottom: '1px solid rgba(216,207,184,0.1)' }}>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="search ontology…"
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                outline: 'none',
                ...mono,
                color: 'rgba(236,229,211,0.9)',
                caretColor: 'var(--accent, #c43a2a)',
              }}
            />
          </Box>

          {/* Results */}
          <Box sx={{ maxHeight: 220, overflowY: 'auto', py: 0.5 }}>
            {loadingOntology && (
              <Box sx={{ px: 1.25, py: 0.75 }}>
                <span style={{ ...mono, color: 'var(--muted)' }}>loading…</span>
              </Box>
            )}

            {!loadingOntology && genres.length > 0 && (
              <>
                <Box sx={{ px: 1.25, pt: 0.5, pb: 0.25 }}>
                  <span style={{ ...mono, fontSize: '0.375rem', color: 'var(--muted)' }}>GENRES</span>
                </Box>
                {genres.map((item) => <Row key={item.id} item={item} />)}
              </>
            )}

            {!loadingOntology && tags.length > 0 && (
              <>
                <Box sx={{ px: 1.25, pt: 0.75, pb: 0.25 }}>
                  <span style={{ ...mono, fontSize: '0.375rem', color: 'var(--muted)' }}>TAGS</span>
                </Box>
                {tags.map((item) => <Row key={item.id} item={item} />)}
              </>
            )}

            {!loadingOntology && filtered.length === 0 && !showCreateOption && (
              <Box sx={{ px: 1.25, py: 0.75 }}>
                <span style={{ ...mono, color: 'var(--muted)' }}>
                  {query ? 'no matches' : 'all tags applied'}
                </span>
              </Box>
            )}

            {applyError && (
              <Box sx={{ px: 1.25, py: 0.625, borderTop: '1px solid rgba(196,58,42,0.3)' }}>
                <span style={{ ...mono, fontSize: '0.375rem', color: 'var(--accent, #c43a2a)' }}>
                  ⚠ {applyError}
                </span>
              </Box>
            )}

            {showCreateOption && (
              <Box
                component="button"
                onClick={handleCreate}
                disabled={applying === '__create__'}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  borderTop: filtered.length > 0 ? '1px solid rgba(216,207,184,0.08)' : 'none',
                  cursor: applying === '__create__' ? 'default' : 'pointer',
                  px: 1.25,
                  py: 0.75,
                  mt: filtered.length > 0 ? 0.5 : 0,
                  '&:hover:not(:disabled)': { backgroundColor: 'rgba(216,207,184,0.06)' },
                }}
              >
                <span style={{ ...mono, fontSize: '0.375rem', color: 'rgba(154,122,191,0.9)' }}>＋</span>
                <span style={{ ...mono, fontSize: '0.4375rem', color: 'rgba(154,122,191,0.9)' }}>
                  {applying === '__create__' ? 'creating…' : `Create "${query.trim()}"`}
                </span>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  )
}
