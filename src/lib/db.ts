// Reexport de la conexión existente a Neon para mantener una API estable en el módulo Documentos
export { query } from './database'
export { default as pool } from './database'

