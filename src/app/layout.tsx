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

const schemaOrg = {
  '@context': 'https://schema.org',
  '@type': 'MedicalBusiness',
  name: 'Nutrición Paul Cortez',
  description:
    'Consulta nutricional profesional en Oaxaca. Más de 10 años de experiencia ayudándote a mejorar tu salud y alcanzar tus objetivos.',
  url: 'https://nutricionpaulcortez.com',
  telephone: '+529511301554',
  email: 'paul_nutricion@hotmail.com',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Oaxaca de Juárez',
    addressRegion: 'Oaxaca',
    addressCountry: 'MX',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 17.0586389,
    longitude: -96.7124167,
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '16:00',
      closes: '20:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Saturday'],
      opens: '08:00',
      closes: '19:00',
    },
  ],
  priceRange: '$$',
  currenciesAccepted: 'MXN',
  paymentAccepted: 'Cash, Credit Card, Bank Transfer',
  medicalSpecialty: 'Nutrition',
  employee: {
    '@type': 'Person',
    name: 'Mtro. Eder Paúl Alavez Cortés',
    jobTitle: 'Nutriólogo Clínico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
        />
      </head>
      <body className={inter.className}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
