import classNames from 'classnames'

/**
 * Utility function to merge CSS classes
 */
export function cn(...inputs: (string | undefined | null | boolean)[]) {
  return classNames(...inputs)
}

/**
 * Format date to readable string
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  }).format(dateObj)
}

/**
 * Format phone number to WhatsApp format
 */
export function formatPhoneForWhatsApp(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '')
  // Ensure it starts with country code
  if (!cleaned.startsWith('52') && cleaned.length === 10) {
    return `+52${cleaned}`
  }
  return `+${cleaned}`
}

/**
 * Sanitize filename for storage
 */
export function sanitizeFilename(filename: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const extension = filename.split('.').pop()
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '')
  const sanitizedName = nameWithoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .substring(0, 30)
  return `${sanitizedName}-${timestamp}-${randomString}.${extension}`
}

/**
 * Validate file type
 */
export function isValidFileType(mimeType: string): boolean {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/heic',
  ]
  return allowedTypes.includes(mimeType)
}

/**
 * Format file size to human readable
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Generate initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}
