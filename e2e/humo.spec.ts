import { test, expect } from '@playwright/test'

/**
 * Pruebas de humo: la aplicación responde, protege y deja entrar.
 * ------------------------------------------------------------
 * La primera versión de este archivo descubrió un fallo real: `/dietas` se
 * servía a cualquiera sin sesión, porque el middleware enumeraba las rutas a
 * proteger y nadie apuntó la sección nueva. El middleware ahora funciona al
 * revés —todo cerrado salvo lo declarado público— y estas pruebas vigilan que
 * siga así.
 */

const EMAIL = process.env.E2E_EMAIL
const PASSWORD = process.env.E2E_PASSWORD

/** Secciones del panel: ninguna debe abrirse sin sesión. */
const RUTAS_PRIVADAS = ['/dietas', '/dashboard', '/citas', '/pacientes', '/mensajes', '/configuracion']

/**
 * Páginas que un paciente o un desconocido sí debe poder abrir.
 *
 * `/login` NO va aquí: la comprobación de abajo es "no acabaste en /login", que
 * para la propia pantalla de login se contradice sola. Su existencia ya la
 * cubre la primera prueba.
 */
const RUTAS_PUBLICAS = ['/', '/agendar', '/mis-citas', '/mi-progreso']

test('el login se pinta', async ({ page }) => {
  await page.goto('/login')

  // Los campos existen: si el formulario cambia, esto avisa.
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
})

test('ninguna sección del panel se abre sin sesión', async ({ page }) => {
  for (const ruta of RUTAS_PRIVADAS) {
    await page.goto(ruta)
    await expect(page, `${ruta} se abrió sin sesión`).toHaveURL(/\/login/)
  }
})

test('las páginas públicas siguen abiertas sin sesión', async ({ page }) => {
  // El contrapeso de la prueba anterior: cerrar de más rompería la reserva de
  // citas y dejaría a los pacientes fuera. `/cita/[codigo]` se prueba aparte
  // porque su prefijo se parece peligrosamente al de `/citas`.
  for (const ruta of RUTAS_PUBLICAS) {
    await page.goto(ruta)
    // Sin `$` final: al cerrar una ruta, el middleware manda a
    // `/login?callbackUrl=…`, que NO acaba en "/login". Con el ancla puesta
    // esta prueba pasaba aunque la reserva de citas estuviera rota — se
    // descubrió saboteando el middleware a propósito.
    await expect(page, `${ruta} exigió sesión y no debería`).not.toHaveURL(/\/login/)
  }
})

test('/cita/[codigo] es pública pero /citas no', async ({ page }) => {
  // Con una comprobación por prefijo suelto, `/cita` dejaría pasar también
  // `/citas` —la agenda del nutriólogo— y el agujero volvería sin que nadie lo
  // notara. Este par lo vigila.
  await page.goto('/cita/CODIGO-INEXISTENTE')
  await expect(page, '/cita/[codigo] debe ser pública').not.toHaveURL(/\/login/)

  await page.goto('/citas')
  await expect(page, '/citas debe exigir sesión').toHaveURL(/\/login/)
})

test('se inicia sesión y se llega a dietas', async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, 'faltan E2E_EMAIL / E2E_PASSWORD en e2e/.env.local')

  await page.goto('/login')
  await page.locator('input[type="email"]').fill(EMAIL!)
  await page.locator('input[type="password"]').fill(PASSWORD!)
  await page.locator('button[type="submit"]').click()

  // El login lleva al panel: hasta que la URL deje de ser /login, no hay sesión.
  // La espera es larga porque al pulsar "entrar" se compila /api/auth/[...nextauth]
  // y después /dashboard: con 20 s la prueba fallaba mientras Next seguía
  // compilando, y parecía un problema de credenciales que no existía.
  await expect(page).not.toHaveURL(/\/login/, { timeout: 90_000 })

  // Y con sesión, la sección que estaba desprotegida ahora sí se abre.
  await page.goto('/dietas')
  await expect(page).toHaveURL(/\/dietas/)
  await expect(page.locator('body')).toContainText(/dieta/i)
})

test('la pantalla no desborda en horizontal', async ({ page }) => {
  // Un desbordamiento lateral es el fallo visual que más se cuela: no rompe
  // nada, pero deja media pantalla inalcanzable. Se mide en el ancho más
  // estrecho que soporta el diseño.
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/login')

  const desborda = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  )
  expect(desborda, 'la página se desplaza en horizontal a 390 px').toBe(false)
})
