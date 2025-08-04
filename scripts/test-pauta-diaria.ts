import { query } from '../src/lib/database';

async function testPautaDiaria() {
  try {
    console.log('🧪 Probando consulta de pauta diaria...');
    
    // Extraer año, mes y día de la fecha
    const fecha = '2025-08-04';
    const fechaObj = new Date(fecha + 'T00:00:00.000Z');
    const anio = fechaObj.getUTCFullYear();
    const mes = fechaObj.getUTCMonth() + 1;
    const dia = fechaObj.getUTCDate();

    console.log(`📅 Fecha: ${fecha} (${anio}-${mes}-${dia})`);

    // Primero verificar si la tabla existe
    console.log('🔍 Verificando si la tabla existe...');
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'as_turnos_pauta_mensual'
      );
    `);
    
    console.log('Tabla existe:', tableExists.rows[0].exists);

    if (!tableExists.rows[0].exists) {
      console.log('❌ La tabla as_turnos_pauta_mensual no existe');
      return;
    }

    // Verificar la estructura de la tabla
    console.log('🔍 Verificando estructura de la tabla...');
    const structure = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_pauta_mensual'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Estructura de la tabla:');
    structure.rows.forEach((column: any) => {
      console.log(`  - ${column.column_name}: ${column.data_type} ${column.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });

    // Verificar si hay datos
    console.log('🔍 Verificando si hay datos...');
    const countData = await query(`
      SELECT COUNT(*) as count FROM as_turnos_pauta_mensual
    `);
    
    console.log('Total de registros:', countData.rows[0].count);

    // Probar la consulta completa
    console.log('🔍 Probando consulta completa...');
    const pautaDiaria = await query(`
      SELECT 
        pm.id,
        pm.puesto_id,
        pm.guardia_id,
        pm.anio,
        pm.mes,
        pm.dia,
        pm.estado,
        pm.observaciones,
        
        -- Datos de la instalación
        i.id as instalacion_id,
        i.nombre as instalacion_nombre,
        i.valor_turno_extra,
        
        -- Datos del puesto
        po.nombre_puesto,
        po.es_ppc,
        
        -- Datos del guardia asignado
        g.nombre as guardia_nombre,
        g.apellido_paterno as guardia_apellido_paterno,
        g.apellido_materno as guardia_apellido_materno,
        
        -- Datos del rol para el turno
        rs.nombre as rol_nombre,
        rs.hora_inicio,
        rs.hora_termino
        
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      
      WHERE pm.anio = $1 AND pm.mes = $2 AND pm.dia = $3
        AND po.activo = true
      
      ORDER BY i.nombre, po.nombre_puesto
    `, [anio, mes, dia]);

    console.log(`✅ Consulta exitosa. Registros encontrados: ${pautaDiaria.rows.length}`);
    
    if (pautaDiaria.rows.length > 0) {
      console.log('📋 Primer registro:');
      console.log(JSON.stringify(pautaDiaria.rows[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Error en la consulta:', error);
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testPautaDiaria()
    .then(() => {
      console.log('✅ Test completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { testPautaDiaria }; 