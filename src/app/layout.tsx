import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SessionProvider from '@/components/providers/SessionProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Nutrición Paul Cortez',
    template: '%s | Nutrición Paul Cortez',
  },
  description: 'Consulta nutricional profesional en Oaxaca. Más de 10 años de experiencia ayudándote a mejorar tu salud y alcanzar tus objetivos.',
  keywords: ['nutriólogo', 'nutrición', 'Oaxaca', 'Paul Cortez', 'consulta nutricional', 'plan alimenticio'],
  authors: [{ name: 'Paul Cortez' }],
  creator: 'Paul Cortez',
  metadataBase: new URL('https://nutricionpaulcortez.com'),
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    url: 'https://nutricionpaulcortez.com',
    title: 'Nutrición Paul Cortez',
    description: 'Consulta nutricional profesional en Oaxaca',
    siteName: 'Nutrición Paul Cortez',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
