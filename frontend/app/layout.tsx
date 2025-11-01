import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Grimr - Metalheads Connect',
  description: 'Social discovery platform for the Metal community',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-grim-black text-silver-text font-sans antialiased">
        {children}
      </body>
    </html>
  )
}

