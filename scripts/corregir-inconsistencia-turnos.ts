import { query } from '../src/lib/database';

async function corregirInconsistenciaTurnos() {
  const instalacionId = '15631bd6-03a9-459d-ae60-fc480f7f3e84';
  
  try {
    console.log('🔍 Analizando inconsistencia en turnos...');
    
    // 1. Obtener configuración actual
    const configResult = await query(`
      SELECT * FROM as_turnos_configuracion 
      WHERE instalacion_id = $1
    `, [instalacionId]);
    
    if (configResult.rows.length === 0) {
      console.log('❌ No se encontró configuración de turnos');
      return;
    }
    
    const config = configResult.rows[0];
    console.log(`📊 Configuración actual: ${config.cantidad_guardias} guardias configurados`);
    
    // 2. Contar requisitos existentes
    const requisitosResult = await query(`
      SELECT COUNT(*) as total FROM as_turnos_requisitos 
      WHERE instalacion_id = $1
    `, [instalacionId]);
    
    const requisitosExistentes = parseInt(requisitosResult.rows[0].total);
    console.log(`📋 Requisitos existentes: ${requisitosExistentes}`);
    
    // 3. Calcular cuántos requisitos faltan
    const requisitosFaltantes = config.cantidad_guardias - requisitosExistentes;
    console.log(`⚠️ Requisitos faltantes: ${requisitosFaltantes}`);
    
    if (requisitosFaltantes <= 0) {
      console.log('✅ No hay inconsistencia que corregir');
      return;
    }
    
    // 4. Obtener un requisito existente como plantilla
    const requisitoPlantilla = await query(`
      SELECT * FROM as_turnos_requisitos 
      WHERE instalacion_id = $1 
      LIMIT 1
    `, [instalacionId]);
    
    if (requisitoPlantilla.rows.length === 0) {
      console.log('❌ No hay requisitos existentes para usar como plantilla');
      return;
    }
    
    const plantilla = requisitoPlantilla.rows[0];
    console.log(`📝 Usando requisito como plantilla: ${plantilla.id}`);
    
    // 5. Crear los requisitos faltantes
    console.log(`🔄 Creando ${requisitosFaltantes} requisitos faltantes...`);
    
    for (let i = 0; i < requisitosFaltantes; i++) {
      await query(`
        INSERT INTO as_turnos_requisitos (
          instalacion_id, 
          rol_servicio_id, 
          cantidad_guardias, 
          vigente_desde, 
          estado
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        plantilla.instalacion_id,
        plantilla.rol_servicio_id,
        1, // 1 guardia por requisito
        plantilla.vigente_desde,
        'Activo'
      ]);
      
      console.log(`✅ Requisito ${i + 1}/${requisitosFaltantes} creado`);
    }
    
    // 6. Verificar el resultado
    const requisitosFinales = await query(`
      SELECT COUNT(*) as total FROM as_turnos_requisitos 
      WHERE instalacion_id = $1
    `, [instalacionId]);
    
    console.log(`📊 Total de requisitos después de la corrección: ${requisitosFinales.rows[0].total}`);
    
    // 7. Verificar PPCs
    const ppcsResult = await query(`
      SELECT ppc.*, tr.instalacion_id 
      FROM as_turnos_ppc ppc 
      JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id 
      WHERE tr.instalacion_id = $1
    `, [instalacionId]);
    
    console.log(`📋 PPCs existentes: ${ppcsResult.rows.length}`);
    ppcsResult.rows.forEach((ppc: any, index: number) => {
      console.log(`  ${index + 1}. PPC ${ppc.id} - Estado: ${ppc.estado} - Cantidad: ${ppc.cantidad_faltante}`);
    });
    
    console.log('✅ Corrección completada');
    
  } catch (error) {
    console.error('❌ Error corrigiendo inconsistencia:', error);
  }
}

// Ejecutar el script
corregirInconsistenciaTurnos()
  .then(() => {
    console.log('🏁 Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  }); 