import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import styles from './admin-layout.module.css'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  )
}
