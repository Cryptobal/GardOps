import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function updatePermisosDescriptions() {
  try {
    console.log('🚀 Actualizando descripciones de permisos...\n');

    // Mapeo de permisos con descripciones mejoradas
    const permisosMejorados = [
      // Turnos
      {
        clave: 'turnos.*',
        descripcion: '🔑 **Acceso completo al módulo de turnos** - Permite gestionar turnos, pautas, asistencia y todos los aspectos relacionados con la programación de guardias'
      },
      {
        clave: 'turnos.view',
        descripcion: '👁️ **Ver turnos y pautas** - Permite consultar la información de turnos, pautas diarias y mensuales, pero sin poder modificarlas'
      },
      {
        clave: 'turnos.edit',
        descripcion: '✏️ **Editar turnos y marcar asistencia** - Permite crear, modificar turnos, marcar asistencia y gestionar cambios en las pautas'
      },

      // Payroll
      {
        clave: 'payroll.*',
        descripcion: '💰 **Acceso completo al módulo de payroll** - Permite gestionar toda la información relacionada con nómina, sueldos y pagos'
      },
      {
        clave: 'payroll.view',
        descripcion: '📊 **Ver información de payroll** - Permite consultar datos de nómina, sueldos y reportes, pero sin poder modificarlos'
      },
      {
        clave: 'payroll.edit',
        descripcion: '💳 **Editar información de payroll** - Permite modificar datos de nómina, calcular sueldos y gestionar pagos'
      },

      // Maestros
      {
        clave: 'maestros.*',
        descripcion: '📋 **Acceso completo a datos maestros** - Permite gestionar toda la información base del sistema (instalaciones, guardias, etc.)'
      },
      {
        clave: 'maestros.view',
        descripcion: '👀 **Ver datos maestros** - Permite consultar información de instalaciones, guardias y otros datos base del sistema'
      },
      {
        clave: 'maestros.edit',
        descripcion: '🔧 **Editar datos maestros** - Permite crear, modificar y eliminar instalaciones, guardias y otros datos base del sistema'
      },

      // RBAC
      {
        clave: 'rbac.platform_admin',
        descripcion: '👑 **Administrador de la plataforma** - Permite crear tenants, gestionar usuarios globales y administrar toda la plataforma multi-tenant'
      },
      {
        clave: 'rbac.permisos.read',
        descripcion: '📖 **Leer catálogo de permisos** - Permite consultar la lista de permisos disponibles en el sistema'
      },
      {
        clave: 'rbac.roles.read',
        descripcion: '👥 **Leer roles** - Permite consultar la lista de roles y sus asignaciones'
      },
      {
        clave: 'rbac.tenants.read',
        descripcion: '🏢 **Leer tenants** - Permite consultar información de los tenants (empresas) en la plataforma'
      },
      {
        clave: 'rbac.tenants.create',
        descripcion: '➕ **Crear tenants** - Permite crear nuevos tenants (empresas) en la plataforma'
      },

      // Usuarios
      {
        clave: 'usuarios.manage',
        descripcion: '👤 **Gestionar usuarios y roles** - Permite crear, editar y eliminar usuarios, así como asignar roles y permisos'
      },

      // Configuración
      {
        clave: 'config.manage',
        descripcion: '⚙️ **Gestionar configuración del sistema** - Permite modificar configuraciones globales, parámetros del sistema y ajustes de la plataforma'
      },
      {
        clave: 'documentos.manage',
        descripcion: '📄 **Gestionar documentos** - Permite subir, descargar, organizar y gestionar documentos del sistema'
      }
    ];

    console.log('📝 Actualizando descripciones...');
    let actualizados = 0;

    for (const permiso of permisosMejorados) {
      try {
        const result = await sql`
          UPDATE permisos 
          SET descripcion = ${permiso.descripcion}
          WHERE clave = ${permiso.clave}
        `;
        
        if (result.rowCount > 0) {
          console.log(`✅ ${permiso.clave} - Actualizado`);
          actualizados++;
        } else {
          console.log(`⚠️  ${permiso.clave} - No encontrado`);
        }
      } catch (error: any) {
        console.log(`❌ ${permiso.clave} - Error: ${error.message}`);
      }
    }

    console.log(`\n🎉 ${actualizados} permisos actualizados exitosamente!`);

    // Mostrar resumen final
    const resumen = await sql`
      SELECT categoria, COUNT(*) as total
      FROM permisos 
      WHERE descripcion IS NOT NULL
      GROUP BY categoria
      ORDER BY categoria
    `;

    console.log('\n📊 Resumen por categorías:');
    resumen.rows.forEach((cat: any) => {
      console.log(`   - ${cat.categoria}: ${cat.total} permisos con descripción`);
    });

  } catch (error) {
    console.error('❌ Error durante la actualización:', error);
    throw error;
  }
}

updatePermisosDescriptions().then(() => {
  console.log('\n🏁 Script completado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
