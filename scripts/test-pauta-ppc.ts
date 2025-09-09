import { query } from '../src/lib/database';

async function testPautaPPC() {
  try {
    console.log('🧪 Probando creación de pauta mensual con PPC...\n');

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

    // 2. Verificar puestos operativos de esta instalación
    console.log('\n2. Verificando puestos operativos...');
    const puestosResult = await query(`
      SELECT 
        po.id as puesto_id,
        po.nombre_puesto,
        po.guardia_id,
        po.es_ppc,
        po.activo,
        rs.nombre as rol_nombre,
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
    let puestosConGuardia = 0;
    let ppcs = 0;
    
    puestosResult.rows.forEach((puesto: any, index: number) => {
      console.log(`  Puesto ${index + 1}:`);
      console.log(`    ID: ${puesto.puesto_id}`);
      console.log(`    Nombre: ${puesto.nombre_puesto}`);
      console.log(`    Es PPC: ${puesto.es_ppc ? 'SÍ' : 'NO'}`);
      console.log(`    Guardia asignada: ${puesto.guardia_id ? 'SÍ' : 'NO'}`);
      if (puesto.guardia_id) {
        console.log(`    Guardia: ${puesto.guardia_nombre} ${puesto.apellido_paterno} ${puesto.apellido_materno}`);
        puestosConGuardia++;
      }
      if (puesto.es_ppc) {
        ppcs++;
      }
    });

    console.log(`\n📈 Resumen:`);
    console.log(`   - Puestos con guardia: ${puestosConGuardia}`);
    console.log(`   - PPCs: ${ppcs}`);
    console.log(`   - Total puestos activos: ${puestosResult.rows.length}`);

    // 3. Simular la creación de pauta mensual
    console.log('\n3. Simulando creación de pauta mensual...');
    const anio = 2025;
    const mes = 8;
    const diasDelMes = Array.from(
      { length: new Date(anio, mes, 0).getDate() }, 
      (_, i) => i + 1
    );

    console.log(`   - Año: ${anio}`);
    console.log(`   - Mes: ${mes}`);
    console.log(`   - Días del mes: ${diasDelMes.length}`);

    // Crear pauta base para cada puesto operativo
    const pautasParaInsertar = [];
    
    for (const puesto of puestosResult.rows) {
      // Solo crear pauta para puestos que tengan guardia asignado o sean PPCs
      if (puesto.guardia_id || puesto.es_ppc) {
        console.log(`   ✅ Procesando puesto: ${puesto.nombre_puesto} (PPC: ${puesto.es_ppc})`);
        
        for (const dia of diasDelMes) {
          // Aplicar patrón de turno automáticamente
          let estado = '';
          
          if (puesto.guardia_id && puesto.rol_nombre) {
            // Aplicar lógica de patrón de turno
            estado = aplicarPatronTurno(puesto.rol_nombre, dia, anio, mes);
          }
          
          pautasParaInsertar.push({
            puesto_id: puesto.puesto_id,
            guardia_id: puesto.guardia_id || puesto.puesto_id, // Para PPCs, usar el puesto_id como guardia_id
            dia: parseInt(dia.toString()),
            estado: estado
          });
        }
      } else {
        console.log(`   ❌ Omitiendo puesto: ${puesto.nombre_puesto} (sin guardia y no es PPC)`);
      }
    }

    console.log(`\n📊 Resumen de pautas a crear:`);
    console.log(`   - Total registros: ${pautasParaInsertar.length}`);
    console.log(`   - Puestos procesados: ${puestosResult.rows.filter((p: any) => p.guardia_id || p.es_ppc).length}`);
    console.log(`   - Puestos omitidos: ${puestosResult.rows.filter((p: any) => !p.guardia_id && !p.es_ppc).length}`);

    // 4. Verificar si ya existe pauta para este mes
    console.log('\n4. Verificando pauta existente...');
    const pautaExistente = await query(`
      SELECT COUNT(*) as count
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE po.instalacion_id = $1 
        AND pm.anio = $2 
        AND pm.mes = $3
    `, [instalacion.id, anio, mes]);

    console.log(`   - Pautas existentes: ${pautaExistente.rows[0].count}`);

    if (parseInt(pautaExistente.rows[0].count) > 0) {
      console.log('   ⚠️ Ya existe una pauta mensual para esta instalación en el mes especificado');
    } else {
      console.log('   ✅ No existe pauta previa, se puede crear nueva');
    }

    console.log('\n✅ Prueba completada exitosamente');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
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

testPautaPPC(); 