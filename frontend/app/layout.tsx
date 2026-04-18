import type { Metadata, Viewport } from 'next'
import { Archivo_Black, EB_Garamond, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from './ThemeProvider'
import { UserProvider } from './context/UserContext'

// ── Fonts via next/font (no CDN round-trip at runtime) ─────
const archivo = Archivo_Black({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const garamond = EB_Garamond({
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

const mono = JetBrains_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

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
  icons: { apple: '/apple-touch-icon.png' },
  openGraph: {
    title: 'Grimr — Metalheads Connect',
    description: 'Letterboxd meets Bandcamp for Metal.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#DCD6C8',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${garamond.variable} ${mono.variable}`}>
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
