import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';
import { logger } from '@/lib/utils/logger';

// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

// Cache para evitar verificaciones repetitivas
let tableVerified = false;

// GET /api/instalaciones - Obtener todas las instalaciones
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const withCoords = searchParams.get('withCoords') === 'true';
    
    // Verificar tabla solo una vez por sesión
    if (!tableVerified) {
      await ensureInstalacionesTable();
      tableVerified = true;
    }
    
    // Si se solicita con coordenadas, devolver formato simplificado
    if (withCoords) {
      const result = await query(`
        SELECT 
          i.id,
          i.nombre,
          i.latitud as lat,
          i.longitud as lng
        FROM instalaciones i
        WHERE i.latitud IS NOT NULL 
          AND i.longitud IS NOT NULL
          AND i.estado = 'Activo'
        ORDER BY i.nombre
      `);
      
      return NextResponse.json(result.rows);
    }
    
    // Query básica para instalaciones con conteo de puestos operativos
    const result = await query(`
      SELECT 
        i.id,
        i.nombre,
        i.cliente_id,
        i.direccion,
        i.latitud,
        i.longitud,
        i.ciudad,
        i.comuna,
        i.telefono,
        i.valor_turno_extra,
        i.estado,
        i.created_at,
        i.updated_at,
        -- Conteo de puestos operativos
        COALESCE(puestos_totales.count, 0) as puestos_creados,
        COALESCE(puestos_asignados.count, 0) as puestos_asignados,
        COALESCE(ppc_pendientes.count, 0) as ppc_pendientes,
        COALESCE(ppc_totales.count, 0) as ppc_totales
      FROM instalaciones i
      
      -- Puestos totales (solo activos)
      LEFT JOIN (
        SELECT 
          po.instalacion_id,
          COUNT(*) as count
        FROM as_turnos_puestos_operativos po
        WHERE po.activo = true
        GROUP BY po.instalacion_id
      ) puestos_totales ON puestos_totales.instalacion_id = i.id
      
      -- Puestos asignados (con guardia asignado, solo activos)
      LEFT JOIN (
        SELECT 
          po.instalacion_id,
          COUNT(*) as count
        FROM as_turnos_puestos_operativos po
        WHERE po.es_ppc = false AND po.guardia_id IS NOT NULL AND po.activo = true
        GROUP BY po.instalacion_id
      ) puestos_asignados ON puestos_asignados.instalacion_id = i.id
      
      -- PPC pendientes (puestos sin asignar, solo activos)
      LEFT JOIN (
        SELECT 
          po.instalacion_id,
          COUNT(*) as count
        FROM as_turnos_puestos_operativos po
        WHERE po.es_ppc = true AND po.activo = true
        GROUP BY po.instalacion_id
      ) ppc_pendientes ON ppc_pendientes.instalacion_id = i.id
      
      -- PPC totales (puestos sin asignar, solo activos)
      LEFT JOIN (
        SELECT 
          po.instalacion_id,
          COUNT(*) as count
        FROM as_turnos_puestos_operativos po
        WHERE po.es_ppc = true AND po.activo = true
        GROUP BY po.instalacion_id
      ) ppc_totales ON ppc_totales.instalacion_id = i.id
      
      ORDER BY i.nombre
    `);
    
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ Error en GET /api/instalaciones:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener instalaciones' },
      { status: 500 }
    );
  }
}

// Función para asegurar que la tabla instalaciones existe
async function ensureInstalacionesTable() {
  try {
    // Verificar si la tabla ya existe
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'instalaciones'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      // Crear tabla si no existe
      await query(`
        CREATE TABLE instalaciones (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nombre VARCHAR(255) NOT NULL,
          cliente_id UUID NOT NULL,
          direccion TEXT NOT NULL,
          latitud DECIMAL(10, 8),
          longitud DECIMAL(11, 8),
          ciudad VARCHAR(100),
          comuna VARCHAR(100),
          telefono VARCHAR(20),
          valor_turno_extra DECIMAL(10, 2) DEFAULT 0,
          estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      logger.debug('✅ Tabla instalaciones creada');
    } else {
      logger.debug('✅ Tabla instalaciones verificada');
    }
  } catch (error) {
    console.error('❌ Error verificando tabla instalaciones:', error);
    throw error;
  }
}