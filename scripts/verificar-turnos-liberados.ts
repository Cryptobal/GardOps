import { query } from '../src/lib/database';

async function verificarTurnosLiberados() {
  try {
    console.log('🔍 Verificando turnos extras liberados...');
    
    // Verificar turnos extras
    const { rows: turnos } = await query(`
      SELECT 
        id, 
        guardia_id, 
        instalacion_id, 
        fecha, 
        estado, 
        valor, 
        pagado, 
        planilla_id,
        fecha_pago,
        observaciones_pago,
        usuario_pago
      FROM te_turnos_extras
      ORDER BY fecha DESC
    `);
    
    console.log('📊 Total de turnos extras:', turnos.length);
    
    if (turnos.length > 0) {
      console.log('📊 Primeros 3 turnos:');
      turnos.slice(0, 3).forEach((turno, index) => {
        console.log(`  ${index + 1}. ID: ${turno.id}`);
        console.log(`     Fecha: ${turno.fecha}`);
        console.log(`     Estado: ${turno.estado}`);
        console.log(`     Valor: $${turno.valor}`);
        console.log(`     Pagado: ${turno.pagado}`);
        console.log(`     Planilla ID: ${turno.planilla_id || 'NULL (liberado)'}`);
        console.log(`     Fecha pago: ${turno.fecha_pago || 'NULL'}`);
        console.log(`     Usuario pago: ${turno.usuario_pago || 'NULL'}`);
        console.log('');
      });
    }
    
    // Contar turnos liberados
    const turnosLiberados = turnos.filter(t => t.planilla_id === null);
    const turnosPagados = turnos.filter(t => t.pagado === true);
    const turnosPendientes = turnos.filter(t => t.pagado === false);
    
    console.log('📊 Estadísticas:');
    console.log(`  - Total turnos: ${turnos.length}`);
    console.log(`  - Turnos liberados (sin planilla): ${turnosLiberados.length}`);
    console.log(`  - Turnos pagados: ${turnosPagados.length}`);
    console.log(`  - Turnos pendientes: ${turnosPendientes.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verificarTurnosLiberados().then(() => {
  console.log('✅ Verificación completada');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
