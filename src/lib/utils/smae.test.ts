import { describe, it, expect } from 'vitest'
import {
  GRUPOS_SMAE,
  sumarEquivalentes,
  nutrientesDeAlimento,
  rolDeTiempo,
  distribuirEnTiemposAuto,
  calcularEquivalentesAuto,
  resumenTiempo,
  repartidoDeGrupo,
  validarDistribucion,
  calcularDiferencia,
  cuadroDistribucion,
  TIEMPOS_DEFAULT,
  type Equivalentes,
} from './smae'

/**
 * Pruebas del Sistema Mexicano de Alimentos Equivalentes.
 *
 * Lo crítico aquí son dos cosas: que los aportes por equivalente no se alteren
 * (son valores de tabla, no opinables) y que los repartos automáticos CUADREN
 * exactamente, porque un descuadre silencioso da una dieta con más o menos
 * energía de la calculada.
 */

describe('GRUPOS_SMAE (tabla de referencia)', () => {
  it('tiene los 17 grupos del sistema', () => {
    expect(GRUPOS_SMAE).toHaveLength(17)
  })

  it('no repite identificadores', () => {
    const ids = GRUPOS_SMAE.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  // Valores de tabla: si cambian, las dietas dejan de cuadrar con el SMAE.
  it.each([
    ['VERDURAS', 4, 2, 0],
    ['FRUTAS', 15, 0, 0],
    ['CEREALES_SG', 15, 2, 0],
    ['AOA_BAG', 0, 7, 3],
  ])('conserva el aporte de %s', (id, hco, proteina, lipidos) => {
    const g = GRUPOS_SMAE.find((x) => x.id === id)
    expect(g).toBeDefined()
    expect(g!.hco).toBe(hco)
    expect(g!.proteina).toBe(proteina)
    expect(g!.lipidos).toBe(lipidos)
  })

  /**
   * Las kcal declaradas deben ser coherentes con los macros por Atwater
   * (HCO y proteína 4 kcal/g, lípidos 9). El SMAE redondea, así que se admite
   * un margen pequeño.
   */
  it('declara kcal coherentes con sus macronutrientes', () => {
    for (const g of GRUPOS_SMAE) {
      const teorico = g.hco * 4 + g.proteina * 4 + g.lipidos * 9
      expect(Math.abs(g.kcal - teorico)).toBeLessThanOrEqual(10)
    }
  })
})

describe('nutrientesDeAlimento', () => {
  it('multiplica el aporte del grupo por los equivalentes', () => {
    // 2 equivalentes de cereal sin grasa: 30 g HCO, 4 g proteína, 140 kcal
    const n = nutrientesDeAlimento('CEREALES_SG', 2)
    expect(n.hco).toBe(30)
    expect(n.proteina).toBe(4)
    expect(n.kcal).toBe(140)
  })

  it('admite medios equivalentes', () => {
    const n = nutrientesDeAlimento('FRUTAS', 0.5)
    expect(n.hco).toBe(7.5)
    expect(n.kcal).toBe(30)
  })

  it('devuelve ceros con cero equivalentes', () => {
    const n = nutrientesDeAlimento('VERDURAS', 0)
    expect(n.hco).toBe(0)
    expect(n.kcal).toBe(0)
  })
})

describe('sumarEquivalentes', () => {
  it('suma el aporte de todos los grupos', () => {
    // 2 cereales (30 HCO, 4 prot) + 1 fruta (15 HCO) + 1 AOA (7 prot, 3 líp)
    const total = sumarEquivalentes({ CEREALES_SG: 2, FRUTAS: 1, AOA_BAG: 1 })
    expect(total.hco).toBe(45)
    expect(total.proteina).toBe(11)
    expect(total.lipidos).toBe(3)
  })

  it('devuelve ceros sin equivalentes', () => {
    const total = sumarEquivalentes({})
    expect(total).toEqual({ hco: 0, proteina: 0, lipidos: 0, kcal: 0 })
  })

  it('ignora los grupos en cero', () => {
    const conCeros = sumarEquivalentes({ CEREALES_SG: 2, FRUTAS: 0, VERDURAS: 0 })
    const sinCeros = sumarEquivalentes({ CEREALES_SG: 2 })
    expect(conCeros).toEqual(sinCeros)
  })
})

describe('rolDeTiempo', () => {
  it('reconoce las comidas fuertes', () => {
    expect(rolDeTiempo('Desayuno')).toBe('principal')
    expect(rolDeTiempo('Comida')).toBe('principal')
    expect(rolDeTiempo('Cena')).toBe('principal')
  })

  it('reconoce las colaciones', () => {
    expect(rolDeTiempo('Colación 1')).toBe('colacion')
    expect(rolDeTiempo('Snack')).toBe('colacion')
    expect(rolDeTiempo('Refrigerio')).toBe('colacion')
    expect(rolDeTiempo('Pre-entreno')).toBe('colacion')
  })

  it('no depende de acentos ni mayúsculas', () => {
    expect(rolDeTiempo('COLACIÓN')).toBe('colacion')
    expect(rolDeTiempo('colacion')).toBe('colacion')
  })

  it('trata como principal lo que no reconoce', () => {
    // Más seguro: recibe carga completa en vez de quedarse casi vacío.
    expect(rolDeTiempo('Media tarde')).toBe('principal')
  })
})

describe('distribuirEnTiemposAuto', () => {
  const equivalentes: Equivalentes = {
    VERDURAS: 5,
    FRUTAS: 3,
    CEREALES_SG: 6,
    LEGUMINOSAS: 2,
    AOA_BAG: 5,
    LECHE_DES: 2,
    ACEITES_SP: 4,
  }

  /**
   * Lo más importante de esta función: lo repartido debe sumar EXACTAMENTE lo
   * disponible. Si sobra o falta, la dieta no cuadra con el cuadro calculado.
   */
  it('reparte exactamente los equivalentes disponibles', () => {
    const dist = distribuirEnTiemposAuto(equivalentes, TIEMPOS_DEFAULT)
    for (const cuadre of validarDistribucion(equivalentes, dist)) {
      expect(cuadre.completo).toBe(true)
    }
  })

  it('cuadra también con medios equivalentes', () => {
    const conMedios: Equivalentes = { VERDURAS: 3.5, FRUTAS: 2.5, CEREALES_SG: 4.5 }
    const dist = distribuirEnTiemposAuto(conMedios, TIEMPOS_DEFAULT)
    for (const cuadre of validarDistribucion(conMedios, dist)) {
      expect(cuadre.completo).toBe(true)
    }
  })

  it('cuadra sin colaciones, solo con comidas fuertes', () => {
    const soloPrincipales = [
      { id: 't1', nombre: 'Desayuno' },
      { id: 't2', nombre: 'Comida' },
      { id: 't3', nombre: 'Cena' },
    ]
    const dist = distribuirEnTiemposAuto(equivalentes, soloPrincipales)
    for (const cuadre of validarDistribucion(equivalentes, dist)) {
      expect(cuadre.completo).toBe(true)
    }
  })

  it('coloca la fruta sobre todo en las colaciones', () => {
    const dist = distribuirEnTiemposAuto({ FRUTAS: 4 }, TIEMPOS_DEFAULT)
    const enColaciones = (dist['t2']?.FRUTAS ?? 0) + (dist['t4']?.FRUTAS ?? 0)
    const enPrincipales =
      (dist['t1']?.FRUTAS ?? 0) + (dist['t3']?.FRUTAS ?? 0) + (dist['t5']?.FRUTAS ?? 0)
    expect(enColaciones).toBeGreaterThan(enPrincipales)
  })

  it('coloca las leguminosas en las comidas fuertes', () => {
    const dist = distribuirEnTiemposAuto({ LEGUMINOSAS: 3 }, TIEMPOS_DEFAULT)
    // No tienen sitio natural en una colación
    expect(dist['t2']?.LEGUMINOSAS ?? 0).toBe(0)
    expect(dist['t4']?.LEGUMINOSAS ?? 0).toBe(0)
  })

  it('es determinista con la misma semilla', () => {
    const a = distribuirEnTiemposAuto(equivalentes, TIEMPOS_DEFAULT, 3)
    const b = distribuirEnTiemposAuto(equivalentes, TIEMPOS_DEFAULT, 3)
    expect(a).toEqual(b)
  })

  it('propone repartos distintos con semillas distintas', () => {
    const firmas = new Set(
      [1, 2, 3, 4].map((s) => JSON.stringify(distribuirEnTiemposAuto(equivalentes, TIEMPOS_DEFAULT, s)))
    )
    expect(firmas.size).toBeGreaterThan(1)
  })

  it('cuadra en todas las variaciones, no solo en la primera', () => {
    for (const semilla of [1, 2, 3, 4, 5]) {
      const dist = distribuirEnTiemposAuto(equivalentes, TIEMPOS_DEFAULT, semilla)
      for (const cuadre of validarDistribucion(equivalentes, dist)) {
        expect(cuadre.completo).toBe(true)
      }
    }
  })

  it('devuelve un reparto vacío si no hay tiempos', () => {
    expect(distribuirEnTiemposAuto(equivalentes, [])).toEqual({})
  })
})

describe('calcularEquivalentesAuto', () => {
  const meta = { kcalMeta: 1800, hco_g: 225, proteina_g: 112, lipidos_g: 50 }

  it('se aproxima a la meta de macros', () => {
    const eq = calcularEquivalentesAuto(meta)
    const total = sumarEquivalentes(eq)
    // Margen amplio: son equivalentes discretos, no se puede clavar al gramo.
    expect(Math.abs(total.proteina - meta.proteina_g)).toBeLessThan(25)
    expect(Math.abs(total.lipidos - meta.lipidos_g)).toBeLessThan(20)
    expect(Math.abs(total.kcal - meta.kcalMeta)).toBeLessThan(200)
  })

  it('propone un patrón de alimentación completo', () => {
    const eq = calcularEquivalentesAuto(meta)
    // Una dieta sensata incluye verduras y fruta, no solo proteína y cereal.
    expect(eq.VERDURAS ?? 0).toBeGreaterThan(0)
    expect(eq.FRUTAS ?? 0).toBeGreaterThan(0)
  })

  it('usa solo medios equivalentes', () => {
    const eq = calcularEquivalentesAuto(meta)
    for (const valor of Object.values(eq)) {
      expect((valor ?? 0) * 2).toBeCloseTo(Math.round((valor ?? 0) * 2), 5)
    }
  })

  it('no propone cantidades absurdas', () => {
    const eq = calcularEquivalentesAuto(meta)
    for (const valor of Object.values(eq)) {
      expect(valor ?? 0).toBeLessThanOrEqual(20)
    }
  })

  it('es determinista con la misma semilla', () => {
    expect(calcularEquivalentesAuto(meta, 2)).toEqual(calcularEquivalentesAuto(meta, 2))
  })

  it('se adapta a metas muy distintas', () => {
    const baja = sumarEquivalentes(
      calcularEquivalentesAuto({ kcalMeta: 1200, hco_g: 150, proteina_g: 75, lipidos_g: 33 })
    )
    const alta = sumarEquivalentes(
      calcularEquivalentesAuto({ kcalMeta: 2800, hco_g: 350, proteina_g: 140, lipidos_g: 78 })
    )
    expect(alta.kcal).toBeGreaterThan(baja.kcal)
  })
})

describe('repartidoDeGrupo y validarDistribucion', () => {
  it('suma lo repartido de un grupo entre todos los tiempos', () => {
    const dist = { t1: { FRUTAS: 1 }, t2: { FRUTAS: 0.5 }, t3: { VERDURAS: 2 } }
    expect(repartidoDeGrupo(dist, 'FRUTAS')).toBe(1.5)
    expect(repartidoDeGrupo(dist, 'VERDURAS')).toBe(2)
  })

  it('devuelve cero para un grupo sin repartir', () => {
    expect(repartidoDeGrupo({ t1: { FRUTAS: 1 } }, 'AOA_BAG')).toBe(0)
  })

  it('detecta un grupo incompleto', () => {
    const cuadres = validarDistribucion({ FRUTAS: 3 }, { t1: { FRUTAS: 2 } })
    const fruta = cuadres.find((c) => c.grupo === 'FRUTAS')
    expect(fruta?.completo).toBe(false)
    expect(fruta?.repartido).toBe(2)
    expect(fruta?.total).toBe(3)
  })

  it('detecta un grupo con exceso', () => {
    const cuadres = validarDistribucion({ FRUTAS: 2 }, { t1: { FRUTAS: 3 } })
    expect(cuadres.find((c) => c.grupo === 'FRUTAS')?.completo).toBe(false)
  })

  it('solo valida los grupos que el nutriólogo definió', () => {
    const cuadres = validarDistribucion({ FRUTAS: 2 }, { t1: { FRUTAS: 2 } })
    expect(cuadres).toHaveLength(1)
  })
})

describe('calcularDiferencia', () => {
  it('resta la meta de los totales', () => {
    const dif = calcularDiferencia(
      { hco: 230, proteina: 115, lipidos: 52, kcal: 1850 },
      { kcalMeta: 1800, hco_g: 225, proteina_g: 112, lipidos_g: 50 }
    )
    expect(dif.hco).toBeCloseTo(5, 1)
    expect(dif.proteina).toBeCloseTo(3, 1)
    expect(dif.kcal).toBe(50)
  })

  it('devuelve negativos cuando falta para la meta', () => {
    const dif = calcularDiferencia(
      { hco: 200, proteina: 100, lipidos: 45, kcal: 1650 },
      { kcalMeta: 1800, hco_g: 225, proteina_g: 112, lipidos_g: 50 }
    )
    expect(dif.hco).toBeLessThan(0)
    expect(dif.kcal).toBeLessThan(0)
  })
})

describe('cuadroDistribucion', () => {
  it('convierte porcentajes en kcal y gramos', () => {
    const filas = cuadroDistribucion(2000, 50, 25, 25)
    const hco = filas.find((f) => f.nombre === 'HCO')
    expect(hco?.kcal).toBe(1000) // 50% de 2000
    expect(hco?.gramos).toBeCloseTo(250, 0) // 1000 / 4
  })

  it('usa 9 kcal por gramo en los lípidos', () => {
    const filas = cuadroDistribucion(1800, 50, 30, 20)
    const lip = filas.find((f) => f.nombre === 'Lípidos')
    expect(lip?.kcal).toBe(540) // 30% de 1800
    expect(lip?.gramos).toBeCloseTo(60, 0) // 540 / 9
  })

  it('incluye la fila informativa de HCO simples', () => {
    const filas = cuadroDistribucion(2000, 50, 25, 25)
    expect(filas.some((f) => /simples/i.test(f.nombre))).toBe(true)
  })
})

describe('resumenTiempo', () => {
  it('calcula el aporte de un tiempo de comida', () => {
    const r = resumenTiempo({ CEREALES_SG: 2, FRUTAS: 1 })
    expect(r.hco).toBe(45) // 30 + 15
    expect(r.kcal).toBe(200) // 140 + 60
  })

  it('devuelve ceros en un tiempo vacío', () => {
    expect(resumenTiempo({}).kcal).toBe(0)
  })
})
