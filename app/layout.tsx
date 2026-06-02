import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Holler',
  description: 'Live Song Requests',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Teko:wght@400;500;600&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Arvo:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
