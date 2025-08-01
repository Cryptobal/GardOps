import { query } from '../src/lib/database';

async function debugInstalacionTest() {
  try {
    console.log('🔍 Debuggeando instalación "A Test"...\n');

    // Buscar la instalación "A Test"
    const instalacionResult = await query(`
      SELECT id, nombre, estado FROM instalaciones 
      WHERE nombre = 'A Test'
    `);
    
    if (instalacionResult.rows.length === 0) {
      console.log('❌ No se encontró la instalación "A Test"');
      return;
    }
    
    const instalacion = instalacionResult.rows[0];
    console.log(`📋 Instalación encontrada: ${instalacion.nombre} (${instalacion.id}) - Estado: ${instalacion.estado}`);

    // Verificar turnos de esta instalación
    console.log('\n1️⃣ Verificando turnos de la instalación...');
    const turnosResult = await query(`
      SELECT 
        tc.id,
        tc.cantidad_guardias,
        tc.estado,
        rs.nombre as rol_nombre,
        rs.id as rol_id
      FROM as_turnos_configuracion tc
      INNER JOIN as_turnos_roles_servicio rs ON tc.rol_servicio_id = rs.id
      WHERE tc.instalacion_id = $1
    `, [instalacion.id]);

    console.log(`📊 Turnos encontrados: ${turnosResult.rows.length}`);
    turnosResult.rows.forEach((turno: any, index: number) => {
      console.log(`  Turno ${index + 1}:`);
      console.log(`    ID: ${turno.id}`);
      console.log(`    Rol: ${turno.rol_nombre}`);
      console.log(`    Cantidad guardias: ${turno.cantidad_guardias}`);
      console.log(`    Estado: ${turno.estado}`);
    });

    // Verificar requisitos de esta instalación
    console.log('\n2️⃣ Verificando requisitos de la instalación...');
    const requisitosResult = await query(`
      SELECT 
        tr.id,
        tr.cantidad_guardias,
        tr.estado,
        rs.nombre as rol_nombre
      FROM as_turnos_requisitos tr
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      WHERE tr.instalacion_id = $1
    `, [instalacion.id]);

    console.log(`📊 Requisitos encontrados: ${requisitosResult.rows.length}`);
    requisitosResult.rows.forEach((requisito: any, index: number) => {
      console.log(`  Requisito ${index + 1}:`);
      console.log(`    ID: ${requisito.id}`);
      console.log(`    Rol: ${requisito.rol_nombre}`);
      console.log(`    Cantidad guardias: ${requisito.cantidad_guardias}`);
      console.log(`    Estado: ${requisito.estado}`);
    });

    // Verificar PPCs de esta instalación
    console.log('\n3️⃣ Verificando PPCs de la instalación...');
    const ppcsResult = await query(`
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

    console.log(`📊 PPCs encontrados: ${ppcsResult.rows.length}`);
    ppcsResult.rows.forEach((ppc: any, index: number) => {
      console.log(`  PPC ${index + 1}:`);
      console.log(`    ID: ${ppc.id}`);
      console.log(`    Rol: ${ppc.rol_nombre}`);
      console.log(`    Cantidad faltante: ${ppc.cantidad_faltante}`);
      console.log(`    Estado: ${ppc.estado}`);
      console.log(`    Motivo: ${ppc.motivo}`);
    });

    // Si no hay PPCs, crear uno manualmente para el requisito existente
    if (ppcsResult.rows.length === 0 && requisitosResult.rows.length > 0) {
      console.log('\n⚠️ No hay PPCs pero sí hay requisitos. Creando PPC manualmente...');
      
      const requisito = requisitosResult.rows[0];
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
      `, [requisito.id, requisito.cantidad_guardias, 'Falta asignación de guardias', 'Media']);
      
      console.log(`✅ PPC creado manualmente: ${ppcResult.rows[0].id}`);
    }

    console.log('\n✅ Debug completado');

  } catch (error) {
    console.error('❌ Error en el debug:', error);
  }
}

// Ejecutar el debug
debugInstalacionTest().then(() => {
  console.log('🏁 Debug finalizado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
}); 