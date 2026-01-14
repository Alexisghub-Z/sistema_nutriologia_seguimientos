import styles from './common.module.css'

interface CardProps {
  children: React.ReactNode
  className?: string
}

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

interface CardBodyProps {
  children: React.ReactNode
  className?: string
}

interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return <div className={`${styles.card} ${className}`}>{children}</div>
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return <div className={`${styles.cardHeader} ${className}`}>{children}</div>
}

export function CardTitle({ children, className = '' }: CardHeaderProps) {
  return <h3 className={`${styles.cardTitle} ${className}`}>{children}</h3>
}

export function CardDescription({ children, className = '' }: CardHeaderProps) {
  return <p className={`${styles.cardDescription} ${className}`}>{children}</p>
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return <div className={`${styles.cardBody} ${className}`}>{children}</div>
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return <div className={`${styles.cardFooter} ${className}`}>{children}</div>
}

// Alias para compatibilidad
export const CardContent = CardBody
