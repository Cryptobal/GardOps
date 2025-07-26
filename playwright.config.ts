import { defineConfig, devices } from '@playwright/test'

/**
 * Configuración de Playwright para auditoría de responsividad
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './scripts',
  /* Ejecutar pruebas en archivos en paralelo */
  fullyParallel: true,
  /* Fallar la compilación en CI si accidentalmente se dejaron pruebas test.only */
  forbidOnly: !!process.env.CI,
  /* Reintentar en CI solamente */
  retries: process.env.CI ? 2 : 0,
  /* Optar por no usar paralelismo en CI */
  workers: process.env.CI ? 1 : undefined,
  /* Configuración de reporte */
  reporter: 'html',
  /* Configuración compartida para todos los proyectos */
  use: {
    /* URL base para usar en las acciones como `await page.goto('/')` */
    baseURL: 'http://localhost:3000',
    
    /* Recopilar trazas al reintentar las pruebas fallidas */
    trace: 'on-first-retry',
    
    /* Configuración para la auditoría */
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },

  /* Configurar proyectos para principales navegadores */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    /* Prueba contra navegadores móviles */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    
    /* Prueba contra navegadores de desktop */
    {
      name: 'Desktop Safari',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  /* Ejecutar el servidor de desarrollo local antes de iniciar las pruebas */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
}) 