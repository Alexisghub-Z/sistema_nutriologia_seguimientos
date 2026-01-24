import PublicFooter from '@/components/layout/PublicFooter'
import styles from './public-layout.module.css'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout}>
      <main className={styles.main}>{children}</main>
      <PublicFooter />
    </div>
  )
}
