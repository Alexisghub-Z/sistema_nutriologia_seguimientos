import { execSync } from 'child_process'
import { getAuthUser } from '@/lib/auth-utils'
import { NextResponse } from 'next/server'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    // Disco: df -BG /
    const dfOutput = execSync('df -BG / | tail -1', { timeout: 3000 }).toString().trim()
    const dfParts = dfOutput.split(/\s+/)
    const discoTotal = parseInt(dfParts[1]?.replace('G', '') ?? '0')
    const discoUsado = parseInt(dfParts[2]?.replace('G', '') ?? '0')
    const discoLibre = parseInt(dfParts[3]?.replace('G', '') ?? '0')
    const discoPct = parseInt(dfParts[4]?.replace('%', '') ?? '0')

    // RAM: /proc/meminfo
    const memInfo = execSync('cat /proc/meminfo', { timeout: 1000 }).toString()
    const memTotal = parseInt(memInfo.match(/MemTotal:\s+(\d+)/)?.[1] ?? '0')
    const memAvail = parseInt(memInfo.match(/MemAvailable:\s+(\d+)/)?.[1] ?? '0')
    const memUsed = memTotal - memAvail
    const ramPct = Math.round((memUsed / memTotal) * 100)

    // CPU: /proc/loadavg
    const loadAvg = execSync('cat /proc/loadavg', { timeout: 1000 }).toString().trim().split(' ')

    return NextResponse.json({
      disco: {
        total: discoTotal,
        usado: discoUsado,
        libre: discoLibre,
        porcentaje: discoPct,
      },
      ram: {
        total: Math.round(memTotal / 1024),
        usado: Math.round(memUsed / 1024),
        libre: Math.round(memAvail / 1024),
        porcentaje: ramPct,
      },
      cpu: {
        carga1m: parseFloat(loadAvg[0] ?? '0'),
        carga5m: parseFloat(loadAvg[1] ?? '0'),
        carga15m: parseFloat(loadAvg[2] ?? '0'),
      },
    })
  } catch {
    return NextResponse.json({ error: 'No se pudieron leer los recursos del sistema' }, { status: 500 })
  }
}
