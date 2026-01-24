import styles from './common.module.css'

interface AlertProps {
  children: React.ReactNode
  variant?: 'info' | 'success' | 'warning' | 'error'
  className?: string
}

export default function Alert({ children, variant = 'info', className = '' }: AlertProps) {
  const variantClass = {
    info: styles.alertInfo,
    success: styles.alertSuccess,
    warning: styles.alertWarning,
    error: styles.alertError,
  }[variant]

  return <div className={`${styles.alert} ${variantClass} ${className}`}>{children}</div>
}
