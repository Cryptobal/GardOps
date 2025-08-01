import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function crearPPCsPrueba() {
  console.log('🔧 Creando PPCs de prueba...\n');

  try {
    // Verificar requisitos de puesto existentes
    const requisitos = await query(`
      SELECT 
        tr.id,
        tr.cantidad_guardias,
        rs.nombre as rol_nombre,
        i.nombre as instalacion_nombre
      FROM as_turnos_requisitos tr
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      INNER JOIN instalaciones i ON tr.instalacion_id = i.id
      LIMIT 5
    `);

    console.log('📋 Requisitos de puesto encontrados:');
    requisitos.rows.forEach((req: any, index: number) => {
      console.log(`${index + 1}. ${req.instalacion_nombre} - ${req.rol_nombre}`);
    });

    if (requisitos.rows.length === 0) {
      console.log('❌ No hay requisitos de puesto disponibles');
      return;
    }

    // Crear PPCs de prueba para cada requisito
    for (const requisito of requisitos.rows) {
      console.log(`\n📝 Creando PPC para: ${requisito.instalacion_nombre} - ${requisito.rol_nombre}`);
      
      const ppcResult = await query(`
        INSERT INTO as_turnos_ppc (
          requisito_puesto_id,
          cantidad_faltante,
          motivo,
          prioridad,
          fecha_deteccion,
          fecha_limite_cobertura,
          estado,
          observaciones,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
        ) RETURNING id
      `, [
        requisito.id,
        2, // cantidad_faltante
        'falta_asignacion', // motivo válido
        'Alta',
        new Date().toISOString().split('T')[0], // fecha_deteccion
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // fecha_limite_cobertura (7 días)
        'Pendiente',
        'PPC creado para pruebas del sistema'
      ]);

      console.log(`✅ PPC creado con ID: ${ppcResult.rows[0].id}`);
    }

    // Verificar PPCs creados
    const ppcsCreados = await query(`
      SELECT 
        ppc.id,
        ppc.estado,
        ppc.cantidad_faltante,
        ppc.motivo,
        ppc.fecha_limite_cobertura,
        rs.nombre as rol_nombre,
        i.nombre as instalacion_nombre
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      INNER JOIN instalaciones i ON tr.instalacion_id = i.id
      WHERE ppc.estado = 'Pendiente'
      ORDER BY ppc.created_at DESC
    `);

    console.log('\n📊 PPCs pendientes disponibles:');
    console.log('='.repeat(80));
    
    if (ppcsCreados.rows.length > 0) {
      ppcsCreados.rows.forEach((ppc: any, index: number) => {
        console.log(`${index + 1}. PPC ID: ${ppc.id}`);
        console.log(`   Estado: ${ppc.estado}`);
        console.log(`   Cantidad faltante: ${ppc.cantidad_faltante}`);
        console.log(`   Motivo: ${ppc.motivo}`);
        console.log(`   Instalación: ${ppc.instalacion_nombre}`);
        console.log(`   Rol: ${ppc.rol_nombre}`);
        console.log(`   Fecha límite: ${ppc.fecha_limite_cobertura}`);
        console.log('');
      });
    } else {
      console.log('No hay PPCs pendientes');
    }

  } catch (error) {
    console.error('❌ Error creando PPCs de prueba:', error);
  }
}

// Ejecutar la creación
crearPPCsPrueba()
  .then(() => {
    console.log('\n✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }); 