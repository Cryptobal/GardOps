#!/usr/bin/env ts-node
import 'dotenv/config'
import path from 'path'
import fs from 'fs'

type Options = { apply: boolean }

function normalizeResource(seg: string): string {
  return seg.replace(/-/g, '_')
}

function infer(resourcePath: string, method: string): { resource: string; action: string } | null {
  const cleaned = resourcePath.replace(/^api\//, '').replace(/\/+$/, '')
  const parts = cleaned.split('/').filter(Boolean)
  if (!parts.length) return null
  const resource = normalizeResource(parts[0])
  const last = parts[parts.length - 1]
  const hasId = parts.some(p => /^\[.+\]$/.test(p))
  let action = 'read:list'
  if (method === 'GET') {
    if (/^export$/.test(last) || /\/export\//.test(cleaned)) action = 'export'
    else action = hasId ? 'read:detail' : 'read:list'
  } else if (method === 'POST') action = 'create'
  else if (method === 'PUT' || method === 'PATCH') action = 'update'
  else if (method === 'DELETE') action = 'delete'
  return { resource, action }
}

function ensureImport(source: string): string {
  if (/from ['"]@\/lib\/authz-api['"]/.test(source) && /requireAuthz/.test(source)) return source
  const line = "import { requireAuthz } from '@/lib/authz-api'\n"
  return line + source
}

function insertGuard(source: string, resource: string, action: string): string {
  const guard = `\nconst __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));\nconst deny = await requireAuthz(__req as any, { resource: '${resource}', action: '${action}' });\nif (deny) return deny;\n`
  return source.replace(/(export\s+(?:async\s+function|const)\s+(GET|POST|PUT|DELETE|PATCH)\b[\s\S]*?\{)/g, (m) => m + guard)
}

function processFile(filePath: string, opts: Options, manual: string[]): { changed: boolean; diff?: string; newCode?: string } {
  const rel = path.relative(process.cwd(), filePath)
  const code = fs.readFileSync(filePath, 'utf8')
  let updated = ensureImport(code)
  let changed = false

  const exportedMethods = Array.from(code.matchAll(/export\s+(?:async\s+function|const)\s+(GET|POST|PUT|DELETE|PATCH)\b/g)).map(m => m[1])
  if (exportedMethods.length === 0) return { changed: false }

  const apiRoutePart = rel.replace(/.*src\//, '').replace(/route.ts$/, '').replace(/^app\//, '') // e.g. api/guardias/
  for (const method of exportedMethods) {
    const inf = infer(apiRoutePart, method)
    if (!inf) { manual.push(`${rel} :: cannot infer`); continue }
    const { resource, action } = inf
    const marker = `{ resource: '${resource}', action: '${action}' }`
    if (!updated.includes(marker)) {
      updated = insertGuard(updated, resource, action)
    }
    changed = true
  }

  if (!changed) return { changed: false }
  const backupDir = path.join(process.cwd(), 'auditoria_rbac', 'backups', 'api')
  const relOut = path.relative(process.cwd(), filePath)
  const backupPath = path.join(backupDir, relOut)
  fs.mkdirSync(path.dirname(backupPath), { recursive: true })
  fs.writeFileSync(backupPath, code, 'utf8')

  if (opts.apply) {
    fs.writeFileSync(filePath, updated, 'utf8')
  }
  const diff = `--- a/${rel}\n+++ b/${rel}\n` // minimizado por simplicidad
  return { changed: true, diff, newCode: updated }
}

async function main() {
  const apply = process.argv.includes('--apply')
  const projectRoot = process.cwd()
  const glob = require('fast-glob') as typeof import('fast-glob')
  const files: string[] = await glob('src/app/api/**/route.ts', { cwd: projectRoot, absolute: true })
  const manual: string[] = []
  const diffs: string[] = []
  let touched = 0

  for (const f of files) {
    const res = processFile(f, { apply }, manual)
    if (res.changed) {
      touched++
      diffs.push(res.diff!)
    }
  }

  const outDir = path.join(projectRoot, 'auditoria_rbac', 'outputs')
  fs.mkdirSync(outDir, { recursive: true })
  if (manual.length) fs.writeFileSync(path.join(outDir, 'manual_review.txt'), manual.join('\n'))
  console.log(`[rbac_refactor_api] files: ${files.length}, changed: ${touched}, apply: ${apply}`)
  if (!apply) {
    console.log(diffs.join('\n'))
  }
}

main().catch((e) => { console.error(e); process.exit(1) })


