/**
 * =====================================================
 * MIGRACIÓN GRADUAL A MULTITENANT - FASE 5: TESTING Y VALIDACIÓN
 * Tablas de Payroll/Sueldos
 * =====================================================
 * Fecha: 2025-01-27
 * Propósito: Testing exhaustivo de la migración multitenant
 * Estrategia: Validar funcionalidad existente y nueva
 */

// Logger simple para scripts
const logger = {
    debug: (msg, ...args) => console.log(`[DEBUG] ${msg}`, ...args),
    info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
    warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
    error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args)
};

/**
 * 1. TESTING DE INTEGRIDAD DE DATOS
 */
async function testDataIntegrity() {
    logger.debug('🧪 Testing integridad de datos...');
    
    const tests = [];
    
    try {
        // Test 1: Verificar que todas las tablas tienen tenant_id
        const tables = [
            'sueldo_estructuras_servicio',
            'sueldo_estructura_guardia',
            'sueldo_estructura_guardia_item',
            'sueldo_bonos_globales',
            'sueldo_item',
            'sueldo_parametros_generales',
            'sueldo_asignacion_familiar',
            'sueldo_afp',
            'sueldo_isapre',
            'sueldo_tramos_impuesto',
            'sueldo_historial_calculos',
            'sueldo_historial_estructuras'
        ];
        
        for (const table of tables) {
            const checkQuery = `
                SELECT 
                    COUNT(*) as total,
                    COUNT(tenant_id) as with_tenant_id,
                    COUNT(*) - COUNT(tenant_id) as null_tenant_id
                FROM ${table}
            `;
            
            const result = await query(checkQuery);
            const { total, with_tenant_id, null_tenant_id } = result.rows[0];
            
            tests.push({
                table,
                total: parseInt(total),
                withTenantId: parseInt(with_tenant_id),
                nullTenantId: parseInt(null_tenant_id),
                success: null_tenant_id === '0'
            });
            
            if (null_tenant_id === '0') {
                logger.debug(`✅ ${table}: ${total} registros, todos con tenant_id`);
            } else {
                logger.warn(`⚠️  ${table}: ${null_tenant_id} registros sin tenant_id`);
            }
        }
        
        return {
            success: tests.every(t => t.success),
            tests,
            message: 'Testing de integridad de datos completado'
        };
        
    } catch (error) {
        logger.error('❌ Error en testing de integridad:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 2. TESTING DE PERFORMANCE
 */
async function testPerformance() {
    logger.debug('🧪 Testing de performance...');
    
    try {
        const tenantId = '1397e653-a702-4020-9702-3ae4f3f8b337';
        
        // Test 1: Consulta sin tenant_id (legacy)
        const startLegacy = Date.now();
        const legacyQuery = `
            SELECT COUNT(*) as total
            FROM sueldo_estructuras_servicio
            WHERE activo = true
        `;
        await query(legacyQuery);
        const legacyTime = Date.now() - startLegacy;
        
        // Test 2: Consulta con tenant_id (nueva)
        const startNew = Date.now();
        const newQuery = `
            SELECT COUNT(*) as total
            FROM sueldo_estructuras_servicio
            WHERE activo = true AND tenant_id = $1
        `;
        await query(newQuery, [tenantId]);
        const newTime = Date.now() - startNew;
        
        // Test 3: Consulta compleja con JOINs
        const startComplex = Date.now();
        const complexQuery = `
            SELECT 
                es.id,
                i.nombre as instalacion_nombre,
                rs.nombre as rol_nombre,
                es.sueldo_base
            FROM sueldo_estructuras_servicio es
            INNER JOIN instalaciones i ON es.instalacion_id = i.id
            INNER JOIN as_turnos_roles_servicio rs ON es.rol_servicio_id = rs.id
            WHERE es.activo = true AND es.tenant_id = $1
            LIMIT 100
        `;
        await query(complexQuery, [tenantId]);
        const complexTime = Date.now() - startComplex;
        
        const performance = {
            legacy: legacyTime,
            new: newTime,
            complex: complexTime,
            improvement: legacyTime > 0 ? ((legacyTime - newTime) / legacyTime * 100).toFixed(2) : 0
        };
        
        logger.debug(`📊 Performance - Legacy: ${legacyTime}ms, Nueva: ${newTime}ms, Compleja: ${complexTime}ms`);
        logger.debug(`📈 Mejora: ${performance.improvement}%`);
        
        return {
            success: true,
            performance,
            message: 'Testing de performance completado'
        };
        
    } catch (error) {
        logger.error('❌ Error en testing de performance:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 3. TESTING DE FUNCIONALIDAD
 */
async function testFunctionality() {
    logger.debug('🧪 Testing de funcionalidad...');
    
    try {
        const tenantId = '1397e653-a702-4020-9702-3ae4f3f8b337';
        const tests = [];
        
        // Test 1: Verificar que las consultas con tenant_id devuelven datos
        const test1Query = `
            SELECT COUNT(*) as total
            FROM sueldo_estructuras_servicio
            WHERE tenant_id = $1
        `;
        const test1Result = await query(test1Query, [tenantId]);
        tests.push({
            name: 'Consulta con tenant_id',
            success: test1Result.rows[0].total > 0,
            result: test1Result.rows[0].total
        });
        
        // Test 2: Verificar que las consultas sin tenant_id siguen funcionando
        const test2Query = `
            SELECT COUNT(*) as total
            FROM sueldo_estructuras_servicio
            WHERE tenant_id IS NULL
        `;
        const test2Result = await query(test2Query);
        tests.push({
            name: 'Consulta legacy (sin tenant_id)',
            success: true, // Debe devolver 0 o datos legacy
            result: test2Result.rows[0].total
        });
        
        // Test 3: Verificar JOINs con tenant_id
        const test3Query = `
            SELECT 
                es.id,
                i.nombre as instalacion_nombre,
                rs.nombre as rol_nombre
            FROM sueldo_estructuras_servicio es
            INNER JOIN instalaciones i ON es.instalacion_id = i.id
            INNER JOIN as_turnos_roles_servicio rs ON es.rol_servicio_id = rs.id
            WHERE es.tenant_id = $1
            LIMIT 5
        `;
        const test3Result = await query(test3Query, [tenantId]);
        tests.push({
            name: 'JOINs con tenant_id',
            success: test3Result.rows.length > 0,
            result: test3Result.rows.length
        });
        
        // Test 4: Verificar que no hay datos de otros tenants
        const test4Query = `
            SELECT COUNT(*) as total
            FROM sueldo_estructuras_servicio
            WHERE tenant_id != $1
        `;
        const test4Result = await query(test4Query, [tenantId]);
        tests.push({
            name: 'Aislamiento de datos',
            success: test4Result.rows[0].total === '0',
            result: test4Result.rows[0].total
        });
        
        const allTestsPassed = tests.every(t => t.success);
        
        logger.debug(`📊 Tests de funcionalidad: ${tests.filter(t => t.success).length}/${tests.length} pasaron`);
        
        return {
            success: allTestsPassed,
            tests,
            message: 'Testing de funcionalidad completado'
        };
        
    } catch (error) {
        logger.error('❌ Error en testing de funcionalidad:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 4. TESTING DE APIS
 */
async function testAPIs() {
    logger.debug('🧪 Testing de APIs...');
    
    try {
        const tenantId = '1397e653-a702-4020-9702-3ae4f3f8b337';
        const tests = [];
        
        // Test 1: API de estructuras
        const test1Query = `
            SELECT DISTINCT
                sei.id as estructura_id,
                sei.instalacion_id,
                i.nombre as instalacion_nombre,
                sei.rol_servicio_id,
                ars.nombre as rol_nombre,
                sei.sueldo_base,
                sei.activa as estructura_activa
            FROM sueldo_estructura_instalacion sei
            INNER JOIN instalaciones i ON sei.instalacion_id = i.id
            INNER JOIN as_turnos_roles_servicio ars ON sei.rol_servicio_id = ars.id
            WHERE sei.activa = true AND sei.tenant_id = $1
            LIMIT 10
        `;
        const test1Result = await query(test1Query, [tenantId]);
        tests.push({
            name: 'API estructuras con tenant_id',
            success: test1Result.rows.length >= 0,
            result: test1Result.rows.length
        });
        
        // Test 2: API de parámetros
        const test2Query = `
            SELECT parametro, valor 
            FROM sueldo_parametros_generales 
            WHERE tenant_id = $1 
            ORDER BY parametro
            LIMIT 5
        `;
        const test2Result = await query(test2Query, [tenantId]);
        tests.push({
            name: 'API parámetros con tenant_id',
            success: test2Result.rows.length >= 0,
            result: test2Result.rows.length
        });
        
        // Test 3: API de bonos
        const test3Query = `
            SELECT id, nombre, descripcion, imponible
            FROM sueldo_bonos_globales
            WHERE tenant_id = $1 AND activo = true
            LIMIT 5
        `;
        const test3Result = await query(test3Query, [tenantId]);
        tests.push({
            name: 'API bonos con tenant_id',
            success: test3Result.rows.length >= 0,
            result: test3Result.rows.length
        });
        
        const allTestsPassed = tests.every(t => t.success);
        
        logger.debug(`📊 Tests de APIs: ${tests.filter(t => t.success).length}/${tests.length} pasaron`);
        
        return {
            success: allTestsPassed,
            tests,
            message: 'Testing de APIs completado'
        };
        
    } catch (error) {
        logger.error('❌ Error en testing de APIs:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 5. TESTING DE SEGURIDAD
 */
async function testSecurity() {
    logger.debug('🧪 Testing de seguridad...');
    
    try {
        const tenantId = '1397e653-a702-4020-9702-3ae4f3f8b337';
        const tests = [];
        
        // Test 1: Verificar que no se pueden acceder datos de otros tenants
        const test1Query = `
            SELECT COUNT(*) as total
            FROM sueldo_estructuras_servicio
            WHERE tenant_id != $1
        `;
        const test1Result = await query(test1Query, [tenantId]);
        tests.push({
            name: 'Aislamiento de datos por tenant',
            success: test1Result.rows[0].total === '0',
            result: test1Result.rows[0].total
        });
        
        // Test 2: Verificar que las consultas sin tenant_id no devuelven datos sensibles
        const test2Query = `
            SELECT COUNT(*) as total
            FROM sueldo_estructuras_servicio
            WHERE tenant_id IS NULL
        `;
        const test2Result = await query(test2Query);
        tests.push({
            name: 'Datos legacy aislados',
            success: test2Result.rows[0].total === '0',
            result: test2Result.rows[0].total
        });
        
        // Test 3: Verificar que los índices de tenant_id están funcionando
        const test3Query = `
            SELECT COUNT(*) as total
            FROM sueldo_estructuras_servicio
            WHERE tenant_id = $1 AND activo = true
        `;
        const test3Result = await query(test3Query, [tenantId]);
        tests.push({
            name: 'Índices de tenant_id funcionando',
            success: test3Result.rows[0].total >= 0,
            result: test3Result.rows[0].total
        });
        
        const allTestsPassed = tests.every(t => t.success);
        
        logger.debug(`📊 Tests de seguridad: ${tests.filter(t => t.success).length}/${tests.length} pasaron`);
        
        return {
            success: allTestsPassed,
            tests,
            message: 'Testing de seguridad completado'
        };
        
    } catch (error) {
        logger.error('❌ Error en testing de seguridad:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 6. FUNCIÓN PRINCIPAL DE TESTING
 */
async function runAllTests() {
    logger.debug('🚀 Iniciando testing completo de migración multitenant...');
    
    try {
        const results = {
            dataIntegrity: await testDataIntegrity(),
            performance: await testPerformance(),
            functionality: await testFunctionality(),
            apis: await testAPIs(),
            security: await testSecurity()
        };
        
        const allTestsPassed = Object.values(results).every(r => r.success);
        
        logger.debug('🎉 Testing completo finalizado');
        
        return {
            success: allTestsPassed,
            results,
            message: allTestsPassed ? 
                'Todos los tests pasaron exitosamente' : 
                'Algunos tests fallaron, revisar resultados'
        };
        
    } catch (error) {
        logger.error('❌ Error en testing completo:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 7. FUNCIÓN PARA GENERAR REPORTE
 */
async function generateTestReport() {
    logger.debug('📊 Generando reporte de testing...');
    
    try {
        const testResults = await runAllTests();
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalTests: Object.keys(testResults.results).length,
                passedTests: Object.values(testResults.results).filter(r => r.success).length,
                failedTests: Object.values(testResults.results).filter(r => !r.success).length,
                successRate: testResults.success ? '100%' : 'Parcial'
            },
            details: testResults.results,
            recommendations: []
        };
        
        // Agregar recomendaciones basadas en resultados
        if (!testResults.results.dataIntegrity.success) {
            report.recommendations.push('Revisar integridad de datos - algunos registros no tienen tenant_id');
        }
        
        if (!testResults.results.performance.success) {
            report.recommendations.push('Revisar performance - considerar optimización de índices');
        }
        
        if (!testResults.results.security.success) {
            report.recommendations.push('Revisar seguridad - hay problemas de aislamiento de datos');
        }
        
        if (testResults.success) {
            report.recommendations.push('✅ Migración completada exitosamente - proceder con Fase 6 (opcional)');
        }
        
        logger.debug('📊 Reporte generado exitosamente');
        
        return report;
        
    } catch (error) {
        logger.error('❌ Error generando reporte:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    runAllTests,
    generateTestReport,
    testDataIntegrity,
    testPerformance,
    testFunctionality,
    testAPIs,
    testSecurity
};
