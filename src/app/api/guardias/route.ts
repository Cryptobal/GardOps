import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

// GET /api/guardias - Obtener todos los guardias del tenant con información básica
export async function GET(request: NextRequest) {
  console.log('🔍 API Guardias - Iniciando request');
  
  try {
    // Por ahora usar un tenant_id fijo para testing
    const tenantId = 'accebf8a-bacc-41fa-9601-ed39cb320a52';
    
    console.log('✅ API Guardias - Usando tenant:', tenantId);

    // Query simplificada sin la vista de roles actuales
    const result = await query(`
      SELECT 
        g.id,
        g.tenant_id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        g.rut,
        g.email,
        g.telefono,
        g.sexo,
        g.activo,
        g.direccion,
        g.comuna,
        g.ciudad,
        g.nacionalidad,
        g.fecha_os10,
        g.latitud,
        g.longitud,
        g.instalacion_id,
        g.created_at,
        g.updated_at,
        -- Información de instalación
        i.nombre as instalacion_nombre,
        c.nombre as cliente_nombre
      FROM guardias g
      LEFT JOIN instalaciones i ON g.instalacion_id = i.id
      LEFT JOIN clientes c ON i.cliente_id = c.id
      WHERE g.tenant_id = $1
      ORDER BY g.apellido_paterno, g.apellido_materno, g.nombre
    `, [tenantId]);

    const guardias = result.rows.map((row: any) => {
      // Calcular alerta OS10
      let alertaOS10 = {
        dias_restantes: null as number | null,
        tiene_alerta: false,
        estado: 'sin_fecha' as 'sin_fecha' | 'vencido' | 'alerta' | 'vigente'
      };

      if (row.fecha_os10) {
        const fechaOS10 = new Date(row.fecha_os10);
        const hoy = new Date();
        const diasRestantes = Math.ceil((fechaOS10.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        
        alertaOS10.dias_restantes = diasRestantes;
        
        if (diasRestantes < 0) {
          alertaOS10.estado = 'vencido';
          alertaOS10.tiene_alerta = true;
        } else if (diasRestantes <= 30) {
          alertaOS10.estado = 'alerta';
          alertaOS10.tiene_alerta = true;
        } else {
          alertaOS10.estado = 'vigente';
          alertaOS10.tiene_alerta = false;
        }
      }

      return {
        id: row.id,
        tenant_id: row.tenant_id,
        nombre: row.nombre,
        apellido_paterno: row.apellido_paterno,
        apellido_materno: row.apellido_materno,
        nombre_completo: `${row.nombre} ${row.apellido_paterno} ${row.apellido_materno || ''}`.trim(),
        rut: row.rut,
        email: row.email,
        telefono: row.telefono,
        sexo: row.sexo,
        activo: row.activo,
        direccion: row.direccion,
        comuna: row.comuna,
        ciudad: row.ciudad,
        nacionalidad: row.nacionalidad,
        fecha_os10: row.fecha_os10,
        latitud: row.latitud,
        longitud: row.longitud,
        instalacion_id: row.instalacion_id,
        instalacion_nombre: row.instalacion_nombre,
        cliente_nombre: row.cliente_nombre,
        created_at: row.created_at,
        updated_at: row.updated_at,
        // Información del rol actual (placeholder por ahora)
        rol_actual: {
          nombre: 'Sin asignar',
          turno: '',
          horario_inicio: '',
          horario_fin: '',
          dias_trabajo: ''
        },
        alerta_os10: alertaOS10
      };
    });

    console.log(`✅ Guardias cargados desde Neon: ${guardias.length}`);

    return NextResponse.json({
      guardias,
      total: guardias.length,
      success: true
    });

  } catch (error) {
    console.error('❌ Error en API Guardias:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/guardias - Crear nuevo guardia (temporalmente deshabilitado)
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Función temporalmente deshabilitada' },
    { status: 501 }
  );
} 