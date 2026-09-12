'use client'

/**
 * Vista previa de la hoja del paciente, antes de descargarla.
 * ------------------------------------------------------------
 * El PDF se ve ANTES de entregarlo, no después: es un documento que sale del
 * consultorio con el nombre del nutriólogo, y descubrir una porción mal escrita
 * cuando el paciente ya lo tiene en la mano no tiene arreglo.
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer'
import {
  DocumentoDieta,
  OPCIONES_POR_DEFECTO,
  type DatosDocumento,
  type OpcionesDocumento,
} from '@/lib/dietas/documento-dieta'
import styles from './VistaPreviaDieta.module.css'

interface Props {
  datos: DatosDocumento
  onCerrar: () => void
}

/** Convierte un nombre en algo que un sistema de archivos acepte. */
function comoNombreDeArchivo(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

/**
 * Nombre del archivo, reconocible en la carpeta de descargas.
 *
 * Lleva la fecha porque un paciente recibe varios planes a lo largo del
 * tratamiento: sin ella el segundo se guardaba como "plan-ana (1).pdf" o
 * pisaba al primero, y ninguno decía de cuándo era.
 */
function nombreArchivo(paciente: string): string {
  const hoy = new Date()
  const fecha = [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, '0'),
    String(hoy.getDate()).padStart(2, '0'),
  ].join('-')
  return `plan-${comoNombreDeArchivo(paciente) || 'paciente'}-${fecha}.pdf`
}

/**
 * Qué se puede añadir o quitar de la hoja.
 *
 * La descripción explica PARA QUIÉN sirve cada dato, no qué hace: la decisión
 * de incluir los macros no es técnica, es sobre si este paciente concreto los
 * va a entender.
 */
/** Dónde se recuerda qué incluye la hoja. */
const CLAVE_PREFERENCIAS = 'dietas:opciones-pdf'

const AJUSTES: Array<{
  campo: keyof OpcionesDocumento
  nombre: string
  ayuda: string
}> = [
  {
    campo: 'indicaciones',
    nombre: 'Indicaciones generales',
    ayuda: 'Lo que escribiste al inicio del plan',
  },
  {
    campo: 'datosConsulta',
    nombre: 'Peso, IMC y peso ideal',
    ayuda: 'Las medidas de la consulta en que se hizo el plan',
  },
  {
    campo: 'metaCalorica',
    nombre: 'Meta calórica',
    ayuda: 'Las kcal diarias del plan',
  },
  {
    campo: 'macros',
    nombre: 'Proteína, grasas y carbohidratos',
    ayuda: 'En gramos. Útil si el paciente ya los conoce',
  },
  {
    campo: 'kcalPorTiempo',
    nombre: 'Kcal de cada tiempo',
    ayuda: 'Junto al nombre de cada comida',
  },
  {
    campo: 'restricciones',
    nombre: 'Alergias e intolerancias',
    ayuda: 'Por escrito, para que no se olviden',
  },
  {
    campo: 'notasTiempo',
    nombre: 'Notas de cada tiempo',
    ayuda: 'Las indicaciones sueltas que añadiste',
  },
  {
    campo: 'preparacion',
    nombre: 'Cómo se prepara',
    ayuda: 'Las instrucciones de cada platillo del recetario',
  },
  {
    campo: 'espacioNotas',
    nombre: 'Renglones para apuntar',
    ayuda: 'Espacio en blanco al final de la hoja',
  },
]

