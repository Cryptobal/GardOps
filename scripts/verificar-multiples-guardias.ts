import { verificarAsistenciaGuardia } from './verificar-asistencia-guardia';
import { query } from '../src/lib/database';

async function verificarMultiplesGuardias() {
  try {
    console.log('👥 Verificando asistencia de múltiples guardias...\n');
    
    // Obtener fecha actual
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = fecha.getMonth() + 1;
    const dia = fecha.getDate();
    
    console.log(`📅 Fecha de verificación: ${anio}-${mes}-${dia}\n`);
    
    // Obtener todos los guardias con asistencia registrada para hoy
    const resultado = await query(`
      SELECT DISTINCT
        pm.guardia_id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        pm.estado,
        pm.observaciones,
        pm.reemplazo_guardia_id,
        po.nombre_puesto,
        i.nombre as instalacion_nombre
      FROM as_turnos_pauta_mensual pm
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      LEFT JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      LEFT JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE pm.anio = $1 
        AND pm.mes = $2 
        AND pm.dia = $3
      ORDER BY g.nombre, g.apellido_paterno
    `, [anio, mes, dia]);
    
    if (resultado.rows.length === 0) {
      console.log('❌ No hay guardias con asistencia registrada para hoy');
      return;
    }
    
    console.log(`✅ Se encontraron ${resultado.rows.length} guardias con asistencia registrada:\n`);
    
    let contador = 0;
    for (const registro of resultado.rows) {
      contador++;
      const nombreCompleto = `${registro.nombre} ${registro.apellido_paterno} ${registro.apellido_materno || ''}`.trim();
      
      console.log(`${contador}. ${nombreCompleto}`);
      console.log(`   ID: ${registro.guardia_id}`);
      console.log(`   Estado: ${registro.estado}`);
      console.log(`   Observaciones: ${registro.observaciones || 'Sin observaciones'}`);
      console.log(`   Reemplazado por: ${registro.reemplazo_guardia_id || 'Ninguno'}`);
      console.log(`   Puesto: ${registro.nombre_puesto || 'No especificado'}`);
      console.log(`   Instalación: ${registro.instalacion_nombre || 'No especificada'}`);
      console.log('');
    }
    
    // Estadísticas
    const estados = resultado.rows.reduce((acc: any, row: any) => {
      acc[row.estado] = (acc[row.estado] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📊 Estadísticas por estado:');
    Object.entries(estados).forEach(([estado, cantidad]) => {
      console.log(`   - ${estado}: ${cantidad} guardias`);
    });
    
    console.log(`\n✅ Verificación completada para ${resultado.rows.length} guardias`);
    
  } catch (error) {
    console.error('❌ Error verificando múltiples guardias:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  verificarMultiplesGuardias();
}

export { verificarMultiplesGuardias };
