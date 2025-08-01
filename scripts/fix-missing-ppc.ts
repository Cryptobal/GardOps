import { query } from '../src/lib/database';

async function fixMissingPPC() {
  try {
    console.log('🔧 Arreglando PPC faltante para la instalación "A Test"...\n');

    // Buscar la instalación "A Test"
    const instalacionResult = await query(`
      SELECT id, nombre FROM instalaciones 
      WHERE nombre = 'A Test'
    `);
    
    if (instalacionResult.rows.length === 0) {
      console.log('❌ No se encontró la instalación "A Test"');
      return;
    }
    
    const instalacion = instalacionResult.rows[0];
    console.log(`📋 Instalación: ${instalacion.nombre} (${instalacion.id})`);

    // Buscar el requisito existente
    const requisitoResult = await query(`
      SELECT id, cantidad_guardias FROM as_turnos_requisitos 
      WHERE instalacion_id = $1
    `, [instalacion.id]);

    if (requisitoResult.rows.length === 0) {
      console.log('❌ No se encontró requisito para esta instalación');
      return;
    }

    const requisito = requisitoResult.rows[0];
    console.log(`📋 Requisito encontrado: ${requisito.id} - ${requisito.cantidad_guardias} guardias`);

    // Verificar si ya existe un PPC para este requisito
    const ppcExistente = await query(`
      SELECT id FROM as_turnos_ppc 
      WHERE requisito_puesto_id = $1
    `, [requisito.id]);

    if (ppcExistente.rows.length > 0) {
      console.log('✅ Ya existe un PPC para este requisito');
      return;
    }

    // Crear el PPC faltante
    console.log('🔧 Creando PPC faltante...');
    const ppcResult = await query(`
      INSERT INTO as_turnos_ppc (
        requisito_puesto_id,
        cantidad_faltante,
        motivo,
        prioridad,
        fecha_deteccion,
        estado
      ) VALUES ($1, $2, $3, $4, CURRENT_DATE, 'Pendiente')
      RETURNING id
    `, [requisito.id, requisito.cantidad_guardias, 'falta_asignacion', 'Media']);
    
    console.log(`✅ PPC creado exitosamente: ${ppcResult.rows[0].id}`);

    // Verificar que se creó correctamente
    const ppcVerificado = await query(`
      SELECT 
        ppc.id,
        ppc.cantidad_faltante,
        ppc.estado,
        ppc.motivo,
        rs.nombre as rol_nombre
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      WHERE tr.instalacion_id = $1
    `, [instalacion.id]);

    console.log('\n📊 PPCs después de la corrección:');
    ppcVerificado.rows.forEach((ppc: any, index: number) => {
      console.log(`  PPC ${index + 1}:`);
      console.log(`    ID: ${ppc.id}`);
      console.log(`    Rol: ${ppc.rol_nombre}`);
      console.log(`    Cantidad faltante: ${ppc.cantidad_faltante}`);
      console.log(`    Estado: ${ppc.estado}`);
      console.log(`    Motivo: ${ppc.motivo}`);
    });

    console.log('\n✅ Corrección completada');

  } catch (error) {
    console.error('❌ Error en la corrección:', error);
  }
}

// Ejecutar la corrección
fixMissingPPC().then(() => {
  console.log('🏁 Corrección finalizada');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
}); 