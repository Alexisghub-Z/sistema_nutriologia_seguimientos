'use client'

import PublicFooter from '@/components/layout/PublicFooter'
import PageTransition from '@/components/layout/PageTransition'
import ChatFAQ from '@/components/chat/ChatFAQ'
import WhatsAppButton from '@/components/chat/WhatsAppButton'
import AvisoSinConexion from '@/components/ui/AvisoSinConexion'
import styles from './public-layout.module.css'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout}>
      {/* Fuera de PageTransition: esa animación usa `transform`, y un ancestro
          con transform rompe el `position: fixed` de la barra. */}
      <AvisoSinConexion />
      <main className={styles.main}>
        <PageTransition>{children}</PageTransition>
      </main>
      <PublicFooter />
      <ChatFAQ />
      <WhatsAppButton />
    </div>
  )
}
