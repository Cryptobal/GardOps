#!/usr/bin/env tsx

import * as fs from 'fs/promises'
import * as path from 'path'

export interface ResponsiveFix {
  name: string
  description: string
  pattern: RegExp
  replacement: string | ((match: string, ...groups: string[]) => string)
  conditions?: string[]
}

export class ResponsiveFixEngine {
  private fixes: ResponsiveFix[] = [
    // 1. Correcciones de texto responsivo
    {
      name: 'responsive-text-sizing',
      description: 'Agregar clases responsivas a textos',
      pattern: /className="([^"]*)(text-xs|text-sm|text-base|text-lg|text-xl|text-2xl|text-3xl|text-4xl)([^"]*)"(?![^<]*(?:sm:|md:|lg:))/g,
      replacement: (match, before, textSize, after) => {
        const responsiveMap: Record<string, string> = {
          'text-xs': 'text-xs sm:text-sm',
          'text-sm': 'text-sm md:text-base',
          'text-base': 'text-sm md:text-base lg:text-lg',
          'text-lg': 'text-base md:text-lg lg:text-xl',
          'text-xl': 'text-lg md:text-xl lg:text-2xl',
          'text-2xl': 'text-xl md:text-2xl lg:text-3xl',
          'text-3xl': 'text-2xl md:text-3xl lg:text-4xl',
          'text-4xl': 'text-3xl md:text-4xl lg:text-5xl'
        }
        
        const responsiveText = responsiveMap[textSize] || textSize
        return `className="${before}${responsiveText}${after}"`
      }
    },

    // 2. Correcciones de padding y margin responsivos
    {
      name: 'responsive-spacing',
      description: 'Hacer espaciado responsivo',
      pattern: /className="([^"]*)(p-\d+|px-\d+|py-\d+|m-\d+|mx-\d+|my-\d+)([^"]*)"(?![^<]*(?:sm:|md:|lg:))/g,
      replacement: (match, before, spacing, after) => {
        const spacingValue = spacing.split('-')[1]
        const spacingType = spacing.split('-')[0]
        
        if (parseInt(spacingValue) >= 8) {
          const responsiveSpacing = `${spacing} sm:${spacingType}-${Math.max(4, parseInt(spacingValue) - 2)} md:${spacing}`
          return `className="${before}${responsiveSpacing}${after}"`
        }
        return match
      }
    },

    // 3. Correcciones de ancho responsivo
    {
      name: 'responsive-width',
      description: 'Hacer anchos responsivos',
      pattern: /className="([^"]*)(w-\d+|w-\[\d+px\])([^"]*)"(?![^<]*max-w)/g,
      replacement: (match, before, width, after) => {
        if (width.includes('[') && width.includes('px')) {
          return `className="${before}${width} max-w-full${after}"`
        }
        
        const widthNum = width.split('-')[1]
        if (parseInt(widthNum) >= 96) { // w-96 = 24rem = 384px
          return `className="${before}w-full md:${width}${after}"`
        }
        
        return match
      }
    },

    // 4. Correcciones de flex
    {
      name: 'responsive-flex',
      description: 'Mejorar layouts flex para responsividad',
      pattern: /className="([^"]*flex[^"]*)"(?![^<]*flex-wrap)(?![^<]*flex-col)/g,
      replacement: (match, classes) => {
        if (classes.includes('flex ') && !classes.includes('flex-wrap') && !classes.includes('flex-col')) {
          return `className="${classes} flex-wrap sm:flex-nowrap"`
        }
        return match
      }
    },

    // 5. Correcciones de grid
    {
      name: 'responsive-grid',
      description: 'Hacer grids responsivos',
      pattern: /className="([^"]*)(grid-cols-\d+)([^"]*)"(?![^<]*(?:sm:|md:|lg:)grid-cols)/g,
      replacement: (match, before, gridCols, after) => {
        const colsNum = parseInt(gridCols.split('-')[2])
        
        if (colsNum > 3) {
          return `className="${before}grid-cols-1 sm:grid-cols-2 md:${gridCols}${after}"`
        } else if (colsNum > 1) {
          return `className="${before}grid-cols-1 md:${gridCols}${after}"`
        }
        
        return match
      }
    },

    // 6. Correcciones de imágenes
    {
      name: 'responsive-images',
      description: 'Agregar object-fit a imágenes',
      pattern: /<img([^>]*className="[^"]*")([^>]*)(?!object-)>/g,
      replacement: '<img$1 object-cover$2>'
    },

    // 7. Correcciones de altura fija
    {
      name: 'responsive-height',
      description: 'Hacer alturas responsivas',
      pattern: /className="([^"]*)(h-\[\d+px\]|h-\d{2,})([^"]*)"(?![^<]*min-h)/g,
      replacement: (match, before, height, after) => {
        return `className="${before}${height} min-h-[200px] sm:${height}${after}"`
      }
    },

    // 8. Correcciones de containers sin max-width
    {
      name: 'responsive-containers',
      description: 'Agregar max-width a contenedores',
      pattern: /className="([^"]*container[^"]*)"(?![^<]*max-w)/g,
      replacement: (match, classes) => {
        return `className="${classes} max-w-7xl mx-auto"`
      }
    },

    // 9. Correcciones de botones
    {
      name: 'responsive-buttons',
      description: 'Hacer botones responsivos',
      pattern: /className="([^"]*)(px-\d+|py-\d+)([^"]*)"[^>]*<button|<button[^>]*className="([^"]*)(px-\d+|py-\d+)([^"]*)"/g,
      replacement: (match, ...groups) => {
        const fullMatch = match
        if (fullMatch.includes('px-') && !fullMatch.includes('sm:px')) {
          return fullMatch.replace(/(px-\d+)/, '$1 sm:px-4 md:px-6')
        }
        if (fullMatch.includes('py-') && !fullMatch.includes('sm:py')) {
          return fullMatch.replace(/(py-\d+)/, '$1 sm:py-2 md:py-3')
        }
        return match
      }
    },

    // 10. Correcciones de navegación móvil
    {
      name: 'responsive-navigation',
      description: 'Mejorar navegación para móvil',
      pattern: /className="([^"]*)(hidden|block)([^"]*)"(?![^<]*(?:sm:|md:|lg:))/g,
      replacement: (match, before, visibility, after) => {
        if (visibility === 'hidden') {
          return `className="${before}hidden md:block${after}"`
        }
        return match
      }
    }
  ]

