import { test, expect } from '@playwright/test'

/**
 * Salir de una dieta por el menú no debe perder trabajo.
 * ------------------------------------------------------------
 * La pantalla ya se protegía al CERRAR la pestaña (`beforeunload`) y al
 * minimizarla (`visibilitychange`). Pero el menú lateral usa `<Link>` de Next,
 * que navega sin recargar: `beforeunload` no salta y los últimos retoques —los
 * que el autoguardado tenía aún en cola— se perdían sin aviso.
 *
 * Ahora la pantalla registra un guardián: al salir intenta guardar, y solo
 * pregunta si el guardado falla.
 */

const EMAIL = process.env.E2E_EMAIL
const PASSWORD = process.env.E2E_PASSWORD

async function entrar(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(EMAIL!)
  await page.locator('input[type="password"]').fill(PASSWORD!)
  await page.locator('button[type="submit"]').click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 90_000 })
}

test('sin trabajo pendiente, el menú navega sin estorbar', async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, 'faltan E2E_EMAIL / E2E_PASSWORD en e2e/.env.local')

  // El caso corriente: nada que guardar, la navegación debe ser normal. Si el
  // guardián se pusiera pesado aquí, sería peor que el problema que arregla.
  await entrar(page)
  await page.goto('/dietas')
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {})

  await page.getByRole('link', { name: /Pacientes/i }).first().click()
  await expect(page).toHaveURL(/\/pacientes/, { timeout: 30_000 })
})

test('el menú sigue permitiendo abrir en otra pestaña (Ctrl+clic)', async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, 'faltan E2E_EMAIL / E2E_PASSWORD en e2e/.env.local')

  // Al interceptar el clic se podía haber roto el Ctrl+clic. Esos clics no se
  // llevan nada de la pestaña actual, así que deben pasar sin preguntar.
  await entrar(page)
  await page.goto('/dietas')
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {})

  const enlace = page.getByRole('link', { name: /Citas/i }).first()
  await enlace.click({ modifiers: ['Control'] })

  // La pestaña actual NO debe haber navegado.
  await page.waitForTimeout(1500)
  await expect(page).toHaveURL(/\/dietas/)
})

test('los enlaces del menú conservan su href real', async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, 'faltan E2E_EMAIL / E2E_PASSWORD en e2e/.env.local')

  // Se conservó el <Link> en lugar de cambiarlo por un botón, justamente para
  // que el clic derecho y "abrir en pestaña nueva" sigan funcionando. Si
  // alguien lo convierte en botón, el href desaparece y esto lo destapa.
  await entrar(page)
  await page.goto('/dietas')

  for (const [nombre, ruta] of [
    ['Dashboard', '/dashboard'],
    ['Pacientes', '/pacientes'],
    ['Citas', '/citas'],
  ] as const) {
    const enlace = page.getByRole('link', { name: new RegExp(nombre, 'i') }).first()
    await expect(enlace, `el enlace ${nombre} perdió su href`).toHaveAttribute('href', ruta)
  }
})
