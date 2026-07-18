/**
 * Abstracción de almacenamiento de archivos.
 *
 * - Si hay configuración S3 (variables S3_*), guarda/lee/borra en object storage
 *   compatible con S3 (Cloudflare R2, DigitalOcean Spaces, AWS S3, MinIO).
 * - Si NO hay configuración S3, usa el disco local (process.cwd()/uploads) —
 *   comportamiento histórico, para desarrollo y despliegues de un solo VPS.
 *
 * Las rutas lógicas ("keys") tienen el formato: consultas/<consultaId>/<archivo>
 * y se mantienen idénticas en ambos backends para no cambiar lo que se guarda
 * en la base de datos (columna ruta_archivo).
 */

import { writeFile, mkdir, readFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'

const S3_ENDPOINT = process.env.S3_ENDPOINT
const S3_BUCKET = process.env.S3_BUCKET
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY
const S3_SECRET_KEY = process.env.S3_SECRET_KEY
const S3_REGION = process.env.S3_REGION || 'auto'
// Prefijo opcional por cliente (para aislar carpetas cuando varios clientes
// comparten un mismo bucket). Ej: "dra-martinez" → dra-martinez/consultas/...
const S3_PREFIX = process.env.S3_PREFIX || ''

/** ¿Está configurado el object storage S3? */
export function isS3Configured(): boolean {
  return !!(S3_ENDPOINT && S3_BUCKET && S3_ACCESS_KEY && S3_SECRET_KEY)
}

let s3Client: S3Client | null = null
function getS3(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: S3_REGION,
      endpoint: S3_ENDPOINT,
      credentials: {
        accessKeyId: S3_ACCESS_KEY!,
        secretAccessKey: S3_SECRET_KEY!,
      },
      // R2/Spaces/MinIO requieren path-style para máxima compatibilidad
      forcePathStyle: true,
    })
  }
  return s3Client
}

/** Aplica el prefijo por cliente a una key (si está configurado). */
function conPrefijo(key: string): string {
  return S3_PREFIX ? `${S3_PREFIX}/${key}` : key
}

/** Ruta absoluta en disco local para una key. */
function rutaLocal(key: string): string {
  return path.join(process.cwd(), 'uploads', key)
}

async function streamToBuffer(stream: unknown): Promise<Buffer> {
  const chunks: Buffer[] = []
  // El body de S3 en Node es un Readable
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

/**
 * Guarda un archivo. `key` es la ruta lógica (ej: consultas/<id>/<archivo>).
 * Devuelve la misma key (que se guarda en la BD sin cambios).
 */
export async function guardarArchivo(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  if (isS3Configured()) {
    await getS3().send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: conPrefijo(key),
        Body: buffer,
        ContentType: contentType,
      })
    )
    return
  }

  // Fallback disco local
  const dest = rutaLocal(key)
  const dir = path.dirname(dest)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  await writeFile(dest, buffer)
}

/**
 * Lee un archivo. Devuelve su contenido o null si no existe.
 * Si hay S3 configurado, intenta S3 primero y cae a disco local (para servir
 * archivos históricos que quedaron en disco antes de migrar).
 */
export async function leerArchivo(key: string): Promise<Buffer | null> {
  if (isS3Configured()) {
    try {
      const res = await getS3().send(
        new GetObjectCommand({ Bucket: S3_BUCKET, Key: conPrefijo(key) })
      )
      if (!res.Body) return null
      return await streamToBuffer(res.Body)
    } catch {
      // No está en S3: intentar disco local (archivos previos a la migración)
    }
  }

  const local = rutaLocal(key)
  if (!existsSync(local)) return null
  return readFile(local)
}

/** Borra un archivo (S3 y/o disco local). No lanza si no existe. */
export async function borrarArchivo(key: string): Promise<void> {
  if (isS3Configured()) {
    try {
      await getS3().send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: conPrefijo(key) }))
    } catch {
      // ignorar
    }
  }
  const local = rutaLocal(key)
  if (existsSync(local)) {
    try {
      await unlink(local)
    } catch {
      // ignorar
    }
  }
}

/** Normaliza `ruta_archivo` de la BD (ej "/uploads/consultas/x/y") a una key. */
export function rutaArchivoAKey(rutaArchivo: string): string {
  // Quita el prefijo "/uploads/" o "uploads/" para obtener la key lógica
  return rutaArchivo.replace(/^\/?uploads\//, '')
}
