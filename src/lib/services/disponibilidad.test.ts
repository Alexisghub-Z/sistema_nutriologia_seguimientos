import { describe, it, expect } from 'vitest'
import {
  generarSlotsDelDia,
  filtrarSlotsOcupados,
  elegirSlotsVariados,
  diaSemanaEnMexico,
  esDiaLaboral,
  horarioDelDia,
  sumarDias,
  CONFIG_POR_DEFECTO,
  type ConfigHorarios,
  type SlotDisponible,
} from './disponibilidad'
import { construirFechaHoraMexico } from '@/lib/utils/proxima-cita'

function config(over: Partial<ConfigHorarios> = {}): ConfigHorarios {
  return { ...CONFIG_POR_DEFECTO, ...over }
}

// 2026-06-10 es miércoles; 2026-06-13 sábado; 2026-06-14 domingo.
const MIERCOLES = '2026-06-10'
const SABADO = '2026-06-13'
const DOMINGO = '2026-06-14'

describe('diaSemanaEnMexico', () => {
  it('acierta el día de la semana', () => {
    expect(diaSemanaEnMexico(MIERCOLES)).toBe(3)
    expect(diaSemanaEnMexico(SABADO)).toBe(6)
    expect(diaSemanaEnMexico(DOMINGO)).toBe(0)
  })

  it('no depende del huso del servidor', () => {
    // El fallo clásico es `new Date('2026-06-10').getDay()`, que en un servidor
    // al este de Greenwich puede devolver el día anterior.
    const original = process.env.TZ
    try {
      process.env.TZ = 'Europe/Berlin'
      expect(diaSemanaEnMexico(MIERCOLES)).toBe(3)
      process.env.TZ = 'Pacific/Auckland'
      expect(diaSemanaEnMexico(MIERCOLES)).toBe(3)
    } finally {
      process.env.TZ = original
    }
  })
})

describe('generarSlotsDelDia', () => {
  it('genera los huecos del horario entre semana', () => {
    // 16:00 a 20:00 cada 60 min, con la última cita empezando al cierre.
    expect(generarSlotsDelDia(MIERCOLES, config())).toEqual([
      '16:00',
      '17:00',
      '18:00',
      '19:00',
      '20:00',
    ])
  })

  it('devuelve vacío si ese día no se atiende', () => {
    expect(generarSlotsDelDia(SABADO, config())).toEqual([])
    expect(generarSlotsDelDia(DOMINGO, config())).toEqual([])
  })

  it('usa el horario especial de sábado cuando está configurado', () => {
    const c = config({
      dias_laborales: '1,2,3,4,5,6',
      horario_sabado_inicio: '08:00',
      horario_sabado_fin: '10:00',
    })
    expect(generarSlotsDelDia(SABADO, c)).toEqual(['08:00', '09:00', '10:00'])
  })

  it('respeta duraciones distintas de una hora', () => {
    const c = config({ horario_inicio: '16:00', horario_fin: '17:30', duracion_cita_default: 30 })
    expect(generarSlotsDelDia(MIERCOLES, c)).toEqual(['16:00', '16:30', '17:00', '17:30'])
  })
})

