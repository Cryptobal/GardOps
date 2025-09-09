import { query } from '../src/lib/database';

async function testEliminarPlanilla() {
  try {
    console.log('🔍 Verificando planillas existentes...');
    
    // Verificar planillas existentes
    const { rows: planillas } = await query(`
      SELECT id, codigo, estado, cantidad_turnos, monto_total 
      FROM te_planillas_turnos_extras
    `);
    
    console.log('📊 Planillas encontradas:', planillas);
    
    if (planillas.length === 0) {
      console.log('❌ No hay planillas para eliminar');
      return;
    }
    
    const planilla = planillas[0];
    console.log('🔍 Planilla a eliminar:', planilla);
    
    // Verificar turnos asociados
    const { rows: turnos } = await query(`
      SELECT id, guardia_id, instalacion_id, fecha, estado, valor, pagado, planilla_id
      FROM te_turnos_extras 
      WHERE planilla_id = $1
    `, [planilla.id]);
    
    console.log('📊 Turnos asociados:', turnos);
    
    // Simular eliminación
    console.log('🔄 Iniciando eliminación...');
    
    // Iniciar transacción
    await query('BEGIN');
    
    try {
      // Liberar los turnos
      if (turnos.length > 0) {
        await query(
          'UPDATE te_turnos_extras SET planilla_id = NULL, pagado = FALSE, fecha_pago = NULL, observaciones_pago = NULL, usuario_pago = NULL WHERE planilla_id = $1',
          [planilla.id]
        );
        console.log('✅ Turnos liberados');
      }
      
      // Eliminar la planilla
      await query(
        'DELETE FROM te_planillas_turnos_extras WHERE id = $1',
        [planilla.id]
      );
      console.log('✅ Planilla eliminada');
      
      await query('COMMIT');
      
      console.log('✅ Eliminación completada exitosamente');
      console.log(`📊 Planilla ${planilla.codigo} eliminada`);
      console.log(`📊 ${turnos.length} turnos liberados`);
      
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testEliminarPlanilla().then(() => {
  console.log('✅ Test completado');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
