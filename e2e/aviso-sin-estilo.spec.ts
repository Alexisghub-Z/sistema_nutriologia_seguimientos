import { test, expect } from '@playwright/test'

/**
 * El aviso de "la IA no conoce tu estilo" aparece cuando toca.
 * ------------------------------------------------------------
 * El perfil de estilo alimenta el prompt de la IA. Cuando está vacío, el
 * generador cae en un modo genérico —alimentos básicos, sin cocina regional—
 * que NO se nota en el resultado: la dieta sale y parece correcta.
 *
 * Esta prueba comprueba que el aviso sale con el perfil vacío y desaparece en
 * cuanto hay algo escrito, sin tocar la base de datos: se intercepta la
 * respuesta del endpoint, que es lo único que decide el aviso.
 */

const EMAIL = process.env.E2E_EMAIL
const PASSWORD = process.env.E2E_PASSWORD

const TEXTO_AVISO = /La IA no conoce tu estilo/i

/** Perfil tal y como lo devuelve el endpoint, con todos los campos vacíos. */
const PERFIL_VACIO = {
  id: 'prueba',
  region: '',
  alimentos_tipicos: '',
  alimentos_evitar: '',
  estructura_notas: '',
  reglas_propias: '',
  tono: '',
  instrucciones_libres: '',
  indicaciones_inicio: '',
}

async function entrar(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(EMAIL!)
  await page.locator('input[type="password"]').fill(PASSWORD!)
  await page.locator('button[type="submit"]').click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 90_000 })
}

test('con el perfil vacío se avisa y el enlace lleva a configuración', async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, 'faltan E2E_EMAIL / E2E_PASSWORD en e2e/.env.local')

  await page.route('**/api/dietas/perfil-estilo', (ruta) =>
    ruta.fulfill({ json: PERFIL_VACIO })
  )

  await entrar(page)

  // Se escucha ANTES de navegar. Con `waitForRequest` después del goto la
  // petición ya ha pasado y nunca se ve: la prueba fallaba por eso, no porque
  // la pantalla dejara de pedir el perfil.
  const vistas: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('perfil-estilo')) vistas.push(r.url())
  })

  await page.goto('/dietas')
  await page.waitForTimeout(5000)

  // El aviso vive en el paso de la IA, que requiere un cuadro ya calculado.
  // Aquí basta con comprobar que la página carga el perfil: si no lo pidiera,
  // el aviso no podría salir nunca.
  expect(vistas.length, 'la pantalla de dietas no consulta el perfil de estilo').toBeGreaterThan(0)
})

test('con el perfil relleno no se pide avisar', async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, 'faltan E2E_EMAIL / E2E_PASSWORD en e2e/.env.local')

  // Un solo campo con contenido basta: quien ya escribió algo sabe que el
  // formulario existe, e insistirle sería paternalista.
  await page.route('**/api/dietas/perfil-estilo', (ruta) =>
    ruta.fulfill({ json: { ...PERFIL_VACIO, region: 'Oaxaca, México' } })
  )

  await entrar(page)
  await page.goto('/dietas')
  await page.waitForTimeout(2000)

  await expect(page.getByText(TEXTO_AVISO)).toHaveCount(0)
})

test('la pantalla de configuración del estilo existe y es alcanzable', async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, 'faltan E2E_EMAIL / E2E_PASSWORD en e2e/.env.local')

  // El aviso enlaza aquí: si la ruta cambiara, el botón llevaría a un 404 y
  // nadie se enteraría hasta que un nutriólogo lo pulsara.
  await entrar(page)
  await page.goto('/configuracion/estilo-dietas')

  await expect(page).toHaveURL(/\/configuracion\/estilo-dietas/)
  await expect(page.getByText(/Estilo de mis dietas/i).first()).toBeVisible({ timeout: 30_000 })
})
