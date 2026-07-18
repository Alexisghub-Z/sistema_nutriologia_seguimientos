import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SessionProvider from '@/components/providers/SessionProvider'

const inter = Inter({ subsets: ['latin'] })

// Nombre/URL del sitio configurables por env (por cliente al desplegar).
// Fallback a los valores de Paul para no alterar su producción actual.
const NOMBRE_SITIO = process.env.NEXT_PUBLIC_NOMBRE_SITIO || 'Nutrición Paul Cortes'
const URL_SITIO = process.env.NEXT_PUBLIC_APP_URL || 'https://nutricionpaulcortez.com'

export const metadata: Metadata = {
  title: {
    default: NOMBRE_SITIO,
    template: `%s | ${NOMBRE_SITIO}`,
  },
  description: 'Consulta nutricional profesional. Agenda tu cita y da seguimiento a tu progreso.',
  keywords: ['nutriólogo', 'nutrición', 'consulta nutricional', 'plan alimenticio'],
  metadataBase: new URL(URL_SITIO),
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    url: URL_SITIO,
    title: NOMBRE_SITIO,
    description: 'Consulta nutricional profesional',
    siteName: NOMBRE_SITIO,
  },
}

const schemaOrg = {
  '@context': 'https://schema.org',
  '@type': 'MedicalBusiness',
  name: 'Nutrición Paul Cortes',
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
