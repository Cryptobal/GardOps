import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

async function testPermisosAPI() {
  console.log('🧪 Probando endpoint API de permisos...\n');

  const baseUrl = 'http://localhost:3000/api';

  try {
    // 1. Probar aplicación de permiso
    console.log('1️⃣ Probando aplicación de permiso...');
    
    const permisoData = {
      guardiaId: '51c4ce5d-0878-4ebc-8ba9-4387db520c6b', // Guardia de prueba
      tipo: 'vacaciones',
      fechaInicio: '2025-08-02',
      fechaFin: '2025-08-09',
      observaciones: 'Vacaciones de verano'
    };

    const permisoResponse = await fetch(`${baseUrl}/guardias/permisos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(permisoData)
    });

    if (permisoResponse.ok) {
      const resultado = await permisoResponse.json();
      console.log('✅ Permiso aplicado exitosamente:', resultado);
    } else {
      const error = await permisoResponse.text();
      console.log('❌ Error aplicando permiso:', error);
    }

    // 2. Probar aplicación de finiquito
    console.log('\n2️⃣ Probando aplicación de finiquito...');
    
    const finiquitoData = {
      guardiaId: '51c4ce5d-0878-4ebc-8ba9-4387db520c6b',
      tipo: 'finiquito',
      fechaInicio: '2025-08-16',
      observaciones: 'Finiquito por renuncia'
    };

    const finiquitoResponse = await fetch(`${baseUrl}/guardias/permisos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(finiquitoData)
    });

    if (finiquitoResponse.ok) {
      const resultado = await finiquitoResponse.json();
      console.log('✅ Finiquito procesado exitosamente:', resultado);
    } else {
      const error = await finiquitoResponse.text();
      console.log('❌ Error procesando finiquito:', error);
    }

    // 3. Probar obtención de permisos
    console.log('\n3️⃣ Probando obtención de permisos...');
    
    const permisosResponse = await fetch(`${baseUrl}/guardias/permisos?guardiaId=51c4ce5d-0878-4ebc-8ba9-4387db520c6b`);
    
    if (permisosResponse.ok) {
      const permisos = await permisosResponse.json();
      console.log('✅ Permisos obtenidos exitosamente:', permisos);
    } else {
      const error = await permisosResponse.text();
      console.log('❌ Error obteniendo permisos:', error);
    }

    // 4. Probar validaciones
    console.log('\n4️⃣ Probando validaciones...');
    
    // Prueba sin guardiaId
    const invalidData1 = {
      tipo: 'vacaciones',
      fechaInicio: '2025-08-02',
      fechaFin: '2025-08-09'
    };

    const invalidResponse1 = await fetch(`${baseUrl}/guardias/permisos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidData1)
    });

    if (!invalidResponse1.ok) {
      const error = await invalidResponse1.json();
      console.log('✅ Validación funcionando (sin guardiaId):', error.error);
    }

    // Prueba tipo inválido
    const invalidData2 = {
      guardiaId: '51c4ce5d-0878-4ebc-8ba9-4387db520c6b',
      tipo: 'tipo_invalido',
      fechaInicio: '2025-08-02',
      fechaFin: '2025-08-09'
    };

    const invalidResponse2 = await fetch(`${baseUrl}/guardias/permisos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidData2)
    });

    if (!invalidResponse2.ok) {
      const error = await invalidResponse2.json();
      console.log('✅ Validación funcionando (tipo inválido):', error.error);
    }

    console.log('\n✅ Pruebas de API completadas exitosamente');

  } catch (error) {
    console.error('❌ Error en las pruebas de API:', error);
  }
}

// Ejecutar las pruebas
testPermisosAPI()
  .then(() => {
    console.log('\n🎉 Pruebas finalizadas');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  }); 