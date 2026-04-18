import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from './ThemeProvider'
import { UserProvider } from './context/UserContext'

// ── SEO & PWA metadata ─────────────────────────────────────
export const metadata: Metadata = {
  title: 'Grimr — Metalheads Connect',
  description: 'Social discovery platform for the Metal community. Find metalheads, track your listening, and build your Metal-ID.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Grimr',
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Grimr — Metalheads Connect',
    description: 'Letterboxd meets Bandcamp for Metal.',
    type: 'website',
  },
}

// ── Viewport (separate export — Next.js 14 requirement) ────
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,      // prevent unwanted double-tap zoom on iOS
  userScalable: false,
  viewportFit: 'cover', // extend into iOS notch / Dynamic Island
  themeColor: '#0A0A0A',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to Google Fonts CDN for faster font load */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <ThemeProvider>
          <UserProvider>
            {children}
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
