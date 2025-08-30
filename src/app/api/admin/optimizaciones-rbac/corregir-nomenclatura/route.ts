import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { requirePlatformAdmin } from '@/lib/auth/rbac';

export async function POST(req: NextRequest) {
  try {
    // Verificar permisos de administrador de plataforma
    const authResult = await requirePlatformAdmin(req);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: 'Acceso denegado. Se requieren permisos de Platform Admin.' },
        { status: authResult.status }
      );
    }

    console.log('🔧 Corrigiendo nomenclatura de permisos...');

    // ===============================================
    // 1. IDENTIFICAR PERMISOS CON PROBLEMAS
    // ===============================================
    const permisosProblema = await sql`
      SELECT id, clave 
      FROM permisos 
      WHERE clave LIKE 'pauta_diaria%'
      OR (clave LIKE '%_%' AND clave LIKE '%-%')
      ORDER BY clave
    `;

    console.log(`📊 Permisos con problemas encontrados: ${permisosProblema.rows.length}`);

    let permisosActualizados = 0;
    const errores = [];

    // ===============================================
    // 2. PROCESAR CADA PERMISO INDIVIDUALMENTE
    // ===============================================
    for (const permiso of permisosProblema.rows) {
      try {
        let nuevaClave = permiso.clave;
        
        // Estandarizar pauta_diaria -> pauta-diaria
        if (nuevaClave.includes('pauta_diaria')) {
          nuevaClave = nuevaClave.replace(/pauta_diaria/g, 'pauta-diaria');
        }
        
        // Estandarizar separadores (mantener rbac. y central_monitoring.)
        if (nuevaClave.includes('_') && !nuevaClave.startsWith('rbac.') && !nuevaClave.startsWith('central_monitoring.')) {
          nuevaClave = nuevaClave.replace(/_/g, '-');
        }
        
        // Solo actualizar si la clave cambió
        if (nuevaClave !== permiso.clave) {
          // Verificar que la nueva clave no exista
          const existeNuevaClave = await sql`
            SELECT 1 FROM permisos WHERE clave = ${nuevaClave} AND id != ${permiso.id}
          `;
          
          if (existeNuevaClave.rows.length === 0) {
            await sql`
              UPDATE permisos 
              SET clave = ${nuevaClave}
              WHERE id = ${permiso.id}
            `;
            permisosActualizados++;
            console.log(`   ✅ ${permiso.clave} -> ${nuevaClave}`);
          } else {
            errores.push(`Clave duplicada: ${nuevaClave} (original: ${permiso.clave})`);
            console.log(`   ❌ No se pudo actualizar ${permiso.clave} -> ${nuevaClave} (duplicado)`);
          }
        }
      } catch (error) {
        errores.push(`Error procesando ${permiso.clave}: ${error.message}`);
        console.log(`   ❌ Error procesando ${permiso.clave}: ${error.message}`);
      }
    }

    // ===============================================
    // 3. VERIFICAR RESULTADO
    // ===============================================
    const inconsistenciasRestantes = await sql`
      SELECT COUNT(*) as count
      FROM permisos 
      WHERE (clave LIKE '%_%' AND clave LIKE '%-%')
      OR (clave LIKE 'pauta_diaria%')
    `;

    const totalInconsistencias = inconsistenciasRestantes.rows[0].count;

    console.log(`✅ Permisos actualizados: ${permisosActualizados}`);
    console.log(`⚠️  Errores encontrados: ${errores.length}`);
    console.log(`📊 Inconsistencias restantes: ${totalInconsistencias}`);

    return NextResponse.json({
      success: true,
      message: 'Nomenclatura de permisos corregida',
      data: {
        permisosActualizados,
        errores,
        inconsistenciasRestantes: totalInconsistencias,
        totalProcesados: permisosProblema.rows.length
      }
    });

  } catch (error) {
    console.error('❌ Error corrigiendo nomenclatura:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
