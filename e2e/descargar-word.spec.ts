import { test, expect } from '@playwright/test'
import { readFile } from 'fs/promises'

/**
 * La vista previa descarga también en Word.
 * ------------------------------------------------------------
 * El PDF es el formato de entrega, pero no se puede editar: cuando hay que
 * retocar una línea para un paciente concreto hace falta el .docx.
 *
 * Esta prueba descarga el archivo de verdad y comprueba que es un documento
 * Word válido. Que el botón exista no basta: puede estar ahí y producir un
 * archivo corrupto que solo se descubre al abrirlo.
 */

const EMAIL = process.env.E2E_EMAIL
const PASSWORD = process.env.E2E_PASSWORD

test('el botón de Word descarga un .docx válido', async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, 'faltan E2E_EMAIL / E2E_PASSWORD en e2e/.env.local')
  test.setTimeout(300_000)

  await page.goto('/login')
  await page.locator('input[type="email"]').fill(EMAIL!)
  await page.locator('input[type="password"]').fill(PASSWORD!)
  await page.locator('button[type="submit"]').click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 90_000 })

  // Se abre la vista previa sobre una dieta ya terminada del historial. Si no
  // hay ninguna, no hay nada que descargar y la prueba no aplica.
  await page.goto('/dietas')
  await page.waitForTimeout(6000)

  const primerPaciente = page.locator('main button').first()
  if ((await primerPaciente.count()) === 0) {
    test.skip(true, 'no hay pacientes con los que probar')
    return
  }
  await primerPaciente.click()
  await page.waitForTimeout(3000)

  const abrir = page.getByRole('button', { name: /^Abrir$/i }).first()
  if ((await abrir.count()) === 0) {
    test.skip(true, 'el paciente no tiene cuadros guardados')
    return
  }
  await abrir.click()
  await page.waitForTimeout(5000)

  const verHoja = page.getByRole('button', { name: /hoja del paciente|vista previa|Ver hoja/i }).first()
  if ((await verHoja.count()) === 0) {
    test.skip(true, 'este cuadro no tiene dieta que previsualizar')
    return
  }
  await verHoja.click()
  await page.waitForTimeout(4000)

  const botonWord = page.getByRole('button', { name: /Descargar Word/i })
  await expect(botonWord, 'no aparece el botón de Word en la vista previa').toBeVisible({
    timeout: 30_000,
  })

  const descarga = page.waitForEvent('download', { timeout: 60_000 })
  await botonWord.click()
  const archivo = await descarga

  expect(archivo.suggestedFilename(), 'el archivo no es un .docx').toMatch(/\.docx$/)

  // Un .docx es un zip: sus dos primeros bytes son "PK". Comprobarlo descarta
  // el caso peor —un archivo con el nombre correcto y contenido roto—.
  const ruta = await archivo.path()
  const contenido = await readFile(ruta)
  expect(contenido.byteLength, 'el .docx está vacío').toBeGreaterThan(1000)
  expect(contenido.subarray(0, 2).toString(), 'el .docx no es un zip válido').toBe('PK')
})
