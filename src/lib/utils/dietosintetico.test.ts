import { describe, it, expect } from 'vitest'
import {
  calcularGEB,
  calcularMLG,
  calcularGET,
  calcularKcalMeta,
  distribuirMacros,
  calcularIMC,
  clasificarIMC,
  calcularPesoIdeal,
  calcularCuadroDietosintetico,
} from './dietosintetico'

/**
 * Pruebas del motor de cálculo del cuadro dietosintético.
 *
 * Los valores esperados se derivan de las fórmulas publicadas, no de lo que
 * devuelve el código: así una prueba falla cuando la implementación se desvía
 * de la fórmula, que es justo lo que queremos detectar.
 */

describe('calcularGEB', () => {
  // Mifflin-St Jeor: (10 × peso) + (6.25 × talla) − (5 × edad) + 5 (H) / − 161 (M)
  it('aplica Mifflin-St Jeor en hombres', () => {
    // 10(80) + 6.25(175) − 5(30) + 5 = 800 + 1093.75 − 150 + 5 = 1748.75 → 1749
    expect(calcularGEB(80, 175, 30, 'MASCULINO')).toBe(1749)
  })

  it('aplica Mifflin-St Jeor en mujeres', () => {
    // 10(65) + 6.25(162) − 5(28) − 161 = 650 + 1012.5 − 140 − 161 = 1361.5 → 1362
    expect(calcularGEB(65, 162, 28, 'FEMENINO')).toBe(1362)
  })

  it('usa Mifflin cuando no se indica fórmula', () => {
    expect(calcularGEB(80, 175, 30, 'MASCULINO')).toBe(
      calcularGEB(80, 175, 30, 'MASCULINO', 'MIFFLIN')
    )
  })

  // Harris-Benedict revisada
  it('aplica Harris-Benedict en hombres', () => {
    // 13.397(80) + 4.799(175) − 5.677(30) + 88.362 = 1071.76 + 839.825 − 170.31 + 88.362
    expect(calcularGEB(80, 175, 30, 'MASCULINO', 'HARRIS')).toBe(1830)
  })

  it('aplica Harris-Benedict en mujeres', () => {
    // 9.247(65) + 3.098(162) − 4.33(28) + 447.593 = 601.055 + 501.876 − 121.24 + 447.593
    expect(calcularGEB(65, 162, 28, 'FEMENINO', 'HARRIS')).toBe(1429)
  })

  // Katch-McArdle y Cunningham dependen solo de la masa libre de grasa
  it('aplica Katch-McArdle a partir de la MLG', () => {
    // 370 + 21.6(64) = 370 + 1382.4 = 1752.4 → 1752
    expect(calcularGEB(80, 175, 30, 'MASCULINO', 'KATCH', 64)).toBe(1752)
  })

  it('aplica Cunningham a partir de la MLG', () => {
    // 500 + 22(64) = 1908
    expect(calcularGEB(80, 175, 30, 'MASCULINO', 'CUNNINGHAM', 64)).toBe(1908)
  })

  it('ignora sexo y edad en las fórmulas basadas en MLG', () => {
    const hombre = calcularGEB(80, 175, 30, 'MASCULINO', 'KATCH', 64)
    const mujer = calcularGEB(55, 160, 50, 'FEMENINO', 'KATCH', 64)
    expect(hombre).toBe(mujer)
  })

  // Sin MLG estas fórmulas no se pueden aplicar: mejor fallar que inventar
  it('exige MLG para Katch-McArdle', () => {
    expect(() => calcularGEB(80, 175, 30, 'MASCULINO', 'KATCH')).toThrow(/masa libre de grasa/i)
  })

  it('exige MLG para Cunningham', () => {
    expect(() => calcularGEB(80, 175, 30, 'MASCULINO', 'CUNNINGHAM')).toThrow(
      /masa libre de grasa/i
    )
  })

  it('rechaza una MLG de cero o negativa', () => {
    expect(() => calcularGEB(80, 175, 30, 'MASCULINO', 'KATCH', 0)).toThrow()
    expect(() => calcularGEB(80, 175, 30, 'MASCULINO', 'KATCH', -5)).toThrow()
  })
})

