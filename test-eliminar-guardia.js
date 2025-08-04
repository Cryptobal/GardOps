// Script de prueba para verificar la funcionalidad de eliminar guardia
const testEliminarGuardia = async () => {
  console.log('🧪 Iniciando pruebas de eliminar guardia...');
  
  // URL base del servidor de desarrollo
  const baseUrl = 'http://localhost:3000';
  
  // Fecha de prueba (hoy)
  const fecha = new Date().toISOString().split('T')[0];
  console.log('📅 Fecha de prueba:', fecha);
  
  try {
    // 1. Cargar pauta diaria
    console.log('\n1️⃣ Cargando pauta diaria...');
    const pautaResponse = await fetch(`${baseUrl}/api/pauta-diaria?fecha=${fecha}`);
    const pautaData = await pautaResponse.json();
    console.log('📊 Pauta cargada:', pautaData.length, 'instalaciones');
    
    // Buscar turnos normales con guardia asignado
    let turnosConGuardia = [];
    for (const instalacion of pautaData) {
      for (const turno of instalacion.turnos) {
        if (!turno.es_ppc && turno.guardia_id && turno.estado !== 'sin_marcar') {
          turnosConGuardia.push({
            instalacion: instalacion.nombre,
            turno: turno
          });
        }
      }
    }
    
    console.log(`🎯 Encontrados ${turnosConGuardia.length} turnos normales con guardia asignado`);
    
    if (turnosConGuardia.length === 0) {
      console.log('❌ No se encontraron turnos normales con guardia asignado para probar');
      return;
    }
    
    // Analizar cada turno
    turnosConGuardia.forEach((item, index) => {
      console.log(`\n📋 Turno ${index + 1}:`);
      console.log(`   Instalación: ${item.instalacion}`);
      console.log(`   Puesto: ${item.turno.nombre_puesto}`);
      console.log(`   Es PPC: ${item.turno.es_ppc}`);
      console.log(`   Estado: ${item.turno.estado}`);
      console.log(`   Guardia actual: ${item.turno.guardia_actual_nombre}`);
    });
    
    // 2. Probar eliminar guardia del primer turno
    const turnoParaEliminar = turnosConGuardia[0];
    console.log(`\n2️⃣ Probando eliminar guardia del turno: ${turnoParaEliminar.turno.nombre_puesto}`);
    
    const eliminarResponse = await fetch(`${baseUrl}/api/pauta-diaria`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        turnoId: turnoParaEliminar.turno.id,
        accion: 'eliminar_guardia',
        observaciones: 'Prueba de eliminar guardia'
      }),
    });
    
    console.log('📡 Respuesta eliminar guardia:', eliminarResponse.status);
    if (eliminarResponse.ok) {
      const eliminarResult = await eliminarResponse.json();
      console.log('✅ Guardia eliminado exitosamente:', eliminarResult);
      
      // 3. Verificar que el turno ahora aparezca sin guardia
      console.log('\n3️⃣ Verificando que el turno aparezca sin guardia...');
      const pautaResponse2 = await fetch(`${baseUrl}/api/pauta-diaria?fecha=${fecha}`);
      const pautaData2 = await pautaResponse2.json();
      
      const turnoActualizado = pautaData2
        .flatMap(i => i.turnos)
        .find(t => t.id === turnoParaEliminar.turno.id);
      
      if (turnoActualizado) {
        console.log('🔄 Turno actualizado:', {
          estado: turnoActualizado.estado,
          guardia_id: turnoActualizado.guardia_id,
          guardia_actual: turnoActualizado.guardia_actual_nombre
        });
        
        if (turnoActualizado.guardia_id === null && turnoActualizado.estado === 'sin_marcar') {
          console.log('✅ CORRECTO: Guardia eliminado, turno vuelve a sin marcar');
        } else {
          console.log('❌ PROBLEMA: Guardia no fue eliminado correctamente');
        }
      }
    } else {
      const error = await eliminarResponse.json();
      console.log('❌ Error eliminar guardia:', error);
    }
    
    console.log('\n✅ Pruebas completadas');
    
  } catch (error) {
    console.error('💥 Error en las pruebas:', error);
  }
};

// Ejecutar pruebas
testEliminarGuardia(); 