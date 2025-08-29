#!/usr/bin/env ts-node
import 'dotenv/config'
import fs from 'fs'
import path from 'path'

function normalizeResourceFromPath(rel: string): string | null {
  const m = rel.match(/^src\/app\/([^\/]+)\//)
  if (!m) return null
  return m[1].replace(/-/g, '_')
}

function ensureImports(src: string): string {
  const hasAuth = /from ['"]@\/lib\/authz-ui['"]/g.test(src)
  if (hasAuth) return src
  return `import { Authorize, GuardButton, can } from '@/lib/authz-ui'\n` + src
}

function wrapButtons(src: string, resource: string): { code: string; wrapped: number } {
  let code = src
  let wrapped = 0
  const patterns: Array<{ re: RegExp; action: string }> = [
    { re: /<button([^>]*?)>([^<]*?(?:nuevo|crear)[^<]*?)<\/button>/gi, action: 'create' },
    { re: /<button([^>]*?)>([^<]*?(?:editar)[^<]*?)<\/button>/gi, action: 'update' },
    { re: /<button([^>]*?)>([^<]*?(?:eliminar|borrar)[^<]*?)<\/button>/gi, action: 'delete' },
    { re: /<button([^>]*?)>([^<]*?(?:export(?:ar)?)[^<]*?)<\/button>/gi, action: 'export' },
    // Enlaces que actúan como botones
    { re: /<a([^>]*?)(?:data-testid=["']create["'][^>]*)>([\s\S]*?)<\/a>/gi, action: 'create' },
    { re: /<a([^>]*?)(?:data-testid=["']edit["'][^>]*)>([\s\S]*?)<\/a>/gi, action: 'update' },
    { re: /<a([^>]*?)(?:data-testid=["']delete["'][^>]*)>([\s\S]*?)<\/a>/gi, action: 'delete' },
    { re: /<a([^>]*?)(?:data-testid=["']export["'][^>]*)>([\s\S]*?)<\/a>/gi, action: 'export' },
    // Next Link con hijos texto
    { re: /<Link([^>]*?)>([^<]*?(?:nuevo|crear)[^<]*?)<\/Link>/gi, action: 'create' },
    { re: /<Link([^>]*?)>([^<]*?(?:editar)[^<]*?)<\/Link>/gi, action: 'update' },
    { re: /<Link([^>]*?)>([^<]*?(?:eliminar|borrar)[^<]*?)<\/Link>/gi, action: 'delete' },
    { re: /<Link([^>]*?)>([^<]*?(?:export(?:ar)?)[^<]*?)<\/Link>/gi, action: 'export' },
  ]
  for (const { re, action } of patterns) {
    code = code.replace(re, (_m, attrs, text) => {
      wrapped++
      return `<Authorize resource="${resource}" action="${action}" eff={effectivePermissions}>
  <GuardButton resource="${resource}" action="${action}" eff={effectivePermissions} ${attrs}>${text}</GuardButton>
</Authorize>`
    })
  }
  return { code, wrapped }
}

function processFile(fp: string, manual: string[]): { changed: boolean; newCode?: string } {
  const code = fs.readFileSync(fp, 'utf8')
  const rel = path.relative(process.cwd(), fp)
  const resource = normalizeResourceFromPath(rel)
  if (!resource) { manual.push(`${rel} :: no resource`); return { changed: false } }
  let updated = ensureImports(code)
  const { code: wrappedCode } = wrapButtons(updated, resource)
  updated = wrappedCode
  if (updated === code) return { changed: false }
  const backup = path.join(process.cwd(), 'auditoria_rbac', 'backups', 'ui', rel)
  fs.mkdirSync(path.dirname(backup), { recursive: true })
  fs.writeFileSync(backup, code, 'utf8')
  return { changed: true, newCode: updated }
}

async function main() {
  const apply = process.argv.includes('--apply')
  const glob = require('fast-glob') as typeof import('fast-glob')
  const files: string[] = [
    ...(await glob('src/app/**/page.tsx', { absolute: true })),
    ...(await glob('src/app/**/components/**/*.tsx', { absolute: true })),
  ]
  const manual: string[] = []
  let changed = 0
  for (const f of files) {
    const res = processFile(f, manual)
    if (res.changed && res.newCode) {
      changed++
      if (apply) fs.writeFileSync(f, res.newCode, 'utf8')
    }
  }
  const outDir = path.join(process.cwd(), 'auditoria_rbac', 'outputs')
  fs.mkdirSync(outDir, { recursive: true })
  if (manual.length) fs.writeFileSync(path.join(outDir, 'manual_review.txt'), manual.join('\n'), { flag: 'a' })
  console.log(`[rbac_refactor_ui] files: ${files.length}, changed: ${changed}, apply: ${apply}`)
}

main().catch(e => { console.error(e); process.exit(1) })


