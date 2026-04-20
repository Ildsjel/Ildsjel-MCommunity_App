export interface BottomTab {
  label: string
  glyph: string
  path: string
  matchPaths?: string[]
}

export const BOTTOM_TABS: BottomTab[] = [
  { label: 'Feed',     glyph: '◉', path: '/feed',          matchPaths: ['/feed'] },
  { label: 'Discover', glyph: '⌕', path: '/search',        matchPaths: ['/search'] },
  { label: 'Bands',    glyph: '◆', path: '/bands',         matchPaths: ['/bands'] },
  { label: 'Alerts',   glyph: '◈', path: '/notifications', matchPaths: ['/notifications'] },
  { label: 'Me',       glyph: '✶', path: '/profile',       matchPaths: ['/profile', '/gallery'] },
]

export interface DesktopNavItem {
  label: string
  path: string
}

export const DESKTOP_NAV_ITEMS: DesktopNavItem[] = [
  { label: 'Feed',     path: '/feed' },
  { label: 'Discover', path: '/search' },
  { label: 'Bands',    path: '/bands' },
  { label: 'Sigil',    path: '/sigil' },
  { label: 'Gather',   path: '/events' },
]

export function getBottomTabValue(pathname: string, tabs: BottomTab[] = BOTTOM_TABS): number {
  const exact = tabs.findIndex((t) => t.path === pathname)
  if (exact >= 0) return exact
  const prefix = tabs.findIndex((t) =>
    t.matchPaths?.some((p) => pathname.startsWith(p))
  )
  return prefix >= 0 ? prefix : -1
}
