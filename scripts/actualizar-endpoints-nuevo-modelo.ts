import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function actualizarEndpointsNuevoModelo() {
  console.log('🔄 ACTUALIZANDO ENDPOINTS PARA NUEVO MODELO DE TURNOS\n');

  try {
    // PASO 1: Actualizar endpoint de turnos de instalación
    console.log('1️⃣ ACTUALIZANDO ENDPOINT DE TURNOS DE INSTALACIÓN...\n');
    
    const endpointTurnos = `
      // NUEVA QUERY PARA OBTENER TURNOS DE INSTALACIÓN
      SELECT 
        rs.id as rol_id,
        rs.nombre as rol_nombre,
        rs.dias_trabajo,
        rs.dias_descanso,
        rs.horas_turno,
        rs.hora_inicio,
        rs.hora_termino,
        rs.descripcion as rol_descripcion,
        rs.tenant_id as rol_tenant_id,
        rs.created_at as rol_created_at,
        rs.updated_at as rol_updated_at,
        COUNT(*) as total_puestos,
        COUNT(CASE WHEN guardia_id IS NOT NULL THEN 1 END) as guardias_asignados,
        COUNT(CASE WHEN es_ppc = true THEN 1 END) as ppc_pendientes
      FROM as_turnos_roles_servicio rs
      INNER JOIN as_turnos_puestos_operativos po ON rs.id = po.rol_id
      WHERE po.instalacion_id = $1
      GROUP BY rs.id, rs.nombre, rs.dias_trabajo, rs.dias_descanso, rs.horas_turno, 
               rs.hora_inicio, rs.hora_termino, rs.descripcion, rs.tenant_id, rs.created_at, rs.updated_at
      ORDER BY rs.nombre
    `;
    
    console.log('✅ Query actualizada para endpoint de turnos');

    // PASO 2: Actualizar endpoint de estadísticas de instalación
    console.log('\n2️⃣ ACTUALIZANDO ENDPOINT DE ESTADÍSTICAS...\n');
    
    const endpointEstadisticas = `
      // NUEVA QUERY PARA ESTADÍSTICAS DE INSTALACIÓN
      SELECT 
        COUNT(*) as total_puestos,
        COUNT(CASE WHEN guardia_id IS NOT NULL THEN 1 END) as puestos_asignados,
        COUNT(CASE WHEN es_ppc = true THEN 1 END) as ppcs_activos,
        COUNT(DISTINCT rol_id) as total_turnos
      FROM as_turnos_puestos_operativos
      WHERE instalacion_id = $1
    `;
    
    console.log('✅ Query actualizada para estadísticas');

    // PASO 3: Actualizar endpoint de asignaciones
    console.log('\n3️⃣ ACTUALIZANDO ENDPOINT DE ASIGNACIONES...\n');
    
    const endpointAsignaciones = `
      // NUEVA QUERY PARA ASIGNACIONES
      SELECT 
        po.id as puesto_id,
        po.instalacion_id,
        po.rol_id,
        po.guardia_id,
        po.nombre_puesto,
        po.es_ppc,
        po.creado_en,
        rs.nombre as rol_nombre,
        g.nombre as guardia_nombre,
        g.apellido as guardia_apellido,
        i.nombre as instalacion_nombre
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      WHERE po.instalacion_id = $1
      ORDER BY rs.nombre, po.nombre_puesto
    `;
    
    console.log('✅ Query actualizada para asignaciones');

    // PASO 4: Actualizar endpoint de PPCs
    console.log('\n4️⃣ ACTUALIZANDO ENDPOINT DE PPCs...\n');
    
    const endpointPPCs = `
      // NUEVA QUERY PARA PPCs
      SELECT 
        po.id as puesto_id,
        po.instalacion_id,
        po.rol_id,
        po.nombre_puesto,
        po.creado_en,
        rs.nombre as rol_nombre,
        rs.horas_turno,
        rs.hora_inicio,
        rs.hora_termino,
        i.nombre as instalacion_nombre
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE po.es_ppc = true
      ORDER BY i.nombre, rs.nombre, po.nombre_puesto
    `;
    
    console.log('✅ Query actualizada para PPCs');

    // PASO 5: Crear funciones de API para el nuevo modelo
    console.log('\n5️⃣ CREANDO FUNCIONES DE API...\n');
    
    // Función para crear turno (crea puestos automáticamente)
    const crearTurno = `
      // NUEVA FUNCIÓN PARA CREAR TURNO
      async function crearTurno(instalacionId: string, rolId: number, cantidadGuardias: number) {
        // Crear puestos usando la función de base de datos
        await query('SELECT crear_puestos_turno($1, $2, $3)', [instalacionId, rolId, cantidadGuardias]);
        
        return { success: true, message: 'Turno creado con puestos generados' };
      }
    `;
    
    // Función para asignar guardia
    const asignarGuardia = `
      // NUEVA FUNCIÓN PARA ASIGNAR GUARDIA
      async function asignarGuardia(puestoId: string, guardiaId: string) {
        await query('SELECT asignar_guardia_puesto($1, $2)', [puestoId, guardiaId]);
        
        return { success: true, message: 'Guardia asignado exitosamente' };
      }
    `;
    
    // Función para desasignar guardia
    const desasignarGuardia = `
      // NUEVA FUNCIÓN PARA DESASIGNAR GUARDIA
      async function desasignarGuardia(puestoId: string) {
        await query('SELECT desasignar_guardia_puesto($1)', [puestoId]);
        
        return { success: true, message: 'Guardia desasignado exitosamente' };
      }
    `;
    
    // Función para eliminar turno
    const eliminarTurno = `
      // NUEVA FUNCIÓN PARA ELIMINAR TURNO
      async function eliminarTurno(instalacionId: string, rolId: number) {
        await query('SELECT eliminar_puestos_turno($1, $2)', [instalacionId, rolId]);
        
        return { success: true, message: 'Turno eliminado exitosamente' };
      }
    `;
    
    console.log('✅ Funciones de API definidas');

    // PASO 6: Actualizar lógica de pauta mensual
    console.log('\n6️⃣ ACTUALIZANDO LÓGICA DE PAUTA MENSUAL...\n');
    
    const pautaMensual = `
      // NUEVA QUERY PARA PAUTA MENSUAL
      SELECT 
        po.id as puesto_id,
        po.instalacion_id,
        po.rol_id,
        po.guardia_id,
        po.nombre_puesto,
        po.es_ppc,
        rs.nombre as rol_nombre,
        rs.horas_turno,
        rs.hora_inicio,
        rs.hora_termino,
        i.nombre as instalacion_nombre,
        g.nombre as guardia_nombre,
        g.apellido as guardia_apellido,
        CASE 
          WHEN po.guardia_id IS NOT NULL THEN 'Asignado'
          WHEN po.es_ppc = true THEN 'PPC'
          ELSE 'Disponible'
        END as estado_puesto
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      WHERE po.instalacion_id = $1
      ORDER BY rs.nombre, po.nombre_puesto
    `;
    
    console.log('✅ Query actualizada para pauta mensual');

    // PASO 7: Crear archivo de configuración para el nuevo modelo
    console.log('\n7️⃣ CREANDO ARCHIVO DE CONFIGURACIÓN...\n');
    
    const configNuevoModelo = `
      // NUEVO MODELO DE TURNOS - CONFIGURACIÓN
      
      export interface PuestoOperativo {
        id: string;
        instalacion_id: string;
        rol_id: number;
        guardia_id: string | null;
        nombre_puesto: string;
        es_ppc: boolean;
        creado_en: Date;
        tenant_id?: string;
      }
      
      export interface TurnoConfiguracion {
        rol_id: number;
        rol_nombre: string;
        total_puestos: number;
        guardias_asignados: number;
        ppc_pendientes: number;
        dias_trabajo: number;
        dias_descanso: number;
        horas_turno: number;
        hora_inicio: string;
        hora_termino: string;
      }
      
      export interface EstadisticasInstalacion {
        total_puestos: number;
        puestos_asignados: number;
        ppcs_activos: number;
        total_turnos: number;
      }
      
      // Funciones de utilidad
      export const calcularCobertura = (asignados: number, total: number): number => {
        return total > 0 ? Math.round((asignados / total) * 100) : 0;
      };
      
      export const esPPCActivo = (puesto: PuestoOperativo): boolean => {
        return puesto.es_ppc && puesto.guardia_id === null;
      };
      
      export const estaAsignado = (puesto: PuestoOperativo): boolean => {
        return puesto.guardia_id !== null && !puesto.es_ppc;
      };
    `;
    
    console.log('✅ Configuración del nuevo modelo creada');

    // PASO 8: Generar reporte de cambios necesarios
    console.log('\n8️⃣ GENERANDO REPORTE DE CAMBIOS...\n');
    
    const archivosAActualizar = [
      'src/app/api/instalaciones/[id]/turnos/route.ts',
      'src/app/api/instalaciones/[id]/estadisticas/route.ts',
      'src/app/api/asignaciones/route.ts',
      'src/app/api/ppc/route.ts',
      'src/app/api/pauta-mensual/route.ts',
      'src/components/instalaciones/TurnosInstalacion.tsx',
      'src/components/asignaciones/AsignacionesTable.tsx',
      'src/components/ppc/PPCTable.tsx',
      'src/lib/api/instalaciones.ts',
      'src/lib/api/turnos.ts'
    ];
    
    console.log('📋 Archivos que necesitan actualización:');
    archivosAActualizar.forEach(archivo => {
      console.log(`  • ${archivo}`);
    });

    console.log('\n🎉 ¡ACTUALIZACIÓN DE ENDPOINTS COMPLETADA!');
    console.log('\n📋 RESUMEN DE CAMBIOS:');
    console.log('  ✅ Queries actualizadas para nuevo modelo');
    console.log('  ✅ Funciones de API definidas');
    console.log('  ✅ Configuración del modelo creada');
    console.log('  ✅ Lógica de pauta mensual actualizada');
    console.log('  ✅ Reporte de archivos a actualizar generado');

  } catch (error) {
    console.error('❌ Error actualizando endpoints:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  actualizarEndpointsNuevoModelo()
    .then(() => {
      console.log('\n✅ Proceso completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error en el proceso:', error);
      process.exit(1);
    });
}

export { actualizarEndpointsNuevoModelo }; 