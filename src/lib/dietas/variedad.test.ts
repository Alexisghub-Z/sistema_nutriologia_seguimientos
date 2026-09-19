import { describe, it, expect } from 'vitest'
import { nombreDeAlimento, alimentosYaUsados, instruccionDeVariedad } from './variedad'

describe('nombreDeAlimento: quedarse con el alimento, no con la porción', () => {
  it('descarta cantidades, unidades y paréntesis', () => {
    // Descripciones reales salidas del generador.
    expect(nombreDeAlimento('2 tortillas de maíz (30 g c/u)')).toBe('tortillas maiz')
    expect(nombreDeAlimento('≈50 g de pechuga de pollo a la plancha en tiras')).toBe('pechuga pollo')
    expect(nombreDeAlimento('1/2 taza de frijoles bayos cocidos (de olla)')).toBe('frijoles bayos')
    expect(nombreDeAlimento('1 cucharadita (5 ml) de aceite de oliva')).toBe('aceite oliva')
  })

  it('agrupa aunque cambien los acentos o el plural del envase', () => {
    // "plátano" y "platano" deben contar como el mismo alimento, o la lista de
    // "ya comió" se llenaría de duplicados que no sirven de nada.
    expect(nombreDeAlimento('1/2 plátano mediano (≈75 g)')).toBe('platano')
    expect(nombreDeAlimento('3/4 de platano en rebanadas')).toBe('platano')
  })

  it('no revienta con una descripción vacía o solo numérica', () => {
    expect(nombreDeAlimento('')).toBe('')
    expect(nombreDeAlimento('100 g')).toBe('')
  })
})

describe('alimentosYaUsados', () => {
  const dieta = {
    tiempos: [
      {
        alimentos: [
          { grupo: 'CEREALES_SG', descripcion: '2 tortillas de maíz' },
          { grupo: 'AOA_BAG', descripcion: '50 g de pechuga de pollo' },
        ],
      },
    ],
  }

  it('agrupa los alimentos por grupo SMAE', () => {
    const r = alimentosYaUsados([dieta])
    expect(r.get('CEREALES_SG')).toContain('tortillas maiz')
    expect(r.get('AOA_BAG')).toContain('pechuga pollo')
  })

  it('también lee los recetarios, que anidan los alimentos en opciones', () => {
    const recetario = {
      tiempos: [
        { opciones: [{ nombre: 'Avena', alimentos: [{ grupo: 'CEREALES_SG', descripcion: '1/2 taza de avena' }] }] },
      ],
    }
    expect(alimentosYaUsados([recetario]).get('CEREALES_SG')).toContain('avena')
  })

  it('ignora grupos inventados y contenido con otra forma', () => {
    // Un grupo que no existe descuadraría la instrucción con un nombre vacío.
    const raro = { tiempos: [{ alimentos: [{ grupo: 'CHOCOLATE', descripcion: 'x' }] }] }
    expect(alimentosYaUsados([raro]).size).toBe(0)
    expect(alimentosYaUsados([null, 'no es una dieta', {}]).size).toBe(0)
  })
})

describe('instruccionDeVariedad', () => {
  it('nombra por grupo lo que el paciente ya comió', () => {
    const mapa = alimentosYaUsados([
      { tiempos: [{ alimentos: [{ grupo: 'AOA_BAG', descripcion: '50 g de pollo' }] }] },
    ])
    const texto = instruccionDeVariedad(mapa)
    expect(texto).toContain('pollo')
    expect(texto).toContain('AOA bajo aporte de grasa')
  })

  it('deja claro que los equivalentes mandan sobre la variedad', () => {
    // Sin esta salida, forzar variación en grupos con pocas opciones (aceites,
    // tortilla) daría un plan peor en vez de uno más variado.
    const mapa = alimentosYaUsados([
      { tiempos: [{ alimentos: [{ grupo: 'ACEITES_SP', descripcion: '1 cdita de aceite de oliva' }] }] },
    ])
    expect(instruccionDeVariedad(mapa)).toContain('puedes repetir')
  })

  it('no dice nada si el paciente no tiene dietas previas', () => {
    // Cadena vacía y no un texto genérico: un paciente nuevo no debe recibir
    // instrucciones sobre alimentos que nunca comió.
    expect(instruccionDeVariedad(alimentosYaUsados([]))).toBe('')
  })
})
