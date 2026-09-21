import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  guardarBorrador,
  leerBorrador,
  olvidarBorrador,
  tieneAlgo,
} from './borrador-local'

/** localStorage de mentira: los tests de vitest corren en Node. */
function montarAlmacen() {
  const datos = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => datos.set(k, v),
    removeItem: (k: string) => datos.delete(k),
    clear: () => datos.clear(),
  })
  return datos
}

describe('borrador del cuadro en el navegador', () => {
  let almacen: Map<string, string>

  beforeEach(() => {
    almacen = montarAlmacen()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('lo guardado se recupera igual', () => {
    guardarBorrador('pac1', { peso: '70', talla_cm: '170' })
    expect(leerBorrador('pac1')).toEqual({ peso: '70', talla_cm: '170' })
  })

  it('cada paciente tiene el suyo', () => {
    // Lo contrario sería grave: mostrar el peso de un paciente en la ficha de
    // otro es un error clínico, no una molestia.
    guardarBorrador('pac1', { peso: '70' })
    guardarBorrador('pac2', { peso: '85' })

    expect(leerBorrador('pac1')).toEqual({ peso: '70' })
    expect(leerBorrador('pac2')).toEqual({ peso: '85' })
  })

  it('sin borrador devuelve null', () => {
    expect(leerBorrador('nadie')).toBeNull()
  })

  it('guardar algo vacío no deja basura', () => {
    guardarBorrador('pac1', { peso: '', talla_cm: '   ' })
    expect(almacen.size).toBe(0)
    expect(leerBorrador('pac1')).toBeNull()
  })

  it('olvidar borra de verdad', () => {
    guardarBorrador('pac1', { peso: '70' })
    olvidarBorrador('pac1')
    expect(leerBorrador('pac1')).toBeNull()
  })

  it('caduca a los 7 días', () => {
    // Un peso de hace medio año sobre un formulario vacío parece actual y no
    // lo es: mejor no mostrarlo.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'))
    guardarBorrador('pac1', { peso: '70' })

    vi.setSystemTime(new Date('2026-01-07T09:00:00Z')) // 6 días: sigue valiendo
    expect(leerBorrador('pac1')).toEqual({ peso: '70' })

    vi.setSystemTime(new Date('2026-01-09T10:00:00Z')) // 8 días: caducó
    expect(leerBorrador('pac1')).toBeNull()
  })

  it('un contenido corrupto no rompe nada', () => {
    // Alguien puede haber tocado localStorage, o quedar de una versión previa.
    almacen.set('dietas.borradorCuadro.pac1', 'esto no es JSON')
    expect(() => leerBorrador('pac1')).not.toThrow()
    expect(leerBorrador('pac1')).toBeNull()
  })

  it('sin id de paciente no hace nada', () => {
    guardarBorrador('', { peso: '70' })
    expect(almacen.size).toBe(0)
    expect(leerBorrador('')).toBeNull()
  })

  it('si localStorage falla, la pantalla no se cae', () => {
    // Ventana privada, cuota llena o permisos: es una comodidad, no puede
    // tumbar la captura de una dieta.
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('bloqueado') },
      setItem: () => { throw new Error('bloqueado') },
      removeItem: () => { throw new Error('bloqueado') },
    })

    expect(() => guardarBorrador('pac1', { peso: '70' })).not.toThrow()
    expect(leerBorrador('pac1')).toBeNull()
    expect(() => olvidarBorrador('pac1')).not.toThrow()
  })
})

describe('tieneAlgo', () => {
  it('distingue lo escrito de lo vacío', () => {
    expect(tieneAlgo({})).toBe(false)
    expect(tieneAlgo({ peso: '' })).toBe(false)
    expect(tieneAlgo({ peso: '  ' })).toBe(false)
    expect(tieneAlgo({ peso: '70' })).toBe(true)
    expect(tieneAlgo({ peso: '', notas: 'algo' })).toBe(true)
  })
})
