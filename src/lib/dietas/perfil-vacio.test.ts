import { describe, it, expect } from 'vitest'
import { perfilEstaVacio, camposRellenos, TOTAL_CAMPOS_PERFIL } from './perfil-vacio'

describe('perfilEstaVacio', () => {
  it('un perfil sin ningún campo está vacío', () => {
    expect(perfilEstaVacio({})).toBe(true)
  })

  it('null y undefined cuentan como vacío', () => {
    // El endpoint crea el perfil vacío la primera vez, y el cliente puede no
    // haberlo cargado aún: en ambos casos no hay estilo que usar.
    expect(perfilEstaVacio(null)).toBe(true)
    expect(perfilEstaVacio(undefined)).toBe(true)
  })

  it('campos en blanco o con espacios siguen siendo vacío', () => {
    expect(perfilEstaVacio({ region: '', alimentos_tipicos: '' })).toBe(true)
    expect(perfilEstaVacio({ region: '   ', reglas_propias: '\n\t ' })).toBe(true)
  })

  it('un solo campo con contenido basta para NO estar vacío', () => {
    // A propósito: quien ya escribió algo sabe que el formulario existe.
    // Insistirle sería paternalista.
    expect(perfilEstaVacio({ tono: 'cercano' })).toBe(false)
    expect(perfilEstaVacio({ region: 'Oaxaca' })).toBe(false)
    expect(perfilEstaVacio({ indicaciones_inicio: 'Bebe 2 L de agua' })).toBe(false)
  })

  it('detecta contenido en cualquiera de los ocho campos', () => {
    // Si alguien añade un campo al formulario y olvida incluirlo aquí, el
    // aviso saldría mal; esto lo deja a la vista.
    const campos = [
      'region',
      'alimentos_tipicos',
      'alimentos_evitar',
      'estructura_notas',
      'reglas_propias',
      'tono',
      'instrucciones_libres',
      'indicaciones_inicio',
    ] as const

    expect(campos).toHaveLength(TOTAL_CAMPOS_PERFIL)

    for (const campo of campos) {
      expect(perfilEstaVacio({ [campo]: 'algo' }), `${campo} no se tuvo en cuenta`).toBe(false)
    }
  })

  it('ignora campos que no son del perfil', () => {
    // El endpoint devuelve también id y fechas: no son estilo.
    const conBasura = { id: 'abc', createdAt: '2026-01-01' } as Record<string, string>
    expect(perfilEstaVacio(conBasura)).toBe(true)
  })
})

describe('camposRellenos', () => {
  it('cuenta solo los que tienen contenido real', () => {
    expect(camposRellenos({})).toBe(0)
    expect(camposRellenos(null)).toBe(0)
    expect(camposRellenos({ region: 'Oaxaca', tono: '  ' })).toBe(1)
    expect(camposRellenos({ region: 'Oaxaca', tono: 'cercano' })).toBe(2)
  })

  it('un perfil completo cuenta todos los campos', () => {
    expect(
      camposRellenos({
        region: 'Oaxaca',
        alimentos_tipicos: 'tlayudas',
        alimentos_evitar: 'refrescos',
        estructura_notas: 'por tiempos',
        reglas_propias: 'sin frituras',
        tono: 'cercano',
        instrucciones_libres: 'nada más',
        indicaciones_inicio: '2 L de agua',
      })
    ).toBe(TOTAL_CAMPOS_PERFIL)
  })
})
