import { describe, it, expect } from 'vitest'
import { encolar, MAX_VISIBLES } from './toast-cola'

describe('encolar', () => {
  it('acumula mientras quepan', () => {
    const r1 = encolar([], 'a')
    expect(r1.visibles).toEqual(['a'])
    expect(r1.descartados).toEqual([])

    const r2 = encolar(r1.visibles, 'b')
    expect(r2.visibles).toEqual(['a', 'b'])
    expect(r2.descartados).toEqual([])
  })

  it('llega justo al tope sin descartar nada', () => {
    const r = encolar(['a', 'b'], 'c')
    expect(r.visibles).toEqual(['a', 'b', 'c'])
    expect(r.descartados).toEqual([])
  })

  it('al pasarse, descarta el más viejo y conserva el nuevo', () => {
    const r = encolar(['a', 'b', 'c'], 'd')
    expect(r.visibles).toEqual(['b', 'c', 'd'])
    expect(r.descartados).toEqual(['a'])
  })

  it('nunca supera el tope', () => {
    let visibles: string[] = []
    for (const m of ['a', 'b', 'c', 'd', 'e', 'f']) {
      visibles = encolar(visibles, m).visibles
      expect(visibles.length).toBeLessThanOrEqual(MAX_VISIBLES)
    }
    expect(visibles).toEqual(['d', 'e', 'f'])
  })

  it('devuelve TODOS los descartados si la cola venía pasada de tope', () => {
    // Importa para no dejar temporizadores huérfanos corriendo.
    const r = encolar(['a', 'b', 'c', 'd'], 'e')
    expect(r.visibles).toEqual(['c', 'd', 'e'])
    expect(r.descartados).toEqual(['a', 'b'])
  })

  it('no muta el array original', () => {
    const original = ['a', 'b', 'c']
    encolar(original, 'd')
    expect(original).toEqual(['a', 'b', 'c'])
  })

  it('respeta un tope personalizado', () => {
    const r = encolar(['a'], 'b', 1)
    expect(r.visibles).toEqual(['b'])
    expect(r.descartados).toEqual(['a'])
  })
})
