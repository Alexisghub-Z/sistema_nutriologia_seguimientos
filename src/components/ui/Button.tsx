import { ButtonHTMLAttributes } from 'react'
import Spinner from './Spinner'
import styles from './common.module.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger'
  size?: 'small' | 'medium' | 'large'
  loading?: boolean
  children: React.ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'medium',
  className = '',
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const variantClass = {
    primary: styles.buttonPrimary,
    secondary: styles.buttonSecondary,
    outline: styles.buttonOutline,
    danger: styles.buttonDanger,
  }[variant]

  const sizeClass = {
    small: styles.buttonSmall,
    medium: '',
    large: styles.buttonLarge,
  }[size]

  return (
    <button
      className={`${styles.button} ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size="sm" />
          <span style={{ marginLeft: '8px' }}>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
