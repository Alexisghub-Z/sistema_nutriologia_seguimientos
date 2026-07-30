'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface SidebarContextType {
  /** Cajón abierto en móvil. */
  isOpen: boolean
  toggleSidebar: () => void
  closeSidebar: () => void
  /** Menú reducido a solo iconos en escritorio. */
  isCollapsed: boolean
  toggleCollapsed: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

/** Clave de la preferencia de menú colapsado. */
const CLAVE_COLAPSADO = 'sidebar.colapsado'

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Cajón deslizante de móvil: siempre arranca cerrado.
  const [isOpen, setIsOpen] = useState(false)
  // Menú colapsado en escritorio: se recuerda entre sesiones.
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(CLAVE_COLAPSADO) === '1') {
      setIsCollapsed(true)
    }
  }, [])

  const toggleSidebar = () => setIsOpen((v) => !v)
  const closeSidebar = () => setIsOpen(false)

  const toggleCollapsed = () =>
    setIsCollapsed((v) => {
      const nuevo = !v
      localStorage.setItem(CLAVE_COLAPSADO, nuevo ? '1' : '0')
      return nuevo
    })

  return (
    <SidebarContext.Provider
      value={{ isOpen, toggleSidebar, closeSidebar, isCollapsed, toggleCollapsed }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
