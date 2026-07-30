'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import PageTransition from '@/components/layout/PageTransition'
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext'
import styles from './admin-layout.module.css'

/**
 * Contenido del área admin. Va aparte del provider para poder leer el estado del
 * menú: cuando está colapsado, el contenido recupera el ancho que deja libre.
 */
function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isMensajesPage = pathname === '/mensajes'
  const { isCollapsed } = useSidebar()

  return (
    <div className={`${styles.layout} ${isCollapsed ? styles.layoutColapsado : ''}`}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        <main className={isMensajesPage ? styles.contentNoPadding : styles.content}>
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AdminShell>{children}</AdminShell>
    </SidebarProvider>
  )
}
