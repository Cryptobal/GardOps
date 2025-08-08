import Mustache from 'mustache'

// Extrae variables en formato {{variable}}
export function extractVariables(template: string): string[] {
  const regex = /{{\s*([\w\.]+)\s*}}/g
  const variables = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = regex.exec(template)) !== null) {
    variables.add(match[1])
  }
  return Array.from(variables)
}

export function renderTemplate(template: string, data: Record<string, any>): string {
  return Mustache.render(template, data)
}

export function validateVariables(used: string[], declared: string[]): { valid: boolean; missing: string[] } {
  const declaredSet = new Set(declared)
  const missing = used.filter(v => !declaredSet.has(v))
  return { valid: missing.length === 0, missing }
}

