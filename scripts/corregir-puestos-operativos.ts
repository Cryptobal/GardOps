import { query } from '../src/lib/database';

async function corregirPuestosOperativos() {
  console.log('🛠️ CORRECCIÓN DE PUESTOS OPERATIVOS');
  console.log('=====================================\n');

  try {
    // 1. Verificar duplicados en puestos operativos
    console.log('📋 1. VERIFICANDO DUPLICADOS EN PUESTOS OPERATIVOS...');
    
    const duplicados = await query(`
      SELECT 
        instalacion_id,
        nombre,
        COUNT(*) as cantidad
      FROM as_turnos_puestos_operativos
      GROUP BY instalacion_id, nombre
      HAVING COUNT(*) > 1
      ORDER BY instalacion_id, nombre
    `);
    
    if (duplicados.rows.length > 0) {
      console.log('❌ DUPLICADOS ENCONTRADOS:');
      duplicados.rows.forEach((dup: any) => {
        console.log(`  Instalación: ${dup.instalacion_id}, Nombre: ${dup.nombre}, Cantidad: ${dup.cantidad}`);
      });
      
      // Eliminar duplicados manteniendo solo el más reciente
      console.log('\n🔄 Eliminando duplicados...');
      for (const dup of duplicados.rows) {
        await query(`
          DELETE FROM as_turnos_puestos_operativos 
          WHERE instalacion_id = $1 AND nombre = $2
          AND id NOT IN (
            SELECT id FROM as_turnos_puestos_operativos 
            WHERE instalacion_id = $1 AND nombre = $2 
            ORDER BY created_at DESC 
            LIMIT 1
          )
        `, [dup.instalacion_id, dup.nombre]);
      }
      console.log('✅ Duplicados eliminados');
    } else {
      console.log('✅ No se encontraron duplicados');
    }

    // 2. Corregir numeración secuencial de puestos
    console.log('\n📋 2. CORRIGIENDO NUMERACIÓN SECUENCIAL DE PUESTOS...');
    
    // Obtener todas las instalaciones con puestos
    const instalacionesConPuestos = await query(`
      SELECT DISTINCT instalacion_id
      FROM as_turnos_puestos_operativos
      ORDER BY instalacion_id
    `);
    
    for (const inst of instalacionesConPuestos.rows) {
      console.log(`  Procesando instalación: ${inst.instalacion_id}`);
      
      // Obtener puestos de esta instalación ordenados por fecha de creación
      const puestos = await query(`
        SELECT id, nombre, created_at
        FROM as_turnos_puestos_operativos
        WHERE instalacion_id = $1
        ORDER BY created_at
      `, [inst.instalacion_id]);
      
      // Renumerar puestos secuencialmente
      for (let i = 0; i < puestos.rows.length; i++) {
        const puesto = puestos.rows[i];
        const nuevoNombre = `Puesto #${i + 1}`;
        
        if (puesto.nombre !== nuevoNombre) {
          await query(`
            UPDATE as_turnos_puestos_operativos
            SET nombre = $1, updated_at = NOW()
            WHERE id = $2
          `, [nuevoNombre, puesto.id]);
          console.log(`    Renombrado: ${puesto.nombre} → ${nuevoNombre}`);
        }
      }
    }
    console.log('✅ Numeración secuencial corregida');

    // 3. Verificar inconsistencias entre PPCs y asignaciones
    console.log('\n📋 3. VERIFICANDO INCONSISTENCIAS PPCs vs ASIGNACIONES...');
    
    const inconsistencias = await query(`
      SELECT 
        ppc.id as ppc_id,
        ppc.requisito_puesto_id,
        ppc.estado as ppc_estado,
        ppc.guardia_asignado_id,
        asig.id as asignacion_id,
        asig.estado as asignacion_estado
      FROM as_turnos_ppc ppc
      LEFT JOIN as_turnos_asignaciones asig ON ppc.requisito_puesto_id = asig.requisito_puesto_id
      WHERE (ppc.estado = 'Pendiente' AND asig.estado = 'Activa')
         OR (ppc.estado = 'Asignado' AND asig.estado IS NULL)
      ORDER BY ppc.requisito_puesto_id
    `);
    
    if (inconsistencias.rows.length > 0) {
      console.log('❌ INCONSISTENCIAS ENCONTRADAS:');
      inconsistencias.rows.forEach((inc: any) => {
        console.log(`  PPC ID: ${inc.ppc_id}, Estado PPC: ${inc.ppc_estado}, Asignación: ${inc.asignacion_id || 'N/A'}`);
      });
      
      // Corregir inconsistencias
      console.log('\n🔄 Corrigiendo inconsistencias...');
      for (const inc of inconsistencias.rows) {
        if (inc.ppc_estado === 'Pendiente' && inc.asignacion_estado === 'Activa') {
          // PPC marcado como pendiente pero tiene asignación activa
          await query(`
            UPDATE as_turnos_ppc
            SET estado = 'Asignado', 
                guardia_asignado_id = (
                  SELECT guardia_id 
                  FROM as_turnos_asignaciones 
                  WHERE requisito_puesto_id = $1 AND estado = 'Activa'
                  LIMIT 1
                ),
                fecha_asignacion = NOW(),
                updated_at = NOW()
            WHERE id = $2
          `, [inc.requisito_puesto_id, inc.ppc_id]);
          console.log(`    Corregido PPC ${inc.ppc_id}: Pendiente → Asignado`);
        } else if (inc.ppc_estado === 'Asignado' && !inc.asignacion_id) {
          // PPC marcado como asignado pero no tiene asignación activa
          await query(`
            UPDATE as_turnos_ppc
            SET estado = 'Pendiente',
                guardia_asignado_id = NULL,
                fecha_asignacion = NULL,
                updated_at = NOW()
            WHERE id = $1
          `, [inc.ppc_id]);
          console.log(`    Corregido PPC ${inc.ppc_id}: Asignado → Pendiente`);
        }
      }
      console.log('✅ Inconsistencias corregidas');
    } else {
      console.log('✅ No se encontraron inconsistencias');
    }

    // 4. Crear puestos faltantes basados en requisitos
    console.log('\n📋 4. CREANDO PUESTOS FALTANTES BASADOS EN REQUISITOS...');
    
    const requisitosSinPuestos = await query(`
      SELECT 
        tr.id as requisito_id,
        tr.instalacion_id,
        tr.rol_servicio_id,
        tr.cantidad_guardias,
        rs.nombre as rol_nombre,
        COALESCE(puestos_existentes.count, 0) as puestos_existentes
      FROM as_turnos_requisitos tr
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      LEFT JOIN (
        SELECT 
          instalacion_id,
          COUNT(*) as count
        FROM as_turnos_puestos_operativos
        GROUP BY instalacion_id
      ) puestos_existentes ON puestos_existentes.instalacion_id = tr.instalacion_id
      WHERE tr.estado = 'Activo'
      AND (puestos_existentes.count IS NULL OR puestos_existentes.count = 0)
      ORDER BY tr.instalacion_id, tr.rol_servicio_id
    `);
    
    if (requisitosSinPuestos.rows.length > 0) {
      console.log(`Encontrados ${requisitosSinPuestos.rows.length} requisitos sin puestos operativos`);
      
      for (const req of requisitosSinPuestos.rows) {
        console.log(`  Creando puestos para instalación ${req.instalacion_id}, rol ${req.rol_nombre}`);
        
        // Crear puestos operativos para este requisito
        for (let i = 1; i <= req.cantidad_guardias; i++) {
          await query(`
            INSERT INTO as_turnos_puestos_operativos (
              instalacion_id,
              nombre,
              descripcion,
              estado,
              created_at,
              updated_at
            ) VALUES ($1, $2, $3, 'Activo', NOW(), NOW())
          `, [
            req.instalacion_id,
            `Puesto #${i}`,
            `Puesto operativo ${i} para ${req.rol_nombre}`
          ]);
        }
        console.log(`    Creados ${req.cantidad_guardias} puestos operativos`);
      }
    } else {
      console.log('✅ Todos los requisitos tienen puestos operativos');
    }

    // 5. Verificar y corregir PPCs faltantes
    console.log('\n📋 5. VERIFICANDO Y CORRIGIENDO PPCs FALTANTES...');
    
    const requisitosSinPPC = await query(`
      SELECT 
        tr.id as requisito_id,
        tr.instalacion_id,
        tr.cantidad_guardias,
        COALESCE(ppcs_existentes.count, 0) as ppcs_existentes,
        COALESCE(asignaciones_activas.count, 0) as asignaciones_activas
      FROM as_turnos_requisitos tr
      LEFT JOIN (
        SELECT 
          requisito_puesto_id,
          COUNT(*) as count
        FROM as_turnos_ppc
        WHERE estado = 'Pendiente'
        GROUP BY requisito_puesto_id
      ) ppcs_existentes ON ppcs_existentes.requisito_puesto_id = tr.id
      LEFT JOIN (
        SELECT 
          requisito_puesto_id,
          COUNT(*) as count
        FROM as_turnos_asignaciones
        WHERE estado = 'Activa'
        GROUP BY requisito_puesto_id
      ) asignaciones_activas ON asignaciones_activas.requisito_puesto_id = tr.id
      WHERE tr.estado = 'Activo'
      AND (ppcs_existentes.count + asignaciones_activas.count) < tr.cantidad_guardias
      ORDER BY tr.instalacion_id
    `);
    
    if (requisitosSinPPC.rows.length > 0) {
      console.log(`Encontrados ${requisitosSinPPC.rows.length} requisitos con PPCs faltantes`);
      
      for (const req of requisitosSinPPC.rows) {
        const ppcsNecesarios = req.cantidad_guardias - req.asignaciones_activas - req.ppcs_existentes;
        console.log(`  Requisito ${req.requisito_id}: necesarios ${ppcsNecesarios} PPCs adicionales`);
        
        for (let i = 0; i < ppcsNecesarios; i++) {
          await query(`
            INSERT INTO as_turnos_ppc (
              requisito_puesto_id,
              cantidad_faltante,
              motivo,
              prioridad,
              fecha_deteccion,
              estado,
              created_at,
              updated_at
            ) VALUES ($1, 1, 'falta_asignacion', 'Media', CURRENT_DATE, 'Pendiente', NOW(), NOW())
          `, [req.requisito_id]);
        }
        console.log(`    Creados ${ppcsNecesarios} PPCs adicionales`);
      }
    } else {
      console.log('✅ Todos los requisitos tienen PPCs correctos');
    }

    // 6. Resumen final
    console.log('\n📊 RESUMEN FINAL');
    console.log('================');
    
    const resumen = await query(`
      SELECT 
        (SELECT COUNT(*) FROM as_turnos_puestos_operativos) as total_puestos,
        (SELECT COUNT(*) FROM as_turnos_requisitos WHERE estado = 'Activo') as total_requisitos,
        (SELECT COUNT(*) FROM as_turnos_ppc WHERE estado = 'Pendiente') as ppcs_pendientes,
        (SELECT COUNT(*) FROM as_turnos_asignaciones WHERE estado = 'Activa') as asignaciones_activas
    `);
    
    const datos = resumen.rows[0];
    console.log(`Total puestos operativos: ${datos.total_puestos}`);
    console.log(`Total requisitos activos: ${datos.total_requisitos}`);
    console.log(`PPCs pendientes: ${datos.ppcs_pendientes}`);
    console.log(`Asignaciones activas: ${datos.asignaciones_activas}`);

    console.log('\n✅ Corrección completada exitosamente');

  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
  }
}

// Ejecutar corrección
corregirPuestosOperativos().then(() => {
  console.log('\n🏁 Corrección finalizada');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
}); 