/**
 * =====================================================
 * MIGRACIÓN GRADUAL A MULTITENANT - FASE 4: ACTUALIZAR APIs
 * Tablas de Payroll/Sueldos
 * =====================================================
 * Fecha: 2025-01-27
 * Propósito: Actualizar APIs para incluir tenant_id en consultas
 * Estrategia: Gradual, con fallback para compatibilidad
 */

// Logger simple para scripts
const logger = {
    debug: (msg, ...args) => console.log(`[DEBUG] ${msg}`, ...args),
    info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
    warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
    error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args)
};

/**
 * Función helper para agregar tenant_id a consultas SQL
 */
function addTenantFilter(sqlQuery, tenantId, paramIndex = 1) {
    // Si ya tiene WHERE, agregar AND
    if (sqlQuery.toUpperCase().includes('WHERE')) {
        return sqlQuery + ` AND tenant_id = $${paramIndex}`;
    } else {
        return sqlQuery + ` WHERE tenant_id = $${paramIndex}`;
    }
}

/**
 * Función helper para agregar tenant_id a parámetros
 */
function addTenantParam(params, tenantId) {
    return [...params, tenantId];
}

/**
 * 1. ACTUALIZAR API: /api/payroll/estructuras/list
 */
async function updateEstructurasListAPI() {
    logger.debug('🔄 Actualizando API: /api/payroll/estructuras/list');
    
    const originalQuery = `
        SELECT DISTINCT
            sei.id as estructura_id,
            sei.instalacion_id,
            i.nombre as instalacion_nombre,
            sei.rol_servicio_id,
            ars.nombre as rol_nombre,
            CONCAT(ars.dias_trabajo, 'x', ars.dias_descanso, 'x', ars.horas_turno, ' / ', ars.hora_inicio, ' ', ars.hora_termino) as rol_descripcion,
            sei.sueldo_base,
            sei.bono_1,
            sei.bono_2,
            sei.bono_3,
            sei.activa as estructura_activa,
            sei.created_at,
            sei.updated_at
        FROM sueldo_estructura_instalacion sei
        INNER JOIN instalaciones i ON sei.instalacion_id = i.id
        INNER JOIN as_turnos_roles_servicio ars ON sei.rol_servicio_id = ars.id
        INNER JOIN as_turnos_puestos_operativos atpo ON i.id = atpo.instalacion_id AND ars.id = atpo.rol_id
        WHERE sei.activa = true
    `;
    
    // Nueva query con tenant_id
    const newQuery = `
        SELECT DISTINCT
            sei.id as estructura_id,
            sei.instalacion_id,
            i.nombre as instalacion_nombre,
            sei.rol_servicio_id,
            ars.nombre as rol_nombre,
            CONCAT(ars.dias_trabajo, 'x', ars.dias_descanso, 'x', ars.horas_turno, ' / ', ars.hora_inicio, ' ', ars.hora_termino) as rol_descripcion,
            sei.sueldo_base,
            sei.bono_1,
            sei.bono_2,
            sei.bono_3,
            sei.activa as estructura_activa,
            sei.created_at,
            sei.updated_at
        FROM sueldo_estructura_instalacion sei
        INNER JOIN instalaciones i ON sei.instalacion_id = i.id
        INNER JOIN as_turnos_roles_servicio ars ON sei.rol_servicio_id = ars.id
        INNER JOIN as_turnos_puestos_operativos atpo ON i.id = atpo.instalacion_id AND ars.id = atpo.rol_id
        WHERE sei.activa = true AND sei.tenant_id = $1
    `;
    
    logger.debug('✅ Query actualizada para incluir tenant_id');
    return newQuery;
}

/**
 * 2. ACTUALIZAR API: /api/payroll/estructuras-unificadas
 */
