/**
 * =====================================================
 * EJECUTOR - MIGRACIÓN DE TABLAS RESTANTES A MULTITENANT
 * payroll_run, payroll_items_extras, historial_asignaciones_guardias
 * =====================================================
 * Fecha: 2025-01-27
 * Propósito: Completar la migración a 100% multitenant
 * Estrategia: Ejecutar migración de las 3 tablas restantes
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

// Logger simple para scripts
const logger = {
    debug: (msg, ...args) => console.log(`[DEBUG] ${msg}`, ...args),
    info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
    warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
    error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args)
};

/**
 * Configuración de la migración
 */
const MIGRATION_CONFIG = {
    phases: [
        {
            name: 'Migración de Tablas Restantes',
            script: 'migrate-remaining-tables-multitenant.sql',
            description: 'Migrar payroll_run, payroll_items_extras, historial_asignaciones_guardias',
            critical: true
        },
        {
            name: 'Hacer tenant_id NOT NULL (Opcional)',
            script: 'make-remaining-tables-not-null.sql',
            description: 'Hacer tenant_id NOT NULL en las 3 tablas restantes',
            critical: false
        }
    ],
    scriptsPath: path.join(__dirname),
    databaseUrl: process.env.DATABASE_URL || process.env.POSTGRES_URL
};

/**
 * Función para ejecutar script SQL
 */
