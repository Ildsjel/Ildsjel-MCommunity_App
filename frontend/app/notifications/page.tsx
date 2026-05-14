'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import { useNotifications, type Signal, type SignalChannel } from '@/app/context/NotificationContext'
import { useUser } from '@/app/context/UserContext'

// ── Design tokens ────────────────────────────────────────────────────────────
const PAPER   = '#120e18'
const PAPER2  = '#1a1424'
const PAPER3  = '#221a2e'
const INK     = '#ece5d3'
const INK2    = '#c9c2ae'
const MUTED   = '#7a7364'
const ACCENT  = '#c43a2a'
const LINE    = '#d8cfb8'
const LINE_DIM = 'rgba(216,207,184,0.35)'
const BORDER   = `1.5px solid ${LINE_DIM}`

const MONO: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
}
const SERIF_I: React.CSSProperties = {
  fontFamily: 'var(--font-serif, "EB Garamond", serif)',
  fontStyle: 'italic',
}
const DISPLAY: React.CSSProperties = {
  fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
}
const MEDIEVAL: React.CSSProperties = {
  fontFamily: 'var(--font-medieval, "UnifrakturCook", serif)',
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function toRoman(n: number): string {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1]
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I']
  let r = ''
  for (let i = 0; i < vals.length; i++) while (n >= vals[i]) { r += syms[i]; n -= vals[i] }
  return r
}