describe('calcularMLG', () => {
  it('descuenta el porcentaje de grasa del peso', () => {
    // 80 kg con 20% de grasa → 64 kg de masa libre de grasa
    expect(calcularMLG(80, 20)).toBe(64)
  })

  it('devuelve el peso completo si no hay grasa', () => {
    expect(calcularMLG(70, 0)).toBe(70)
  })

  it('redondea a un decimal', () => {
    // 75 × (1 − 0.333) = 50.025 → 50
    expect(calcularMLG(75, 33.3)).toBeCloseTo(50, 1)
  })
})

describe('calcularGET', () => {
  it('multiplica el GEB por el factor de actividad', () => {
    // Sedentario suele ser 1.2
    const get = calcularGET(1500, 'SEDENTARIO')
    expect(get).toBeGreaterThan(1500)
    expect(get).toBeLessThan(2000)
  })

  it('crece con el nivel de actividad', () => {
    const geb = 1500
    const sedentario = calcularGET(geb, 'SEDENTARIO')
    const ligero = calcularGET(geb, 'LIGERO')
    const moderado = calcularGET(geb, 'MODERADO')
    const activo = calcularGET(geb, 'ACTIVO')
    const muyActivo = calcularGET(geb, 'MUY_ACTIVO')

    expect(ligero).toBeGreaterThan(sedentario)
    expect(moderado).toBeGreaterThan(ligero)
    expect(activo).toBeGreaterThan(moderado)
    expect(muyActivo).toBeGreaterThan(activo)
  })

  it('nunca queda por debajo del gasto basal', () => {
    expect(calcularGET(1500, 'SEDENTARIO')).toBeGreaterThanOrEqual(1500)
  })
})

describe('calcularKcalMeta', () => {
  it('resta calorías para bajar de peso', () => {
    expect(calcularKcalMeta(2500, 'BAJAR_PESO')).toBeLessThan(2500)
  })

  it('mantiene el gasto para conservar el peso', () => {
    expect(calcularKcalMeta(2500, 'MANTENER')).toBe(2500)
  })

  it('suma calorías para subir de peso', () => {
    expect(calcularKcalMeta(2500, 'SUBIR_PESO')).toBeGreaterThan(2500)
  })

  it('respeta un ajuste personalizado por encima del objetivo', () => {
    expect(calcularKcalMeta(2500, 'BAJAR_PESO', -300)).toBe(2200)
    expect(calcularKcalMeta(2500, 'SUBIR_PESO', 500)).toBe(3000)
  })

  /**
   * Suelo de seguridad: una dieta por debajo de ~1200 kcal no cubre los
   * requerimientos mínimos sin supervisión. Es la protección más importante de
   * este módulo.
   */
  it('no baja del mínimo de seguridad aunque el ajuste sea extremo', () => {
    expect(calcularKcalMeta(1400, 'BAJAR_PESO', -1000)).toBeGreaterThanOrEqual(1200)
  })

  it('mantiene el suelo con un gasto muy bajo', () => {
    expect(calcularKcalMeta(1000, 'BAJAR_PESO')).toBeGreaterThanOrEqual(1200)
  })
})

describe('distribuirMacros', () => {
  it('reparte las calorías según los porcentajes indicados', () => {
    const m = distribuirMacros(2000, { proteina: 30, grasa: 25, carbohidrato: 45 })
    // Atwater: proteína y HCO 4 kcal/g, grasa 9 kcal/g
    expect(m.proteina.gramos).toBeCloseTo((2000 * 0.3) / 4, 0) // 150 g
    expect(m.grasa.gramos).toBeCloseTo((2000 * 0.25) / 9, 0) // ~55.6 g
    expect(m.carbohidrato.gramos).toBeCloseTo((2000 * 0.45) / 4, 0) // 225 g
  })

  it('las kcal de los macros suman el total', () => {
    const m = distribuirMacros(2000, { proteina: 30, grasa: 25, carbohidrato: 45 })
    const suma = m.proteina.kcal + m.grasa.kcal + m.carbohidrato.kcal
    expect(suma).toBeCloseTo(2000, 0)
  })

  it('conserva los porcentajes recibidos', () => {
    const m = distribuirMacros(1800, { proteina: 25, grasa: 30, carbohidrato: 45 })
    expect(m.proteina.porcentaje).toBe(25)
    expect(m.grasa.porcentaje).toBe(30)
    expect(m.carbohidrato.porcentaje).toBe(45)
  })
})

