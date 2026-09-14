import { defineConfig, devices } from '@playwright/test'
import { config as cargarEnv } from 'dotenv'

// Credenciales de la cuenta de pruebas. Viven en `e2e/.env.local` —ignorado por
// git— y no dentro de los `.spec.ts`, para que no acaben en un commit.
cargarEnv({ path: 'e2e/.env.local' })

/**
 * Pruebas de navegador.
 * ------------------------------------------------------------
 * Las 213 pruebas de Vitest cubren los cálculos: que los equivalentes cuadren,
 * que el autoguardado no pierda trabajo, que la comparación ordene bien. Nada
 * de eso mira la pantalla, así que fallos como un modal que se corta al hacer
 * scroll o dos líneas de color que compiten pasaban inadvertidos.
 *
 * Esto cubre ese hueco: abre la aplicación de verdad y comprueba lo que se ve.
 *
 * Viven en `e2e/` y no en `src/`, así que `npm test` sigue corriendo solo las
 * de lógica —rápidas, sin navegador— y estas se piden aparte.
 */
export default defineConfig({
  testDir: './e2e',

  // Una prueba de interfaz que falla suele ser una espera corta, no un fallo
  // real: se reintenta una vez antes de darla por rota.
  retries: 1,
  // En serie: comparten la misma base de datos de desarrollo y pisarse los
  // datos daría fallos que no existen.
  workers: 1,

  // Generoso a propósito. En `next dev` cada ruta se compila la primera vez que
  // alguien la pide, y aquí eso llega a tardar más de un minuto:
  // /api/citas/codigo/[codigo] tardó 65 s, /mi-progreso 17 s, /dashboard 15 s.
  // Con el límite en 45 s las pruebas fallaban por la compilación y no por un
  // fallo real —dos dieron "flaky" sin que hubiera nada roto—. En caliente
  // ninguna ruta pasa de 3 s, así que este tope solo absorbe el primer golpe.
  timeout: 150_000,
  expect: { timeout: 30_000 },

  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/.reporte' }]],

  use: {
    baseURL: 'http://localhost:3000',
    // Solo se guardan capturas y traza cuando algo falla: si todo va bien no
    // hay nada que revisar y el disco se llena de basura.
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],

  // Reutiliza el servidor si ya está levantado; si no, lo arranca. Sin esto
  // habría que acordarse de tener `npm run dev` corriendo.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/login',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