function getWeekNumber(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'NOW'
  if (m < 60) return `${m}M`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}H`
  return `${Math.floor(h / 24)}D`
}

type Bucket = 'tonight' | 'today' | 'this_week' | 'earlier'

function getBucket(iso: string): Bucket {
  const now = new Date(), then = new Date(iso)
  const diffH = (now.getTime() - then.getTime()) / 3600000
  const sameDay = then.toDateString() === now.toDateString()
  const thenH = then.getHours(), nowH = now.getHours()
  if (sameDay && (thenH >= 16 || (nowH < 4 && diffH < 8))) return 'tonight'
  if (sameDay) return 'today'
  if (diffH < 24 * 7) return 'this_week'
  return 'earlier'
}

const BUCKET_LABELS: Record<Bucket, string> = {
  tonight:   'TONIGHT',
  today:     'TODAY',
  this_week: 'THIS WEEK',
  earlier:   'EARLIER',
}

// ── Filter types ─────────────────────────────────────────────────────────────
type YouFilter      = 'all' | 'matches' | 'messages' | 'horns' | 'comments' | 'mentions' | 'views'
type ActivityFilter = 'all' | 'albums'  | 'reviews'  | 'gigs'  | 'coven'    | 'digest'

const YOU_FILTER_MAP: Record<YouFilter, Signal['type'][]> = {
  all:      ['match','message','horns','comment_photo','mention','profile_view'],
  matches:  ['match'],
  messages: ['message'],
  horns:    ['horns'],
  comments: ['comment_photo'],
  mentions: ['mention'],
  views:    ['profile_view'],
}

const ACT_FILTER_MAP: Record<ActivityFilter, Signal['type'][]> = {
  all:     ['album_drop','concert_nearby','event_reminder','coven_join','friend_going','band_review','weekly_dispatch'],
  albums:  ['album_drop'],
  reviews: ['band_review'],
  gigs:    ['concert_nearby','event_reminder','friend_going'],
  coven:   ['coven_join'],
  digest:  ['weekly_dispatch'],
}

function filterSignals(signals: Signal[], tab: SignalChannel, filter: YouFilter | ActivityFilter): Signal[] {
  const map = tab === 'you' ? YOU_FILTER_MAP : ACT_FILTER_MAP
  const types = (map as Record<string, Signal['type'][]>)[filter] ?? []
  return signals.filter(s => s.channel === tab && types.includes(s.type))
}

function bucketAndSort(signals: Signal[]): [Bucket, Signal[]][] {
  const buckets: Record<Bucket, Signal[]> = { tonight: [], today: [], this_week: [], earlier: [] }
  for (const s of signals) buckets[getBucket(s.createdAt)].push(s)
  const ORDER: Bucket[] = ['tonight','today','this_week','earlier']
  const sort = (arr: Signal[]) => [...arr].sort((a,b) =>
    a.priority !== b.priority ? a.priority - b.priority
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  return ORDER.filter(b => buckets[b].length > 0).map(b => [b, sort(buckets[b])])
}

// ── Glyph circle ─────────────────────────────────────────────────────────────
function Glyph({ type, unread }: { type: Signal['type']; unread: boolean }) {
  const accent = unread && ['match','horns','event_reminder','friend_going'].includes(type)
  const serif  = ['comment_photo','mention','band_review'].includes(type)
  const med    = type === 'coven_join'

  const char: Record<Signal['type'], string> = {
    match: '✶', message: '⌑', horns: '✶', comment_photo: '☍',
    mention: '@', profile_view: '◐', album_drop: '◉',
    concert_nearby: '◉', event_reminder: '◉', coven_join: '☩',
    friend_going: '◉', band_review: '★', weekly_dispatch: '𝔚',
  }

  return (
    <Box sx={{
      width: 24, height: 24, borderRadius: '50%',
      border: `1.5px solid ${accent ? ACCENT : LINE_DIM}`,
      color: accent ? ACCENT : INK2,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, mt: '2px',
      fontSize: serif ? '13px' : med ? '14px' : '11px',
      fontFamily: serif ? 'var(--font-serif,"EB Garamond",serif)'
        : med ? 'var(--font-medieval,"UnifrakturCook",serif)'
        : 'var(--font-display,"Archivo Black",sans-serif)',
      fontStyle: serif ? 'italic' : 'normal',
      fontWeight: serif ? 600 : 400,
      userSelect: 'none',
    }}>
      {char[type]}
    </Box>
  )
}

// ── Avatar stack (for profile views / stacked signals) ────────────────────────
function AvatarStack({ initials, extra = 0 }: { initials: string[]; extra?: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mt: '4px' }}>
      {initials.slice(0, 3).map((i, idx) => (
        <Box key={idx} sx={{
          width: 18, height: 18, borderRadius: '50%',
          border: `1.5px solid ${PAPER}`,
          background: PAPER3, color: INK,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display,"Archivo Black",sans-serif)',
          fontSize: '7.5px',
          ml: idx === 0 ? 0 : '-6px',
        }}>{i}</Box>
      ))}
      {extra > 0 && (
        <Box sx={{
          width: 18, height: 18, borderRadius: '50%',
          border: `1.5px solid ${PAPER}`,
          background: ACCENT, color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display,"Archivo Black",sans-serif)',
          fontSize: '7px', ml: '-6px',
        }}>+{extra}</Box>
      )}
    </Box>
  )
}

// ── Dense row text/meta builders ──────────────────────────────────────────────
function denseText(s: Signal): React.ReactNode {
  const Who = ({ h }: { h: string }) => (
    <span style={{ ...MONO, fontSize: '10px', letterSpacing: '.1em', color: INK }}>{h}</span>
  )
  const Bold = ({ t }: { t: string }) => (
    <span style={{ ...MEDIEVAL, color: INK, letterSpacing: '.01em' }}>{t}</span>
  )
  const Em = ({ t }: { t: string }) => (
    <em style={{ ...SERIF_I, color: INK2 }}>{t}</em>
  )
  const Count = ({ n }: { n: number }) => (
    <span style={{ ...MONO, fontSize: '11px', fontWeight: 500, letterSpacing: '.1em', color: INK }}>{n} others</span>
  )

  switch (s.type) {
    case 'horns':
      return <><Who h={s.fromHandle ?? '?'} /> threw horns at your review of <Bold t={`${s.artistName} — ${s.albumTitle}`} />.</>
    case 'comment_photo':
      return <><Who h={s.fromHandle ?? '?'} /> wrote on your gig photo: <Em t={`"${s.commentSnippet}"`} /></>
    case 'mention':
      return <><Who h={s.fromHandle ?? '?'} /> mentioned you in a discussion under <Bold t={s.threadTitle ?? ''} />.</>
    case 'profile_view': {
      const count = s.viewCount ?? 1
      const handles = s.viewInitials ?? []
      if (handles.length === 1)
        return <><Count n={1} /> soul looked at your sigil.</>
      if (handles.length <= 2)
        return <>{handles.map((h,i) => <span key={i}>{i>0 && ', '}<Who h={h} /></span>)} looked at your sigil.</>
      return <>{handles.slice(0,2).map((h,i) => <span key={i}>{i>0 && ', '}<Who h={h} /></span>)} and <Count n={count - 2} /> looked at your sigil.</>
    }
    case 'event_reminder':
      return <><Bold t={s.eventName ?? ''} /> — doors at {s.doorsAt ?? '?'}, two nights from now.</>
    case 'coven_join':
      return <><Who h={s.fromHandle ?? '?'} /> joined your coven. <Em t={`· ${s.sharedPct ?? 0}% shared`} /></>
    case 'friend_going': {
      const friends = s.friendHandles ?? [s.fromHandle ?? '?']
      return <>{friends.map((h,i) => <span key={i}>{i>0 && ' and '}<Who h={h} /></span>)} {friends.length === 1 ? 'is' : 'are'} going to <Bold t={s.eventName ?? ''} />.</>
    }
    case 'band_review': {
      const count = s.reviewerCount ?? 1
      const bands = (s.bands ?? [s.artistName ?? '']).join(', ')
      if (count === 1)
        return <><Who h={s.fromHandle ?? '?'} /> reviewed <Bold t={`${s.artistName} — ${s.albumTitle}`} />: <Em t={`"${s.reviewSnippet}"`} /></>
      return <><Who h={s.fromHandle ?? '?'} /> and <Count n={count - 1} /> reviewed bands you follow tonight. <Em t={`— ${bands}`} /></>
    }
    default: return null
  }
}

function denseMeta(s: Signal): React.ReactNode {
  const ts = relativeTime(s.createdAt)
  switch (s.type) {
    case 'horns':
      return <>{ts}{s.weeklyHornsCount ? <> · <span style={{ color: INK }}>+{s.weeklyHornsCount} horns this week</span></> : null}</>
    case 'comment_photo': return <>{ts}</>
    case 'mention': return <>{ts}{s.replyCount ? <> · {s.replyCount} replies</> : null}</>
    case 'profile_view':
      return s.viewInitials ? <AvatarStack initials={s.viewInitials} extra={Math.max(0,(s.viewCount??0)-3)} /> : null
    case 'event_reminder':
      return <>{s.venueName}{s.covenGoingCount ? <> · YOU + {s.covenGoingCount} OF COVEN</> : null}</>
    case 'coven_join': return <>{s.fromCity}{s.distanceKm ? <> · {s.distanceKm} KM</> : null}</>
    case 'friend_going': return <>{s.eventDate ? <>{s.eventDate} · </> : null}{s.covenGoingCount ? <>{s.covenGoingCount} of coven going</> : null}</>
    case 'band_review': return <>{ts}</>
    default: return ts
  }
}

function denseRight(s: Signal): React.ReactNode {
  if (s.type === 'event_reminder') return <span>REMINDER</span>
  if (s.type === 'profile_view') return <span>{s.viewTimeRange ?? relativeTime(s.createdAt)}</span>
  if (s.type === 'band_review' && (s.reviewerCount ?? 1) > 1)
    return <><span style={{ ...MONO, fontSize: '11px', color: ACCENT }}>{s.reviewerCount}</span><br /><span>{relativeTime(s.createdAt)}</span></>
  return <span>{relativeTime(s.createdAt)}</span>
}

// ── Dense row ─────────────────────────────────────────────────────────────────
function DenseRow({ s, onRead }: { s: Signal; onRead: (id: string) => void }) {
  const hasThumb = s.type === 'comment_photo' && !!s.photoThumbUrl

  return (
    <Box
      onClick={() => onRead(s.id)}
      sx={{
        display: 'grid',
        gridTemplateColumns: hasThumb ? '28px 1fr 36px' : '28px 1fr auto',
        gap: '10px',
        alignItems: 'start',
        py: '9px', px: '4px',
        borderBottom: `1px dashed ${LINE_DIM}`,
        '&:last-child': { borderBottom: 'none' },
        position: 'relative', cursor: 'pointer',
        '&:hover': { background: 'rgba(216,207,184,.025)' },
      }}
    >
      {!s.read && (
        <Box sx={{ position: 'absolute', left: -8, top: 16, width: 4, height: 4, borderRadius: '50%', background: ACCENT }} />
      )}

      <Glyph type={s.type} unread={!s.read} />

      <Box>
        <Typography sx={{ fontFamily: 'var(--font-serif,"EB Garamond",serif)', fontSize: '13px', lineHeight: 1.3, color: INK }}>
          {denseText(s)}
        </Typography>
        <Box sx={{ ...MONO, fontSize: '9px', color: MUTED, mt: '3px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          {denseMeta(s)}
        </Box>
      </Box>

      {hasThumb ? (
        <Box sx={{
          width: 36, height: 36,
          border: `1px solid ${LINE_DIM}`, background: PAPER3,
          gridColumn: '3 / 4', gridRow: '1 / 3', alignSelf: 'center',
        }} />
      ) : (
        <Box sx={{ ...MONO, fontSize: '9.5px', color: MUTED, textAlign: 'right', mt: '3px' }}>
          {denseRight(s)}
        </Box>
      )}
    </Box>
  )
}

// ── Rich card base ────────────────────────────────────────────────────────────
function Card({ s, ribbon, ribbonDim = false, children, onRead }: {
  s: Signal; ribbon: string; ribbonDim?: boolean; children: React.ReactNode; onRead: (id: string) => void
}) {
  return (
    <Box
      component="article"
      onClick={() => onRead(s.id)}
      sx={{
        border: `1.5px solid ${s.read ? LINE_DIM : ACCENT}`,
        borderRadius: '3px', background: PAPER2,
        p: '12px 14px', my: '4px',
        boxShadow: s.read ? '2px 2px 0 rgba(216,207,184,.1)' : `2px 2px 0 rgba(196,58,42,.2)`,
        position: 'relative', cursor: 'pointer',
        transition: 'transform .1s, box-shadow .1s',
        '&:hover': { transform: 'translate(-1px,-1px)', boxShadow: '3px 3px 0 rgba(216,207,184,.2)' },
      }}
    >
      {!s.read && (
        <Box sx={{ position: 'absolute', left: -8, top: 16, width: 4, height: 4, borderRadius: '50%', background: ACCENT }} />
      )}
      <Box sx={{
        position: 'absolute', top: -9, left: 10,
        background: ribbonDim ? INK : ACCENT, color: ribbonDim ? PAPER : '#fff',
        ...MONO, fontSize: '9px', letterSpacing: '.18em', px: '8px', py: '2px',
      }}>
        {ribbon}
      </Box>
      {children}
    </Box>
  )
}

function Btn({ label, primary, onClick }: { label: string; primary?: boolean; onClick?: () => void }) {
  return (
    <Box
      component="button"
      onClick={e => { e.stopPropagation(); onClick?.() }}
      sx={{
        flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
        py: '7px', px: '8px',
        ...MONO, fontSize: '9px',
        border: `1.5px solid ${primary ? ACCENT : LINE_DIM}`,
        background: primary ? ACCENT : 'transparent',
        color: primary ? '#fff' : INK,
        borderRadius: '3px', cursor: 'pointer',
        '&:hover': { background: primary ? '#e05a3a' : INK, color: primary ? '#fff' : PAPER },
      }}
    >{label}</Box>
  )
}

const CtaRow = ({ children }: { children: React.ReactNode }) => (
  <Box sx={{ display: 'flex', gap: '6px', mt: '12px', pt: '10px', borderTop: `1px dashed ${LINE_DIM}` }}>
    {children}
  </Box>
)

// ── Match card (P0, rich) ──────────────────────────────────────────────────────
function MatchCard({ s, onRead }: { s: Signal; onRead: (id: string) => void }) {
  return (
    <Card s={s} ribbon="NEW MATCH" onRead={onRead}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: '12px', alignItems: 'center' }}>
        <Box sx={{
          width: 48, height: 48, borderRadius: '50%',
          border: `1.5px solid ${LINE_DIM}`, background: PAPER3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          ...DISPLAY, fontSize: '16px', color: INK,
        }}>{s.fromInitial ?? '?'}</Box>
        <Box>
          <Box sx={{ ...MEDIEVAL, fontSize: '20px', color: INK, lineHeight: 1 }}>
            {s.fromHandle ?? 'Unknown'}
          </Box>
          <Box sx={{ ...MONO, fontSize: '9px', color: MUTED, mt: '4px' }}>
            {[s.fromCity, s.fromDistanceKm ? `${s.fromDistanceKm} KM` : null, s.fromLevel ? `LVL ${toRoman(s.fromLevel)}` : null, s.lastActiveAgo ? `ACTIVE ${s.lastActiveAgo}` : null].filter(Boolean).join(' · ')}
          </Box>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Box sx={{ ...DISPLAY, fontSize: '24px', color: ACCENT, lineHeight: 1 }}>
            {s.compatibilityPct ?? 0}
          </Box>
          <Box sx={{ ...MONO, fontSize: '7.5px', color: MUTED, mt: '3px' }}>% PURITY</Box>
        </Box>
      </Box>
      <CtaRow><Btn label="VIEW SIGIL" /><Btn label="✶ THROW HORNS" primary /></CtaRow>
    </Card>
  )
}

// ── Message card (P0, rich) ────────────────────────────────────────────────────
function MessageCard({ s, onRead }: { s: Signal; onRead: (id: string) => void }) {
  return (
    <Card s={s} ribbon="⌑ MESSAGE" ribbonDim onRead={onRead}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: '10px', alignItems: 'start' }}>
        <Box sx={{
          width: 40, height: 40, borderRadius: '50%',
          border: `1.5px solid ${LINE_DIM}`, background: PAPER3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          ...DISPLAY, fontSize: '14px', color: INK,
        }}>{s.fromInitial ?? '?'}</Box>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <Box sx={{ ...MONO, fontSize: '10px', color: INK }}>{s.fromHandle ?? '?'}</Box>
            <Box sx={{ ...MONO, fontSize: '9px', color: MUTED }}>· {relativeTime(s.createdAt)}</Box>
            {(s.unreadMsgCount ?? 0) > 0 && (
              <Box sx={{
                ml: 'auto', background: ACCENT, color: '#fff',
                ...MONO, fontSize: '8.5px', px: '6px', py: '1px', borderRadius: '8px',
              }}>{s.unreadMsgCount} UNREAD</Box>
            )}
          </Box>
          <Box sx={{ ...SERIF_I, fontSize: '13px', lineHeight: 1.3, color: INK, mt: '4px' }}>
            "{s.snippet}"
          </Box>
        </Box>
      </Box>
    </Card>
  )
}

// ── Album drop card (P1, rich) ────────────────────────────────────────────────
function AlbumCard({ s, onRead }: { s: Signal; onRead: (id: string) => void }) {
  return (
    <Card s={s} ribbon="NEW ALBUM" onRead={onRead}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '12px' }}>
        <Box sx={{
          width: 70, height: 70,
          border: `1.5px solid ${LINE_DIM}`,
          background: 'repeating-linear-gradient(45deg,rgba(154,26,26,.3) 0 2px,transparent 2px 5px),linear-gradient(180deg,#2a1818 0%,#0a0a0a 100%)',
          position: 'relative',
          '&::after': { content: '""', position: 'absolute', inset: '8%', border: '1px solid rgba(255,255,255,.15)' },
        }} />
        <Box>
          <Box sx={{ ...MEDIEVAL, fontSize: '19px', color: INK, lineHeight: 1 }}>{s.bandName}</Box>
          <Box sx={{ ...SERIF_I, fontSize: '13px', color: INK2, lineHeight: 1.2, mt: '2px' }}>
            {s.albumName}{s.albumYear ? ` · ${s.albumYear}` : ''}
          </Box>
          <Box sx={{ ...MONO, fontSize: '9px', color: MUTED, mt: '5px', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ color: ACCENT }}>◉ FOLLOWED</span>
            {s.covenListeningCount ? <><span>·</span><span>{s.covenListeningCount} of coven listening</span></> : null}
          </Box>
          <CtaRow><Btn label="REVIEW" /><Btn label="↗ LISTEN" primary /></CtaRow>
        </Box>
      </Box>
    </Card>
  )
}

// ── Concert card (P1, rich) ───────────────────────────────────────────────────
function ConcertCard({ s, onRead }: { s: Signal; onRead: (id: string) => void }) {
  const date = s.eventDate ? new Date(s.eventDate) : null
  const day = date ? date.getDate() : '?'
  const mon = date ? date.toLocaleString('en', { month: 'short' }).toUpperCase() : '???'
  const yr  = date ? toRoman(date.getFullYear()) : 'MMXXVI'

  return (
    <Card s={s} ribbon="◉ NEW CONCERT" ribbonDim onRead={onRead}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '56px 1fr', gap: '12px' }}>
        <Box sx={{
          width: 56, height: 70, border: `1.5px solid ${LINE_DIM}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'repeating-linear-gradient(0deg,rgba(196,58,42,.12) 0 1px,transparent 1px 5px),linear-gradient(180deg,#1a0a14,#2a1818)',
          textAlign: 'center', p: '4px',
        }}>
          <Box sx={{ ...DISPLAY, fontSize: '20px', color: INK, lineHeight: 1 }}>{day}</Box>
          <Box sx={{ ...MONO, fontSize: '8px', letterSpacing: '.18em', color: ACCENT, mt: '3px' }}>{mon}</Box>
          <Box sx={{ ...MONO, fontSize: '7px', letterSpacing: '.18em', color: MUTED, mt: '6px' }}>{yr}</Box>
        </Box>
        <Box>
          <Box sx={{ ...MEDIEVAL, fontSize: '18px', color: INK, lineHeight: 1 }}>{s.eventName}</Box>
          <Box sx={{ ...SERIF_I, fontSize: '13px', color: INK2, mt: '2px' }}>
            {s.venueName}{s.eventCity ? ` · ${s.eventCity}` : ''}
          </Box>
          <Box sx={{ ...MONO, fontSize: '9px', color: MUTED, mt: '5px' }}>
            {s.distanceKm ? <><span style={{ color: ACCENT }}>{s.distanceKm} KM AWAY</span> · </> : null}
            {s.priceFrom ? `FROM ${s.priceFrom}` : null}
          </Box>
          <CtaRow><Btn label="HIDE" /><Btn label="→ ATTEND" primary /></CtaRow>
        </Box>
      </Box>
    </Card>
  )
}

