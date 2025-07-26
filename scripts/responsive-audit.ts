#!/usr/bin/env tsx

import { chromium, Browser, Page } from '@playwright/test'
import * as fs from 'fs/promises'
import * as path from 'path'
import { glob } from 'glob'

// Tipos de datos para el reporte
interface ResponsiveIssue {
  file: string
  route: string
  breakpoint: string
  width: number
  type: 'overflow' | 'text-scaling' | 'image-fit' | 'alignment' | 'layout'
  description: string
  element?: string
  severity: 'low' | 'medium' | 'high'
  autoFixApplied?: boolean
  suggestion?: string
}

interface AuditReport {
  timestamp: string
  totalRoutes: number
  totalIssues: number
  issuesByType: Record<string, number>
  issuesBySeverity: Record<string, number>
  issues: ResponsiveIssue[]
  autoFixesApplied: number
  summary: string
}

// Breakpoints definidos según Tailwind CSS
const BREAKPOINTS = [
  { name: 'xs', width: 320, description: 'Mobile pequeño' },
  { name: 'sm', width: 480, description: 'Mobile' },
  { name: 'md', width: 640, description: 'Tablet pequeña' },
  { name: 'lg', width: 768, description: 'Tablet' },
  { name: 'xl', width: 1024, description: 'Desktop' },
  { name: '2xl', width: 1280, description: 'Desktop grande' },
  { name: '3xl', width: 1536, description: 'Desktop extra grande' }
]

class ResponsiveAuditor {
  private browser!: Browser
  private page!: Page
  private issues: ResponsiveIssue[] = []
  private baseUrl = 'http://localhost:3000'
  private autoFixesApplied = 0

  async init() {
    console.log('🚀 Iniciando auditoría de responsividad...')
    this.browser = await chromium.launch({ headless: true })
    this.page = await this.browser.newPage()
    
    // Configurar timeout y esperar por la red
    this.page.setDefaultTimeout(30000)
    await this.page.setViewportSize({ width: 1280, height: 720 })
  }

  async close() {
    await this.browser.close()
  }

  // Buscar todos los archivos de componentes y páginas
  async findReactFiles(): Promise<string[]> {
    const patterns = [
      'app/**/*.tsx',
      'app/**/*.jsx',
      'components/**/*.tsx',
      'components/**/*.jsx',
      'views/**/*.tsx',
      'views/**/*.jsx'
    ]
    
    const files: string[] = []
    for (const pattern of patterns) {
      const matches = await glob(pattern, { 
        ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*']
      })
      files.push(...matches)
    }
    
    return Array.from(new Set(files)) // Eliminar duplicados
  }

  // Extraer rutas desde archivos de páginas
  async extractRoutes(files: string[]): Promise<{ file: string; route: string }[]> {
    const routes: { file: string; route: string }[] = []
    
    for (const file of files) {
      if (file.startsWith('app/') && (file.includes('page.tsx') || file.includes('page.jsx'))) {
        let route = file
          .replace(/^app/, '')
          .replace(/\/page\.(tsx|jsx)$/, '')
          .replace(/\[[^\]]+\]/g, '1') // Reemplazar parámetros dinámicos con valores por defecto
        
        if (route === '') route = '/'
        
        routes.push({ file, route })
      }
    }
    
    // Agregar rutas adicionales conocidas si no están en el sistema de archivos
    const additionalRoutes = [
      { file: 'app/page.tsx', route: '/' },
      { file: 'app/guardias/page.tsx', route: '/guardias' },
      { file: 'app/instalaciones/page.tsx', route: '/instalaciones' },
      { file: 'app/clientes/page.tsx', route: '/clientes' },
      { file: 'app/configuracion/page.tsx', route: '/configuracion' }
    ]
    
    for (const additionalRoute of additionalRoutes) {
      if (!routes.some(r => r.route === additionalRoute.route)) {
        routes.push(additionalRoute)
      }
    }
    