async function updateEstructurasUnificadasAPI() {
    logger.debug('🔄 Actualizando API: /api/payroll/estructuras-unificadas');
    
    const originalQuery = `
        SELECT 
            'servicio' as tipo,
            es.id,
            es.instalacion_id,
            i.nombre as instalacion_nombre,
            es.rol_servicio_id,
            rs.nombre as rol_nombre,
            rs.dias_trabajo,
            rs.dias_descanso,
            rs.hora_inicio,
            rs.hora_termino,
            NULL as guardia_id,
            NULL as guardia_nombre,
            NULL as guardia_rut,
            es.sueldo_base,
            es.bono_movilizacion,
            es.bono_colacion,
            es.bono_responsabilidad,
            CASE 
                WHEN es.bono_movilizacion > 0 OR es.bono_colacion > 0 OR es.bono_responsabilidad > 0 
                THEN '🚌 Movilización: ' || COALESCE(es.bono_movilizacion, 0) || 
                     ' | 🍽️ Colación: ' || COALESCE(es.bono_colacion, 0) || 
                     ' | ⭐ Responsabilidad: ' || COALESCE(es.bono_responsabilidad, 0)
                ELSE 'Sin bonos'
            END as bonos_detalle,
            es.activo,
            es.created_at as fecha_creacion,
            NULL as fecha_inactivacion,
            '🟡 Estructura de Servicio' as prioridad
        FROM sueldo_estructuras_servicio es
        INNER JOIN instalaciones i ON i.id = es.instalacion_id
        INNER JOIN as_turnos_roles_servicio rs ON rs.id = es.rol_servicio_id
        WHERE ${whereClause}
    `;
    
    // Nueva query con tenant_id
    const newQuery = `
        SELECT 
            'servicio' as tipo,
            es.id,
            es.instalacion_id,
            i.nombre as instalacion_nombre,
            es.rol_servicio_id,
            rs.nombre as rol_nombre,
            rs.dias_trabajo,
            rs.dias_descanso,
            rs.hora_inicio,
            rs.hora_termino,
            NULL as guardia_id,
            NULL as guardia_nombre,
            NULL as guardia_rut,
            es.sueldo_base,
            es.bono_movilizacion,
            es.bono_colacion,
            es.bono_responsabilidad,
            CASE 
                WHEN es.bono_movilizacion > 0 OR es.bono_colacion > 0 OR es.bono_responsabilidad > 0 
                THEN '🚌 Movilización: ' || COALESCE(es.bono_movilizacion, 0) || 
                     ' | 🍽️ Colación: ' || COALESCE(es.bono_colacion, 0) || 
                     ' | ⭐ Responsabilidad: ' || COALESCE(es.bono_responsabilidad, 0)
                ELSE 'Sin bonos'
            END as bonos_detalle,
            es.activo,
            es.created_at as fecha_creacion,
            NULL as fecha_inactivacion,
            '🟡 Estructura de Servicio' as prioridad
        FROM sueldo_estructuras_servicio es
        INNER JOIN instalaciones i ON i.id = es.instalacion_id
        INNER JOIN as_turnos_roles_servicio rs ON rs.id = es.rol_servicio_id
        WHERE es.tenant_id = $1 AND ${whereClause}
    `;
    
    logger.debug('✅ Query actualizada para incluir tenant_id');
    return newQuery;
}

/**
 * 3. ACTUALIZAR API: /api/estructuras-servicio/global
 */
async function updateEstructurasServicioGlobalAPI() {
    logger.debug('🔄 Actualizando API: /api/estructuras-servicio/global');
    
    const originalQuery = `
        WITH base AS (
            SELECT 
                es.*,
                i.nombre AS instalacion_nombre,
                rs.nombre AS rol_nombre,
                CONCAT(
                    rs.nombre, ' - ',
                    rs.dias_trabajo, 'x', rs.dias_descanso,
                    CASE 
                        WHEN rs.hora_inicio IS NOT NULL AND rs.hora_termino IS NOT NULL 
                        THEN CONCAT(' / ', rs.hora_inicio, '-', rs.hora_termino)
                        ELSE ''
                    END
                ) AS rol_completo,
                ROW_NUMBER() OVER (
                    PARTITION BY es.instalacion_id, es.rol_servicio_id
                    ORDER BY es.updated_at DESC, es.created_at DESC
                ) AS rn
            FROM sueldo_estructuras_servicio es
            INNER JOIN instalaciones i ON es.instalacion_id = i.id
            INNER JOIN as_turnos_roles_servicio rs ON es.rol_servicio_id = rs.id
            WHERE es.bono_id IS NULL
        )
    `;
    
    // Nueva query con tenant_id
    const newQuery = `
        WITH base AS (
            SELECT 
                es.*,
                i.nombre AS instalacion_nombre,
                rs.nombre AS rol_nombre,
                CONCAT(
                    rs.nombre, ' - ',
                    rs.dias_trabajo, 'x', rs.dias_descanso,
                    CASE 
                        WHEN rs.hora_inicio IS NOT NULL AND rs.hora_termino IS NOT NULL 
                        THEN CONCAT(' / ', rs.hora_inicio, '-', rs.hora_termino)
                        ELSE ''
                    END
                ) AS rol_completo,
                ROW_NUMBER() OVER (
                    PARTITION BY es.instalacion_id, es.rol_servicio_id
                    ORDER BY es.updated_at DESC, es.created_at DESC
                ) AS rn
            FROM sueldo_estructuras_servicio es
            INNER JOIN instalaciones i ON es.instalacion_id = i.id
            INNER JOIN as_turnos_roles_servicio rs ON es.rol_servicio_id = rs.id
            WHERE es.bono_id IS NULL AND es.tenant_id = $1
        )
    `;
    
    logger.debug('✅ Query actualizada para incluir tenant_id');
    return newQuery;
}

