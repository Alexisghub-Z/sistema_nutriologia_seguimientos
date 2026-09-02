import { describe, it, expect } from 'vitest'
import {
  firmaContenido,
  formaDeTiempos,
  hayTrabajoEnElAire,
  textoAutoguardado,
  type ContenidoAutoguardado,
} from './autoguardado'

/** Contenido de ejemplo, con la forma que devuelve el generador. */
function contenido(over: Partial<ContenidoAutoguardado> = {}): ContenidoAutoguardado {
  return {
    modo: 'DIETA',
    tiempos: [{ id: 'desayuno', nombre: 'Desayuno', alimentos: [{ descripcion: '2 huevos' }] }],
    ...over,
  }
}

describe('firmaContenido', () => {
  it('da la misma firma para el mismo contenido', () => {
    expect(firmaContenido(contenido())).toBe(firmaContenido(contenido()))
  })

  it('cambia si cambia un alimento', () => {
    const a = firmaContenido(contenido())
    const b = firmaContenido(
      contenido({
        tiempos: [{ id: 'desayuno', nombre: 'Desayuno', alimentos: [{ descripcion: '3 huevos' }] }],
      })
    )
    expect(a).not.toBe(b)
  })

  it('distingue dieta de recetario aunque los tiempos coincidan', () => {
    expect(firmaContenido(contenido({ modo: 'DIETA' }))).not.toBe(
      firmaContenido(contenido({ modo: 'RECETARIO' }))
    )
  })

  it('tiene en cuenta las indicaciones de inicio', () => {
    expect(firmaContenido(contenido())).not.toBe(
      firmaContenido(contenido({ indicacionesInicio: 'Beber 2L de agua' }))
    )
  })

  it('trata indicaciones ausentes y vacías como lo mismo', () => {
    expect(firmaContenido(contenido({ indicacionesInicio: '' }))).toBe(
      firmaContenido(contenido({ indicacionesInicio: undefined }))
    )
  })

  it('detecta que se vació la dieta', () => {
    expect(firmaContenido(contenido({ tiempos: [] }))).not.toBe(firmaContenido(contenido()))
  })
})

describe('textoAutoguardado', () => {
  const hora = new Date(2026, 6, 31, 14, 32)

  it('una dieta finalizada manda sobre cualquier estado', () => {
    // Aunque el autoguardado hubiera fallado antes de finalizar.
    const r = textoAutoguardado('error', null, true, true)
    expect(r).toEqual({ texto: 'Guardada', tono: 'definitiva' })
  })

  it('no muestra nada si todavía no hay dieta', () => {
    expect(textoAutoguardado('inactivo', null, false, false)).toBeNull()
  })

  it('avisa mientras guarda', () => {
    expect(textoAutoguardado('guardando', null, false, true)).toEqual({
      texto: 'Guardando…',
      tono: 'trabajando',
    })
  })

  it('incluye la hora cuando ya guardó', () => {
    const r = textoAutoguardado('guardado', hora, false, true)
    expect(r?.tono).toBe('ok')
    expect(r?.texto).toContain('Borrador guardado')
    expect(r?.texto).toContain('14:32')
  })

  it('no inventa hora si no la tiene', () => {
    expect(textoAutoguardado('guardado', null, false, true)).toEqual({
      texto: 'Borrador guardado',
      tono: 'ok',
    })
  })

  it('marca el fallo sin alarmar', () => {
    expect(textoAutoguardado('error', hora, false, true)).toEqual({
      texto: 'Sin guardar',
      tono: 'error',
    })
  })

  it('con cambios pendientes tras un guardado previo, mantiene el mensaje tranquilizador', () => {
    // El trabajo YA está a salvo; decir "sin guardar" asustaría sin motivo.
    const r = textoAutoguardado('pendiente', hora, false, true)
    expect(r?.tono).toBe('ok')
    expect(r?.texto).toContain('14:32')
  })

  it('con cambios pendientes y sin guardado previo, sí avisa', () => {
    expect(textoAutoguardado('pendiente', null, false, true)).toEqual({
      texto: 'Cambios sin guardar',
      tono: 'pendiente',
    })
  })

  it('en reposo sin guardado previo solo dice que es un borrador', () => {
    expect(textoAutoguardado('inactivo', null, false, true)).toEqual({
      texto: 'Borrador',
      tono: 'pendiente',
    })
  })

  it('nunca dice "Guardada" a secas para un borrador', () => {
    // "Guardada" está reservado a la versión definitiva: confundirlas tiene
    // consecuencias clínicas (una definitiva no se re-edita).
    const estados = ['inactivo', 'pendiente', 'guardando', 'guardado', 'error'] as const
    for (const e of estados) {
      const r = textoAutoguardado(e, hora, false, true)
      expect(r?.texto).not.toBe('Guardada')
      expect(r?.tono).not.toBe('definitiva')
    }
  })
})

