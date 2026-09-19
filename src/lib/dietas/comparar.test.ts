import { describe, it, expect } from 'vitest'
import {
  compararDietas,
  compararPlatillos,
  compararGrupos,
  compararContexto,
  motivoNoComparable,
  type DietaComparable,
} from './comparar'

/** Una dieta guardada, con lo mínimo para comparar. */
function dieta(over: Partial<DietaComparable> = {}): DietaComparable {
  return {
    id: 'd1',
    modo: 'DIETA',
    fecha: '2026-06-12T10:00:00.000Z',
    contenido: {
      tiempos: [
        {
          nombre: 'Desayuno',
          alimentos: [{ descripcion: '2 tortillas de maíz' }, { descripcion: '1 huevo' }],
        },
      ],
    },
    equivalentes: { CEREALES_SG: 2, AOA_BAG: 1 },
    cuadro: { peso: 78.5, imc: 26.4, kcalMeta: 1800, objetivo: 'BAJAR_PESO' },
    ...over,
  }
}

describe('compararContexto: la evolución clínica', () => {
  it('calcula la bajada de peso y de meta calórica', () => {
    const c = compararContexto(
      { peso: 78.5, imc: 26.4, kcalMeta: 1800 },
      { peso: 74.2, imc: 24.9, kcalMeta: 1650 }
    )
    const peso = c.find((x) => x.etiqueta === 'Peso')
    expect(peso?.delta).toBe(-4.3)
    expect(c.find((x) => x.etiqueta === 'Meta diaria')?.delta).toBe(-150)
  })

  it('omite un dato que falta en una de las dos', () => {
    // Con el peso ausente, mostrar "0 → 74 kg" sería inventar una bajada
    // de 74 kilos que nunca ocurrió.
    const c = compararContexto({ peso: null, kcalMeta: 1800 }, { peso: 74.2, kcalMeta: 1650 })
    expect(c.some((x) => x.etiqueta === 'Peso')).toBe(false)
    expect(c.some((x) => x.etiqueta === 'Meta diaria')).toBe(true)
  })

  it('no arrastra colas de coma flotante', () => {
    // 74.3 - 74.2 da 0.09999999999999432 en binario.
    const c = compararContexto({ peso: 74.3 }, { peso: 74.2 })
    expect(c[0]?.delta).toBe(-0.1)
  })
})

describe('compararGrupos: el cambio estructural', () => {
  it('detecta qué grupo subió y cuál bajó', () => {
    const g = compararGrupos({ CEREALES_SG: 8, AOA_BAG: 5 }, { CEREALES_SG: 6, AOA_BAG: 6 })
    expect(g.find((x) => x.grupo === 'CEREALES_SG')?.delta).toBe(-2)
    expect(g.find((x) => x.grupo === 'AOA_BAG')?.delta).toBe(1)
  })

  it('incluye un grupo que aparece de cero', () => {
    const g = compararGrupos({ CEREALES_SG: 4 }, { CEREALES_SG: 4, LEGUMINOSAS: 2 })
    expect(g.find((x) => x.grupo === 'LEGUMINOSAS')?.delta).toBe(2)
  })

  it('omite los grupos que no se usan en ninguna de las dos', () => {
    // De 17 grupos, una dieta usa seis o siete: listar los vacíos con 0 → 0
    // enterraría los que sí cambiaron.
    const g = compararGrupos({ CEREALES_SG: 4 }, { CEREALES_SG: 4 })
    expect(g).toHaveLength(1)
  })

  it('redondea los medios equivalentes sin colas binarias', () => {
    const g = compararGrupos({ ACEITES_SP: 1.1 }, { ACEITES_SP: 0.8 })
    expect(g[0]?.delta).toBe(-0.3)
  })

  it('no revienta si faltan los equivalentes', () => {
    expect(compararGrupos(null, undefined)).toEqual([])
  })
})