// ── Weekly dispatch card (P2, rich) ──────────────────────────────────────────
function DispatchCard({ s, onRead }: { s: Signal; onRead: (id: string) => void }) {
  return (
    <Card s={s} ribbon="𝔚 DISPATCH" ribbonDim onRead={onRead}>
      <Box sx={{ textAlign: 'center', pt: '4px' }}>
        <Box sx={{ ...MONO, fontSize: '10px', letterSpacing: '.2em', color: MUTED }}>
          WEEK {s.weekNum ? toRoman(s.weekNum) : '?'} · ISSUE {s.issueNum ? String(s.issueNum).padStart(3, '0') : '001'}
        </Box>
        <Box sx={{ ...MEDIEVAL, fontSize: '26px', color: INK, lineHeight: 1, mt: '4px', mb: '2px' }}>
          From the <em style={{ ...SERIF_I, color: ACCENT, fontSize: '22px' }}>underground.</em>
        </Box>
        <Box sx={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px',
          mt: '10px', pt: '10px', borderTop: `1px dashed ${LINE_DIM}`,
        }}>
          {[
            { n: s.covenReviewCount ?? 0, l: 'REVIEWS · COVEN' },
            { n: s.newAlbumCount ?? 0,    l: 'NEW ALBUMS'       },
            { n: s.nearbyGigCount ?? 0,   l: 'GIGS · NEAR YOU'  },
          ].map(({ n, l }) => (
            <Box key={l} sx={{ textAlign: 'center' }}>
              <Box sx={{ ...DISPLAY, fontSize: '18px', color: ACCENT, lineHeight: 1 }}>{n}</Box>
              <Box sx={{ ...MONO, fontSize: '8px', letterSpacing: '.1em', color: MUTED, mt: '2px' }}>{l}</Box>
            </Box>
          ))}
        </Box>
        <CtaRow><Btn label="→ READ DISPATCH" primary /></CtaRow>
      </Box>
    </Card>
  )
}

