import { query } from '../src/lib/database';

async function testEndpointPauta() {
  try {
    console.log('🧪 Probando endpoint de crear pauta mensual...\n');

    // 1. Buscar la instalación "A Test"
    console.log('1. Buscando instalación "A Test"...');
    const instalacionResult = await query(`
      SELECT id, nombre, estado FROM instalaciones 
      WHERE nombre ILIKE '%A Test%'
    `);
    
    if (instalacionResult.rows.length === 0) {
      console.log('❌ No se encontró la instalación "A Test"');
      return;
    }
    
    const instalacion = instalacionResult.rows[0];
    console.log(`✅ Instalación encontrada: ${instalacion.nombre} (${instalacion.id})`);

    // 2. Eliminar pauta existente si existe
    console.log('\n2. Eliminando pauta existente si existe...');
    await query(`
      DELETE FROM as_turnos_pauta_mensual pm
      WHERE pm.puesto_id IN (
        SELECT po.id 
        FROM as_turnos_puestos_operativos po 
        WHERE po.instalacion_id = $1
      ) AND pm.anio = $2 AND pm.mes = $3
    `, [instalacion.id, 2025, 8]);

    console.log('✅ Pauta existente eliminada');

    // 3. Simular la lógica del endpoint
    console.log('\n3. Ejecutando lógica del endpoint...');
    
    const anio = 2025;
    const mes = 8;
    
    // Verificar puestos operativos
    const puestosResult = await query(`
      SELECT 
        po.id as puesto_id,
        po.nombre_puesto,
        po.guardia_id,
        po.es_ppc,
        po.activo,
        rs.nombre as rol_nombre,
        rs.nombre as patron_turno,
        g.nombre as guardia_nombre,
        g.apellido_paterno,
        g.apellido_materno
      FROM as_turnos_puestos_operativos po
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      WHERE po.instalacion_id = $1 
        AND po.activo = true
      ORDER BY po.nombre_puesto
    `, [instalacion.id]);

    console.log(`📊 Puestos encontrados: ${puestosResult.rows.length}`);
    
    // Generar días del mes
    const diasDelMes = Array.from(
      { length: new Date(anio, mes, 0).getDate() }, 
      (_, i) => i + 1
    );

    console.log(`📅 Días del mes: ${diasDelMes.length}`);

    // Crear pauta base para cada puesto operativo
    const pautasParaInsertar = [];
    
    for (const puesto of puestosResult.rows) {
      console.log(`\n🔄 Procesando puesto: ${puesto.nombre_puesto} (PPC: ${puesto.es_ppc})`);
      
      // Solo crear pauta para puestos que tengan guardia asignado o sean PPCs
      if (puesto.guardia_id || puesto.es_ppc) {
        console.log(`   ✅ Procesando puesto: ${puesto.nombre_puesto} (PPC: ${puesto.es_ppc})`);
        
        for (const dia of diasDelMes) {
          // Aplicar patrón de turno automáticamente
          let estado = '';
          
          if (puesto.guardia_id && puesto.patron_turno) {
            // Aplicar lógica de patrón de turno
            estado = aplicarPatronTurno(puesto.patron_turno, dia, anio, mes);
          }
          
          // Para PPCs sin guardia asignada, establecer estado como 'libre' por defecto
          if (puesto.es_ppc && !puesto.guardia_id) {
            estado = 'libre';
          }
          
          // Solo insertar si el estado no está vacío
          if (estado) {
            pautasParaInsertar.push({
              puesto_id: puesto.puesto_id,
              guardia_id: puesto.guardia_id || puesto.puesto_id, // Para PPCs, usar el puesto_id como guardia_id
              dia: parseInt(dia.toString()),
              estado: estado
            });
          }
        }
      } else {
        console.log(`   ❌ Omitiendo puesto: ${puesto.nombre_puesto} (sin guardia y no es PPC)`);
      }
    }

    console.log(`\n📊 Resumen de pautas a crear:`);
    console.log(`   - Total registros: ${pautasParaInsertar.length}`);
    console.log(`   - Puestos procesados: ${puestosResult.rows.filter((p: any) => p.guardia_id || p.es_ppc).length}`);
    console.log(`   - Puestos omitidos: ${puestosResult.rows.filter((p: any) => !p.guardia_id && !p.es_ppc).length}`);

    // 4. Insertar todas las pautas
    console.log('\n4. Insertando pautas en la base de datos...');
    const insertPromises = pautasParaInsertar.map(pauta => 
      query(`
        INSERT INTO as_turnos_pauta_mensual (puesto_id, guardia_id, anio, mes, dia, estado)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [pauta.puesto_id, pauta.guardia_id, anio, mes, pauta.dia, pauta.estado])
    );

    await Promise.all(insertPromises);

    console.log(`✅ Pauta mensual creada automáticamente para instalación ${instalacion.id} en ${mes}/${anio}`);
    console.log(`📊 Resumen: ${pautasParaInsertar.length} registros creados para ${puestosResult.rows.length} puestos`);
    console.log(`🔍 Puestos con guardia: ${puestosResult.rows.filter((p: any) => p.guardia_id).length}, PPCs: ${puestosResult.rows.filter((p: any) => p.es_ppc).length}`);

    // 5. Verificar que se insertaron correctamente
    console.log('\n5. Verificando inserción...');
    const verificacionResult = await query(`
      SELECT 
        COUNT(*) as total_registros,
        COUNT(DISTINCT pm.puesto_id) as puestos_unicos,
        COUNT(DISTINCT pm.guardia_id) as guardias_unicas
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE po.instalacion_id = $1 
        AND pm.anio = $2 
        AND pm.mes = $3
    `, [instalacion.id, anio, mes]);

    const verificacion = verificacionResult.rows[0];
    console.log(`   - Total registros insertados: ${verificacion.total_registros}`);
    console.log(`   - Puestos únicos: ${verificacion.puestos_unicos}`);
    console.log(`   - Guardias únicas: ${verificacion.guardias_unicas}`);

    console.log('\n✅ Prueba del endpoint completada exitosamente');

  } catch (error) {
    console.error('❌ Error en la prueba del endpoint:', error);
  } finally {
    process.exit(0);
  }
}

// Función para aplicar patrón de turno automáticamente
function aplicarPatronTurno(rolCompleto: string, dia: number, anio: number, mes: number): string {
  const fecha = new Date(anio, mes - 1, dia);
  const diaSemana = fecha.getDay(); // 0 = Domingo, 1 = Lunes, etc.
  
  // Extraer el patrón del rol completo (ej: "Día 4x4x12 / 08:00 20:00" -> "4x4")
  const patronMatch = rolCompleto.match(/(\d+x\d+)/);
  const patron = patronMatch ? patronMatch[1] : '';
  
  // Patrón 4x4 (4 días trabajando, 4 días libres)
  if (patron === '4x4') {
    const diaDelCiclo = ((dia - 1) % 8) + 1;
    return diaDelCiclo <= 4 ? 'trabajado' : 'libre';
  }
  
  // Patrón 5x2 (5 días trabajando, 2 días libres)
  if (patron === '5x2') {
    const diaDelCiclo = ((dia - 1) % 7) + 1;
    return diaDelCiclo <= 5 ? 'trabajado' : 'libre';
  }
  
  // Patrón 6x1 (6 días trabajando, 1 día libre)
  if (patron === '6x1') {
    const diaDelCiclo = ((dia - 1) % 7) + 1;
    return diaDelCiclo <= 6 ? 'trabajado' : 'libre';
  }
  
  // Patrón L-V (Lunes a Viernes)
  if (patron === 'L-V') {
    return (diaSemana >= 1 && diaSemana <= 5) ? 'trabajado' : 'libre';
  }
  
  // Por defecto, días sin asignar
  return '';
}

testEndpointPauta(); 