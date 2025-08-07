import { query } from '../src/lib/database';

async function actualizarFechaOS10Test() {
  console.log('🔧 Actualizando fecha OS10 del guardia de prueba...');
  
  try {
    // Buscar el guardia de prueba
    const guardiaTestResult = await query(`
      SELECT 
        id,
        nombre,
        apellido_paterno,
        apellido_materno,
        fecha_os10
      FROM guardias 
      WHERE nombre LIKE '%Test%' AND apellido_paterno LIKE '%Test%'
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    if (guardiaTestResult.rows.length === 0) {
      console.log('❌ No se encontró guardia de prueba');
      return;
    }
    
    const guardia = guardiaTestResult.rows[0];
    console.log(`📋 Guardia encontrado: ${guardia.nombre} ${guardia.apellido_paterno} ${guardia.apellido_materno}`);
    console.log(`📅 Fecha OS10 actual: ${guardia.fecha_os10}`);
    
    // Establecer fecha OS10 para que venga en 15 días (para que aparezca en alertas)
    const fechaOS10 = new Date();
    fechaOS10.setDate(fechaOS10.getDate() + 15);
    const fechaOS10String = fechaOS10.toISOString().split('T')[0];
    
    console.log(`📅 Nueva fecha OS10: ${fechaOS10String}`);
    
    // Actualizar la fecha OS10
    const updateResult = await query(`
      UPDATE guardias 
      SET 
        fecha_os10 = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [fechaOS10String, guardia.id]);
    
    if (updateResult.rows.length > 0) {
      const guardiaActualizado = updateResult.rows[0];
      console.log('✅ Fecha OS10 actualizada exitosamente');
      console.log(`📅 Nueva fecha: ${guardiaActualizado.fecha_os10}`);
      
      // Verificar que aparezca en las alertas
      const alertasResult = await query(`
        SELECT 
          g.id as documento_id,
          'OS10 - Curso de Seguridad' as documento_nombre,
          g.fecha_os10 as fecha_vencimiento,
          CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', g.apellido_materno) as entidad_nombre,
          g.id as entidad_id,
          'OS10' as tipo_documento_nombre,
          30 as dias_antes_alarma,
          (g.fecha_os10::date - CURRENT_DATE) as dias_restantes,
          CASE 
            WHEN g.fecha_os10::date < CURRENT_DATE THEN 'El curso OS10 ha vencido'
            WHEN g.fecha_os10::date = CURRENT_DATE THEN 'El curso OS10 vence hoy'
            WHEN (g.fecha_os10::date - CURRENT_DATE) = 1 THEN 'El curso OS10 vence mañana'
            ELSE 'El curso OS10 vence en ' || (g.fecha_os10::date - CURRENT_DATE) || ' días'
          END as mensaje,
          'guardias_os10' as modulo
        FROM guardias g
        WHERE g.id = $1
          AND g.fecha_os10 IS NOT NULL
          AND (g.fecha_os10::date - CURRENT_DATE) <= 30
          AND (g.fecha_os10::date - CURRENT_DATE) >= -365
          AND g.activo = true
      `, [guardia.id]);
      
      if (alertasResult.rows.length > 0) {
        console.log('✅ El guardia ahora aparece en las alertas de OS10');
        const alerta = alertasResult.rows[0];
        console.log(`📋 Alerta: ${alerta.entidad_nombre} - ${alerta.mensaje}`);
      } else {
        console.log('❌ El guardia no aparece en las alertas');
      }
    } else {
      console.log('❌ Error al actualizar fecha OS10');
    }
    
  } catch (error) {
    console.error('❌ Error actualizando fecha OS10:', error);
  }
}

// Ejecutar la actualización
actualizarFechaOS10Test()
  .then(() => {
    console.log('🏁 Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  });