// ── Signal item dispatcher ────────────────────────────────────────────────────
function SignalItem({ s, onRead }: { s: Signal; onRead: (id: string) => void }) {
  switch (s.type) {
    case 'match':    return <MatchCard    s={s} onRead={onRead} />
    case 'message':  return <MessageCard  s={s} onRead={onRead} />
    case 'album_drop':      return <AlbumCard   s={s} onRead={onRead} />
    case 'concert_nearby':  return <ConcertCard s={s} onRead={onRead} />
    case 'weekly_dispatch': return <DispatchCard s={s} onRead={onRead} />
    default: return <DenseRow s={s} onRead={onRead} />
  }
}

// ── Bucket divider ────────────────────────────────────────────────────────────
function BucketDivider({ bucket, newCount }: { bucket: Bucket; newCount?: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', my: '8px', '&:first-of-type': { mt: 0 } }}>
      <Box sx={{ ...MONO, fontSize: '10px', letterSpacing: '.18em', color: INK2, whiteSpace: 'nowrap' }}>
        {BUCKET_LABELS[bucket]}
      </Box>
      <Box sx={{ flex: 1, height: '1px', background: LINE_DIM }} />
      {newCount != null && newCount > 0 && (
        <Box sx={{ ...MONO, fontSize: '9px', letterSpacing: '.14em', color: MUTED, whiteSpace: 'nowrap' }}>
          {newCount} NEW
        </Box>
      )}
    </Box>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ tab, filter }: { tab: SignalChannel; filter: string }) {
  const router = useRouter()
  const isFiltered = filter !== 'all'

  const copy = isFiltered
    ? { head: `No ${filter} yet.`, sub: 'Nothing matched your current filter. Try a different one or check back later.' }
    : tab === 'you'
    ? { head: 'Nothing has been signed to you yet.', sub: 'When the dark sends something — a match, a horn, a passing soul — you\'ll find it written here.' }
    : { head: 'The world is quiet.', sub: 'When bands you follow release albums, friends join covens, or gigs open near you — they appear here.' }

  return (
    <Box sx={{ textAlign: 'center', px: '24px', py: '48px' }}>
      <Box sx={{ ...MEDIEVAL, fontSize: '64px', color: ACCENT, opacity: 0.7, mb: '18px', lineHeight: 1 }}>☩</Box>
      <Box sx={{ ...DISPLAY, fontSize: '16px', letterSpacing: '.1em', textTransform: 'uppercase', color: INK, mb: '12px' }}>
        {copy.head}
      </Box>
      <Box sx={{ ...SERIF_I, fontSize: '16px', lineHeight: 1.5, color: MUTED, mb: '24px' }}>
        {copy.sub}
      </Box>
      {!isFiltered && (
        <Box
          component="button"
          onClick={() => router.push('/feed?mode=people')}
          sx={{
            display: 'inline-block', px: '18px', py: '9px',
            border: `1.5px solid ${LINE}`, color: INK,
            ...MONO, fontSize: '10px', letterSpacing: '.18em',
            background: 'transparent', borderRadius: '2px', cursor: 'pointer',
            '&:hover': { background: INK, color: PAPER },
          }}
        >↗ OPEN DISCOVER</Box>
      )}
    </Box>
  )
}

