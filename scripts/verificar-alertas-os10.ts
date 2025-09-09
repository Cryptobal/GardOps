import { query } from '../src/lib/database';

async function verificarAlertasOS10() {
  console.log('🔍 Verificando alertas de OS10...');
  
  try {
    // 1. Verificar si existe el campo fecha_os10 en la tabla guardias
    console.log('\n1. Verificando estructura de tabla guardias...');
    const estructuraResult = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'guardias' 
      AND column_name = 'fecha_os10'
    `);
    
    if (estructuraResult.rows.length === 0) {
      console.log('❌ Campo fecha_os10 no existe en tabla guardias');
      console.log('🔧 Agregando campo fecha_os10...');
      
      await query(`
        ALTER TABLE guardias 
        ADD COLUMN fecha_os10 DATE
      `);
      
      console.log('✅ Campo fecha_os10 agregado exitosamente');
    } else {
      console.log('✅ Campo fecha_os10 existe');
      console.log('📊 Tipo:', estructuraResult.rows[0].data_type);
      console.log('📊 Nullable:', estructuraResult.rows[0].is_nullable);
    }
    
    // 2. Verificar guardias con fecha_os10
    console.log('\n2. Verificando guardias con fecha_os10...');
    const guardiasOS10Result = await query(`
      SELECT 
        id,
        nombre,
        apellido_paterno,
        apellido_materno,
        fecha_os10,
        (fecha_os10::date - CURRENT_DATE) as dias_restantes
      FROM guardias 
      WHERE fecha_os10 IS NOT NULL
      ORDER BY fecha_os10
    `);
    
    console.log(`📊 ${guardiasOS10Result.rows.length} guardias tienen fecha_os10`);
    
    if (guardiasOS10Result.rows.length > 0) {
      console.log('\n📋 Guardias con OS10:');
      guardiasOS10Result.rows.forEach((guardia: any) => {
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
        
        console.log(`  - ${nombreCompleto}: ${guardia.fecha_os10} - ${estado}`);
      });
    }
    
    // 3. Verificar alertas generadas
    console.log('\n3. Verificando alertas generadas...');
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
    `;
    
    const alertasResult = await query(alertasOS10Query);
    console.log(`📊 ${alertasResult.rows.length} alertas de OS10 generadas`);
    
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
    
    // 4. Verificar guardias sin fecha_os10
    console.log('\n4. Verificando guardias sin fecha_os10...');
    const guardiasSinOS10Result = await query(`
      SELECT 
        id,
        nombre,
        apellido_paterno,
        apellido_materno
      FROM guardias 
      WHERE fecha_os10 IS NULL
      ORDER BY nombre
    `);
    
    console.log(`📊 ${guardiasSinOS10Result.rows.length} guardias sin fecha_os10`);
    
    if (guardiasSinOS10Result.rows.length > 0) {
      console.log('\n📋 Guardias sin OS10:');
      guardiasSinOS10Result.rows.slice(0, 10).forEach((guardia: any) => {
        const nombreCompleto = `${guardia.nombre} ${guardia.apellido_paterno} ${guardia.apellido_materno}`.trim();
        console.log(`  - ${nombreCompleto}`);
      });
      
      if (guardiasSinOS10Result.rows.length > 10) {
        console.log(`  ... y ${guardiasSinOS10Result.rows.length - 10} más`);
      }
    }
    
    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error en verificación:', error);
  }
}

// Ejecutar la verificación
verificarAlertasOS10()
  .then(() => {
    console.log('🏁 Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  });
