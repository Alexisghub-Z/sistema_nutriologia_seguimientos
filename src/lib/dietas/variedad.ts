/**
 * Variedad entre dietas del mismo paciente.
 * ------------------------------------------------------------
 * Las dietas previas del paciente se le pasan a la IA como ejemplos a imitar,
 * para dar continuidad al tratamiento. El efecto secundario es que el modelo
 * repite los mismos platillos: midiendo cuatro generaciones del mismo cuadro,
 * pollo, frijoles y tortilla aparecían en las cuatro.
 *
 * Aquí se extrae qué alimentos ya comió el paciente para poder pedirle
 * explícitamente que use otros. No se trata de cambiar el estilo del
 * nutriólogo —eso se sigue imitando—, sino de que el paciente no reciba tres
 * veces la misma comida.
 */

import { GRUPOS_SMAE, type GrupoSMAEId } from '@/lib/utils/smae'

/** Un alimento tal como se guarda dentro del contenido de una dieta. */
interface AlimentoGuardado {
  grupo?: string
  descripcion?: string
}

interface TiempoGuardado {
  alimentos?: AlimentoGuardado[]
  opciones?: Array<{ nombre?: string; alimentos?: AlimentoGuardado[] }>
}

/** Palabras de cantidad y relleno que no identifican al alimento. */
const RUIDO = new RegExp(
  '\\b(' +
    'g|gr|gramos?|ml|kg|taza|tazas|cucharadas?|cucharaditas?|soperas?|rasas?|' +
    'piezas?|pza|pzas|rebanadas?|porci[oó]n|porciones|vaso|vasos|' +
    'chica?|chico|mediana?|mediano|grande|peque[nñ]a?|' +
    'de|del|la|el|los|las|un|una|unos|unas|con|sin|al|a|y|o|en|para|' +
    'cocidas?|cocidos?|crudas?|crudos?|natural|fresca?|fresco|' +
    'aprox|aproximadamente' +
    ')\\b',
  'gi'
)

/**
 * Reduce "1/2 taza de frijoles bayos cocidos (de olla)" a "frijoles bayos".
 *
 * Se queda con las dos primeras palabras con contenido: la primera suele ser
 * el alimento y la segunda su variedad, que es justo el nivel al que conviene
 * pedir variación ("pollo" y no "pechuga de pollo a la plancha en tiras").
 */
export function nombreDeAlimento(descripcion: string): string {
  const limpio = descripcion
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // sin acentos, para agrupar bien
    .replace(/\([^)]*\)/g, ' ') // fuera los paréntesis: "(≈150 g)"
    .replace(/[0-9]+([.,/][0-9]+)?/g, ' ') // fuera las cantidades
    .replace(/[^a-z\s]/g, ' ')
    .replace(RUIDO, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return limpio.split(' ').filter(Boolean).slice(0, 2).join(' ')
}

/**
 * Alimentos que el paciente ya tiene en sus dietas previas, agrupados por
 * grupo SMAE. Se agrupa así porque la instrucción útil para la IA no es "no
 * uses pollo" a secas, sino "en las proteínas, usa algo distinto de pollo".
 */
export function alimentosYaUsados(
  contenidos: unknown[]
): Map<GrupoSMAEId, Set<string>> {
  const porGrupo = new Map<GrupoSMAEId, Set<string>>()
  const idsValidos = new Set<string>(GRUPOS_SMAE.map((g) => g.id))

  const anotar = (a: AlimentoGuardado) => {
    if (!a.descripcion || !a.grupo || !idsValidos.has(a.grupo)) return
    const nombre = nombreDeAlimento(a.descripcion)
    if (!nombre) return
    const grupo = a.grupo as GrupoSMAEId
    const set = porGrupo.get(grupo) ?? new Set<string>()
    set.add(nombre)
    porGrupo.set(grupo, set)
  }

  for (const contenido of contenidos) {
    const tiempos = (contenido as { tiempos?: TiempoGuardado[] } | null)?.tiempos
    if (!Array.isArray(tiempos)) continue
    for (const t of tiempos) {
      // Dieta precisa: alimentos sueltos. Recetario: alimentos por opción.
      for (const a of t.alimentos ?? []) anotar(a)
      for (const o of t.opciones ?? []) for (const a of o.alimentos ?? []) anotar(a)
    }
  }

  return porGrupo
}

/** Cuántos alimentos por grupo se nombran en la instrucción. */
const MAX_POR_GRUPO = 6

/**
 * Instrucción para el prompt, o cadena vacía si el paciente no tiene dietas
 * previas con alimentos reconocibles.
 *
 * Se le pide variar SIN romper lo demás: los equivalentes siguen siendo
 * obligatorios y el estilo del nutriólogo se mantiene. Y se deja una salida
 * —"si no hay alternativa razonable, repite"— porque hay grupos con pocas
 * opciones reales (los aceites) o cuyo alimento es la base de la cocina local
 * y se repite a diario; forzar ahí la variación daría un plan peor.
 */
export function instruccionDeVariedad(porGrupo: Map<GrupoSMAEId, Set<string>>): string {
  const nombreGrupo = Object.fromEntries(GRUPOS_SMAE.map((g) => [g.id, g.nombre]))

  const lineas = [...porGrupo.entries()]
    .filter(([, set]) => set.size > 0)
    .map(([grupo, set]) => {
      const lista = [...set].slice(0, MAX_POR_GRUPO).join(', ')
      return `  - ${nombreGrupo[grupo]}: ya ha comido ${lista}`
    })

  if (lineas.length === 0) return ''

  return [
    'VARIEDAD (importante): este paciente ya recibió dietas antes con estos alimentos:',
    ...lineas,
    'Propón alimentos DISTINTOS de los anteriores dentro de cada grupo, para que no',
    'coma siempre lo mismo. Mantén el estilo del nutriólogo y la cocina de la región:',
    'variar no es proponer cosas raras o caras, sino usar el abanico que ya existe',
    '(otras proteínas, otros cereales, otras frutas y verduras de temporada).',
    'Si en algún grupo no hay alternativa razonable, puedes repetir: los equivalentes',
    'exactos y las restricciones del paciente mandan siempre sobre la variedad.',
  ].join('\n')
}