// ── Chip ──────────────────────────────────────────────────────────────────────
function Chip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        px: '11px', py: '5px',
        ...MONO, fontSize: '9.5px',
        borderRadius: '11px',
        border: `1.5px solid ${LINE}`,
        background: active ? INK : 'transparent',
        color: active ? PAPER : INK,
        whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none',
        flexShrink: 0,
        '&:hover': { background: active ? INK : 'rgba(236,229,211,.08)' },
      }}
    >
      {label}
      {count > 0 && !active && (
        <Box component="span" sx={{ color: ACCENT, fontWeight: 700, fontSize: '9px' }}>{count}</Box>
      )}
    </Box>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SignalsPage() {
  const router  = useRouter()
  const { user, isLoading } = useUser()
  const { signals, youUnreadCount, activityUnreadCount, markRead, markTabRead } = useNotifications()

  const [tab,           setTab]           = useState<SignalChannel>('you')
  const [youFilter,     setYouFilter]     = useState<YouFilter>('all')
  const [actFilter,     setActFilter]     = useState<ActivityFilter>('all')
  const [allReadDone,   setAllReadDone]   = useState(false)
  const [pagerLoads,    setPagerLoads]    = useState(0)

  useEffect(() => { if (!isLoading && !user) router.push('/auth/login') }, [user, isLoading, router])

  // Reset "all read" state when new unreads arrive on the active tab
  const activeUnread = tab === 'you' ? youUnreadCount : activityUnreadCount
  useEffect(() => { if (activeUnread > 0) setAllReadDone(false) }, [activeUnread])

  const youSignals = useMemo(() => signals.filter(s => s.channel === 'you'), [signals])
  const actSignals = useMemo(() => signals.filter(s => s.channel === 'activity'), [signals])

  const activeSignals = tab === 'you'
    ? filterSignals(signals, 'you', youFilter)
    : filterSignals(signals, 'activity', actFilter)

  const bucketed = useMemo(() => bucketAndSort(activeSignals), [activeSignals])

  const week = getWeekNumber()
  const year = new Date().getFullYear()

  function switchTab(t: SignalChannel) {
    setTab(t)
    setYouFilter('all')
    setActFilter('all')
    setAllReadDone(false)
  }

  function handleMarkAllRead() {
    markTabRead(tab)
    setAllReadDone(true)
  }

  // Filter chip counts
  const youCounts: Record<YouFilter, number> = {
    all: youSignals.filter(s => !s.read).length,
    matches: youSignals.filter(s => !s.read && s.type === 'match').length,
    messages: youSignals.filter(s => !s.read && s.type === 'message').length,
    horns: youSignals.filter(s => !s.read && s.type === 'horns').length,
    comments: youSignals.filter(s => !s.read && s.type === 'comment_photo').length,
    mentions: youSignals.filter(s => !s.read && s.type === 'mention').length,
    views: youSignals.filter(s => !s.read && s.type === 'profile_view').length,
  }
  const actCounts: Record<ActivityFilter, number> = {
    all: actSignals.filter(s => !s.read).length,
    albums: actSignals.filter(s => !s.read && s.type === 'album_drop').length,
    reviews: actSignals.filter(s => !s.read && s.type === 'band_review').length,
    gigs: actSignals.filter(s => !s.read && ['concert_nearby','event_reminder','friend_going'].includes(s.type)).length,
    coven: actSignals.filter(s => !s.read && s.type === 'coven_join').length,
    digest: actSignals.filter(s => !s.read && s.type === 'weekly_dispatch').length,
  }

  return (
    <>
      <Navigation />

      <Box sx={{ maxWidth: 480, mx: 'auto' }}>

        {/* ── Sticky header ──────────────────────────────────── */}
        <Box sx={{
          position: 'sticky', top: { xs: 52, md: 56 }, zIndex: 10,
          background: PAPER,
          borderBottom: `1px solid ${LINE_DIM}`,
        }}>
          {/* Row 1: title + actions */}
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', px: '18px', pt: '10px', pb: '2px' }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <Box sx={{ ...DISPLAY, fontSize: '22px', letterSpacing: '.04em', textTransform: 'uppercase', color: INK }}>
                SIGNALS
              </Box>
              <Box sx={{ ...MONO, fontSize: '10px', letterSpacing: '.14em', color: ACCENT }}>
                WEEK {toRoman(week)} · {toRoman(year)}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <Box
                component="button"
                onClick={handleMarkAllRead}
                disabled={allReadDone || activeUnread === 0}
                sx={{
                  ...MONO, fontSize: '9px', color: allReadDone ? MUTED : MUTED,
                  border: 'none', background: 'transparent', cursor: 'pointer', p: '4px 6px',
                  '&:hover:not(:disabled)': { color: ACCENT },
                  '&:disabled': { opacity: 0.4, cursor: 'default' },
                }}
              >
                {allReadDone ? '✓ ALL READ' : '⊘ MARK ALL READ'}
              </Box>
              <Box
                component="button"
                onClick={() => router.push('/settings/notifications')}
                sx={{
                  width: 30, height: 30, borderRadius: '50%',
                  border: `1.5px solid ${LINE}`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent', color: INK, cursor: 'pointer',
                  ...DISPLAY, fontSize: '13px', lineHeight: 1,
                  '&:hover': { background: INK, color: PAPER },
                }}
              >⚙</Box>
            </Box>
          </Box>

          {/* Row 2: YOU / ACTIVITY tabs */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `1.5px solid ${LINE_DIM}`, mx: '18px' }}>
            {(['you', 'activity'] as const).map(t => {
              const count = t === 'you' ? youUnreadCount : activityUnreadCount
              return (
                <Box
                  key={t}
                  component="button"
                  onClick={() => switchTab(t)}
                  sx={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    py: '10px',
                    ...DISPLAY, fontSize: '11px', letterSpacing: '.14em', textTransform: 'uppercase',
                    color: tab === t ? INK : MUTED,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    position: 'relative',
                    '&::after': tab === t ? {
                      content: '""', position: 'absolute',
                      left: '20%', right: '20%', bottom: '-1.5px',
                      height: '1.5px', background: ACCENT,
                    } : {},
                  }}
                >
                  {t.toUpperCase()}
                  {count > 0 && (
                    <Box sx={{
                      ...MONO, fontSize: '9px', letterSpacing: '.02em',
                      background: ACCENT, color: '#fff',
                      px: '5px', py: '1px', borderRadius: '9px', minWidth: '16px', textAlign: 'center',
                    }}>{count}</Box>
                  )}
                </Box>
              )
            })}
          </Box>

          {/* Row 3: Filter chips */}
          <Box sx={{
            px: '18px', pt: '10px', pb: '8px',
            borderBottom: `1.5px solid ${LINE_DIM}`,
            overflowX: 'auto',
            '&::-webkit-scrollbar': { display: 'none' },
          }}>
            <Box sx={{ display: 'flex', gap: '6px', width: 'max-content' }}>
              {tab === 'you'
                ? (['all','matches','messages','horns','comments','mentions','views'] as YouFilter[]).map(f => (
                    <Chip key={f} label={f.toUpperCase()} count={youCounts[f]} active={youFilter === f} onClick={() => setYouFilter(f)} />
                  ))
                : (['all','albums','reviews','gigs','coven','digest'] as ActivityFilter[]).map(f => (
                    <Chip key={f} label={f.toUpperCase()} count={actCounts[f]} active={actFilter === f} onClick={() => setActFilter(f)} />
                  ))
              }
            </Box>
          </Box>
        </Box>

        {/* ── Body ───────────────────────────────────────────── */}
        <Box sx={{ px: '18px', pt: '10px', pb: 12 }}>
          {activeSignals.length === 0 ? (
            <EmptyState tab={tab} filter={tab === 'you' ? youFilter : actFilter} />
          ) : (
            <>
              {bucketed.map(([bucket, items]) => (
                <Box key={bucket}>
                  <BucketDivider bucket={bucket} newCount={items.filter(s => !s.read).length} />
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    {items.map(s => <SignalItem key={s.id} s={s} onRead={markRead} />)}
                  </Box>
                </Box>
              ))}

              {/* Load older */}
              <Box sx={{ mt: '12px', textAlign: 'center' }}>
                {pagerLoads >= 2 ? (
                  <Typography sx={{ ...SERIF_I, fontSize: '13px', color: MUTED }}>
                    you have read everything.
                  </Typography>
                ) : (
                  <Box
                    component="button"
                    onClick={() => setPagerLoads(p => p + 1)}
                    sx={{
                      width: '100%', py: '8px', px: '18px',
                      ...MONO, fontSize: '9.5px', letterSpacing: '.16em',
                      color: MUTED, border: `1.5px solid ${LINE_DIM}`,
                      background: 'transparent', borderRadius: '2px', cursor: 'pointer',
                      '&:hover': { borderColor: LINE, color: INK },
                    }}
                  >↓ LOAD OLDER</Box>
                )}
              </Box>
            </>
          )}
        </Box>
      </Box>
    </>
  )
}
