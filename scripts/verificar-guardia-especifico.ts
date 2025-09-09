import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function verificarGuardiaEspecifico() {
  const guardiaId = 'd8083f2a-d246-4ec1-9c77-d92d8bde496b';
  
  console.log(`🔍 Verificando guardia específico: ${guardiaId}\n`);

  try {
    // Obtener información del guardia
    const guardia = await query(`
      SELECT 
        id,
        nombre,
        apellido_paterno,
        apellido_materno,
        email,
        telefono,
        direccion,
        activo,
        latitud,
        longitud,
        ciudad,
        comuna,
        region,
        rut,
        nacionalidad,
        sexo,
        fecha_os10,
        instalacion_id,
        created_at,
        updated_at
      FROM guardias 
      WHERE id = $1
    `, [guardiaId]);

    if (guardia.rows.length === 0) {
      console.log('❌ Guardia no encontrado');
      return;
    }

    const g = guardia.rows[0];
    console.log('📋 INFORMACIÓN DEL GUARDIA:');
    console.log('='.repeat(80));
    console.log(`ID: ${g.id}`);
    console.log(`Nombre: ${g.nombre} ${g.apellido_paterno} ${g.apellido_materno}`);
    console.log(`RUT: ${g.rut}`);
    console.log(`Email: ${g.email || 'No especificado'}`);
    console.log(`Teléfono: ${g.telefono || 'No especificado'}`);
    console.log(`Dirección: ${g.direccion || 'No especificada'}`);
    console.log(`Activo: ${g.activo ? 'Sí' : 'No'}`);
    console.log(`Coordenadas: ${g.latitud && g.longitud ? `Sí (${g.latitud}, ${g.longitud})` : 'No'}`);
    console.log(`Ciudad: ${g.ciudad || 'No especificada'}`);
    console.log(`Comuna: ${g.comuna || 'No especificada'}`);
    console.log(`Región: ${g.region || 'No especificada'}`);
    console.log(`Nacionalidad: ${g.nacionalidad || 'No especificada'}`);
    console.log(`Sexo: ${g.sexo || 'No especificado'}`);
    console.log(`Fecha OS10: ${g.fecha_os10 || 'No especificada'}`);
    console.log(`Instalación ID: ${g.instalacion_id || 'No asignada'}`);
    console.log(`Creado: ${g.created_at}`);
    console.log(`Actualizado: ${g.updated_at}`);

    // Verificar asignaciones
    const asignaciones = await query(`
      SELECT 
        ta.id,
        ta.estado,
        ta.tipo_asignacion,
        ta.fecha_inicio,
        ta.fecha_termino,
        rs.nombre as rol_nombre,
        i.nombre as instalacion_nombre
      FROM as_turnos_asignaciones ta
      INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      INNER JOIN instalaciones i ON tr.instalacion_id = i.id
      WHERE ta.guardia_id = $1
      ORDER BY ta.fecha_inicio DESC
    `, [guardiaId]);

    console.log('\n📋 ASIGNACIONES:');
    console.log('='.repeat(80));
    if (asignaciones.rows.length === 0) {
      console.log('No tiene asignaciones');
    } else {
      asignaciones.rows.forEach((asig: any, index: number) => {
        console.log(`${index + 1}. Asignación ID: ${asig.id}`);
        console.log(`   Estado: ${asig.estado}`);
        console.log(`   Tipo: ${asig.tipo_asignacion}`);
        console.log(`   Rol: ${asig.rol_nombre}`);
        console.log(`   Instalación: ${asig.instalacion_nombre}`);
        console.log(`   Fecha inicio: ${asig.fecha_inicio}`);
        console.log(`   Fecha término: ${asig.fecha_termino || 'No especificada'}`);
        console.log('');
      });
    }

    // Verificar documentos
    const documentos = await query(`
      SELECT 
        dg.id,
        dg.nombre_archivo,
        dg.fecha_subida,
        dg.fecha_vencimiento,
        dg.estado,
        td.nombre as tipo_documento
      FROM documentos_guardias dg
      LEFT JOIN tipos_documentos td ON dg.tipo_documento_id = td.id
      WHERE dg.guardia_id = $1
      ORDER BY dg.fecha_subida DESC
    `, [guardiaId]);

    console.log('📋 DOCUMENTOS:');
    console.log('='.repeat(80));
    if (documentos.rows.length === 0) {
      console.log('No tiene documentos');
    } else {
      documentos.rows.forEach((doc: any, index: number) => {
        console.log(`${index + 1}. Documento ID: ${doc.id}`);
        console.log(`   Nombre: ${doc.nombre_archivo}`);
        console.log(`   Tipo: ${doc.tipo_documento || 'No especificado'}`);
        console.log(`   Estado: ${doc.estado}`);
        console.log(`   Fecha subida: ${doc.fecha_subida}`);
        console.log(`   Fecha vencimiento: ${doc.fecha_vencimiento || 'No especificada'}`);
        console.log('');
      });
    }

    // Verificar PPCs disponibles
    const ppcsDisponibles = await query(`
      SELECT 
        ppc.id,
        ppc.estado,
        ppc.cantidad_faltante,
        ppc.motivo,
        ppc.fecha_limite_cobertura,
        rs.nombre as rol_nombre,
        i.nombre as instalacion_nombre
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos rp ON ppc.requisito_puesto_id = rp.id
      INNER JOIN as_turnos_roles_servicio rs ON rp.rol_servicio_id = rs.id
      INNER JOIN instalaciones i ON rp.instalacion_id = i.id
      WHERE ppc.estado = 'Pendiente'
      ORDER BY ppc.fecha_limite_cobertura ASC
    `);

    console.log('📋 PPCs DISPONIBLES:');
    console.log('='.repeat(80));
    if (ppcsDisponibles.rows.length === 0) {
      console.log('No hay PPCs pendientes disponibles');
    } else {
      ppcsDisponibles.rows.forEach((ppc: any, index: number) => {
        console.log(`${index + 1}. PPC ID: ${ppc.id}`);
        console.log(`   Estado: ${ppc.estado}`);
        console.log(`   Cantidad faltante: ${ppc.cantidad_faltante}`);
        console.log(`   Motivo: ${ppc.motivo}`);
        console.log(`   Rol: ${ppc.rol_nombre}`);
        console.log(`   Instalación: ${ppc.instalacion_nombre}`);
        console.log(`   Fecha límite: ${ppc.fecha_limite_cobertura}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error verificando guardia:', error);
  }
}

// Ejecutar la verificación
verificarGuardiaEspecifico()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }); 