'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import FilePreviewModal from '@/components/ui/FilePreviewModal'
import styles from './ConsultaPreviewModal.module.css'

interface Archivo {
  id: string
  nombre_original: string
  ruta_archivo: string
  tipo_mime: string
  categoria: string
}

interface ConsultaDetalle {
  id: string
  fecha: string
  motivo: string | null
  peso: number | null
  talla: number | null
  imc: number | null
  grasa_corporal: number | null
  porcentaje_agua: number | null
  masa_muscular_kg: number | null
  diagnostico: string | null
  notas: string | null
  observaciones: string | null
  objetivo: string | null
  plan: string | null
  antecedentes_familiares: string | null
  estudios_laboratorio: string | null
  archivos: Archivo[]
}

interface ConsultaPreviewModalProps {
  consultaId: string | null
  onClose: () => void
}

const MIN_W = 320
const MIN_H = 300
const DEFAULT_W = 480
const DEFAULT_H = 560

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function SeccionNota({ titulo, contenido }: { titulo: string; contenido: string | null }) {
  if (!contenido) return null
  return (
    <div className={styles.seccion}>
      <p className={styles.seccionTitulo}>{titulo}</p>
      <p className={styles.seccionContenido}>{contenido}</p>
    </div>
  )
}

export default function ConsultaPreviewModal({ consultaId, onClose }: ConsultaPreviewModalProps) {
  const [consulta, setConsulta] = useState<ConsultaDetalle | null>(null)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [previewArchivo, setPreviewArchivo] = useState<Archivo | null>(null)

  // Posición y tamaño de la ventana flotante
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H })
  const [initialized, setInitialized] = useState(false)

  const windowRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const resizing = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Centrar la ventana al abrir (solo la primera vez)
  useEffect(() => {
    if (!consultaId || initialized) return
    const x = Math.max(0, (window.innerWidth - DEFAULT_W) / 2)
    const y = Math.max(0, (window.innerHeight - DEFAULT_H) / 2)
    setPos({ x, y })
    setInitialized(true)
  }, [consultaId, initialized])

  // Reset initialized cuando se cierra
  useEffect(() => {
    if (!consultaId) setInitialized(false)
  }, [consultaId])

  // Fetch de consulta — solo los datos, no resetea posición/tamaño
  useEffect(() => {
    if (!consultaId) {
      setConsulta(null)
      return
    }
    setLoading(true)
    fetch(`/api/consultas/${consultaId}`)
      .then((r) => r.json())
      .then((data) => setConsulta(data.consulta ?? null))
      .finally(() => setLoading(false))
  }, [consultaId])

  // Drag — mousedown en el header
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    }

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const nx = Math.max(0, Math.min(window.innerWidth - size.w, ev.clientX - dragOffset.current.x))
      const ny = Math.max(0, Math.min(window.innerHeight - 40, ev.clientY - dragOffset.current.y))
      setPos({ x: nx, y: ny })
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [pos, size.w])

  // Resize — mousedown en el handle
  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    resizing.current = true
    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h }

    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return
      const nw = Math.max(MIN_W, resizeStart.current.w + (ev.clientX - resizeStart.current.x))
      const nh = Math.max(MIN_H, resizeStart.current.h + (ev.clientY - resizeStart.current.y))
      setSize({ w: nw, h: nh })
    }
    const onUp = () => {
      resizing.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [size])

  if (!mounted || !consultaId) return null

  const hayNotas = consulta && (
    consulta.diagnostico ||
    consulta.notas ||
    consulta.observaciones ||
    consulta.objetivo ||
    consulta.plan ||
    consulta.antecedentes_familiares ||
    consulta.estudios_laboratorio
  )

  const ventana = (
    <div
      ref={windowRef}
      className={styles.ventana}
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
      {/* Titlebar — arrastrar aquí */}
      <div className={styles.titlebar} onMouseDown={onDragStart}>
        <div className={styles.titlebarInfo}>
          <span className={styles.titlebarTitulo}>Resumen de consulta</span>
          {consulta && (
            <span className={styles.titlebarFecha}>{formatearFecha(consulta.fecha)}</span>
          )}
        </div>
        <button className={styles.cerrar} onClick={onClose} onMouseDown={(e) => e.stopPropagation()} aria-label="Cerrar">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="13" y2="13" />
            <line x1="13" y1="1" x2="1" y2="13" />
          </svg>
        </button>
      </div>

      {/* Contenido scrolleable */}
      <div className={styles.cuerpo}>
        {loading && (
          <div className={styles.cargando}>
            <div className={styles.spinner} />
            <p>Cargando consulta...</p>
          </div>
        )}

        {!loading && consulta && (
          <>
            {/* Medidas rápidas */}
            {(consulta.peso || consulta.imc || consulta.grasa_corporal || consulta.masa_muscular_kg) && (
              <div className={styles.medidas}>
                {consulta.peso && (
                  <div className={styles.medida}>
                    <span className={styles.medidaValor}>{consulta.peso.toFixed(1)}</span>
                    <span className={styles.medidaUnidad}>kg</span>
                  </div>
                )}
                {consulta.imc && (
                  <div className={styles.medida}>
                    <span className={styles.medidaValor}>{consulta.imc.toFixed(1)}</span>
                    <span className={styles.medidaUnidad}>IMC</span>
                  </div>
                )}
                {consulta.grasa_corporal && (
                  <div className={styles.medida}>
                    <span className={styles.medidaValor}>{consulta.grasa_corporal.toFixed(1)}</span>
                    <span className={styles.medidaUnidad}>% grasa</span>
                  </div>
                )}
                {consulta.masa_muscular_kg && (
                  <div className={styles.medida}>
                    <span className={styles.medidaValor}>{consulta.masa_muscular_kg.toFixed(1)}</span>
                    <span className={styles.medidaUnidad}>kg músculo</span>
                  </div>
                )}
              </div>
            )}

            {/* Notas clínicas */}
            {hayNotas ? (
              <div className={styles.notas}>
                <SeccionNota titulo="Diagnóstico" contenido={consulta.diagnostico} />
                <SeccionNota titulo="Hábitos alimenticios" contenido={consulta.notas} />
                <SeccionNota titulo="Hábitos de ejercicio" contenido={consulta.observaciones} />
                <SeccionNota titulo="Objetivos" contenido={consulta.objetivo} />
                <SeccionNota titulo="Plan nutricional" contenido={consulta.plan} />
                <SeccionNota titulo="Antecedentes familiares" contenido={consulta.antecedentes_familiares} />
                <SeccionNota titulo="Estudios de laboratorio" contenido={consulta.estudios_laboratorio} />
              </div>
            ) : (
              <p className={styles.sinNotas}>Sin notas clínicas registradas.</p>
            )}

            {/* Archivos adjuntos */}
            {consulta.archivos.length > 0 && (
              <div className={styles.archivos}>
                <p className={styles.archivosTitle}>Archivos adjuntos ({consulta.archivos.length})</p>
                <div className={styles.archivosLista}>
                  {consulta.archivos.map((archivo) => (
                    <div key={archivo.id} className={styles.archivo}>
                      <span className={styles.archivoIcono}>
                        {archivo.tipo_mime.startsWith('image/') ? '🖼️' :
                         archivo.tipo_mime === 'application/pdf' ? '📄' : '📎'}
                      </span>
                      <span className={styles.archivoNombre}>{archivo.nombre_original}</span>
                      <button
                        className={styles.archivoVerBtn}
                        onClick={() => setPreviewArchivo(archivo)}
                        title="Ver archivo"
                        type="button"
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Handle de resize — esquina inferior derecha */}
      <div className={styles.resizeHandle} onMouseDown={onResizeStart} />
    </div>
  )

  return (
    <>
      {createPortal(ventana, document.body)}
      {previewArchivo && (
        <FilePreviewModal
          isOpen={true}
          onClose={() => setPreviewArchivo(null)}
          fileUrl={`/api${previewArchivo.ruta_archivo}`}
          fileName={previewArchivo.nombre_original}
          fileType={previewArchivo.tipo_mime}
        />
      )}
    </>
  )
}
