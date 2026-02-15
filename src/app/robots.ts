import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/configuracion', '/login', '/api/'],
      },
    ],
    sitemap: 'https://nutricionpaulcortez.com/sitemap.xml',
  }
}
