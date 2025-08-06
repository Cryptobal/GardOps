import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Iniciando migración: Agregar columna codigo a planillas_turnos_extras...');

    // 1. Agregar columna codigo si no existe
    console.log('📝 Agregando columna codigo...');
    await sql`
      ALTER TABLE planillas_turnos_extras 
      ADD COLUMN IF NOT EXISTS codigo VARCHAR(20) UNIQUE
    `;

    // 2. Crear índice para búsquedas rápidas
    console.log('📊 Creando índice para codigo...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_planillas_turnos_extras_codigo 
      ON planillas_turnos_extras(codigo)
    `;

    // 3. Actualizar planillas existentes con códigos retroactivos
    console.log('🔄 Generando códigos para planillas existentes...');
    
    // Obtener todas las planillas sin código
    const { rows: planillasSinCodigo } = await sql`
      SELECT id, fecha_generacion 
      FROM planillas_turnos_extras 
      WHERE codigo IS NULL 
      ORDER BY fecha_generacion, id
    `;

    console.log(`📋 Encontradas ${planillasSinCodigo.length} planillas sin código`);

    // Agrupar por año-mes para asignar números secuenciales
    const planillasPorMes = new Map<string, any[]>();
    
    for (const planilla of planillasSinCodigo) {
      const fecha = new Date(planilla.fecha_generacion);
      const yearMonth = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      
      if (!planillasPorMes.has(yearMonth)) {
        planillasPorMes.set(yearMonth, []);
      }
      planillasPorMes.get(yearMonth)!.push(planilla);
    }

    // Actualizar cada planilla con su código
    let totalActualizadas = 0;
    for (const [yearMonth, planillas] of planillasPorMes) {
      const [year, month] = yearMonth.split('-');
      
      for (let i = 0; i < planillas.length; i++) {
        const codigo = `TE-${year}-${month}-${String(i + 1).padStart(4, '0')}`;
        
        await sql`
          UPDATE planillas_turnos_extras 
          SET codigo = ${codigo} 
          WHERE id = ${planillas[i].id}
        `;
        
        totalActualizadas++;
      }
    }

    console.log(`✅ ${totalActualizadas} planillas actualizadas con código`);

    // 4. Verificar la migración
    const { rows: verificacion } = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(codigo) as con_codigo,
        COUNT(*) - COUNT(codigo) as sin_codigo
      FROM planillas_turnos_extras
    `;

    const resultado = {
      success: true,
      mensaje: 'Migración completada exitosamente',
      estadisticas: {
        total_planillas: verificacion[0].total,
        planillas_con_codigo: verificacion[0].con_codigo,
        planillas_sin_codigo: verificacion[0].sin_codigo,
        planillas_actualizadas: totalActualizadas
      },
      ejemplos_codigos: planillasSinCodigo.slice(0, 3).map((p, i) => {
        const fecha = new Date(p.fecha_generacion);
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        return `TE-${year}-${month}-${String(i + 1).padStart(4, '0')}`;
      })
    };

    console.log('✅ Migración completada:', resultado);
    return NextResponse.json(resultado);

  } catch (error) {
    console.error('❌ Error en migración:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error durante la migración',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
