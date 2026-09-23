import { test, expect } from '@playwright/test'

/**
 * La salida desde una dieta hacia el resumen.
 * ------------------------------------------------------------
 * Con un paciente abierto, la única forma de volver al resumen de dietas era
 * un botón llamado "Cambiar", que describía solo la mitad de lo que hace:
 * también suelta al paciente y devuelve al resumen, pero con ese nombre nadie
 * lo encontraba para eso.
 */

const EMAIL = process.env.E2E_EMAIL
const PASSWORD = process.env.E2E_PASSWORD

async function entrarEnDietas(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(EMAIL!)
  await page.locator('input[type="password"]').fill(PASSWORD!)
  await page.locator('button[type="submit"]').click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 90_000 })

  await page.goto('/dietas')
  // Sin sesión previa: la prueba decide a qué paciente entra.
  await page.evaluate(() => localStorage.removeItem('dietas.sesion'))
  await page.reload()
  await page.waitForTimeout(6000)
}

test('con un paciente abierto hay salida hacia el resumen', async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, 'faltan E2E_EMAIL / E2E_PASSWORD en e2e/.env.local')
  test.setTimeout(180_000)

  await entrarEnDietas(page)

  const primerPaciente = page.locator('main button').first()
  if ((await primerPaciente.count()) === 0) {
    test.skip(true, 'no hay pacientes con los que probar')
    return
  }
  await primerPaciente.click()
  await page.waitForTimeout(3000)

  // El botón tiene que estar JUSTO cuando hay un paciente abierto: es el
  // momento en que la pantalla se llena y hace falta una salida visible.
  const volver = page.getByRole('button', { name: /Volver a dietas/i })
  await expect(volver, 'no hay forma visible de volver al resumen').toBeVisible({
    timeout: 30_000,
  })

  await volver.click()
  await page.waitForTimeout(3000)

  // Vuelta al resumen: reaparece el buscador de pacientes.
  await expect(page.getByPlaceholder(/Busca un paciente/i)).toBeVisible({ timeout: 30_000 })
  await page.evaluate(() => localStorage.removeItem('dietas.sesion'))
})
