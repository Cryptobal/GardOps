const fetch = require('node-fetch');

async function verificarEstructuras() {
  console.log('🔍 Verificando estructura de tablas de estructuras...\n');

  try {
    // Verificar endpoint de filtros
    console.log('1. Verificando endpoint de filtros...');
    const filtrosResponse = await fetch('http://localhost:3000/api/payroll/estructuras-unificadas/filtros');
    const filtrosData = await filtrosResponse.json();
    
    if (filtrosData.success) {
      console.log('✅ Endpoint de filtros funciona correctamente');
      console.log(`📊 Instalaciones: ${filtrosData.data.instalaciones.length}`);
      console.log(`📊 Roles: ${filtrosData.data.roles.length}`);
      console.log(`📊 Guardias: ${filtrosData.data.guardias.length}\n`);
    } else {
      console.log('❌ Error en endpoint de filtros:', filtrosData.error);
    }

    // Verificar endpoint de estructuras unificadas
    console.log('2. Verificando endpoint de estructuras unificadas...');
    const estructurasResponse = await fetch('http://localhost:3000/api/payroll/estructuras-unificadas');
    const estructurasData = await estructurasResponse.json();
    
    if (estructurasData.success) {
      console.log('✅ Endpoint de estructuras unificadas funciona correctamente');
      console.log(`📊 Total estructuras: ${estructurasData.data.length}`);
      
      // Contar por tipo
      const estructurasServicio = estructurasData.data.filter(e => e.tipo === 'servicio');
      const estructurasGuardia = estructurasData.data.filter(e => e.tipo === 'guardia');
      
      console.log(`📊 Estructuras de servicio: ${estructurasServicio.length}`);
      console.log(`📊 Estructuras por guardia: ${estructurasGuardia.length}\n`);
      
      // Mostrar algunas estructuras de ejemplo
      if (estructurasData.data.length > 0) {
        console.log('📋 Ejemplos de estructuras:');
        estructurasData.data.slice(0, 3).forEach((estructura, index) => {
          console.log(`   ${index + 1}. ${estructura.tipo === 'servicio' ? '🏗️ Servicio' : '👤 Guardia'}`);
          console.log(`      Instalación: ${estructura.instalacion_nombre}`);
          console.log(`      Rol: ${estructura.rol_nombre}`);
          if (estructura.guardia_nombre) {
            console.log(`      Guardia: ${estructura.guardia_nombre} (${estructura.guardia_rut})`);
          }
          console.log(`      Sueldo base: $${estructura.sueldo_base?.toLocaleString() || 'N/A'}`);
          console.log(`      Bono: $${estructura.bono_monto?.toLocaleString() || '0'}`);
          console.log(`      Estado: ${estructura.activo ? 'Activo' : 'Inactivo'}\n`);
        });
      }
    } else {
      console.log('❌ Error en endpoint de estructuras unificadas:', estructurasData.error);
    }

    // Verificar endpoint de estructuras por guardia
    console.log('3. Verificando endpoint de estructuras por guardia...');
    const guardiaResponse = await fetch('http://localhost:3000/api/payroll/estructuras-guardia');
    const guardiaData = await guardiaResponse.json();
    
    if (guardiaData.success) {
      console.log('✅ Endpoint de estructuras por guardia funciona correctamente');
      console.log(`📊 Total estructuras por guardia: ${guardiaData.data.length}\n`);
    } else {
      console.log('❌ Error en endpoint de estructuras por guardia:', guardiaData.error);
    }

    // Probar crear una estructura de servicio
    console.log('4. Probando crear una estructura de servicio...');
    const createData = {
      tipo: 'servicio',
      instalacion_id: filtrosData.data.instalaciones[0]?.id,
      rol_servicio_id: filtrosData.data.roles[0]?.id,
      sueldo_base: 500000,
      descripcion: 'Estructura de prueba desde script'
    };

    const createResponse = await fetch('http://localhost:3000/api/payroll/estructuras-unificadas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createData)
    });

    const createResult = await createResponse.json();
    
    if (createResult.success) {
      console.log('✅ Estructura de servicio creada exitosamente');
      console.log(`📊 ID creado: ${createResult.data.id}`);
      console.log(`📊 Tipo: ${createResult.data.tipo}`);
      console.log(`📊 Mensaje: ${createResult.data.mensaje}\n`);
    } else {
      console.log('❌ Error creando estructura de servicio:', createResult.error);
    }

    // Probar crear una estructura por guardia
    console.log('5. Probando crear una estructura por guardia...');
    const createGuardiaData = {
      tipo: 'guardia',
      instalacion_id: filtrosData.data.instalaciones[0]?.id,
      rol_servicio_id: filtrosData.data.roles[0]?.id,
      guardia_id: filtrosData.data.guardias[0]?.id,
      sueldo_base: 550000,
      descripcion: 'Estructura por guardia de prueba desde script'
    };

    const createGuardiaResponse = await fetch('http://localhost:3000/api/payroll/estructuras-unificadas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createGuardiaData)
    });

    const createGuardiaResult = await createGuardiaResponse.json();
    
    if (createGuardiaResult.success) {
      console.log('✅ Estructura por guardia creada exitosamente');
      console.log(`📊 ID creado: ${createGuardiaResult.data.id}`);
      console.log(`📊 Tipo: ${createGuardiaResult.data.tipo}`);
      console.log(`📊 Mensaje: ${createGuardiaResult.data.mensaje}\n`);
    } else {
      console.log('❌ Error creando estructura por guardia:', createGuardiaResult.error);
    }

  } catch (error) {
    console.error('❌ Error verificando estructuras:', error);
  }
}

verificarEstructuras().then(() => {
  console.log('✅ Verificación completada');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error en verificación:', error);
  process.exit(1);
});
