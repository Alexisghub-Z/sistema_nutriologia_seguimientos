import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

/**
 * Puerta de entrada: qué se puede ver sin haber iniciado sesión.
 * ------------------------------------------------------------
 * Antes esto era una LISTA NEGRA: enumeraba las secciones a proteger
 * (/dashboard, /citas, /pacientes, /mensajes, /configuracion). El problema de
 * esa forma es que toda sección nueva nace desprotegida, y hay que acordarse de
 * venir aquí a apuntarla. No nos acordamos: /dietas se sirvió entera a
 * cualquiera que la pidiera sin sesión hasta que lo detectó una prueba.
 *
 * Ahora es al revés: TODO exige sesión salvo lo que se declara público abajo.
 * La próxima sección que se cree estará protegida sin tocar este archivo.
 */

/** Páginas que un desconocido debe poder abrir. */
const RUTAS_PUBLICAS = [
  '/', // portada
  '/login',
  '/agendar', // reserva pública de cita
  '/cita', // /cita/[codigo] — ver o confirmar una cita por su código
  '/mis-citas', // consulta del paciente con su teléfono
  '/mi-progreso', // progreso que el paciente abre desde su enlace
]

/**
 * ¿Es pública esta ruta?
 *
 * Coincidencia por segmento, no por prefijo suelto: `startsWith('/cita')`
 * también dejaría pasar `/citas` —la agenda del nutriólogo— y volveríamos a
 * abrir un agujero, esta vez sin darnos cuenta. Con el `/` final exigido, o es
 * la ruta exacta o es una subruta suya.
 */
function esRutaPublica(pathname: string): boolean {
  return RUTAS_PUBLICAS.some((ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`))
}

export default auth((req) => {
  const { pathname } = req.nextUrl
  const haIniciadoSesion = !!req.auth

  // Las rutas de API no pasan por aquí (ver `matcher`): cada endpoint valida
  // con getAuthUser(), y el webhook de Twilio debe seguir entrando sin sesión.

  // Si ya tiene sesión, el login no le sirve de nada.
  if (pathname === '/login' && haIniciadoSesion) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (!esRutaPublica(pathname) && !haIniciadoSesion) {
    // Se recuerda a dónde iba, para devolverlo ahí después de identificarse en
    // lugar de soltarlo siempre en el panel.
    const destino = new URL('/login', req.url)
    destino.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(destino)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Se evalúa todo MENOS:
     * - api            (cada endpoint valida por su cuenta; incluye webhooks)
     * - _next/static, _next/image, favicon.ico  (estáticos de Next)
     * - archivos con extensión de imagen        (assets de /public)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
