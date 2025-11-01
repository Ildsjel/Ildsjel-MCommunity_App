import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from './ThemeProvider'
import { UserProvider } from './context/UserContext'

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
    <html lang="en">
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