describe('formaDeTiempos', () => {
  it('reconoce una dieta por su campo alimentos', () => {
    expect(formaDeTiempos([{ id: 'd', nombre: 'Desayuno', alimentos: [] }])).toBe('DIETA')
  })

  it('reconoce un recetario por su campo opciones', () => {
    expect(formaDeTiempos([{ id: 'd', nombre: 'Desayuno', opciones: [] }])).toBe('RECETARIO')
  })

  it('detecta el recetario disfrazado de dieta que tumbaba la pantalla', () => {
    // Caso real de producción: el borrador cmshypr2500... estaba guardado con
    // modo DIETA pero sus tiempos eran { id, nombre, opciones }. Al hacerle
    // caso a la etiqueta se leía `tiempo.alimentos`, undefined, y `.filter`
    // lanzaba un TypeError que se llevaba por delante toda la pantalla.
    const contenidoReal = [
      { id: 't1', nombre: 'Desayuno', opciones: [{ nombre: 'Avena', alimentos: [] }] },
      { id: 't2', nombre: 'Comida', opciones: [] },
    ]
    expect(formaDeTiempos(contenidoReal)).toBe('RECETARIO')
  })

  it('devuelve null cuando no reconoce la forma, para no adivinar', () => {
    expect(formaDeTiempos([{ id: 'x', nombre: 'Raro' }])).toBeNull()
    expect(formaDeTiempos([])).toBeNull()
    expect(formaDeTiempos(null)).toBeNull()
    expect(formaDeTiempos('no es un array')).toBeNull()
  })

  it('ignora entradas nulas y se queda con el primer tiempo reconocible', () => {
    expect(formaDeTiempos([null, { id: 'd', nombre: 'D', alimentos: [] }])).toBe('DIETA')
  })
})

describe('hayTrabajoEnElAire: cuándo avisar antes de cerrar', () => {
  const caso = (over: Partial<Parameters<typeof hayTrabajoEnElAire>[0]> = {}) =>
    hayTrabajoEnElAire({
      estado: 'guardado',
      temporizadorActivo: false,
      guardadoEnCurso: false,
      ...over,
    })

  it('avisa mientras el temporizador de los 3 segundos corre', () => {
    // Es la ventana que perdía trabajo: escrito en pantalla, no en la base.
    expect(caso({ temporizadorActivo: true })).toBe(true)
  })

  it('avisa con una petición en vuelo', () => {
    expect(caso({ guardadoEnCurso: true })).toBe(true)
  })

  it('avisa en los estados pendiente y guardando', () => {
    expect(caso({ estado: 'pendiente' })).toBe(true)
    expect(caso({ estado: 'guardando' })).toBe(true)
  })

  it('NO avisa cuando todo está guardado', () => {
    // Un aviso que salta siempre se ignora, y entonces no protege nada.
    expect(caso({ estado: 'guardado' })).toBe(false)
  })

  it('NO avisa sin dieta abierta', () => {
    expect(caso({ estado: 'inactivo' })).toBe(false)
  })

  it('NO avisa tras un fallo: reintentará al siguiente cambio', () => {
    // El error ya se le comunicó al nutriólogo por su propio aviso; bloquear
    // además la salida sería insistir dos veces sobre lo mismo.
    expect(caso({ estado: 'error' })).toBe(false)
  })
})
