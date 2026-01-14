import styles from './common.module.css'

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export default function Spinner({ size = 'medium', className = '' }: SpinnerProps) {
  const sizeStyle = {
    small: { width: '16px', height: '16px' },
    medium: { width: '24px', height: '24px' },
    large: { width: '40px', height: '40px' },
  }[size]

  return (
    <div
      className={`${styles.spinner} ${className}`}
      style={sizeStyle}
    />
  )
}
