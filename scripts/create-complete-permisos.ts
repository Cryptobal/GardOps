import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';

async function createCompletePermisos() {
  try {
    console.log('🚀 Creando permisos completos para todos los módulos...\n');

    // Lista completa de permisos por módulo
    const permisosCompletos = [
      // ===== CLIENTES =====
      {
        clave: 'clientes.*',
        descripcion: '🏢 **Acceso completo al módulo de clientes** - Permite gestionar toda la información de clientes, incluyendo creación, edición, eliminación y consultas'
      },
      {
        clave: 'clientes.view',
        descripcion: '👁️ **Ver clientes** - Permite consultar la lista de clientes y ver sus detalles, pero sin poder modificarlos'
      },
      {
        clave: 'clientes.create',
        descripcion: '➕ **Crear clientes** - Permite crear nuevos clientes en el sistema'
      },
      {
        clave: 'clientes.edit',
        descripcion: '✏️ **Editar clientes** - Permite modificar información de clientes existentes'
      },
      {
        clave: 'clientes.delete',
        descripcion: '🗑️ **Eliminar clientes** - Permite eliminar clientes del sistema'
      },

      // ===== INSTALACIONES =====
      {
        clave: 'instalaciones.*',
        descripcion: '🏭 **Acceso completo al módulo de instalaciones** - Permite gestionar todas las instalaciones, incluyendo turnos, PPCs y asignaciones'
      },
      {
        clave: 'instalaciones.view',
        descripcion: '👁️ **Ver instalaciones** - Permite consultar la lista de instalaciones y ver sus detalles'
      },
      {
        clave: 'instalaciones.create',
        descripcion: '➕ **Crear instalaciones** - Permite crear nuevas instalaciones en el sistema'
      },
      {
        clave: 'instalaciones.edit',
        descripcion: '✏️ **Editar instalaciones** - Permite modificar información de instalaciones existentes'
      },
      {
        clave: 'instalaciones.delete',
        descripcion: '🗑️ **Eliminar instalaciones** - Permite eliminar instalaciones del sistema'
      },
      {
        clave: 'instalaciones.turnos',
        descripcion: '🔄 **Gestionar turnos de instalaciones** - Permite crear, editar y eliminar turnos en instalaciones'
      },
      {
        clave: 'instalaciones.ppcs',
        descripcion: '⏳ **Gestionar PPCs** - Permite asignar y desasignar guardias a Puestos Pendientes por Cubrir'
      },

      // ===== GUARDIAS =====
      {
        clave: 'guardias.*',
        descripcion: '👮 **Acceso completo al módulo de guardias** - Permite gestionar toda la información de guardias, incluyendo fichas, permisos y finiquitos'
      },
      {
        clave: 'guardias.view',
        descripcion: '👁️ **Ver guardias** - Permite consultar la lista de guardias y ver sus fichas'
      },
      {
        clave: 'guardias.create',
        descripcion: '➕ **Crear guardias** - Permite crear nuevas fichas de guardias'
      },
      {
        clave: 'guardias.edit',
        descripcion: '✏️ **Editar guardias** - Permite modificar información de guardias existentes'
      },
      {
        clave: 'guardias.delete',
        descripcion: '🗑️ **Eliminar guardias** - Permite eliminar guardias del sistema'
      },
      {
        clave: 'guardias.permisos',
        descripcion: '📋 **Gestionar permisos de guardias** - Permite registrar permisos, licencias y vacaciones de guardias'
      },
      {
        clave: 'guardias.finiquitos',
        descripcion: '📄 **Gestionar finiquitos** - Permite procesar finiquitos y terminar contratos de guardias'
      },

      // ===== PAUTA DIARIA =====
      {
        clave: 'pauta-diaria.*',
        descripcion: '📅 **Acceso completo a pauta diaria** - Permite gestionar asistencia, reemplazos y cobertura diaria'
      },
      {
        clave: 'pauta-diaria.view',
        descripcion: '👁️ **Ver pauta diaria** - Permite consultar la pauta diaria y estado de asistencia'
      },
      {
        clave: 'pauta-diaria.edit',
        descripcion: '✏️ **Editar pauta diaria** - Permite marcar asistencia, ausencias y reemplazos'
      },
      {
        clave: 'pauta-diaria.reemplazos',
        descripcion: '🔄 **Gestionar reemplazos** - Permite asignar guardias de reemplazo para ausencias'
      },
      {
        clave: 'pauta-diaria.turnos-extras',
        descripcion: '⏰ **Gestionar turnos extras** - Permite crear y gestionar turnos adicionales'
      },

      // ===== PAUTA MENSUAL =====
      {
        clave: 'pauta-mensual.*',
        descripcion: '📊 **Acceso completo a pauta mensual** - Permite gestionar planificación mensual de turnos'
      },
      {
        clave: 'pauta-mensual.view',
        descripcion: '👁️ **Ver pauta mensual** - Permite consultar la planificación mensual de turnos'
      },
      {
        clave: 'pauta-mensual.create',
        descripcion: '➕ **Crear pauta mensual** - Permite generar nuevas pautas mensuales'
      },
      {
        clave: 'pauta-mensual.edit',
        descripcion: '✏️ **Editar pauta mensual** - Permite modificar la planificación mensual'
      },
      {
        clave: 'pauta-mensual.delete',
        descripcion: '🗑️ **Eliminar pauta mensual** - Permite eliminar pautas mensuales'
      },

      // ===== DOCUMENTOS =====
      {
        clave: 'documentos.*',
        descripcion: '📄 **Acceso completo al módulo de documentos** - Permite gestionar todos los documentos del sistema'
      },
      {
        clave: 'documentos.view',
        descripcion: '👁️ **Ver documentos** - Permite consultar y descargar documentos'
      },
      {
        clave: 'documentos.upload',
        descripcion: '📤 **Subir documentos** - Permite cargar nuevos documentos al sistema'
      },
      {
        clave: 'documentos.edit',
        descripcion: '✏️ **Editar documentos** - Permite modificar información de documentos'
      },
      {
        clave: 'documentos.delete',
        descripcion: '🗑️ **Eliminar documentos** - Permite eliminar documentos del sistema'
      },

      // ===== REPORTES =====
      {
        clave: 'reportes.*',
        descripcion: '📈 **Acceso completo a reportes** - Permite generar y exportar todos los reportes del sistema'
      },
      {
        clave: 'reportes.asistencia',
        descripcion: '📊 **Reportes de asistencia** - Permite generar reportes de asistencia y ausencias'
      },
      {
        clave: 'reportes.turnos',
        descripcion: '🔄 **Reportes de turnos** - Permite generar reportes de turnos y cobertura'
      },
      {
        clave: 'reportes.payroll',
        descripcion: '💰 **Reportes de payroll** - Permite generar reportes de nómina y sueldos'
      },
      {
        clave: 'reportes.export',
        descripcion: '📤 **Exportar reportes** - Permite exportar reportes en diferentes formatos'
      },

      // ===== CONFIGURACIÓN AVANZADA =====
      {
        clave: 'config.tenant',
        descripcion: '🏢 **Configuración de tenant** - Permite gestionar configuración específica del tenant'
      },
      {
        clave: 'config.system',
        descripcion: '⚙️ **Configuración del sistema** - Permite modificar configuraciones globales del sistema'
      },
      {
        clave: 'config.backup',
        descripcion: '💾 **Respaldos del sistema** - Permite realizar y gestionar respaldos de datos'
      },

      // ===== AUDITORÍA =====
      {
        clave: 'auditoria.*',
        descripcion: '🔍 **Acceso completo a auditoría** - Permite consultar logs y auditoría del sistema'
      },
      {
        clave: 'auditoria.logs',
        descripcion: '📋 **Ver logs del sistema** - Permite consultar logs de actividades del sistema'
      },
      {
        clave: 'auditoria.export',
        descripcion: '📤 **Exportar auditoría** - Permite exportar logs y reportes de auditoría'
      }
    ];

    console.log('📝 Insertando permisos...');
    let insertados = 0;
    let existentes = 0;

    for (const permiso of permisosCompletos) {
      try {
        // Verificar si ya existe
        const existing = await sql`
          SELECT id FROM permisos WHERE clave = ${permiso.clave}
        `;

        if (existing.rows.length > 0) {
          console.log(`⚠️  ${permiso.clave} - Ya existe`);
          existentes++;
        } else {
          // Usar la función helper para categorización automática
          await sql`
            SELECT insert_permiso_auto_categoria(${permiso.clave}, ${permiso.descripcion})
          `;
          console.log(`✅ ${permiso.clave} - Creado`);
          insertados++;
        }
      } catch (error: any) {
        console.log(`❌ ${permiso.clave} - Error: ${error.message}`);
      }
    }

    console.log(`\n🎉 Resumen:`);
    console.log(`   - Permisos insertados: ${insertados}`);
    console.log(`   - Permisos existentes: ${existentes}`);
    console.log(`   - Total procesados: ${permisosCompletos.length}`);

    // Mostrar estadísticas finales
    const stats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT categoria) as categorias,
        (SELECT COUNT(DISTINCT p.id) FROM permisos p JOIN roles_permisos rp ON rp.permiso_id = p.id) as permisosEnUso
      FROM permisos
    `;

    const finalStats = stats.rows[0];
    console.log('\n📊 Estadísticas finales:');
    console.log(`   - Total de permisos: ${finalStats.total}`);
    console.log(`   - Categorías: ${finalStats.categorias}`);
    console.log(`   - Permisos en uso: ${finalStats.permisosEnUso}`);

    // Mostrar categorías
    const categorias = await sql`
      SELECT categoria, COUNT(*) as total
      FROM permisos 
      WHERE categoria IS NOT NULL
      GROUP BY categoria
      ORDER BY categoria
    `;

    console.log('\n📂 Categorías disponibles:');
    categorias.rows.forEach((cat: any) => {
      console.log(`   - ${cat.categoria}: ${cat.total} permisos`);
    });

  } catch (error) {
    console.error('❌ Error durante la creación:', error);
    throw error;
  }
}

createCompletePermisos().then(() => {
  console.log('\n🏁 Script completado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
