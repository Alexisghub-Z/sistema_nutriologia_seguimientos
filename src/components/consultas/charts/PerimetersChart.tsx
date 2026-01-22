'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import styles from './Charts.module.css'

interface DataPoint {
  fecha: string
  brazo_relajado: number | null
  brazo_flexionado: number | null
  cintura: number | null
  cadera_maximo: number | null
  muslo_maximo: number | null
  muslo_medio: number | null
  pantorrilla_maximo: number | null
}

interface PerimetersChartProps {
  data: DataPoint[]
}

export default function PerimetersChart({ data }: PerimetersChartProps) {
  // Filtrar datos válidos
  const validData = data.filter(
    d =>
      d.brazo_relajado !== null ||
      d.brazo_flexionado !== null ||
      d.cintura !== null ||
      d.cadera_maximo !== null ||
      d.muslo_maximo !== null ||
      d.muslo_medio !== null ||
      d.pantorrilla_maximo !== null
  )

  if (validData.length === 0) {
    return (
      <div className={styles.emptyChart}>
        <p>No hay datos de perímetros para mostrar</p>
      </div>
    )
  }

  // Formatear fecha para el eje X
  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
    })
  }

  // Calcular estadísticas para todos los perímetros
  const cinturas = validData.filter(d => d.cintura !== null).map(d => d.cintura!)
  const cinturaInicial = cinturas.length > 0 ? cinturas[cinturas.length - 1] : null
  const cinturaActual = cinturas.length > 0 ? cinturas[0] : null
  const diferenciaCintura = cinturaActual && cinturaInicial ? cinturaActual - cinturaInicial : null

  const caderas = validData.filter(d => d.cadera_maximo !== null).map(d => d.cadera_maximo!)
  const caderaInicial = caderas.length > 0 ? caderas[caderas.length - 1] : null
  const caderaActual = caderas.length > 0 ? caderas[0] : null
  const diferenciaCadera = caderaActual && caderaInicial ? caderaActual - caderaInicial : null

  const brazosRelajados = validData.filter(d => d.brazo_relajado !== null).map(d => d.brazo_relajado!)
  const brazoRelajadoInicial = brazosRelajados.length > 0 ? brazosRelajados[brazosRelajados.length - 1] : null
  const brazoRelajadoActual = brazosRelajados.length > 0 ? brazosRelajados[0] : null
  const diferenciaBrazoRelajado = brazoRelajadoActual && brazoRelajadoInicial ? brazoRelajadoActual - brazoRelajadoInicial : null

  const brazosFlexionados = validData.filter(d => d.brazo_flexionado !== null).map(d => d.brazo_flexionado!)
  const brazoFlexionadoInicial = brazosFlexionados.length > 0 ? brazosFlexionados[brazosFlexionados.length - 1] : null
  const brazoFlexionadoActual = brazosFlexionados.length > 0 ? brazosFlexionados[0] : null
  const diferenciaBrazoFlexionado = brazoFlexionadoActual && brazoFlexionadoInicial ? brazoFlexionadoActual - brazoFlexionadoInicial : null

  const muslosMaximos = validData.filter(d => d.muslo_maximo !== null).map(d => d.muslo_maximo!)
  const musloMaximoInicial = muslosMaximos.length > 0 ? muslosMaximos[muslosMaximos.length - 1] : null
  const musloMaximoActual = muslosMaximos.length > 0 ? muslosMaximos[0] : null
  const diferenciaMusloMaximo = musloMaximoActual && musloMaximoInicial ? musloMaximoActual - musloMaximoInicial : null

  const muslosMedios = validData.filter(d => d.muslo_medio !== null).map(d => d.muslo_medio!)
  const musloMedioInicial = muslosMedios.length > 0 ? muslosMedios[muslosMedios.length - 1] : null
  const musloMedioActual = muslosMedios.length > 0 ? muslosMedios[0] : null
  const diferenciaMusloMedio = musloMedioActual && musloMedioInicial ? musloMedioActual - musloMedioInicial : null

  const pantorrillasMaximas = validData.filter(d => d.pantorrilla_maximo !== null).map(d => d.pantorrilla_maximo!)
  const pantorrillaMaximaInicial = pantorrillasMaximas.length > 0 ? pantorrillasMaximas[pantorrillasMaximas.length - 1] : null
  const pantorrillaMaximaActual = pantorrillasMaximas.length > 0 ? pantorrillasMaximas[0] : null
  const diferenciaPantorrillaMaxima = pantorrillaMaximaActual && pantorrillaMaximaInicial ? pantorrillaMaximaActual - pantorrillaMaximaInicial : null

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Perímetros Corporales (cm)</h3>
        <div className={styles.stats}>
          {brazoRelajadoActual !== null && (
            <>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Brazo relajado:</span>
                <span className={styles.statValue}>{brazoRelajadoActual.toFixed(1)} cm</span>
              </div>
              {diferenciaBrazoRelajado !== null && (
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Cambio brazo relaj.:</span>
                  <span
                    className={`${styles.statValue} ${
                      diferenciaBrazoRelajado < 0 ? styles.positive : diferenciaBrazoRelajado > 0 ? styles.negative : ''
                    }`}
                  >
                    {diferenciaBrazoRelajado > 0 ? '+' : ''}
                    {diferenciaBrazoRelajado.toFixed(1)} cm
                  </span>
                </div>
              )}
            </>
          )}
          {brazoFlexionadoActual !== null && (
            <>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Brazo flexionado:</span>
                <span className={styles.statValue}>{brazoFlexionadoActual.toFixed(1)} cm</span>
              </div>
              {diferenciaBrazoFlexionado !== null && (
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Cambio brazo flex.:</span>
                  <span
                    className={`${styles.statValue} ${
                      diferenciaBrazoFlexionado < 0 ? styles.positive : diferenciaBrazoFlexionado > 0 ? styles.negative : ''
                    }`}
                  >
                    {diferenciaBrazoFlexionado > 0 ? '+' : ''}
                    {diferenciaBrazoFlexionado.toFixed(1)} cm
                  </span>
                </div>
              )}
            </>
          )}
          {cinturaActual !== null && (
            <>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Cintura:</span>
                <span className={styles.statValue}>{cinturaActual.toFixed(1)} cm</span>
              </div>
              {diferenciaCintura !== null && (
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Cambio cintura:</span>
                  <span
                    className={`${styles.statValue} ${
                      diferenciaCintura < 0 ? styles.positive : diferenciaCintura > 0 ? styles.negative : ''
                    }`}
                  >
                    {diferenciaCintura > 0 ? '+' : ''}
                    {diferenciaCintura.toFixed(1)} cm
                  </span>
                </div>
              )}
            </>
          )}
          {caderaActual !== null && (
            <>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Cadera:</span>
                <span className={styles.statValue}>{caderaActual.toFixed(1)} cm</span>
              </div>
              {diferenciaCadera !== null && (
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Cambio cadera:</span>
                  <span
                    className={`${styles.statValue} ${
                      diferenciaCadera < 0 ? styles.positive : diferenciaCadera > 0 ? styles.negative : ''
                    }`}
                  >
                    {diferenciaCadera > 0 ? '+' : ''}
                    {diferenciaCadera.toFixed(1)} cm
                  </span>
                </div>
              )}
            </>
          )}
          {musloMaximoActual !== null && (
            <>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Muslo máximo:</span>
                <span className={styles.statValue}>{musloMaximoActual.toFixed(1)} cm</span>
              </div>
              {diferenciaMusloMaximo !== null && (
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Cambio muslo máx.:</span>
                  <span
                    className={`${styles.statValue} ${
                      diferenciaMusloMaximo < 0 ? styles.positive : diferenciaMusloMaximo > 0 ? styles.negative : ''
                    }`}
                  >
                    {diferenciaMusloMaximo > 0 ? '+' : ''}
                    {diferenciaMusloMaximo.toFixed(1)} cm
                  </span>
                </div>
              )}
            </>
          )}
          {musloMedioActual !== null && (
            <>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Muslo medio:</span>
                <span className={styles.statValue}>{musloMedioActual.toFixed(1)} cm</span>
              </div>
              {diferenciaMusloMedio !== null && (
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Cambio muslo med.:</span>
                  <span
                    className={`${styles.statValue} ${
                      diferenciaMusloMedio < 0 ? styles.positive : diferenciaMusloMedio > 0 ? styles.negative : ''
                    }`}
                  >
                    {diferenciaMusloMedio > 0 ? '+' : ''}
                    {diferenciaMusloMedio.toFixed(1)} cm
                  </span>
                </div>
              )}
            </>
          )}
          {pantorrillaMaximaActual !== null && (
            <>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Pantorrilla:</span>
                <span className={styles.statValue}>{pantorrillaMaximaActual.toFixed(1)} cm</span>
              </div>
              {diferenciaPantorrillaMaxima !== null && (
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Cambio pantorrilla:</span>
                  <span
                    className={`${styles.statValue} ${
                      diferenciaPantorrillaMaxima < 0 ? styles.positive : diferenciaPantorrillaMaxima > 0 ? styles.negative : ''
                    }`}
                  >
                    {diferenciaPantorrillaMaxima > 0 ? '+' : ''}
                    {diferenciaPantorrillaMaxima.toFixed(1)} cm
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={validData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="fecha"
            tickFormatter={formatearFecha}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} label={{ value: 'cm', angle: -90, position: 'insideLeft' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: any) => value?.toFixed(1) + ' cm'}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="cintura"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ fill: '#f59e0b', r: 4 }}
            name="Cintura"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="cadera_maximo"
            stroke="#ec4899"
            strokeWidth={2}
            dot={{ fill: '#ec4899', r: 4 }}
            name="Cadera"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="brazo_relajado"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            name="Brazo relajado"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="brazo_flexionado"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ fill: '#8b5cf6', r: 4 }}
            name="Brazo flexionado"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="muslo_maximo"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
            name="Muslo máximo"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="muslo_medio"
            stroke="#14b8a6"
            strokeWidth={2}
            dot={{ fill: '#14b8a6', r: 4 }}
            name="Muslo medio"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="pantorrilla_maximo"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ fill: '#6366f1', r: 4 }}
            name="Pantorrilla"
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
