import { describe, it, expect } from 'vitest'
import { validarContenido, LIMITES } from './contenido-schema'

/** Un alimento válido, con un grupo SMAE real. */
const alimento = (over: Record<string, unknown> = {}) => ({
  grupo: 'CEREALES_SG',
  equivalentes: 1,
  descripcion: 'pan integral',
  ...over,
})

const tiempoDieta = (over: Record<string, unknown> = {}) => ({
  id: 't1',
  nombre: 'Desayuno',
  alimentos: [alimento()],
  ...over,
})

const tiempoRecetario = (over: Record<string, unknown> = {}) => ({
  id: 't1',
  nombre: 'Desayuno',
  opciones: [{ nombre: 'Avena', alimentos: [alimento()] }],
  ...over,
})

describe('validarContenido: lo que el nutriólogo produce de verdad', () => {
  it('acepta una dieta normal', () => {
    expect(validarContenido('DIETA', { tiempos: [tiempoDieta()] }).ok).toBe(true)
  })

  it('acepta un recetario normal', () => {
    expect(validarContenido('RECETARIO', { tiempos: [tiempoRecetario()] }).ok).toBe(true)
  })

  it('acepta un tiempo recién añadido, todavía sin alimentos', () => {
    // Se añade el tiempo y luego se llena: si esto se rechazara, el
    // autoguardado fallaría a media edición.
    expect(validarContenido('DIETA', { tiempos: [tiempoDieta({ alimentos: [] })] }).ok).toBe(true)
  })

  it('acepta equivalentes decimales', () => {
    // Media ración es de lo más corriente; un esquema de enteros habría roto
    // el guardado de dietas perfectamente válidas.
    const c = { tiempos: [tiempoDieta({ alimentos: [alimento({ equivalentes: 0.5 })] })] }
    expect(validarContenido('DIETA', c).ok).toBe(true)
  })

  it('acepta una descripción vacía mientras se escribe', () => {
    const c = { tiempos: [tiempoDieta({ alimentos: [alimento({ descripcion: '' })] })] }
    expect(validarContenido('DIETA', c).ok).toBe(true)
  })

  it('acepta los campos opcionales que usa la interfaz', () => {
    const c = {
      tiempos: [
        tiempoDieta({
          nota: 'Tomar con agua',
          alimentos: [alimento({ calculo: '1 pieza', fijado: true })],
        }),
      ],
    }
    expect(validarContenido('DIETA', c).ok).toBe(true)
  })

  it('no se rompe por campos extra que añada la interfaz', () => {
    // Zod ignora lo desconocido por defecto. Se fija aquí para que un cambio
    // a `.strict()` no tumbe el guardado sin querer.
    const c = { tiempos: [{ ...tiempoDieta(), colorUI: 'azul' }] }
    expect(validarContenido('DIETA', c).ok).toBe(true)
  })
})

describe('validarContenido: lo que debe rechazar', () => {
  it('rechaza un recetario guardado como dieta, y lo dice claro', () => {
    // El fallo real de producción: así se guardó el borrador que al abrirlo
    // tumbaba la pantalla entera.
    const r = validarContenido('DIETA', { tiempos: [tiempoRecetario()] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('forma de recetario')
  })

  it('rechaza una dieta guardada como recetario, y lo dice claro', () => {
    const r = validarContenido('RECETARIO', { tiempos: [tiempoDieta()] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('forma de dieta')
  })

  it('rechaza un grupo SMAE inventado', () => {
    // El grupo alimenta el cálculo de equivalentes: uno inventado descuadraría
    // la dieta sin que salte ningún aviso.
    const c = { tiempos: [tiempoDieta({ alimentos: [alimento({ grupo: 'CHOCOLATE' })] })] }
    expect(validarContenido('DIETA', c).ok).toBe(false)
  })

  it('rechaza una dieta sin ningún tiempo', () => {
    expect(validarContenido('DIETA', { tiempos: [] }).ok).toBe(false)
  })

  it('rechaza un payload desbocado', () => {
    const tiempos = Array.from({ length: LIMITES.tiempos + 1 }, (_, i) => tiempoDieta({ id: `t${i}` }))
    expect(validarContenido('DIETA', { tiempos }).ok).toBe(false)
  })

  it('rechaza demasiados alimentos en un mismo tiempo', () => {
    const alimentos = Array.from({ length: LIMITES.alimentosPorTiempo + 1 }, () => alimento())
    expect(validarContenido('DIETA', { tiempos: [tiempoDieta({ alimentos })] }).ok).toBe(false)
  })

  it('rechaza equivalentes negativos o absurdos', () => {
    const neg = { tiempos: [tiempoDieta({ alimentos: [alimento({ equivalentes: -1 })] })] }
    const alto = { tiempos: [tiempoDieta({ alimentos: [alimento({ equivalentes: 1000 })] })] }
    expect(validarContenido('DIETA', neg).ok).toBe(false)
    expect(validarContenido('DIETA', alto).ok).toBe(false)
  })

  it('rechaza basura sin forma reconocible', () => {
    expect(validarContenido('DIETA', null).ok).toBe(false)
    expect(validarContenido('DIETA', { tiempos: 'no es un array' }).ok).toBe(false)
    expect(validarContenido('DIETA', { tiempos: [{ id: 't1' }] }).ok).toBe(false)
  })
})
