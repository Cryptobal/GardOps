import * as fs from 'fs';
import * as path from 'path';

async function actualizarEndpointsADO() {
  console.log('🔧 ACTUALIZANDO ENDPOINTS ADO\n');

  // =====================================================
  // 1. ACTUALIZAR ENDPOINT DE TURNOS
  // =====================================================
  console.log('📋 1. ACTUALIZANDO ENDPOINT DE TURNOS...');
  
  const turnosEndpointPath = 'src/app/api/instalaciones/[id]/turnos/route.ts';
  
  if (fs.existsSync(turnosEndpointPath)) {
    let contenido = fs.readFileSync(turnosEndpointPath, 'utf8');
    
    // Reemplazar referencias a tablas antiguas
    contenido = contenido.replace(/turnos_instalacion/g, 'as_turnos_configuracion');
    contenido = contenido.replace(/roles_servicio/g, 'as_turnos_roles_servicio');
    contenido = contenido.replace(/requisitos_puesto/g, 'as_turnos_requisitos');
    contenido = contenido.replace(/puestos_por_cubrir/g, 'as_turnos_ppc');
    contenido = contenido.replace(/asignaciones_guardias/g, 'as_turnos_asignaciones');
    
    // Actualizar alias en queries
    contenido = contenido.replace(/ti\./g, 'tc.');
    contenido = contenido.replace(/rp\./g, 'req.');
    contenido = contenido.replace(/ppc\./g, 'ppc.');
    contenido = contenido.replace(/ag\./g, 'asig.');
    
    // Actualizar nombres de variables
    contenido = contenido.replace(/nuevoTurno/g, 'nuevaConfiguracion');
    contenido = contenido.replace(/turnoExistente/g, 'configuracionExistente');
    
    fs.writeFileSync(turnosEndpointPath, contenido);
    console.log('✅ Endpoint de turnos actualizado');
  } else {
    console.log('❌ Archivo de endpoint de turnos no encontrado');
  }

  // =====================================================
  // 2. ACTUALIZAR ENDPOINT DE PPC
  // =====================================================
  console.log('\n📋 2. ACTUALIZANDO ENDPOINT DE PPC...');
  
  const ppcEndpointPath = 'src/app/api/instalaciones/[id]/ppc/route.ts';
  
  if (fs.existsSync(ppcEndpointPath)) {
    let contenido = fs.readFileSync(ppcEndpointPath, 'utf8');
    
    // Reemplazar referencias a tablas antiguas
    contenido = contenido.replace(/puestos_por_cubrir/g, 'as_turnos_ppc');
    contenido = contenido.replace(/requisitos_puesto/g, 'as_turnos_requisitos');
    contenido = contenido.replace(/roles_servicio/g, 'as_turnos_roles_servicio');
    
    // Actualizar alias en queries
    contenido = contenido.replace(/ppc\./g, 'ppc.');
    contenido = contenido.replace(/rp\./g, 'req.');
    contenido = contenido.replace(/rs\./g, 'rol.');
    
    fs.writeFileSync(ppcEndpointPath, contenido);
    console.log('✅ Endpoint de PPC actualizado');
  } else {
    console.log('❌ Archivo de endpoint de PPC no encontrado');
  }

  // =====================================================
  // 3. ACTUALIZAR ENDPOINT DE ROLES DE SERVICIO
  // =====================================================
  console.log('\n📋 3. ACTUALIZANDO ENDPOINT DE ROLES DE SERVICIO...');
  
  const rolesEndpointPath = 'src/app/api/roles-servicio/route.ts';
  
  if (fs.existsSync(rolesEndpointPath)) {
    let contenido = fs.readFileSync(rolesEndpointPath, 'utf8');
    
    // Reemplazar referencias a tablas antiguas
    contenido = contenido.replace(/roles_servicio/g, 'as_turnos_roles_servicio');
    contenido = contenido.replace(/turnos_instalacion/g, 'as_turnos_configuracion');
    contenido = contenido.replace(/requisitos_puesto/g, 'as_turnos_requisitos');
    contenido = contenido.replace(/puestos_por_cubrir/g, 'as_turnos_ppc');
    contenido = contenido.replace(/asignaciones_guardias/g, 'as_turnos_asignaciones');
    
    fs.writeFileSync(rolesEndpointPath, contenido);
    console.log('✅ Endpoint de roles de servicio actualizado');
  } else {
    console.log('❌ Archivo de endpoint de roles de servicio no encontrado');
  }

  // =====================================================
  // 4. ACTUALIZAR ENDPOINT DE ROLES DE SERVICIO [ID]
  // =====================================================
  console.log('\n📋 4. ACTUALIZANDO ENDPOINT DE ROLES DE SERVICIO [ID]...');
  
  const rolesIdEndpointPath = 'src/app/api/roles-servicio/[id]/route.ts';
  
  if (fs.existsSync(rolesIdEndpointPath)) {
    let contenido = fs.readFileSync(rolesIdEndpointPath, 'utf8');
    
    // Reemplazar referencias a tablas antiguas
    contenido = contenido.replace(/roles_servicio/g, 'as_turnos_roles_servicio');
    contenido = contenido.replace(/turnos_instalacion/g, 'as_turnos_configuracion');
    contenido = contenido.replace(/requisitos_puesto/g, 'as_turnos_requisitos');
    contenido = contenido.replace(/puestos_por_cubrir/g, 'as_turnos_ppc');
    contenido = contenido.replace(/asignaciones_guardias/g, 'as_turnos_asignaciones');
    
    fs.writeFileSync(rolesIdEndpointPath, contenido);
    console.log('✅ Endpoint de roles de servicio [ID] actualizado');
  } else {
    console.log('❌ Archivo de endpoint de roles de servicio [ID] no encontrado');
  }

  // =====================================================
  // 5. ACTUALIZAR ENDPOINT DE TURNOS [TURNOID]
  // =====================================================
  console.log('\n📋 5. ACTUALIZANDO ENDPOINT DE TURNOS [TURNOID]...');
  
  const turnosIdEndpointPath = 'src/app/api/instalaciones/[id]/turnos/[turnoId]/route.ts';
  
  if (fs.existsSync(turnosIdEndpointPath)) {
    let contenido = fs.readFileSync(turnosIdEndpointPath, 'utf8');
    
    // Reemplazar referencias a tablas antiguas
    contenido = contenido.replace(/turnos_instalacion/g, 'as_turnos_configuracion');
    contenido = contenido.replace(/requisitos_puesto/g, 'as_turnos_requisitos');
    contenido = contenido.replace(/puestos_por_cubrir/g, 'as_turnos_ppc');
    contenido = contenido.replace(/asignaciones_guardias/g, 'as_turnos_asignaciones');
    
    fs.writeFileSync(turnosIdEndpointPath, contenido);
    console.log('✅ Endpoint de turnos [turnoId] actualizado');
  } else {
    console.log('❌ Archivo de endpoint de turnos [turnoId] no encontrado');
  }

  // =====================================================
  // 6. ACTUALIZAR APIS CLIENTE
  // =====================================================
  console.log('\n📋 6. ACTUALIZANDO APIS CLIENTE...');
  
  const apisCliente = [
    'src/lib/api/instalaciones.ts',
    'src/lib/api/roles-servicio.ts'
  ];

  for (const api of apisCliente) {
    if (fs.existsSync(api)) {
      let contenido = fs.readFileSync(api, 'utf8');
      
      // Reemplazar referencias a tablas antiguas
      contenido = contenido.replace(/turnos_instalacion/g, 'as_turnos_configuracion');
      contenido = contenido.replace(/roles_servicio/g, 'as_turnos_roles_servicio');
      contenido = contenido.replace(/requisitos_puesto/g, 'as_turnos_requisitos');
      contenido = contenido.replace(/puestos_por_cubrir/g, 'as_turnos_ppc');
      contenido = contenido.replace(/asignaciones_guardias/g, 'as_turnos_asignaciones');
      
      fs.writeFileSync(api, contenido);
      console.log(`✅ API cliente ${api} actualizada`);
    } else {
      console.log(`❌ Archivo de API cliente ${api} no encontrado`);
    }
  }

  // =====================================================
  // 7. ACTUALIZAR SCHEMAS
  // =====================================================
  console.log('\n📋 7. ACTUALIZANDO SCHEMAS...');
  
  const schemas = [
    'src/lib/schemas/instalaciones.ts',
    'src/lib/schemas/roles-servicio.ts'
  ];

  for (const schema of schemas) {
    if (fs.existsSync(schema)) {
      let contenido = fs.readFileSync(schema, 'utf8');
      
      // Reemplazar referencias a tablas antiguas
      contenido = contenido.replace(/turnos_instalacion/g, 'as_turnos_configuracion');
      contenido = contenido.replace(/roles_servicio/g, 'as_turnos_roles_servicio');
      contenido = contenido.replace(/requisitos_puesto/g, 'as_turnos_requisitos');
      contenido = contenido.replace(/puestos_por_cubrir/g, 'as_turnos_ppc');
      contenido = contenido.replace(/asignaciones_guardias/g, 'as_turnos_asignaciones');
      
      fs.writeFileSync(schema, contenido);
      console.log(`✅ Schema ${schema} actualizado`);
    } else {
      console.log(`❌ Archivo de schema ${schema} no encontrado`);
    }
  }

  // =====================================================
  // 8. RESUMEN DE ACTUALIZACIONES
  // =====================================================
  console.log('\n📋 8. RESUMEN DE ACTUALIZACIONES:');
  
  console.log('✅ Endpoints actualizados:');
  console.log('   - /api/instalaciones/[id]/turnos');
  console.log('   - /api/instalaciones/[id]/ppc');
  console.log('   - /api/roles-servicio');
  console.log('   - /api/roles-servicio/[id]');
  console.log('   - /api/instalaciones/[id]/turnos/[turnoId]');
  
  console.log('\n✅ APIs cliente actualizadas:');
  console.log('   - src/lib/api/instalaciones.ts');
  console.log('   - src/lib/api/roles-servicio.ts');
  
  console.log('\n✅ Schemas actualizados:');
  console.log('   - src/lib/schemas/instalaciones.ts');
  console.log('   - src/lib/schemas/roles-servicio.ts');

  console.log('\n🎯 RECOMENDACIONES POST-ACTUALIZACIÓN:');
  console.log('1. Revisar manualmente los cambios realizados');
  console.log('2. Probar endpoints para verificar funcionalidad');
  console.log('3. Actualizar componentes frontend si es necesario');
  console.log('4. Ejecutar tests de validación');

  console.log('\n✅ Actualización de endpoints ADO completada');
}

// Ejecutar la actualización
actualizarEndpointsADO().catch(console.error); 