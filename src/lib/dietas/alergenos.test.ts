import { describe, it, expect } from 'vitest'
import { buscarAlergenos } from './alergenos'

/**
 * Pruebas del detector de alérgenos.
 *
 * Es la última barrera antes de que una dieta llegue al paciente, así que
 * importan los dos lados: que DETECTE lo que hay (un falso negativo es un riesgo
 * clínico) y que no dispare avisos sin motivo (un falso positivo constante hace
 * que el nutriólogo deje de mirarlos).
 */

/** Atajo para no repetir la estructura en cada caso. */
const buscar = (alergias: string | null | undefined, ...textos: string[]) =>
  buscarAlergenos(
    alergias,
    textos.map((texto) => ({ texto, ubicacion: 'Comida' }))
  )

describe('buscarAlergenos: detección directa', () => {
  it('encuentra el alérgeno nombrado tal cual', () => {
    const r = buscar('cacahuate', '1 cda de crema de cacahuate')
    expect(r).toHaveLength(1)
    expect(r[0]!.declarado).toBe('cacahuate')
  })

  it('no distingue mayúsculas', () => {
    expect(buscar('CACAHUATE', 'crema de Cacahuate')).toHaveLength(1)
  })

  it('no distingue acentos', () => {
    // El nutriólogo puede escribir con o sin acento; el alimento también.
    expect(buscar('camarón', '80 g de camaron')).toHaveLength(1)
    expect(buscar('camaron', '80 g de camarón')).toHaveLength(1)
  })

  it('informa dónde apareció', () => {
    const r = buscarAlergenos('mariscos', [
      { texto: '80 g de camarón', ubicacion: 'Comida · opción 2' },
    ])
    expect(r[0]!.ubicacion).toBe('Comida · opción 2')
    expect(r[0]!.texto).toBe('80 g de camarón')
  })
})

describe('buscarAlergenos: derivados', () => {
  /**
   * Lo que hace útil al detector: una búsqueda literal de "lácteos" no
   * encontraría "queso panela", que es justo el caso frecuente.
   */
  it.each([
    ['lácteos', '30 g de queso panela'],
    ['lácteos', '1 taza de yogur natural'],
    ['leche', '2 cdas de crema'],
    ['lactosa', '240 ml de leche descremada'],
    ['huevo', 'Omelette de claras'],
    ['gluten', '2 rebanadas de pan integral'],
    ['trigo', '1 taza de pasta cocida'],
    ['nuez', '6 almendras'],
    ['mariscos', '100 g de pulpo'],
    ['cerdo', '2 rebanadas de jamón'],
    ['soya', '80 g de tofu'],
  ])('detecta %s en «%s»', (alergia, texto) => {
    expect(buscar(alergia, texto).length).toBeGreaterThan(0)
  })
})

describe('buscarAlergenos: sin falsos positivos', () => {
  it('no avisa cuando el alimento no tiene relación', () => {
    expect(buscar('mariscos', '100 g de pechuga de pollo')).toHaveLength(0)
    expect(buscar('lácteos', '1 taza de papaya')).toHaveLength(0)
    expect(buscar('cacahuate', '2 tortillas de maíz')).toHaveLength(0)
  })

  it('no avisa si no hay alergias declaradas', () => {
    expect(buscar(null, '80 g de camarón')).toHaveLength(0)
    expect(buscar(undefined, '80 g de camarón')).toHaveLength(0)
    expect(buscar('', '80 g de camarón')).toHaveLength(0)
    expect(buscar('   ', '80 g de camarón')).toHaveLength(0)
  })

  it('no avisa sobre una dieta vacía', () => {
    expect(buscarAlergenos('mariscos', [])).toHaveLength(0)
  })

  it('ignora palabras demasiado cortas de la declaración', () => {
    // "y", "de" no deben usarse como término de búsqueda: casarían con todo.
    expect(buscar('de y a', '80 g de pollo')).toHaveLength(0)
  })
})

describe('buscarAlergenos: varias alergias', () => {
  it('separa la lista por comas', () => {
    const r = buscar('mariscos, cacahuate', '1 cda de crema de cacahuate')
    expect(r).toHaveLength(1)
    expect(r[0]!.declarado).toBe('cacahuate')
  })

  it('admite otros separadores', () => {
    expect(buscar('mariscos; cacahuate', 'crema de cacahuate')).toHaveLength(1)
    expect(buscar('mariscos / cacahuate', 'crema de cacahuate')).toHaveLength(1)
  })

  it('detecta varias alergias distintas en la misma dieta', () => {
    const r = buscar('mariscos, cacahuate', '80 g de camarón', '1 cda de crema de cacahuate')
    expect(r).toHaveLength(2)
    expect(r.map((h) => h.declarado).sort()).toEqual(['cacahuate', 'mariscos'])
  })
})

describe('buscarAlergenos: sin duplicados', () => {
  it('no repite el mismo alérgeno en la misma ubicación', () => {
    // Dos alimentos con camarón en el mismo tiempo: un solo aviso.
    const r = buscarAlergenos('mariscos', [
      { texto: '80 g de camarón', ubicacion: 'Comida' },
      { texto: 'caldo de camarón', ubicacion: 'Comida' },
    ])
    expect(r).toHaveLength(1)
  })

  it('sí avisa del mismo alérgeno en ubicaciones distintas', () => {
    const r = buscarAlergenos('mariscos', [
      { texto: '80 g de camarón', ubicacion: 'Comida' },
      { texto: 'coctel de camarón', ubicacion: 'Cena' },
    ])
    expect(r).toHaveLength(2)
  })
})
