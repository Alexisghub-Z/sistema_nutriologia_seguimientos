import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { guardarSesion, leerSesion, olvidarSesion } from './sesion-dietas'

function montarAlmacen() {
  const datos = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => datos.set(k, v),
    removeItem: (k: string) => datos.delete(k),
  })
  return datos
}

const SESION = {
  pacienteId: 'pac1',
  pacienteNombre: 'Ana López',
  paso: 'tiempos',
  cuadroId: 'cua1',
}

describe('sesión de dietas', () => {
  let almacen: Map<string, string>

  beforeEach(() => {
    almacen = montarAlmacen()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('devuelve el sitio tal cual se guardó', () => {
    guardarSesion(SESION)
    expect(leerSesion()).toEqual(SESION)
  })

  it('sin sesión previa devuelve null', () => {
    expect(leerSesion()).toBeNull()
  })

  it('sin paciente no guarda nada', () => {
    guardarSesion({ ...SESION, pacienteId: '' })
    expect(almacen.size).toBe(0)
  })

  it('olvidar la borra', () => {
    guardarSesion(SESION)
    olvidarSesion()
    expect(leerSesion()).toBeNull()
  })

  it('caduca a las 12 horas', () => {
    // Retomar por la tarde lo de la mañana es útil; abrir el lunes el paciente
    // del viernes, no.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T09:00:00Z'))
    guardarSesion(SESION)

    vi.setSystemTime(new Date('2026-01-01T18:00:00Z')) // 9 h: vale
    expect(leerSesion()).toEqual(SESION)

    vi.setSystemTime(new Date('2026-01-02T09:00:00Z')) // 24 h: caducó
    expect(leerSesion()).toBeNull()
  })

  it('una sesión a medias se descarta', () => {
    // Sin paso no se puede recomponer la pantalla; devolver media sesión sería
    // dejar al nutriólogo en un sitio que no es el suyo.
    almacen.set('dietas.sesion', JSON.stringify({ sesion: { pacienteId: 'x' }, guardadoEn: Date.now() }))
    expect(leerSesion()).toBeNull()
  })

  it('un contenido corrupto no rompe nada', () => {
    almacen.set('dietas.sesion', 'no soy JSON')
    expect(() => leerSesion()).not.toThrow()
    expect(leerSesion()).toBeNull()
  })

  it('si localStorage falla, no se cae', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('bloqueado') },
      setItem: () => { throw new Error('bloqueado') },
      removeItem: () => { throw new Error('bloqueado') },
    })
    expect(() => guardarSesion(SESION)).not.toThrow()
    expect(leerSesion()).toBeNull()
    expect(() => olvidarSesion()).not.toThrow()
  })
})