async function executeSQLScript(scriptPath) {
    try {
        logger.debug(`🔄 Ejecutando script SQL: ${scriptPath}`);
        
        const command = `psql "${MIGRATION_CONFIG.databaseUrl}" -f "${scriptPath}"`;
        const { stdout, stderr } = await execAsync(command);
        
        if (stderr && !stderr.includes('NOTICE')) {
            logger.warn(`⚠️  Warnings en ${scriptPath}:`, stderr);
        }
        
        logger.debug(`✅ Script SQL ejecutado exitosamente: ${scriptPath}`);
        return { success: true, output: stdout, warnings: stderr };
        
    } catch (error) {
        logger.error(`❌ Error ejecutando script SQL ${scriptPath}:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Función para verificar que existe un script
 */
async function verifyScriptExists(scriptName) {
    try {
        const scriptPath = path.join(MIGRATION_CONFIG.scriptsPath, scriptName);
        await fs.access(scriptPath);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Función para ejecutar una fase individual
 */
async function executePhase(phase) {
    logger.debug(`🚀 Ejecutando ${phase.name}...`);
    
    try {
        // Verificar que el script existe
        const scriptExists = await verifyScriptExists(phase.script);
        if (!scriptExists) {
            throw new Error(`Script no encontrado: ${phase.script}`);
        }
        
        const scriptPath = path.join(MIGRATION_CONFIG.scriptsPath, phase.script);
        const result = await executeSQLScript(scriptPath);
        
        if (result.success) {
            logger.debug(`✅ ${phase.name} completada exitosamente`);
            return {
                phase: phase.name,
                success: true,
                result: result
            };
        } else {
            logger.error(`❌ ${phase.name} falló:`, result.error);
            return {
                phase: phase.name,
                success: false,
                error: result.error
            };
        }
        
    } catch (error) {
        logger.error(`❌ Error en ${phase.name}:`, error.message);
        return {
            phase: phase.name,
            success: false,
            error: error.message
        };
    }
}

/**
 * Función para validar pre-requisitos
 */
async function validatePrerequisites() {
    logger.debug('🔍 Validando pre-requisitos...');
    
    const checks = [];
    
    try {
        // Verificar que existe la base de datos
        const { stdout } = await execAsync(`psql "${MIGRATION_CONFIG.databaseUrl}" -c "SELECT 1;"`);
        checks.push({ name: 'Conexión a base de datos', success: true });
        
        // Verificar que existe la tabla tenants
        const { stdout: tenantsCheck } = await execAsync(`psql "${MIGRATION_CONFIG.databaseUrl}" -c "SELECT COUNT(*) FROM tenants;"`);
        checks.push({ name: 'Tabla tenants existe', success: true });
        
        // Verificar que existen las tablas a migrar
        const tables = ['payroll_run', 'payroll_items_extras', 'historial_asignaciones_guardias'];
        for (const table of tables) {
            try {
                const { stdout } = await execAsync(`psql "${MIGRATION_CONFIG.databaseUrl}" -c "SELECT COUNT(*) FROM ${table};"`);
                checks.push({ name: `Tabla ${table} existe`, success: true });
            } catch (error) {
                checks.push({ name: `Tabla ${table} existe`, success: false });
            }
        }
        
        // Verificar que existen los scripts
        for (const phase of MIGRATION_CONFIG.phases) {
            const scriptExists = await verifyScriptExists(phase.script);
            checks.push({ 
                name: `Script ${phase.script}`, 
                success: scriptExists 
            });
        }
        
        const allChecksPassed = checks.every(check => check.success);
        
        logger.debug(`📊 Validación de pre-requisitos: ${checks.filter(c => c.success).length}/${checks.length} pasaron`);
        
        return {
            success: allChecksPassed,
            checks
        };
        
    } catch (error) {
        logger.error('❌ Error validando pre-requisitos:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Función para verificar estado actual de las tablas
 */
async function checkCurrentState() {
    logger.debug('🔍 Verificando estado actual de las tablas...');
    
    try {
        const tables = ['payroll_run', 'payroll_items_extras', 'historial_asignaciones_guardias'];
        const results = {};
        
        for (const table of tables) {
            try {
                // Verificar si tiene columna tenant_id
                const { stdout: columnCheck } = await execAsync(`psql "${MIGRATION_CONFIG.databaseUrl}" -c "SELECT column_name FROM information_schema.columns WHERE table_name = '${table}' AND column_name = 'tenant_id';"`);
                const hasTenantId = stdout.trim().length > 0;
                
                // Verificar registros con tenant_id NULL
                const { stdout: nullCheck } = await execAsync(`psql "${MIGRATION_CONFIG.databaseUrl}" -c "SELECT COUNT(*) FROM ${table} WHERE tenant_id IS NULL;"`);
                const nullCount = parseInt(nullCheck.trim());
                
                // Verificar si tenant_id es NOT NULL
                const { stdout: notNullCheck } = await execAsync(`psql "${MIGRATION_CONFIG.databaseUrl}" -c "SELECT is_nullable FROM information_schema.columns WHERE table_name = '${table}' AND column_name = 'tenant_id';"`);
                const isNotNull = notNullCheck.trim() === 'NO';
                
                results[table] = {
                    hasTenantId,
                    nullCount,
                    isNotNull,
                    status: hasTenantId ? (isNotNull ? 'NOT NULL' : 'NULLABLE') : 'NO TENANT_ID'
                };
                
            } catch (error) {
                results[table] = {
                    error: error.message,
                    status: 'ERROR'
                };
            }
        }
        
        logger.debug('📊 Estado actual de las tablas:', results);
        return results;
        
    } catch (error) {
        logger.error('❌ Error verificando estado actual:', error.message);
        return { error: error.message };
    }
}

/**
 * Función principal de migración
 */
async function executeRemainingTablesMigration(options = {}) {
    const {
        skipOptional = false,
        stopOnError = true
    } = options;
    
    logger.debug('🚀 Iniciando migración de tablas restantes a multitenant...');
    
    const results = {
        startTime: new Date(),
        phases: [],
        success: false,
        errors: []
    };
    
    try {
        // 1. Validar pre-requisitos
        logger.debug('1️⃣ Validando pre-requisitos...');
        const prerequisites = await validatePrerequisites();
        if (!prerequisites.success) {
            throw new Error('Pre-requisitos no cumplidos');
        }
        logger.debug('✅ Pre-requisitos validados');
        
        // 2. Verificar estado actual
        logger.debug('2️⃣ Verificando estado actual...');
        const currentState = await checkCurrentState();
        logger.debug('✅ Estado actual verificado');
        
        // 3. Ejecutar fases
        logger.debug('3️⃣ Ejecutando fases de migración...');
        
        for (const phase of MIGRATION_CONFIG.phases) {
            // Saltar fases opcionales si se solicita
            if (skipOptional && !phase.critical) {
                logger.debug(`⏭️  Saltando fase opcional: ${phase.name}`);
                continue;
            }
            
            const phaseResult = await executePhase(phase);
            results.phases.push(phaseResult);
            
            if (!phaseResult.success) {
                results.errors.push(`${phase.name}: ${phaseResult.error}`);
                
                if (stopOnError) {
                    throw new Error(`Fase falló: ${phase.name}`);
                } else {
                    logger.warn(`⚠️  Fase falló pero continuando: ${phase.name}`);
                }
            }
        }
        
        // 4. Verificar éxito
        const failedPhases = results.phases.filter(p => !p.success);
        results.success = failedPhases.length === 0;
        results.endTime = new Date();
        results.duration = results.endTime - results.startTime;
        
        if (results.success) {
            logger.debug('🎉 Migración de tablas restantes completada exitosamente');
        } else {
            logger.warn(`⚠️  Migración completada con ${failedPhases.length} errores`);
        }
        
        return results;
        
    } catch (error) {
        results.success = false;
        results.endTime = new Date();
        results.duration = results.endTime - results.startTime;
        results.errors.push(error.message);
        
        logger.error('❌ Migración falló:', error.message);
        return results;
    }
}

/**
 * Función para generar reporte de migración
 */
async function generateMigrationReport(results) {
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            success: results.success,
            duration: results.duration,
            totalPhases: results.phases.length,
            successfulPhases: results.phases.filter(p => p.success).length,
            failedPhases: results.phases.filter(p => !p.success).length
        },
        phases: results.phases.map(phase => ({
            name: phase.phase,
            success: phase.success,
            error: phase.error || null
        })),
        errors: results.errors,
        recommendations: []
    };
    
    // Agregar recomendaciones
    if (results.success) {
        report.recommendations.push('✅ Migración de tablas restantes completada exitosamente');
        report.recommendations.push('🎯 Sistema ahora está 100% multitenant');
        report.recommendations.push('🔍 Verificar que todas las APIs funcionan correctamente');
        report.recommendations.push('📊 Monitorear performance de las consultas');
    } else {
        report.recommendations.push('❌ Revisar errores y ejecutar fases fallidas');
        report.recommendations.push('💾 Considerar restaurar desde backup si es necesario');
    }
    
    return report;
}

// Exportar funciones
module.exports = {
    executeRemainingTablesMigration,
    generateMigrationReport,
    validatePrerequisites,
    checkCurrentState
};

// Ejecutar si se llama directamente
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0] || 'migrate';
    
    switch (command) {
        case 'migrate':
            executeRemainingTablesMigration()
                .then(results => {
                    console.log('🎉 Migración completada:', results.success ? 'ÉXITO' : 'CON ERRORES');
                    if (!results.success) {
                        console.log('❌ Errores:', results.errors);
                    }
                    process.exit(results.success ? 0 : 1);
                })
                .catch(error => {
                    console.error('❌ Error fatal:', error.message);
                    process.exit(1);
                });
            break;
            
        case 'validate':
            validatePrerequisites()
                .then(result => {
                    console.log('🔍 Validación:', result.success ? 'ÉXITO' : 'FALLÓ');
                    process.exit(result.success ? 0 : 1);
                })
                .catch(error => {
                    console.error('❌ Error en validación:', error.message);
                    process.exit(1);
                });
            break;
            
        case 'check':
            checkCurrentState()
                .then(result => {
                    console.log('🔍 Estado actual:', result);
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Error verificando estado:', error.message);
                    process.exit(1);
                });
            break;
            
        default:
            console.log('Uso: node execute-remaining-tables-migration.js [migrate|validate|check]');
            process.exit(1);
    }
}
