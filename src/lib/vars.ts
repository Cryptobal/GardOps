/**
 * Librería para manejo de variables en plantillas de documentos
 */

/**
 * Extrae variables de un texto HTML usando regex
 * Busca patrones como {{variable}} y los extrae
 */
export function extractVars(html: string): string[] {
  const regex = /\{\{\s*([a-z0-9_]+)\s*\}\}/g;
  const matches = html.match(regex);
  
  if (!matches) {
    return [];
  }
  
  // Extraer solo los nombres de las variables (sin {{ }})
  const vars = matches.map(match => {
    // Remover {{ y }} y espacios
    return match.replace(/\{\{\s*/, '').replace(/\s*\}\}/, '');
  });
  
  // Remover duplicados y ordenar
  return [...new Set(vars)].sort();
}

/**
 * Valida si una variable tiene el formato correcto
 */
export function isValidVarName(varName: string): boolean {
  const regex = /^[a-z][a-z0-9_]*$/;
  return regex.test(varName);
}

/**
 * Reemplaza variables en un texto con valores
 */
export function replaceVars(template: string, values: Record<string, string>): string {
  let result = template;
  
  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(regex, value);
  }
  
  return result;
}

/**
 * Obtiene todas las variables únicas de un array de plantillas
 */
export function getAllVarsFromTemplates(templates: Array<{ content_html: string }>): string[] {
  const allVars: string[] = [];
  
  for (const template of templates) {
    const vars = extractVars(template.content_html);
    allVars.push(...vars);
  }
  
  // Remover duplicados y ordenar
  return [...new Set(allVars)].sort();
}