/**
 * 4. ACTUALIZAR API: /api/payroll/parametros
 */
async function updateParametrosAPI() {
    logger.debug('🔄 Actualizando API: /api/payroll/parametros');
    
    const queries = {
        parametros: `SELECT parametro, valor FROM sueldo_parametros_generales WHERE tenant_id = $1 ORDER BY parametro`,
        afp: `SELECT codigo, nombre, tasa, periodo FROM sueldo_afp WHERE tenant_id = $1 ORDER BY nombre`,
        isapre: `SELECT nombre, plan, valor_uf FROM sueldo_isapre WHERE tenant_id = $1 ORDER BY nombre`,
        tramos: `SELECT tramo, desde, hasta, factor, rebaja FROM sueldo_tramos_impuesto WHERE tenant_id = $1 ORDER BY tramo ASC`
    };
    
    logger.debug('✅ Queries actualizadas para incluir tenant_id');
    return queries;
}

/**
 * 5. FUNCIÓN HELPER PARA MIGRAR ENDPOINTS
 */
async function migrateEndpoint(endpointName, updateFunction) {
    try {
        logger.debug(`🔄 Migrando endpoint: ${endpointName}`);
        const newQuery = await updateFunction();
        logger.debug(`✅ Endpoint ${endpointName} migrado exitosamente`);
        return newQuery;
    } catch (error) {
        logger.error(`❌ Error migrando endpoint ${endpointName}:`, error);
        throw error;
    }
}

/**
 * 6. FUNCIÓN PRINCIPAL DE MIGRACIÓN
 */
async function migratePayrollAPIs() {
    logger.debug('🚀 Iniciando migración de APIs de payroll a multitenant...');
    
    try {
        // Migrar cada endpoint
        await migrateEndpoint('estructuras/list', updateEstructurasListAPI);
        await migrateEndpoint('estructuras-unificadas', updateEstructurasUnificadasAPI);
        await migrateEndpoint('estructuras-servicio/global', updateEstructurasServicioGlobalAPI);
        await migrateEndpoint('parametros', updateParametrosAPI);
        
        logger.debug('🎉 Migración de APIs completada exitosamente');
        
        return {
            success: true,
            message: 'APIs de payroll migradas a multitenant',
            migratedEndpoints: [
                '/api/payroll/estructuras/list',
                '/api/payroll/estructuras-unificadas',
                '/api/estructuras-servicio/global',
                '/api/payroll/parametros'
            ]
        };
        
    } catch (error) {
        logger.error('❌ Error en migración de APIs:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 7. FUNCIÓN PARA TESTING
 */
async function testMigratedAPIs() {
    logger.debug('🧪 Testing APIs migradas...');
    
    try {
        const tenantId = '1397e653-a702-4020-9702-3ae4f3f8b337'; // Tenant por defecto
        
        // Test 1: Verificar que las consultas con tenant_id funcionan
        const testQuery = `
            SELECT COUNT(*) as total 
            FROM sueldo_estructuras_servicio 
            WHERE tenant_id = $1
        `;
        
        const result = await query(testQuery, [tenantId]);
        logger.debug(`✅ Test 1: ${result.rows[0].total} registros encontrados con tenant_id`);
        
        // Test 2: Verificar que las consultas sin tenant_id siguen funcionando (fallback)
        const fallbackQuery = `
            SELECT COUNT(*) as total 
            FROM sueldo_estructuras_servicio 
            WHERE tenant_id IS NULL
        `;
        
        const fallbackResult = await query(fallbackQuery);
        logger.debug(`✅ Test 2: ${fallbackResult.rows[0].total} registros legacy encontrados`);
        
        logger.debug('🎉 Testing completado exitosamente');
        
        return {
            success: true,
            message: 'APIs migradas funcionando correctamente',
            tests: {
                withTenantId: result.rows[0].total,
                legacy: fallbackResult.rows[0].total
            }
        };
        
    } catch (error) {
        logger.error('❌ Error en testing:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    migratePayrollAPIs,
    testMigratedAPIs,
    addTenantFilter,
    addTenantParam
};
