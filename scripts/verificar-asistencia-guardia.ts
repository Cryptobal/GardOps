import { query } from '../src/lib/database';

async function verificarAsistenciaGuardia(guardiaId: string) {
  try {
    console.log(`🔍 Verificando asistencia del guardia ${guardiaId}...`);
    
    // Obtener fecha actual
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = fecha.getMonth() + 1; // getMonth() devuelve 0-11
    const dia = fecha.getDate();
    
    console.log(`📅 Fecha actual: ${anio}-${mes}-${dia}`);
    
    // Consultar asistencia del guardia para hoy
    const resultado = await query(`
      SELECT 
        estado,
        observaciones,
        reemplazo_guardia_id,
        anio,
        mes,
        dia
      FROM as_turnos_pauta_mensual 
      WHERE guardia_id = $1 
        AND anio = $2 
        AND mes = $3 
        AND dia = $4
    `, [guardiaId, anio, mes, dia]);
    
    if (resultado.rows.length > 0) {
      const registro = resultado.rows[0];
      
      console.log('\n✅ Guardia con asistencia registrada hoy:');
      console.log(`Estado: ${registro.estado}`);
      console.log(`Observaciones: ${registro.observaciones || 'Sin observaciones'}`);
      console.log(`Reemplazado por: ${registro.reemplazo_guardia_id || 'null'}`);
      
      return {
        tieneAsistencia: true,
        estado: registro.estado,
        observaciones: registro.observaciones,
        reemplazoGuardiaId: registro.reemplazo_guardia_id
      };
    } else {
      console.log('\n❌ Guardia sin registro de asistencia para hoy');
      
      return {
        tieneAsistencia: false,
        estado: null,
        observaciones: null,
        reemplazoGuardiaId: null
      };
    }
    
  } catch (error) {
    console.error('❌ Error verificando asistencia:', error);
    throw error;
  }
}

// Función para ejecutar el script
async function main() {
  try {
    // ID del guardia a verificar (reemplazar con el ID real)
    const guardiaId = 'REEMPLAZAR_ID_GUARDIA';
    
    if (guardiaId === 'REEMPLAZAR_ID_GUARDIA') {
      console.log('⚠️  Por favor, reemplaza REEMPLAZAR_ID_GUARDIA con el ID real del guardia');
      return;
    }
    
    await verificarAsistenciaGuardia(guardiaId);
    
  } catch (error) {
    console.error('❌ Error en el script:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

export { verificarAsistenciaGuardia };