describe('filtrarSlotsOcupados', () => {
  const slots = ['16:00', '17:00', '18:00', '19:00']
  // Lejos de la fecha para que la anticipación mínima no interfiera.
  const ahora = new Date('2026-06-01T12:00:00Z')
  const opciones = { duracionMinutos: 60, horasAnticipacionMin: 24, ahora }

  it('bloquea el hueco que ya tiene una cita — el bug de zona horaria', () => {
    // Una cita guardada como la guarda el sistema: anclada a México.
    const cita = construirFechaHoraMexico(MIERCOLES, '17:00')
    const ocupaciones = [{ inicio: cita, fin: new Date(cita.getTime() + 3_600_000) }]

    const libres = filtrarSlotsOcupados(MIERCOLES, slots, ocupaciones, opciones)
    expect(libres).not.toContain('17:00')
    expect(libres).toEqual(['16:00', '18:00', '19:00'])
  })

  it('sigue bloqueándolo con el servidor en Berlín', () => {
    // Esta es la prueba que protege contra la regresión: el VPS de producción
    // corre en Europe/Berlin y el cálculo anterior fallaba justo ahí.
    const original = process.env.TZ
    try {
      process.env.TZ = 'Europe/Berlin'
      const cita = construirFechaHoraMexico(MIERCOLES, '17:00')
      const ocupaciones = [{ inicio: cita, fin: new Date(cita.getTime() + 3_600_000) }]
      expect(filtrarSlotsOcupados(MIERCOLES, slots, ocupaciones, opciones)).not.toContain('17:00')
    } finally {
      process.env.TZ = original
    }
  })

  it('deja libres los huecos sin cita', () => {
    expect(filtrarSlotsOcupados(MIERCOLES, slots, [], opciones)).toEqual(slots)
  })

  it('bloquea un hueco solapado parcialmente', () => {
    // Un evento de 17:30 a 18:30 pisa tanto el de las 17:00 como el de las 18:00.
    const inicio = construirFechaHoraMexico(MIERCOLES, '17:30')
    const ocupaciones = [{ inicio, fin: new Date(inicio.getTime() + 3_600_000) }]
    const libres = filtrarSlotsOcupados(MIERCOLES, slots, ocupaciones, opciones)
    expect(libres).toEqual(['16:00', '19:00'])
  })

  it('no bloquea un evento que solo toca el borde', () => {
    // De 15:00 a 16:00 termina justo cuando empieza el hueco de las 16:00.
    const inicio = construirFechaHoraMexico(MIERCOLES, '15:00')
    const ocupaciones = [{ inicio, fin: new Date(inicio.getTime() + 3_600_000) }]
    expect(filtrarSlotsOcupados(MIERCOLES, slots, ocupaciones, opciones)).toContain('16:00')
  })

  it('descarta los huecos que no cumplen la anticipación mínima', () => {
    // Faltan ~7 horas para las 17:00 de ese día y se exigen 24.
    const casi = construirFechaHoraMexico(MIERCOLES, '10:00')
    const libres = filtrarSlotsOcupados(MIERCOLES, slots, [], {
      duracionMinutos: 60,
      horasAnticipacionMin: 24,
      ahora: casi,
    })
    expect(libres).toEqual([])
  })
})

describe('elegirSlotsVariados', () => {
  const s = (fecha: string, hora: string): SlotDisponible => ({ fecha, hora })

  it('devuelve todo si hay menos candidatos que el máximo', () => {
    const dos = [s('2026-06-10', '16:00'), s('2026-06-11', '17:00')]
    expect(elegirSlotsVariados(dos, 3)).toEqual(dos)
  })

  it('prefiere días distintos antes que horas del mismo día', () => {
    const candidatos = [
      s('2026-06-10', '16:00'),
      s('2026-06-10', '17:00'),
      s('2026-06-10', '18:00'),
      s('2026-06-11', '16:00'),
      s('2026-06-12', '16:00'),
    ]
    const elegidos = elegirSlotsVariados(candidatos, 3)
    expect(elegidos).toHaveLength(3)
    expect(new Set(elegidos.map((e) => e.fecha)).size).toBe(3)
  })

  it('con un solo día disponible, separa las horas', () => {
    const candidatos = [
      s('2026-06-10', '16:00'),
      s('2026-06-10', '17:00'),
      s('2026-06-10', '18:00'),
      s('2026-06-10', '19:00'),
    ]
    const elegidos = elegirSlotsVariados(candidatos, 2)
    expect(elegidos).toHaveLength(2)
    expect(elegidos[0]!.hora).not.toBe(elegidos[1]!.hora)
  })

  it('nunca devuelve más del máximo', () => {
    const muchos = Array.from({ length: 20 }, (_, i) =>
      s(`2026-06-${String(10 + (i % 5)).padStart(2, '0')}`, `1${i % 10}:00`)
    )
    expect(elegirSlotsVariados(muchos, 3)).toHaveLength(3)
  })
})

describe('esDiaLaboral y horarioDelDia', () => {
  it('reconoce los días de atención configurados', () => {
    expect(esDiaLaboral(MIERCOLES, config())).toBe(true)
    expect(esDiaLaboral(SABADO, config())).toBe(false)
    expect(esDiaLaboral(SABADO, config({ dias_laborales: '1,2,3,4,5,6' }))).toBe(true)
  })

  it('usa el horario general cuando el día no tiene uno propio', () => {
    expect(horarioDelDia(MIERCOLES, config())).toEqual({ inicio: '16:00', fin: '20:00' })
  })
})

describe('sumarDias', () => {
  it('avanza sin desplazarse por husos horarios', () => {
    expect(sumarDias('2026-06-10', 1)).toBe('2026-06-11')
    expect(sumarDias('2026-06-30', 1)).toBe('2026-07-01')
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('cruza el cambio de horario de verano sin perder un día', () => {
    expect(sumarDias('2026-03-28', 1)).toBe('2026-03-29')
    expect(sumarDias('2026-10-24', 1)).toBe('2026-10-25')
  })
})
