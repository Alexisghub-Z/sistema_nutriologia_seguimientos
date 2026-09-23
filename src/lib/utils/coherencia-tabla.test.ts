import { describe, it, expect } from 'vitest'
import { sumarEquivalentes, calcularDiferencia } from './smae'
import type { Equivalentes } from './smae'

/**
 * La tabla de distribución tiene que poder leerse restando.
 * ------------------------------------------------------------
 * TOTAL, META y DIFERENCIA se muestran una debajo de otra, y el nutriólogo
 * comprueba el cuadre restando de cabeza. Durante un tiempo las dos primeras
 * filas se pintaban con `toFixed(0)` —que borra el decimal— mientras la
 * diferencia mostraba el suyo: con TOTAL 79 y META 79, la tabla decía "+0.2" y
 * parecía sumar mal. La suma era correcta (79.1 − 78.9 = 0.2); lo que engañaba
 * era mostrar tres números con dos precisiones distintas.
 *
 * Esto vigila que la diferencia calculada sea SIEMPRE la resta de lo que se
 * ve. Si alguien vuelve a redondear una fila y no la otra, salta aquí.
 */

/** Como se pinta un número en la tabla (fmtNum de la página). */
function comoSeVe(n: number): number {
  return Number.isInteger(n) ? n : Math.round(n * 100) / 100
}

describe('la tabla de distribución cuadra a la vista', () => {
  const combinaciones: Array<{ nombre: string; equivalentes: Equivalentes; meta: { hco: number; pro: number; lip: number; kcal: number } }> = [
    {
      nombre: 'caso del nutriólogo (lípidos con decimal)',
      equivalentes: { VERDURAS: 3, FRUTAS: 3, CEREALES_SG: 8, AOA_BAG: 4, AZUCAR_SG: 5 },
      meta: { hco: 197, pro: 79, lip: 53, kcal: 1576 },
    },
    {
      nombre: 'reparto pequeño',
      equivalentes: { VERDURAS: 2, FRUTAS: 1, CEREALES_SG: 3 },
      meta: { hco: 100, pro: 30, lip: 20, kcal: 700 },
    },
    {
      nombre: 'con medios equivalentes',
      equivalentes: { VERDURAS: 2.5, FRUTAS: 1.5, LEGUMINOSAS: 2, AZUCAR_CG: 1.5 },
      meta: { hco: 120, pro: 45, lip: 35, kcal: 950 },
    },
    {
      nombre: 'dieta amplia',
      equivalentes: {
        VERDURAS: 5, FRUTAS: 4, CEREALES_SG: 10, CEREALES_CG: 2,
        LEGUMINOSAS: 2, AOA_BAG: 3, AOA_AAG: 3, LECHE_SEMI: 2, AZUCAR_SG: 6,
      },
      meta: { hco: 250, pro: 110, lip: 70, kcal: 2100 },
    },
  ]

  for (const c of combinaciones) {
    it(`${c.nombre}: la diferencia es la resta de lo que se ve`, () => {
      const total = sumarEquivalentes(c.equivalentes)
      const diferencia = calcularDiferencia(total, {
        hco_g: c.meta.hco,
        proteina_g: c.meta.pro,
        lipidos_g: c.meta.lip,
        kcalMeta: c.meta.kcal,
      })

      const macros = [
        ['hco', total.hco, c.meta.hco, diferencia.hco],
        ['proteína', total.proteina, c.meta.pro, diferencia.proteina],
        ['lípidos', total.lipidos, c.meta.lip, diferencia.lipidos],
        ['kcal', total.kcal, c.meta.kcal, diferencia.kcal],
      ] as const

      for (const [nombre, valorTotal, valorMeta, dif] of macros) {
        const restaVisible = comoSeVe(valorTotal) - comoSeVe(valorMeta)
        expect(
          Math.abs(restaVisible - dif),
          `${nombre}: se ve ${comoSeVe(valorTotal)} − ${comoSeVe(valorMeta)} = ${restaVisible}, pero la tabla dice ${dif}`
        ).toBeLessThan(0.051)
      }
    })
  }
})
