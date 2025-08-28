import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// POST - Configurar tablas de estructuras por guardia
export async function POST(request: NextRequest) {
  try {
    const maybeDeny = await requireAuthz(request as any, { resource: 'payroll', action: 'create' });
    if (maybeDeny && (maybeDeny as any).status === 403) return maybeDeny;
  } catch (_) {}

  try {
    // Crear extensión si no existe
    await sql`CREATE EXTENSION IF NOT EXISTS btree_gist`;

    // Crear tabla de estructuras por guardia
    await sql`
      CREATE TABLE IF NOT EXISTS sueldo_estructura_guardia (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        guardia_id UUID NOT NULL,
        vigencia_desde DATE NOT NULL,
        vigencia_hasta DATE NULL,
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Crear índices
    await sql`CREATE INDEX IF NOT EXISTS idx_sueldo_estructura_guardia_guardia ON sueldo_estructura_guardia(guardia_id)`;

    // Crear tabla de ítems de estructura por guardia
    await sql`
      CREATE TABLE IF NOT EXISTS sueldo_estructura_guardia_item (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        estructura_guardia_id UUID NOT NULL,
        item_id TEXT NOT NULL,
        monto DECIMAL(15,2) NOT NULL DEFAULT 0,
        vigencia_desde DATE NOT NULL,
        vigencia_hasta DATE NULL,
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Crear índices para ítems
    await sql`CREATE INDEX IF NOT EXISTS idx_guardia_item_estructura ON sueldo_estructura_guardia_item(estructura_guardia_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_guardia_item_item ON sueldo_estructura_guardia_item(item_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_guardia_item_activo ON sueldo_estructura_guardia_item(activo)`;

    return NextResponse.json({
      success: true,
      message: 'Tablas de estructuras por guardia configuradas correctamente'
    });

  } catch (error) {
    console.error('Error al configurar tablas:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
