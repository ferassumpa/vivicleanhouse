import type { Metadata, Viewport } from 'next'
import { DM_Sans, Fraunces } from 'next/font/google'
import { AuthProvider } from '@/contexts/AuthContext'
import './globals.css'

const body = DM_Sans({
  variable: '--font-body',
  subsets: ['latin'],
})

const display = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Vivi Clean house',
  description: 'Gestão de faxinas para estúdios e apartamentos',
  applicationName: 'Vivi Clean house',
  icons: { icon: '/logo.png' },
  appleWebApp: {
    capable: true,
    title: 'Vivi Clean house',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#f4a7b9',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${body.variable} ${display.variable} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