describe('calcularIMC y clasificarIMC', () => {
  it('calcula el IMC como peso entre talla al cuadrado', () => {
    // 80 / 1.75² = 80 / 3.0625 = 26.12
    expect(calcularIMC(80, 175)).toBeCloseTo(26.1, 1)
  })

  it('clasifica según los cortes de la OMS', () => {
    expect(clasificarIMC(17)).toMatch(/bajo/i)
    expect(clasificarIMC(22)).toMatch(/normal/i)
    expect(clasificarIMC(27)).toMatch(/sobrepeso/i)
    expect(clasificarIMC(32)).toMatch(/obesidad/i)
  })

  it('sitúa los límites en la categoría correcta', () => {
    // 18.5 y 25 son los cortes clásicos: pertenecen a la categoría superior
    expect(clasificarIMC(18.5)).toMatch(/normal/i)
    expect(clasificarIMC(25)).toMatch(/sobrepeso/i)
    expect(clasificarIMC(30)).toMatch(/obesidad/i)
  })
})

describe('calcularPesoIdeal', () => {
  it('devuelve un peso plausible para la talla', () => {
    const ideal = calcularPesoIdeal(175, 'MASCULINO')
    expect(ideal).toBeGreaterThan(50)
    expect(ideal).toBeLessThan(100)
  })

  it('crece con la estatura', () => {
    expect(calcularPesoIdeal(180, 'MASCULINO')).toBeGreaterThan(
      calcularPesoIdeal(165, 'MASCULINO')
    )
  })
})

describe('calcularCuadroDietosintetico (integración)', () => {
  const entrada = {
    peso: 80,
    tallaCm: 175,
    edad: 30,
    sexo: 'MASCULINO' as const,
    nivelActividad: 'MODERADO' as const,
    objetivo: 'BAJAR_PESO' as const,
    distribucionMacros: { proteina: 30, grasa: 25, carbohidrato: 45 },
  }

  it('encadena los cálculos de forma coherente', () => {
    const r = calcularCuadroDietosintetico(entrada)
    expect(r.geb).toBe(1749) // Mifflin, verificado arriba
    expect(r.get).toBeGreaterThan(r.geb) // la actividad suma
    expect(r.kcalMeta).toBeLessThan(r.get) // bajar peso resta
    expect(r.imc).toBeCloseTo(26.1, 1)
  })

  it('los macros cuadran con la kcal meta', () => {
    const r = calcularCuadroDietosintetico(entrada)
    const suma =
      r.macros.proteina.kcal + r.macros.grasa.kcal + r.macros.carbohidrato.kcal
    // Tolerancia por el redondeo de gramos a un decimal
    expect(Math.abs(suma - r.kcalMeta)).toBeLessThan(15)
  })

  it('propaga la fórmula elegida', () => {
    const conKatch = calcularCuadroDietosintetico({
      ...entrada,
      formula: 'KATCH',
      mlgKg: 64,
    })
    expect(conKatch.geb).toBe(1752)
  })

  it('falla si la fórmula necesita MLG y no se aporta', () => {
    expect(() => calcularCuadroDietosintetico({ ...entrada, formula: 'KATCH' })).toThrow()
  })

  it('respeta el suelo de seguridad en un caso extremo', () => {
    const r = calcularCuadroDietosintetico({
      ...entrada,
      peso: 45,
      tallaCm: 150,
      edad: 70,
      sexo: 'FEMENINO',
      nivelActividad: 'SEDENTARIO',
      ajusteObjetivoCustom: -800,
    })
    expect(r.kcalMeta).toBeGreaterThanOrEqual(1200)
  })
})
