'use client'

import PublicFooter from '@/components/layout/PublicFooter'
import PageTransition from '@/components/layout/PageTransition'
import styles from './public-layout.module.css'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <PageTransition>{children}</PageTransition>
      </main>
      <PublicFooter />
    </div>
  )
}
