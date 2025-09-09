import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { Client } from 'pg'

async function main() {
  // Cargar env locales si existen
  if (fs.existsSync(path.resolve('.env.local'))) {
    dotenv.config({ path: path.resolve('.env.local') })
  } else {
    dotenv.config()
  }

  const fileArg = process.argv[2]
  if (!fileArg) {
    console.error('Uso: ts-node scripts/apply-sql.ts <ruta_sql>')
    process.exit(1)
  }

  const filePath = path.resolve(fileArg)
  if (!fs.existsSync(filePath)) {
    console.error(`No existe el archivo SQL: ${filePath}`)
    process.exit(1)
  }

  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL
  if (!databaseUrl) {
    console.error('No se encontró DATABASE_URL/POSTGRES_URL en el entorno')
    process.exit(1)
  }

  const sql = fs.readFileSync(filePath, 'utf8')
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  })

  try {
    console.log(`📥 Aplicando SQL: ${filePath}`)
    await client.connect()
    await client.query('BEGIN')
    await client.query(sql)
    await client.query('COMMIT')
    console.log('✅ SQL aplicado correctamente')
  } catch (err) {
    try { await client.query('ROLLBACK') } catch {}
    console.error('❌ Error aplicando SQL:', err)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error('❌ Error inesperado:', e)
  process.exit(1)
})


