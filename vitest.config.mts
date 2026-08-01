import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

/**
 * Configuración de pruebas.
 *
 * El foco son los cálculos clínicos puros (GEB, equivalentes SMAE, macros):
 * un error silencioso ahí acaba en la dieta de un paciente real, así que es
 * donde más valor tiene la red de seguridad.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // El test de openai-assistant es antiguo, usa la API de Jest y no compila.
    // `src/lib/services/__tests__` son pruebas antiguas escritas para Jest, que
    // no está instalado: no se ejecutan y solo generan errores de tipos. Por eso
    // también se excluyen en tsconfig.json.
    // Pendiente: reescribirlas en Vitest o eliminarlas.
    exclude: ['node_modules', '.next', 'src/lib/services/__tests__/**'],
    coverage: {
      provider: 'v8',
      // Solo los módulos con pruebas: incluir el resto daría un porcentaje
      // global engañosamente bajo y ocultaría una caída real de cobertura.
      include: [
        'src/lib/utils/smae.ts',
        'src/lib/utils/dietosintetico.ts',
        'src/lib/dietas/alergenos.ts',
      ],
      reporter: ['text', 'html'],
      // Si la cobertura de los cálculos clínicos baja de aquí, algo se dejó sin probar.
      thresholds: { statements: 85, branches: 75, functions: 90, lines: 85 },
    },
  },
  resolve: {
    // Mismo alias que usa la app, para importar con '@/...' en las pruebas.
    alias: { '@': resolve(import.meta.dirname, './src') },
  },
})
