/**
 * A quién conviene hacerle una dieta ahora.
 * ------------------------------------------------------------
 * No es un listado de pacientes —para buscar a uno concreto está el buscador,
 * que funciona por su cuenta— sino una recomendación: de todos, estos son los
 * que piden atención, y con el motivo a la vista para que el nutriólogo pueda
 * juzgar si está de acuerdo.
 *
 * Un paciente con dieta reciente y sin cita no aparece: no hay nada que hacer
 * con él, y llenar el panel de esos casos lo convertiría en ruido.
 */

export interface PacienteConContexto {
  id: string
  nombre: string
  email: string
  ultima_consulta: string | null
  ultimo_peso: number | null
  proxima_cita: string | null
  ultima_dieta: string | null
  dieta_finalizada: boolean
}

/** Días desde una fecha, o null si no la hay. */
function diasDesde(iso: string | null): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

/** Días hasta una fecha futura, o null. */
function diasHasta(iso: string | null): number | null {
  if (!iso) return null
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
  return d < 0 ? null : d
}

/** "3 d", "2 meses". */
function haceCuanto(dias: number): string {
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  if (dias < 30) return `${dias} d`
  const meses = Math.round(dias / 30)
  return `${meses} mes${meses === 1 ? '' : 'es'}`
}

interface Recomendacion {
  paciente: PacienteConContexto
  /** Por qué se recomienda: es lo que se le muestra al nutriólogo. */
  motivo: string
  /** Menor = más urgente. */
  prioridad: number
  urgente: boolean
}

/**
 * Decide a quién recomendar y por qué. Exportada para poder probarla sin
 * montar el componente.
 */
export function recomendar(pacientes: PacienteConContexto[]): Recomendacion[] {
  const recomendaciones: Recomendacion[] = []

  for (const p of pacientes) {
    const paraLaCita = diasHasta(p.proxima_cita)
    const desdeConsulta = diasDesde(p.ultima_consulta)
    const desdeDieta = diasDesde(p.ultima_dieta)
    const sinDieta = desdeDieta === null

    // 1. Cita a la vuelta de la esquina y sin dieta preparada. Es lo más
    //    urgente: hay fecha y el paciente llega esperando su plan.
    if (paraLaCita !== null && paraLaCita <= 14 && sinDieta) {
      recomendaciones.push({
        paciente: p,
        motivo: paraLaCita === 0 ? 'Cita hoy · sin dieta' : `Cita en ${paraLaCita} d · sin dieta`,
        prioridad: paraLaCita,
        urgente: paraLaCita <= 3,
      })
      continue
    }

    // 2. Consulta reciente y todavía sin dieta: el seguimiento natural de la
    //    visita, mientras los datos siguen frescos.
    if (desdeConsulta !== null && desdeConsulta <= 45 && sinDieta) {
      recomendaciones.push({
        paciente: p,
        motivo: `Consulta ${haceCuanto(desdeConsulta)} · sin dieta`,
        prioridad: 100 + desdeConsulta,
        urgente: false,
      })
      continue
    }

    // 3. Cita próxima con una dieta que ya tiene meses: conviene revisarla
    //    antes de que vuelva.
    if (paraLaCita !== null && paraLaCita <= 14 && desdeDieta !== null && desdeDieta > 60) {
      recomendaciones.push({
        paciente: p,
        motivo: `Cita en ${paraLaCita} d · dieta de ${haceCuanto(desdeDieta)}`,
        prioridad: 200 + paraLaCita,
        urgente: false,
      })
      continue
    }

    // 4. Sin dieta y sin nada agendado: no urge, pero está pendiente.
    if (sinDieta && desdeConsulta !== null) {
      recomendaciones.push({
        paciente: p,
        motivo: `Consulta ${haceCuanto(desdeConsulta)} · sin dieta`,
        prioridad: 300 + desdeConsulta,
        urgente: false,
      })
    }
  }

  return recomendaciones.sort((a, b) => a.prioridad - b.prioridad)
}