describe('compararPlatillos: qué comida cambió', () => {
  const conAlimentos = (nombre: string, descripciones: string[]) => ({
    tiempos: [{ nombre, alimentos: descripciones.map((d) => ({ descripcion: d })) }],
  })

  it('separa lo que entró, salió y sigue', () => {
    const r = compararPlatillos(
      conAlimentos('Desayuno', ['2 tortillas de maíz', '1 huevo']),
      conAlimentos('Desayuno', ['2 tortillas de maíz', '2 claras de huevo'])
    )
    const desayuno = r?.[0]
    // "claras" y "huevo" son alimentos distintos y deben separarse; la
    // tortilla, idéntica en las dos, tiene que seguir.
    expect(desayuno?.siguen).toContain('tortillas')
    expect(desayuno?.entraron).toContain('claras')
    expect(desayuno?.salieron).toContain('huevo')
  })

  it('no cuenta como cambio una redacción distinta del mismo alimento', () => {
    // Este es el motivo de normalizar: retocar el texto de una porción no es
    // cambiarle la comida al paciente.
    const r = compararPlatillos(
      conAlimentos('Colación', ['1 taza de papaya']),
      conAlimentos('Colación', ['1 taza de papaya en cubos'])
    )
    expect(r?.[0]?.entraron).toHaveLength(0)
    expect(r?.[0]?.salieron).toHaveLength(0)
  })

  it('cruza los tiempos por nombre, no por posición', () => {
    // Añadir una colación al principio movía todos los índices: comparando
    // por posición, el día entero salía como cambiado.
    const antes = {
      tiempos: [{ nombre: 'Comida', alimentos: [{ descripcion: '50 g de pollo' }] }],
    }
    const despues = {
      tiempos: [
        { nombre: 'Colación', alimentos: [{ descripcion: '1 manzana' }] },
        { nombre: 'Comida', alimentos: [{ descripcion: '50 g de pollo' }] },
      ],
    }
    const r = compararPlatillos(antes, despues)
    expect(r?.find((x) => x.tiempo === 'Comida')?.siguen).toContain('pollo')
    expect(r?.find((x) => x.tiempo === 'Comida')?.entraron).toHaveLength(0)
    expect(r?.find((x) => x.tiempo === 'Colación')?.entraron).toContain('manzana')
  })

  it('avisa de un tiempo que se quitó entero', () => {
    const r = compararPlatillos(
      conAlimentos('Cena', ['1 quesadilla']),
      { tiempos: [{ nombre: 'Desayuno', alimentos: [{ descripcion: '1 huevo' }] }] }
    )
    const cena = r?.find((x) => x.tiempo === 'Cena')
    expect(cena?.salieron).toContain('quesadilla')
    expect(cena?.entraron).toHaveLength(0)
  })

  it('lee los alimentos anidados de un recetario', () => {
    const receta = (platillo: string, ingrediente: string) => ({
      tiempos: [
        { nombre: 'Comida', opciones: [{ nombre: platillo, alimentos: [{ descripcion: ingrediente }] }] },
      ],
    })
    const r = compararPlatillos(receta('Pollo asado', '50 g de pollo'), receta('Pescado', '80 g de tilapia'))
    expect(r?.[0]?.salieron).toContain('pollo')
    expect(r?.[0]?.entraron).toContain('tilapia')
  })

  it('devuelve null si el contenido no tiene forma de dieta', () => {
    expect(compararPlatillos(null, { tiempos: [] })).toBeNull()
    expect(compararPlatillos({ tiempos: 'roto' }, { tiempos: [] })).toBeNull()
  })
})

describe('compararDietas: la comparación completa', () => {
  it('ordena por fecha aunque se pasen al revés', () => {
    // Marcar dos casillas en un historial no garantiza el orden, y "qué
    // cambió" solo tiene sentido de la más vieja a la más nueva.
    const junio = dieta({ id: 'jun', fecha: '2026-06-12T10:00:00.000Z' })
    const septiembre = dieta({ id: 'sep', fecha: '2026-09-02T10:00:00.000Z' })
    expect(compararDietas(septiembre, junio).anterior.id).toBe('jun')
    expect(compararDietas(junio, septiembre).anterior.id).toBe('jun')
  })

  it('cuenta los días entre las dos', () => {
    const r = compararDietas(
      dieta({ fecha: '2026-06-12T10:00:00.000Z' }),
      dieta({ id: 'd2', fecha: '2026-06-22T10:00:00.000Z' })
    )
    expect(r.diasEntre).toBe(10)
  })

  it('no compara platillos entre una dieta y un recetario', () => {
    // Una lista alimentos fijos y el otro alternativas: cruzarlos daría un
    // resultado que induce a error.
    const r = compararDietas(dieta(), dieta({ id: 'd2', modo: 'RECETARIO', fecha: '2026-09-02T10:00:00.000Z' }))
    expect(r.platillos).toBeNull()
    expect(r.motivoSinPlatillos).toBe('modos_distintos')
    // El contexto clínico sí se compara siempre.
    expect(r.contexto.length).toBeGreaterThan(0)
  })

  it('la misma dieta consigo misma no muestra cambios', () => {
    const r = compararDietas(dieta(), dieta({ id: 'd2', fecha: '2026-09-02T10:00:00.000Z' }))
    expect(r.contexto.every((c) => c.delta === 0)).toBe(true)
    expect(r.platillos?.every((p) => p.entraron.length === 0 && p.salieron.length === 0)).toBe(true)
  })

  it('sobrevive a un contenido corrupto', () => {
    const r = compararDietas(
      dieta({ contenido: null }),
      dieta({ id: 'd2', fecha: '2026-09-02T10:00:00.000Z' })
    )
    expect(r.platillos).toBeNull()
    expect(r.motivoSinPlatillos).toBe('contenido_no_legible')
  })
})

describe('motivoNoComparable: qué impide comparar', () => {
  it('pide dos dietas', () => {
    expect(motivoNoComparable(dieta(), null)).toContain('dos dietas')
  })

  it('rechaza comparar una dieta consigo misma', () => {
    expect(motivoNoComparable(dieta(), dieta())).toContain('misma dieta')
  })

  it('detecta modos distintos por la FORMA real, no por la etiqueta', () => {
    // En producción apareció un borrador marcado DIETA cuyo contenido era un
    // recetario: fiarse de la etiqueta lo habría dado por comparable.
    const disfrazada = dieta({
      id: 'd2',
      modo: 'DIETA',
      contenido: { tiempos: [{ nombre: 'Comida', opciones: [{ nombre: 'X', alimentos: [] }] }] },
    })
    expect(motivoNoComparable(dieta(), disfrazada)).toContain('recetario')
  })

  it('deja comparar dos dietas normales', () => {
    expect(motivoNoComparable(dieta(), dieta({ id: 'd2' }))).toBeNull()
  })
})
