import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// Función para validar UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function POST(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'roles_servicio', action: 'create' });
if (deny) return deny;

  try {
    const body = await request.json();
    const { rol_id } = body;

    console.log('🔍 Endpoint verificar-pautas recibió:', { rol_id, body });

    if (!rol_id) {
      console.log('❌ Error: rol_id no proporcionado');
      return NextResponse.json(
        { error: 'Parámetros requeridos: rol_id' },
        { status: 400 }
      );
    }

    console.log('🔍 Validando UUID:', rol_id, 'Es válido:', isValidUUID(rol_id));

    // Validar que el rol_id sea un UUID válido
    if (!isValidUUID(rol_id)) {
      console.log('❌ Error: rol_id no es un UUID válido:', rol_id);
      return NextResponse.json(
        { error: 'ID de rol inválido. Debe ser un UUID válido.' },
        { status: 400 }
      );
    }

    console.log('✅ UUID válido, procediendo con la consulta...');

    // Verificar si el rol existe
    const rolResult = await query(`
      SELECT id, nombre, estado FROM as_turnos_roles_servicio WHERE id = $1
    `, [rol_id]);
    
    console.log('🔍 Resultado de consulta de rol:', rolResult.rows.length, 'filas encontradas');
    
    if (rolResult.rows.length === 0) {
      console.log('❌ Rol no encontrado en la base de datos');
      return NextResponse.json({
        tiene_pautas: false,
        mensaje: 'Rol de servicio no encontrado',
        pautas_count: 0,
        puede_editar: false
      });
    }

    const rol = rolResult.rows[0];
    console.log('✅ Rol encontrado:', rol);

    // Verificar si hay pautas mensuales asociadas a este rol
    const pautasResult = await query(`
      SELECT COUNT(*) as count
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE po.rol_id = $1
    `, [rol_id]);

    const pautasCount = parseInt(pautasResult.rows[0].count);
    const tienePautas = pautasCount > 0;
    const puedeEditar = !tienePautas;

    console.log('🔍 Pautas encontradas:', pautasCount, 'Tiene pautas:', tienePautas);

    // Si tiene pautas, obtener información adicional
    let pautasInfo = null;
    if (tienePautas) {
      const pautasDetalleResult = await query(`
        SELECT 
          pm.anio,
          pm.mes,
          COUNT(*) as dias_asignados,
          i.nombre as instalacion_nombre
        FROM as_turnos_pauta_mensual pm
        INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
        INNER JOIN instalaciones i ON po.instalacion_id = i.id
        WHERE po.rol_id = $1
        GROUP BY pm.anio, pm.mes, i.nombre
        ORDER BY pm.anio DESC, pm.mes DESC
        LIMIT 5
      `, [rol_id]);

      pautasInfo = pautasDetalleResult.rows;
      console.log('🔍 Información detallada de pautas:', pautasInfo);
    }

    const response = {
      tiene_pautas: tienePautas,
      pautas_count: pautasCount,
      puede_editar: puedeEditar,
      rol_nombre: rol.nombre,
      rol_estado: rol.estado,
      mensaje: tienePautas 
        ? `El rol "${rol.nombre}" tiene ${pautasCount} días asignados en pautas mensuales. No se puede editar para evitar inconsistencias.`
        : `El rol "${rol.nombre}" no tiene pautas mensuales asignadas. Se puede editar sin problemas.`,
      pautas_info: pautasInfo
    };

    console.log('✅ Respuesta final:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error verificando pautas del rol:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al verificar pautas del rol' },
      { status: 500 }
    );
  }
}