  async applyFixesToFile(filePath: string): Promise<number> {
    try {
      const fullPath = path.resolve(filePath)
      const originalContent = await fs.readFile(fullPath, 'utf-8')
      let modifiedContent = originalContent
      let totalFixes = 0

      // Aplicar cada corrección
      for (const fix of this.fixes) {
        const before = modifiedContent
        
        if (typeof fix.replacement === 'function') {
          modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement)
        } else {
          modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement)
        }
        
        if (modifiedContent !== before) {
          const fixCount = (before.match(fix.pattern) || []).length
          totalFixes += fixCount
          console.log(`  ✓ ${fix.name}: ${fixCount} correcciones`)
        }
      }

      // Guardar archivo si hubo cambios
      if (modifiedContent !== originalContent) {
        // Crear backup
        const backupPath = `${fullPath}.backup.${Date.now()}`
        await fs.writeFile(backupPath, originalContent, 'utf-8')
        
        // Guardar archivo modificado
        await fs.writeFile(fullPath, modifiedContent, 'utf-8')
        
        console.log(`✅ ${totalFixes} correcciones aplicadas a ${filePath}`)
        console.log(`📁 Backup creado: ${path.basename(backupPath)}`)
      }

      return totalFixes
    } catch (error) {
      console.error(`❌ Error procesando ${filePath}:`, error)
      return 0
    }
  }

  async applyFixesToDirectory(directory: string): Promise<void> {
    console.log(`🔧 Aplicando correcciones automáticas en ${directory}...`)
    
    const { glob } = await import('glob')
    const files = await glob(`${directory}/**/*.{tsx,jsx}`, {
      ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*']
    })

    let totalFiles = 0
    let totalFixes = 0

    for (const file of files) {
      console.log(`\n📄 Procesando: ${file}`)
      const fixes = await this.applyFixesToFile(file)
      
      if (fixes > 0) {
        totalFiles++
        totalFixes += fixes
      } else {
        console.log(`  ℹ️ No se requieren correcciones`)
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log(`🎯 Resumen de correcciones automáticas:`)
    console.log(`📁 Archivos procesados: ${files.length}`)
    console.log(`📝 Archivos modificados: ${totalFiles}`)
    console.log(`🔧 Total de correcciones: ${totalFixes}`)
    console.log('='.repeat(50))
  }

  // Método para validar que las correcciones son seguras
  async validateFix(filePath: string, content: string): Promise<boolean> {
    try {
      // Verificar que el archivo sigue siendo válido TypeScript/JSX
      // Esta es una validación básica - en un entorno real podrías usar el compilador de TS
      
      // Verificar balance de llaves
      const openBraces = (content.match(/\{/g) || []).length
      const closeBraces = (content.match(/\}/g) || []).length
      
      if (openBraces !== closeBraces) {
        throw new Error('Llaves desbalanceadas')
      }

      // Verificar balance de paréntesis
      const openParens = (content.match(/\(/g) || []).length
      const closeParens = (content.match(/\)/g) || []).length
      
      if (openParens !== closeParens) {
        throw new Error('Paréntesis desbalanceados')
      }

      // Verificar que no se han roto las props de React
      const brokenProps = content.match(/className="{2,}|className="[^"]*"[^>\s]/g)
      if (brokenProps) {
        throw new Error('Props malformadas detectadas')
      }

      return true
    } catch (error) {
      console.warn(`⚠️ Validación fallida para ${filePath}: ${error}`)
      return false
    }
  }
}

// CLI para ejecutar solo las correcciones
async function main() {
  const engine = new ResponsiveFixEngine()
  
  const directories = ['app', 'components']
  
  for (const dir of directories) {
    if (await fs.access(dir).then(() => true).catch(() => false)) {
      await engine.applyFixesToDirectory(dir)
    }
  }
}

if (require.main === module) {
  main().catch(console.error)
} 