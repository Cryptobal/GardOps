import { query } from '../src/lib/database';

async function probarAlertasOS10() {
  console.log('🧪 Probando alertas de OS10...');
  
  try {
    // 1. Verificar el guardia "A Test Guardia"
    console.log('\n1. Verificando guardia de prueba...');
    const guardiaTestResult = await query(`
      SELECT 
        id,
        nombre,
        apellido_paterno,
        apellido_materno,
        fecha_os10,
        activo,
        (fecha_os10::date - CURRENT_DATE) as dias_restantes
      FROM guardias 
      WHERE nombre LIKE '%Test%' AND apellido_paterno LIKE '%Test%'
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log(`📊 ${guardiaTestResult.rows.length} guardias de prueba encontrados`);
    
    if (guardiaTestResult.rows.length > 0) {
      console.log('\n📋 Guardias de prueba:');
      guardiaTestResult.rows.forEach((guardia: any) => {
        const nombreCompleto = `${guardia.nombre} ${guardia.apellido_paterno} ${guardia.apellido_materno}`.trim();
        const diasRestantes = parseInt(guardia.dias_restantes);
        let estado = '';
        
        if (diasRestantes < 0) {
          estado = `❌ VENCIDO (${Math.abs(diasRestantes)} días)`;
        } else if (diasRestantes === 0) {
          estado = '⚠️ VENCE HOY';
        } else if (diasRestantes <= 7) {
          estado = `🟡 CRÍTICO (${diasRestantes} días)`;
        } else if (diasRestantes <= 30) {
          estado = `🟠 PRÓXIMO (${diasRestantes} días)`;
        } else {
          estado = `✅ VIGENTE (${diasRestantes} días)`;
        }
        
        console.log(`  - ${nombreCompleto}: ${guardia.fecha_os10} - ${estado} - Activo: ${guardia.activo}`);
      });
    }
    
    // 2. Verificar alertas generadas para guardias activos
    console.log('\n2. Verificando alertas de OS10 para guardias activos...');
    const alertasOS10Query = `
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
      WHERE g.fecha_os10 IS NOT NULL
        AND (g.fecha_os10::date - CURRENT_DATE) <= 30
        AND (g.fecha_os10::date - CURRENT_DATE) >= -365
        AND g.activo = true
    `;
    
    const alertasResult = await query(alertasOS10Query);
    console.log(`📊 ${alertasResult.rows.length} alertas de OS10 generadas para guardias activos`);
    
    if (alertasResult.rows.length > 0) {
      console.log('\n📋 Alertas de OS10:');
      alertasResult.rows.forEach((alerta: any) => {
        const diasRestantes = parseInt(alerta.dias_restantes);
        let icono = '';
        
        if (diasRestantes < 0) icono = '❌';
        else if (diasRestantes === 0) icono = '⚠️';
        else if (diasRestantes <= 7) icono = '🟡';
        else if (diasRestantes <= 30) icono = '🟠';
        else icono = '✅';
        
        console.log(`  ${icono} ${alerta.entidad_nombre}: ${alerta.mensaje}`);
      });
    }
    
    // 3. Verificar alertas totales incluyendo todos los módulos
    console.log('\n3. Verificando alertas totales...');
    const alertasTotalesQuery = `
      SELECT 
        'clientes' as modulo,
        COUNT(*) as total
      FROM documentos_clientes dc
      JOIN clientes c ON dc.cliente_id = c.id
      WHERE dc.fecha_vencimiento IS NOT NULL
        AND (dc.fecha_vencimiento::date - CURRENT_DATE) <= 30
        AND (dc.fecha_vencimiento::date - CURRENT_DATE) >= -365
      
      UNION ALL
      
      SELECT 
        'instalaciones' as modulo,
        COUNT(*) as total
      FROM documentos_instalacion di
      JOIN instalaciones i ON di.instalacion_id = i.id
      WHERE di.fecha_vencimiento IS NOT NULL
        AND (di.fecha_vencimiento::date - CURRENT_DATE) <= 30
        AND (di.fecha_vencimiento::date - CURRENT_DATE) >= -365
      
      UNION ALL
      
      SELECT 
        'guardias' as modulo,
        COUNT(*) as total
      FROM documentos_guardias dg
      JOIN guardias g ON dg.guardia_id = g.id
      WHERE dg.fecha_vencimiento IS NOT NULL
        AND (dg.fecha_vencimiento::date - CURRENT_DATE) <= 30
        AND (dg.fecha_vencimiento::date - CURRENT_DATE) >= -365
      
      UNION ALL
      
      SELECT 
        'guardias_os10' as modulo,
        COUNT(*) as total
      FROM guardias g
      WHERE g.fecha_os10 IS NOT NULL
        AND (g.fecha_os10::date - CURRENT_DATE) <= 30
        AND (g.fecha_os10::date - CURRENT_DATE) >= -365
        AND g.activo = true
    `;
    
    const alertasTotalesResult = await query(alertasTotalesQuery);
    console.log('\n📊 Resumen de alertas por módulo:');
    alertasTotalesResult.rows.forEach((row: any) => {
      console.log(`  - ${row.modulo}: ${row.total} alertas`);
    });
    
    console.log('\n✅ Prueba completada');
    
  } catch (error) {
    console.error('❌ Error en prueba:', error);
  }
}

// Ejecutar la prueba
probarAlertasOS10()
  .then(() => {
    console.log('🏁 Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  });