export default function VistaPreviaDieta({ datos, onCerrar }: Props) {
  const [montado, setMontado] = useState(false)
  const [opciones, setOpciones] = useState<OpcionesDocumento>(OPCIONES_POR_DEFECTO)

  // Lo que se elige una vez suele repetirse: cada nutriólogo tiene su forma de
  // entregar la hoja. Se recuerda entre pacientes y entre sesiones, y si el
  // navegador no deja guardar se sigue con los valores por defecto.
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_PREFERENCIAS)
      if (!guardado) return
      const leido = JSON.parse(guardado) as Partial<OpcionesDocumento>
      // Se parte de los valores por defecto para que una opción añadida más
      // adelante no quede indefinida al leer preferencias viejas.
      setOpciones({ ...OPCIONES_POR_DEFECTO, ...leido })
    } catch {
      /* sin preferencias guardadas: se usan las de siempre */
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_PREFERENCIAS, JSON.stringify(opciones))
    } catch {
      /* modo privado o almacenamiento lleno: no es motivo para romper nada */
    }
  }, [opciones])

  // El visor de PDF solo funciona en el navegador.
  useEffect(() => setMontado(true), [])

  // Escape cierra, y el fondo no se desplaza mientras el visor está abierto.
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alPulsar)
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', alPulsar)
      document.body.style.overflow = overflowPrevio
    }
  }, [onCerrar])

  if (!montado) return null

  const doc = (
    <DocumentoDieta
      datos={datos}
      opciones={opciones}
      logo="/word/encabezado.png"
      manzana="/word/fondo.png"
    />
  )

  // Un dato que la dieta no tiene no se puede ofrecer: marcarlo solo dejaría
  // la casilla encendida sin que cambie nada en la hoja.
  const disponible: Record<keyof OpcionesDocumento, boolean> = {
    indicaciones: !!datos.indicacionesInicio,
    datosConsulta: !!datos.consulta?.peso || !!datos.consulta?.imc,
    metaCalorica: !!datos.kcalMeta,
    macros: !!datos.macros,
    kcalPorTiempo: datos.tiempos.some((t) => !!t.kcal),
    restricciones: !!datos.restricciones?.length,
    notasTiempo: datos.tiempos.some((t) => !!t.nota),
    preparacion: datos.tiempos.some((t) => t.opciones?.some((o) => !!o.preparacion)),
    espacioNotas: true,
  }

  return createPortal(
    <div className={styles.fondo} onClick={onCerrar} role="dialog" aria-modal="true">
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <header className={styles.cabecera}>
          <div>
            <h2 className={styles.titulo}>Plan de {datos.paciente}</h2>
            <p className={styles.subtitulo}>Así lo recibirá el paciente</p>
          </div>

          <div className={styles.acciones}>
            <PDFDownloadLink
              document={doc}
              fileName={nombreArchivo(datos.paciente)}
              className={styles.descargar}
            >
              {({ loading }) => (loading ? 'Preparando…' : 'Descargar PDF')}
            </PDFDownloadLink>

            <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar">
              ✕
            </button>
          </div>
        </header>

        <div className={styles.cuerpo}>
          <aside className={styles.ajustes}>
            <h3 className={styles.ajustesTitulo}>Qué incluir</h3>
            <ul className={styles.ajustesLista}>
              {AJUSTES.map(({ campo, nombre, ayuda }) => {
                const hayDato = disponible[campo]
                return (
                  <li key={campo}>
                    <label
                      className={`${styles.ajuste} ${hayDato ? '' : styles.ajusteVacio}`}
                      title={hayDato ? ayuda : 'Esta dieta no tiene ese dato'}
                    >
                      <input
                        type="checkbox"
                        className={styles.casilla}
                        checked={hayDato && opciones[campo]}
                        disabled={!hayDato}
                        onChange={(e) =>
                          setOpciones((o) => ({ ...o, [campo]: e.target.checked }))
                        }
                      />
                      <span className={styles.ajusteTexto}>
                        <span className={styles.ajusteNombre}>{nombre}</span>
                        <span className={styles.ajusteAyuda}>
                          {hayDato ? ayuda : 'No hay este dato en la dieta'}
                        </span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>

            <button
              type="button"
              className={styles.restablecer}
              onClick={() => setOpciones(OPCIONES_POR_DEFECTO)}
            >
              Volver a lo básico
            </button>
          </aside>

          <div className={styles.visor}>
            {/* La `key` remonta el visor al cambiar una opción: sin ella el
                PDF se queda como estaba y la vista previa mentiría. */}
            <PDFViewer
              key={JSON.stringify(opciones)}
              width="100%"
              height="100%"
              showToolbar={false}
            >
              {doc}
            </PDFViewer>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
