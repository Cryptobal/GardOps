import { query } from '@/lib/db'

export type EntityType = 'guardia' | 'instalacion' | 'cliente'

export interface EntityDataResult {
  data: Record<string, any>
}

export async function getEntityData(entityType: EntityType, entityId: string): Promise<EntityDataResult> {
  switch (entityType) {
    case 'guardia':
      return getGuardiaData(entityId)
    case 'instalacion':
      return getInstalacionData(entityId)
    case 'cliente':
      return getClienteData(entityId)
    default:
      throw new Error(`Tipo de entidad no soportado: ${entityType}`)
  }
}

async function getGuardiaData(id: string): Promise<EntityDataResult> {
  const sql = `
    SELECT g.id, g.nombre, g.apellido_paterno, g.apellido_materno, g.rut, g.email,
           g.telefono, g.direccion, g.fecha_os10, g.created_at
    FROM guardias g
    WHERE g.id = $1
  `
  const result = await query(sql, [id])
  if (result.rows.length === 0) throw new Error('Guardia no encontrado')
  const g = result.rows[0]
  const nombreCompleto = [g.nombre, g.apellido_paterno, g.apellido_materno].filter(Boolean).join(' ')
  return {
    data: {
      guardia_id: g.id,
      guardia_nombre: nombreCompleto,
      rut: g.rut,
      email: g.email,
      telefono: g.telefono,
      direccion: g.direccion,
      fecha_contrato: new Date(g.created_at).toISOString().slice(0, 10),
    },
  }
}

async function getInstalacionData(id: string): Promise<EntityDataResult> {
  const sql = `
    SELECT i.id, i.nombre, i.direccion, c.nombre as cliente_nombre
    FROM instalaciones i
    LEFT JOIN clientes c ON c.id = i.cliente_id
    WHERE i.id = $1
  `
  const result = await query(sql, [id])
  if (result.rows.length === 0) throw new Error('Instalación no encontrada')
  const i = result.rows[0]
  return {
    data: {
      instalacion_id: i.id,
      instalacion_nombre: i.nombre,
      instalacion_direccion: i.direccion,
      cliente_nombre: i.cliente_nombre,
    },
  }
}

async function getClienteData(id: string): Promise<EntityDataResult> {
  const sql = `
    SELECT id, nombre, rut, direccion FROM clientes WHERE id = $1
  `
  const result = await query(sql, [id])
  if (result.rows.length === 0) throw new Error('Cliente no encontrado')
  const c = result.rows[0]
  return {
    data: {
      cliente_id: c.id,
      cliente_nombre: c.nombre,
      cliente_rut: c.rut,
      cliente_direccion: c.direccion,
    },
  }
}

export async function searchGuardias(term: string): Promise<Array<{ id: string; nombre: string; rut?: string }>> {
  const result = await query(
    `SELECT id, CONCAT(nombre, ' ', apellido_paterno, ' ', COALESCE(apellido_materno,'')) nombre, rut
     FROM guardias
     WHERE LOWER(CONCAT(nombre,' ',apellido_paterno,' ',COALESCE(apellido_materno,''))) LIKE LOWER($1)
        OR LOWER(rut) LIKE LOWER($1)
     ORDER BY nombre
     LIMIT 20`,
    [`%${term}%`]
  )
  return result.rows
}

