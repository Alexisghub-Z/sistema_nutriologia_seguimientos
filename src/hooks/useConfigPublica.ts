'use client'

import { useState, useEffect } from 'react'

export interface ConfigPublica {
  nombreConsultorio: string
  whatsappPublico: string | null
}

/**
 * Obtiene la configuración pública del consultorio (nombre y WhatsApp) para
 * mostrar la marca del cliente en las páginas de pacientes. Con un fallback
 * neutral mientras carga o si falla.
 */
export function useConfigPublica(): ConfigPublica {
  const [config, setConfig] = useState<ConfigPublica>({
    nombreConsultorio: 'Consultorio',
    whatsappPublico: null,
  })

  useEffect(() => {
    let activo = true
    fetch('/api/config-publica')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (activo && data) setConfig(data)
      })
      .catch(() => {
        /* mantener fallback */
      })
    return () => {
      activo = false
    }
  }, [])

  return config
}
