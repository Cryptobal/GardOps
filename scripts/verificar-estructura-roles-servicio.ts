import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function verificarEstructuraRolesServicio() {
  console.log('🔍 VERIFICANDO ESTRUCTURA DE ROLES DE SERVICIO\n');

  try {
    // 1. Verificar estructura de la tabla
    console.log('1️⃣ ESTRUCTURA DE LA TABLA as_turnos_roles_servicio...');
    const estructura = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'as_turnos_roles_servicio'
      ORDER BY ordinal_position
    `);

    console.log('Columnas de la tabla:');
    estructura.rows.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // 2. Verificar roles de servicio para la instalación A-Test
    console.log('\n2️⃣ ROLES DE SERVICIO PARA INSTALACIÓN A-TEST...');
    const rolesServicio = await query(`
      SELECT 
        rs.id,
        rs.nombre,
        rs.dias_trabajo,
        rs.dias_descanso,
        rs.hora_inicio,
        rs.hora_fin,
        CONCAT(rs.dias_trabajo, 'x', rs.dias_descanso) as patron_turno,
        CONCAT(rs.hora_inicio, ' ', rs.hora_fin) as horario
      FROM as_turnos_roles_servicio rs
      INNER JOIN as_turnos_puestos_operativos po ON rs.id = po.rol_id
      WHERE po.instalacion_id = '7e05a55d-8db6-4c20-b51c-509f09d69f74'
      GROUP BY rs.id, rs.nombre, rs.dias_trabajo, rs.dias_descanso, rs.hora_inicio, rs.hora_fin
      ORDER BY rs.nombre
    `);

    console.log(`Total roles de servicio: ${rolesServicio.rows.length}`);
    
    if (rolesServicio.rows.length > 0) {
      console.log('\nDetalles de roles de servicio:');
      rolesServicio.rows.forEach((rol: any, index: number) => {
        console.log(`  ${index + 1}. ID: ${rol.id}`);
        console.log(`     Nombre: ${rol.nombre}`);
        console.log(`     Patrón: ${rol.patron_turno}`);
        console.log(`     Horario: ${rol.horario}`);
        console.log(`     Días trabajo: ${rol.dias_trabajo}`);
        console.log(`     Días descanso: ${rol.dias_descanso}`);
        console.log('');
      });
    }

    // 3. Verificar puestos operativos con roles
    console.log('\n3️⃣ PUESTOS OPERATIVOS CON ROLES...');
    const puestosConRoles = await query(`
      SELECT 
        po.id,
        po.nombre_puesto,
        po.guardia_id,
        po.es_ppc,
        g.nombre as guardia_nombre,
        rs.nombre as rol_nombre,
        CONCAT(rs.dias_trabajo, 'x', rs.dias_descanso) as patron_turno,
        CONCAT(rs.hora_inicio, ' ', rs.hora_fin) as horario
      FROM as_turnos_puestos_operativos po
      LEFT JOIN guardias g ON po.guardia_id = g.id
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.instalacion_id = '7e05a55d-8db6-4c20-b51c-509f09d69f74'
      ORDER BY po.nombre_puesto
    `);

    console.log(`Total puestos operativos: ${puestosConRoles.rows.length}`);
    
    if (puestosConRoles.rows.length > 0) {
      console.log('\nDetalles de puestos operativos:');
      puestosConRoles.rows.forEach((puesto: any, index: number) => {
        console.log(`  ${index + 1}. ${puesto.nombre_puesto}`);
        console.log(`     Guardia: ${puesto.guardia_nombre || 'NULL'}`);
        console.log(`     Rol: ${puesto.rol_nombre}`);
        console.log(`     Patrón: ${puesto.patron_turno}`);
        console.log(`     Horario: ${puesto.horario}`);
        console.log(`     Es PPC: ${puesto.es_ppc}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  }
}

verificarEstructuraRolesServicio(); 