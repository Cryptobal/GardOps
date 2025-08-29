import { query } from '../src/lib/database';

async function testGuardiasDisponibles() {
  try {
    console.log('🔍 Probando endpoint de guardias disponibles...');
    
    // Obtener una instalación de prueba
    const instalacionResult = await query(`
      SELECT id, nombre FROM instalaciones LIMIT 1
    `);
    
    if (instalacionResult.rows.length === 0) {
      console.log('❌ No hay instalaciones activas para probar');
      return;
    }
    
    const instalacion = instalacionResult.rows[0];
    console.log(`📍 Usando instalación: ${instalacion.nombre} (${instalacion.id})`);
    
    // Verificar guardias asignados en esta instalación
    const asignadosResult = await query(`
      SELECT DISTINCT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        g.rut
      FROM guardias g
      JOIN as_turnos_puestos_operativos po ON g.id = po.guardia_id
      WHERE po.instalacion_id = $1 
        AND po.es_ppc = false 
        AND po.activo = true
      ORDER BY g.apellido_paterno, g.apellido_materno, g.nombre
    `, [instalacion.id]);
    
    console.log(`\n🔒 Guardias asignados en ${instalacion.nombre}:`);
    asignadosResult.rows.forEach((guardia, index) => {
      console.log(`   ${index + 1}. ${guardia.apellido_paterno} ${guardia.apellido_materno}, ${guardia.nombre} - ${guardia.rut}`);
    });
    
    // Probar la consulta de guardias disponibles
    const disponiblesResult = await query(`
      SELECT DISTINCT
        g.id, 
        g.nombre, 
        g.apellido_paterno, 
        g.apellido_materno,
        g.rut,
        CASE WHEN po_asignacion.id IS NOT NULL THEN true ELSE false END as tiene_asignacion_activa
      FROM guardias g
      LEFT JOIN as_turnos_puestos_operativos po_asignacion ON g.id = po_asignacion.guardia_id 
        AND po_asignacion.es_ppc = false 
        AND po_asignacion.activo = true
      WHERE g.activo = true
        AND g.id NOT IN (
          SELECT DISTINCT guardia_id 
          FROM as_turnos_puestos_operativos 
          WHERE instalacion_id = $1
            AND guardia_id IS NOT NULL 
            AND es_ppc = false 
            AND activo = true
        )
      ORDER BY g.apellido_paterno ASC, g.apellido_materno ASC, g.nombre ASC
      LIMIT 10
    `, [instalacion.id]);
    
    console.log(`\n✅ Guardias disponibles para ${instalacion.nombre}:`);
    disponiblesResult.rows.forEach((guardia, index) => {
      const nombreCompleto = `${guardia.apellido_paterno || ''} ${guardia.apellido_materno || ''}, ${guardia.nombre || ''} - ${guardia.rut || 'Sin RUT'}`.trim();
      console.log(`   ${index + 1}. ${nombreCompleto} (Asignación activa: ${guardia.tiene_asignacion_activa})`);
    });
    
    console.log(`\n📊 Resumen:`);
    console.log(`   Total guardias asignados: ${asignadosResult.rows.length}`);
    console.log(`   Total guardias disponibles: ${disponiblesResult.rows.length}`);
    
    // Verificar que no hay duplicados
    const asignadosIds = asignadosResult.rows.map(g => g.id);
    const disponiblesIds = disponiblesResult.rows.map(g => g.id);
    const duplicados = asignadosIds.filter(id => disponiblesIds.includes(id));
    
    if (duplicados.length > 0) {
      console.log(`❌ ERROR: Hay ${duplicados.length} guardias que aparecen tanto asignados como disponibles`);
    } else {
      console.log(`✅ CORRECTO: No hay guardias duplicados`);
    }

  } catch (error) {
    console.error('❌ Error probando guardias disponibles:', error);
  }
}

testGuardiasDisponibles();
