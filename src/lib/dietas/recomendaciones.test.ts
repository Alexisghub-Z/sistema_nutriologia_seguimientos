import { describe, it, expect } from 'vitest'
import { recomendar, type PacienteConContexto } from './recomendaciones'

const DIA = 86400000
const hace = (dias: number) => new Date(Date.now() - dias * DIA).toISOString()
const dentroDe = (dias: number) => new Date(Date.now() + dias * DIA).toISOString()

function paciente(over: Partial<PacienteConContexto> = {}): PacienteConContexto {
  return {
    id: 'p1',
    nombre: 'Ana López',
    email: 'ana@test.mx',
    ultima_consulta: null,
    ultimo_peso: null,
    proxima_cita: null,
    ultima_dieta: null,
    dieta_finalizada: false,
    ...over,
  }
}

describe('a quién recomendar', () => {
  it('pone primero la cita próxima sin dieta preparada', () => {
    // Es lo más urgente: hay fecha y el paciente llega esperando su plan.
    const r = recomendar([
      paciente({ id: 'lejos', ultima_consulta: hace(10) }),
      paciente({ id: 'cita', proxima_cita: dentroDe(2), ultima_consulta: hace(90) }),
    ])
    expect(r[0]?.paciente.id).toBe('cita')
    expect(r[0]?.motivo).toContain('Cita en 2 d')
  })

  it('marca como urgente solo lo que ocurre en tres días o menos', () => {
    const [pronto] = recomendar([paciente({ proxima_cita: dentroDe(1) })])
    const [luego] = recomendar([paciente({ proxima_cita: dentroDe(10) })])
    expect(pronto?.urgente).toBe(true)
    expect(luego?.urgente).toBe(false)
  })

  it('recomienda al que acaba de venir a consulta y sigue sin dieta', () => {
    const r = recomendar([paciente({ ultima_consulta: hace(3) })])
    expect(r).toHaveLength(1)
    expect(r[0]?.motivo).toContain('sin dieta')
  })

  it('NO recomienda a quien ya tiene dieta reciente y nada agendado', () => {
    // Llenar el panel con estos casos lo convertiría en ruido: no hay nada
    // que hacer con ellos.
    const r = recomendar([paciente({ ultima_consulta: hace(10), ultima_dieta: hace(5) })])
    expect(r).toHaveLength(0)
  })

  it('sí lo recomienda si vuelve pronto y su dieta ya tiene meses', () => {
    const r = recomendar([
      paciente({ proxima_cita: dentroDe(5), ultima_dieta: hace(90), ultima_consulta: hace(95) }),
    ])
    expect(r).toHaveLength(1)
    expect(r[0]?.motivo).toContain('dieta de')
  })

  it('ignora a quien nunca ha venido ni tiene cita', () => {
    // Un registro sin consulta ni cita no es trabajo pendiente todavía.
    expect(recomendar([paciente()])).toHaveLength(0)
  })

  it('ordena de más a menos urgente', () => {
    const r = recomendar([
      paciente({ id: 'c', ultima_consulta: hace(40) }),
      paciente({ id: 'a', proxima_cita: dentroDe(1) }),
      paciente({ id: 'b', ultima_consulta: hace(2) }),
    ])
    expect(r.map((x) => x.paciente.id)).toEqual(['a', 'b', 'c'])
  })

  it('no revienta con una lista vacía', () => {
    expect(recomendar([])).toEqual([])
  })
})