    return routes
  }

  // Auditar una página específica en todos los breakpoints
  async auditPage(route: { file: string; route: string }) {
    console.log(`🔍 Auditando ruta: ${route.route}`)
    
    for (const breakpoint of BREAKPOINTS) {
      try {
        await this.page.setViewportSize({ 
          width: breakpoint.width, 
          height: Math.max(600, breakpoint.width * 0.6) 
        })
        
        // Navegar a la página y esperar a que cargue
        await this.page.goto(`${this.baseUrl}${route.route}`, {
          waitUntil: 'networkidle',
          timeout: 10000
        })
        
        // Esperar un poco más para que los componentes se rendericen
        await this.page.waitForTimeout(1000)
        
        // Auditar problemas específicos
        await this.checkOverflow(route, breakpoint)
        await this.checkTextScaling(route, breakpoint)
        await this.checkImageFitting(route, breakpoint)
        await this.checkLayoutAlignment(route, breakpoint)
        
      } catch (error) {
        console.warn(`⚠️ Error auditando ${route.route} en ${breakpoint.name}: ${error}`)
        this.addIssue({
          file: route.file,
          route: route.route,
          breakpoint: breakpoint.name,
          width: breakpoint.width,
          type: 'layout',
          description: `Error al cargar la página: ${error}`,
          severity: 'high'
        })
      }
    }
  }

  // Verificar elementos que desbordan el viewport
  async checkOverflow(route: { file: string; route: string }, breakpoint: any) {
    const overflowElements = await this.page.evaluate((viewportWidth) => {
      const elements = document.querySelectorAll('*')
      const overflowing: Array<{selector: string, width: number, right: number}> = []
      
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect()
        if (rect.right > viewportWidth && rect.width > 20) { // Ignorar elementos muy pequeños
          overflowing.push({
            selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ').join('.') : ''),
            width: rect.width,
            right: rect.right
          })
        }
      })
      
      return overflowing
    }, breakpoint.width)
    
    for (const element of overflowElements) {
      this.addIssue({
        file: route.file,
        route: route.route,
        breakpoint: breakpoint.name,
        width: breakpoint.width,
        type: 'overflow',
        description: `Elemento desborda el viewport por ${element.right - breakpoint.width}px`,
        element: element.selector,
        severity: element.right - breakpoint.width > 50 ? 'high' : 'medium',
        suggestion: 'Agregar clases responsive como max-w-full, overflow-hidden, o flex-wrap'
      })
    }
  }

  // Verificar escalado de texto
  async checkTextScaling(route: { file: string; route: string }, breakpoint: any) {
    const textIssues = await this.page.evaluate((width) => {
      const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div')
      const issues: Array<{selector: string, fontSize: number, text: string}> = []
      
      textElements.forEach((el) => {
        const styles = window.getComputedStyle(el)
        const fontSize = parseFloat(styles.fontSize)
        const text = el.textContent?.slice(0, 50) || ''
        
        // Verificar si el texto es demasiado grande para móviles
        if (width < 768 && fontSize > 24) {
          issues.push({
            selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ').join('.') : ''),
            fontSize,
            text
          })
        }
        
        // Verificar si el texto es demasiado pequeño para desktop
        if (width > 1024 && fontSize < 12 && text.length > 10) {
          issues.push({
            selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ').join('.') : ''),
            fontSize,
            text
          })
        }
      })
      
      return issues
    }, breakpoint.width)
    
    for (const issue of textIssues) {
      this.addIssue({
        file: route.file,
        route: route.route,
        breakpoint: breakpoint.name,
        width: breakpoint.width,
        type: 'text-scaling',
        description: `Texto con tamaño ${issue.fontSize}px puede no ser optimal para este breakpoint`,
        element: issue.selector,
        severity: 'medium',
        suggestion: 'Usar clases responsive como text-sm md:text-base lg:text-lg'
      })
    }
  }

  // Verificar ajuste de imágenes
  async checkImageFitting(route: { file: string; route: string }, breakpoint: any) {
    const imageIssues = await this.page.evaluate(() => {
      const images = document.querySelectorAll('img, [style*="background-image"]')
      const issues: Array<{selector: string, hasObjectFit: boolean, naturalWidth?: number}> = []
      
      images.forEach((el) => {
        const styles = window.getComputedStyle(el)
        const hasObjectFit = styles.objectFit !== 'fill'
        
        if (el.tagName === 'IMG') {
          const img = el as HTMLImageElement
          issues.push({
            selector: 'img' + (el.className ? '.' + el.className.split(' ').join('.') : ''),
            hasObjectFit,
            naturalWidth: img.naturalWidth
          })
        } else {
          issues.push({
            selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ').join('.') : ''),
            hasObjectFit: styles.backgroundSize !== 'auto'
          })
        }
      })
      
      return issues.filter(issue => !issue.hasObjectFit)
    })
    
    for (const issue of imageIssues) {
      this.addIssue({
        file: route.file,
        route: route.route,
        breakpoint: breakpoint.name,
        width: breakpoint.width,
        type: 'image-fit',
        description: 'Imagen sin object-fit apropiado puede distorsionarse',
        element: issue.selector,
        severity: 'low',
        suggestion: 'Agregar object-cover, object-contain, o background-size apropiado'
      })
    }
  }

  // Verificar alineación y layout
  async checkLayoutAlignment(route: { file: string; route: string }, breakpoint: any) {
    const layoutIssues = await this.page.evaluate((width) => {
      const containers = document.querySelectorAll('div, section, main, aside')
      const issues: Array<{selector: string, issue: string}> = []
      
      containers.forEach((el) => {
        const rect = el.getBoundingClientRect()
        const styles = window.getComputedStyle(el)
        
        // Verificar si hay elementos con ancho fijo que pueden causar problemas
        if (styles.width && styles.width.includes('px') && parseInt(styles.width) > width * 0.9) {
          issues.push({
            selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ').join('.') : ''),
            issue: 'Ancho fijo muy grande para este breakpoint'
          })
        }
        
        // Verificar elementos que no usan flex o grid en mobile
        if (width < 768 && styles.display === 'block' && el.children.length > 2) {
          const hasFlexChildren = Array.from(el.children).some(child => 
            window.getComputedStyle(child).display.includes('flex')
          )
          if (!hasFlexChildren) {
            issues.push({
              selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ').join('.') : ''),
              issue: 'Podría beneficiarse de layout flex/grid en mobile'
            })
          }
        }
      })
      
      return issues
    }, breakpoint.width)
    
    for (const issue of layoutIssues) {
      this.addIssue({
        file: route.file,
        route: route.route,
        breakpoint: breakpoint.name,
        width: breakpoint.width,
        type: 'alignment',
        description: issue.issue,
        element: issue.selector,
        severity: 'medium',
        suggestion: 'Considerar usar flex, grid, o clases responsive de ancho'
      })
    }
  }

  // Agregar una incidencia al reporte
  private addIssue(issue: ResponsiveIssue) {
    this.issues.push(issue)
  }

  // Aplicar correcciones automáticas a los archivos
  async applyAutoFixes() {
    console.log('🔧 Aplicando correcciones automáticas...')
    
    const fileGroups = this.groupIssuesByFile()
    
    for (const [filePath, fileIssues] of Object.entries(fileGroups)) {
      await this.applyFixesToFile(filePath, fileIssues)
    }
  }

  // Agrupar incidencias por archivo
  private groupIssuesByFile(): Record<string, ResponsiveIssue[]> {
    const groups: Record<string, ResponsiveIssue[]> = {}
    
    for (const issue of this.issues) {
      if (!groups[issue.file]) {
        groups[issue.file] = []
      }
      groups[issue.file].push(issue)
    }
    
    return groups
  }

  // Aplicar correcciones a un archivo específico
  private async applyFixesToFile(filePath: string, issues: ResponsiveIssue[]) {
    try {
      const fullPath = path.resolve(filePath)
      const content = await fs.readFile(fullPath, 'utf-8')
      let modifiedContent = content
      
      // Patterns comunes que se pueden arreglar automáticamente
      const fixes = [
        // Agregar responsive breakpoints a clases de texto
        {
          pattern: /className="([^"]*text-\w+[^"]*)"(?![^<]*responsive)/g,
          replacement: (match: string, classes: string) => {
            if (!classes.includes('sm:') && !classes.includes('md:')) {
              const newClasses = classes.replace(/(text-\w+)/, '$1 sm:$1 md:text-base lg:text-lg')
              return `className="${newClasses}"`
            }
            return match
          }
        },
        // Agregar object-cover a imágenes sin object-fit
        {
          pattern: /<img([^>]*className="[^"]*")([^>]*?)(?!object-)/g,
          replacement: '<img$1 object-cover$2'
        },
        // Agregar max-width a contenedores sin responsive
        {
          pattern: /className="([^"]*w-\[\d+px\][^"]*)"(?![^<]*max-w)/g,
          replacement: (match: string, classes: string) => {
            return `className="${classes} max-w-full"`
          }
        },
        // Agregar flex-wrap a contenedores flex
        {
          pattern: /className="([^"]*flex[^"]*)"(?![^<]*flex-wrap)/g,
          replacement: (match: string, classes: string) => {
            if (classes.includes('flex ') && !classes.includes('flex-wrap')) {
              return `className="${classes} flex-wrap"`
            }
            return match
          }
        }
      ]
      
      let fixesApplied = 0
      for (const fix of fixes) {
        const originalContent = modifiedContent
        if (typeof fix.replacement === 'function') {
          modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement)
        } else {
          modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement)
        }
        
        if (modifiedContent !== originalContent) {
          fixesApplied++
        }
      }
      
      // Guardar archivo modificado si hubo cambios
      if (modifiedContent !== content) {
        await fs.writeFile(fullPath, modifiedContent, 'utf-8')
        console.log(`✅ Aplicadas ${fixesApplied} correcciones a ${filePath}`)
        this.autoFixesApplied += fixesApplied
        
        // Marcar issues como resueltas
        issues.forEach(issue => {
          issue.autoFixApplied = true
        })
      }
      
    } catch (error) {
      console.warn(`⚠️ Error aplicando correcciones a ${filePath}: ${error}`)
    }
  }

  // Generar reporte final
  async generateReport(): Promise<AuditReport> {
    const timestamp = new Date().toISOString()
    const routes = await this.extractRoutes(await this.findReactFiles())
    
    // Estadísticas
    const issuesByType = this.issues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const issuesBySeverity = this.issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const summary = this.generateSummary(routes.length, this.issues.length)
    
    return {
      timestamp,
      totalRoutes: routes.length,
      totalIssues: this.issues.length,
      issuesByType,
      issuesBySeverity,
      issues: this.issues,
      autoFixesApplied: this.autoFixesApplied,
      summary
    }
  }

  private generateSummary(totalRoutes: number, totalIssues: number): string {
    if (totalIssues === 0) {
      return `¡Excelente! No se encontraron problemas de responsividad en ${totalRoutes} rutas auditadas.`
    }
    
    const severity = totalIssues > 20 ? 'alta' : totalIssues > 10 ? 'media' : 'baja'
    return `Se encontraron ${totalIssues} incidencias de responsividad en ${totalRoutes} rutas (severidad ${severity}). ${this.autoFixesApplied} correcciones aplicadas automáticamente.`
  }

  // Ejecutar auditoría completa
  async runAudit() {
    await this.init()
    
    try {
      // Encontrar archivos y rutas
      const files = await this.findReactFiles()
      const routes = await this.extractRoutes(files)
      
      console.log(`📁 Encontrados ${files.length} archivos React`)
      console.log(`🌐 Detectadas ${routes.length} rutas para auditar`)
      
      // Verificar si Next.js está corriendo
      try {
        await this.page.goto(this.baseUrl, { timeout: 5000 })
        console.log('✅ Servidor Next.js detectado')
      } catch (error) {
        console.error('❌ Error: Servidor Next.js no está ejecutándose en http://localhost:3000')
        console.log('Por favor ejecuta "npm run dev" en otra terminal antes de ejecutar la auditoría')
        process.exit(1)
      }
      
      // Auditar cada ruta
      for (const route of routes) {
        await this.auditPage(route)
      }
      
      // Aplicar correcciones automáticas
      await this.applyAutoFixes()
      
      // Generar y guardar reporte
      const report = await this.generateReport()
      const reportPath = path.resolve('reports/responsive-audit.json')
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8')
      
      // Mostrar resumen en consola
      console.log('\n' + '='.repeat(60))
      console.log('📊 RESUMEN DE AUDITORÍA DE RESPONSIVIDAD')
      console.log('='.repeat(60))
      console.log(`📅 Fecha: ${new Date().toLocaleString('es-CL')}`)
      console.log(`🌐 Rutas auditadas: ${report.totalRoutes}`)
      console.log(`⚠️  Incidencias encontradas: ${report.totalIssues}`)
      console.log(`🔧 Correcciones aplicadas: ${report.autoFixesApplied}`)
      console.log('\n📈 Incidencias por tipo:')
      Object.entries(report.issuesByType).forEach(([type, count]) => {
        console.log(`  • ${type}: ${count}`)
      })
      console.log('\n🎯 Incidencias por severidad:')
      Object.entries(report.issuesBySeverity).forEach(([severity, count]) => {
        const emoji = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢'
        console.log(`  • ${emoji} ${severity}: ${count}`)
      })
      console.log('\n' + '='.repeat(60))
      console.log(`Auditoría de Responsividad completada: ${report.totalRoutes} rutas auditadas, ${report.totalIssues} incidencias encontradas. Consulta reports/responsive-audit.json`)
      console.log('='.repeat(60))
      
    } finally {
      await this.close()
    }
  }
}

// Ejecutar auditoría
async function main() {
  const auditor = new ResponsiveAuditor()
  await auditor.runAudit()
}

// Manejar errores no capturados
process.on('unhandledRejection', (error) => {
  console.error('❌ Error no manejado:', error)
  process.exit(1)
})

if (require.main === module) {
  main().catch(console.error)
}

export { ResponsiveAuditor } 