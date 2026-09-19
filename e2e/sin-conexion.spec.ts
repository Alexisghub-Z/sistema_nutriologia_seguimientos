import { test, expect } from '@playwright/test'

/**
 * El aviso de "sin conexión" aparece cuando toca y se va cuando toca.
 * ------------------------------------------------------------
 * Se prueba con el navegador de verdad porque el componente depende de los
 * eventos `online`/`offline`, que no se pueden reproducir razonablemente sin
 * uno: Playwright corta la red del contexto y el navegador los emite solo.
 */

const EMAIL = process.env.E2E_EMAIL
const PASSWORD = process.env.E2E_PASSWORD

/** Texto que ve el usuario; si cambia, estas pruebas deben cambiar con él. */
const TEXTO_CAIDA = /Sin conexión a internet/i
const TEXTO_VUELTA = /Conexión restablecida/i

test('en una página pública avisa al caerse internet y al volver', async ({ page, context }) => {
  await page.goto('/agendar')

  // Con red, no hay barra: un aviso permanente sería ruido.
  await expect(page.getByText(TEXTO_CAIDA)).toHaveCount(0)

  await context.setOffline(true)
  await expect(page.getByText(TEXTO_CAIDA)).toBeVisible({ timeout: 10_000 })

  await context.setOffline(false)
  // Al volver se confirma en verde, para que el usuario sepa que puede seguir.
  await expect(page.getByText(TEXTO_VUELTA)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(TEXTO_CAIDA)).toHaveCount(0)

  // Y la confirmación se retira sola: es un aviso, no un estado permanente.
  await expect(page.getByText(TEXTO_VUELTA)).toHaveCount(0, { timeout: 15_000 })
})

test('en el panel también avisa', async ({ page, context }) => {
  test.skip(!EMAIL || !PASSWORD, 'faltan E2E_EMAIL / E2E_PASSWORD en e2e/.env.local')

  await page.goto('/login')
  await page.locator('input[type="email"]').fill(EMAIL!)
  await page.locator('input[type="password"]').fill(PASSWORD!)
  await page.locator('button[type="submit"]').click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 90_000 })

  await page.goto('/dietas')
  await expect(page).toHaveURL(/\/dietas/)

  await context.setOffline(true)
  await expect(page.getByText(TEXTO_CAIDA)).toBeVisible({ timeout: 10_000 })

  await context.setOffline(false)
  await expect(page.getByText(TEXTO_CAIDA)).toHaveCount(0, { timeout: 10_000 })
})

test('la barra se ve de verdad: arriba, visible y por encima del contenido', async ({
  page,
  context,
}) => {
  // Que el texto exista en el DOM no basta. El riesgo real aquí es que un
  // ancestro con `transform` rompa el `position: fixed` y la barra acabe fuera
  // de la pantalla o tapada. Se comprueba su posición real.
  await page.goto('/agendar')
  await context.setOffline(true)

  const barra = page.getByRole('status').filter({ hasText: TEXTO_CAIDA })
  await expect(barra).toBeVisible({ timeout: 10_000 })

  const caja = await barra.boundingBox()
  expect(caja, 'la barra no tiene caja: no se está pintando').not.toBeNull()
  expect(caja!.width, 'la barra debería ocupar el ancho de la pantalla').toBeGreaterThan(300)

  // La prueba de fuego del `position: fixed`: tras desplazar la página, la
  // barra debe seguir VISIBLE EN PANTALLA.
  //
  // Se mide con getBoundingClientRect() —coordenadas de la ventana— y no con
  // boundingBox() de Playwright, que las da respecto al DOCUMENTO. Esa
  // diferencia importa: con `position: static` la barra se queda en y≈0 del
  // documento y boundingBox() sigue devolviendo ~0 aunque se haya ido de la
  // pantalla, así que la comprobación pasaba con el fixed roto. Se descubrió
  // saboteando el CSS y viendo que la prueba no se enteraba.
  await page.evaluate(() => window.scrollTo(0, 600))
  await page.waitForTimeout(400)

  const desplazado = await page.evaluate(() => window.scrollY)
  expect(desplazado, 'la página no se desplazó: la comprobación no valdría').toBeGreaterThan(100)

  const yEnPantalla = await barra.evaluate((el) => el.getBoundingClientRect().top)
  // Cerca de cero POR LOS DOS LADOS. Comprobar solo `< 10` no sirve: cuando el
  // fixed se rompe, la barra sube con el scroll y `top` se vuelve muy negativo
  // (-368 en la prueba real), que también cumple "< 10". Esa condición mal
  // escrita dejó pasar el sabotaje cuatro veces seguidas.
  expect(
    Math.abs(yEnPantalla),
    `la barra se fue con el scroll (top=${yEnPantalla}): el \`position: fixed\` no funciona`
  ).toBeLessThan(10)

  await context.setOffline(false)
})
