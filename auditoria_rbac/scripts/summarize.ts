const fs = require('fs')
const path = require('path')

function read(file: string): string | null {
  try { return fs.readFileSync(file, 'utf8') } catch { return null }
}

function main() {
  const root = path.resolve(__dirname, '..')
  const outDir = path.join(root, 'outputs')
  const map = read(path.join(outDir, 'rbac_endpoint_map.json'))
  const staticAudit = read(path.join(outDir, 'rbac_static_audit.md'))
  const apiCsv = read(path.join(outDir, 'rbac_results_api.csv'))
  const apiMd = read(path.join(outDir, 'rbac_failures_api.md'))
  const uiHtml = read(path.join(outDir, 'rbac_results_ui.html'))
  const uiMd = read(path.join(outDir, 'rbac_failures_ui.md'))

  const lines: string[] = []
  lines.push('# Resumen Auditoría RBAC')
  lines.push('')
  lines.push('## Mapa de Endpoints')
  lines.push(map ? '```json\n' + map + '\n```' : '_No disponible_')
  lines.push('')
  lines.push('## Hallazgos estáticos')
  lines.push(staticAudit ?? '_No disponible_')
  lines.push('')
  lines.push('## Resultados API')
  lines.push(apiCsv ? '```csv\n' + apiCsv + '\n```' : '_No disponible_')
  if (apiMd) lines.push(apiMd)
  lines.push('')
  lines.push('## Resultados UI')
  lines.push(uiHtml ? uiHtml : '_No disponible_')
  if (uiMd) lines.push(uiMd)

  fs.writeFileSync(path.join(root, 'README_AUDITORIA.md'), lines.join('\n'))
  console.log('Resumen escrito a auditoria_rbac/README_AUDITORIA.md')
}

main()


