/**
 * =====================================================
 * EJECUTOR PRINCIPAL - MIGRACIÓN GRADUAL A MULTITENANT
 * Tablas de Payroll/Sueldos
 * =====================================================
 * Fecha: 2025-01-27
 * Propósito: Orquestar la migración completa de forma segura
 * Estrategia: Ejecutar fases secuencialmente con validaciones
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
            name: 'Fase 1: Preparación',
            script: 'migrate-payroll-multitenant-phase1.sql',
            description: 'Agregar tenant_id nullable a todas las tablas de sueldo',
            critical: true
        },
        {
            name: 'Fase 2: Poblar tenant_id',
            script: 'migrate-payroll-multitenant-phase2.sql',
            description: 'Poblar tenant_id con valor por defecto',
            critical: true
        },
        {
            name: 'Fase 3: Crear índices',
            script: 'migrate-payroll-multitenant-phase3.sql',
            description: 'Crear índices para performance multitenant',
            critical: true
        },
        {
            name: 'Fase 4: Actualizar APIs',
            script: 'migrate-payroll-multitenant-phase4.js',
            description: 'Actualizar APIs para incluir tenant_id',
            critical: true
        },
        {
            name: 'Fase 5: Testing y validación',
            script: 'migrate-payroll-multitenant-phase5.js',
            description: 'Testing exhaustivo de la migración',
            critical: true
        },
        {
            name: 'Fase 6: Hacer tenant_id NOT NULL (Opcional)',
            script: 'migrate-payroll-multitenant-phase6.sql',
            description: 'Hacer tenant_id NOT NULL y agregar Foreign Keys',
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
 * Función para ejecutar script JavaScript
 */
async function executeJSScript(scriptPath) {
    try {
        logger.debug(`🔄 Ejecutando script JS: ${scriptPath}`);
        
        // Importar y ejecutar el script
        const scriptModule = require(scriptPath);
        
        let result;
        if (scriptModule.runAllTests) {
            result = await scriptModule.runAllTests();
        } else if (scriptModule.migratePayrollAPIs) {
            result = await scriptModule.migratePayrollAPIs();
        } else {
            throw new Error('Script no tiene función principal reconocida');
        }
        
        logger.debug(`✅ Script JS ejecutado exitosamente: ${scriptPath}`);
        return result;
        
    } catch (error) {
        logger.error(`❌ Error ejecutando script JS ${scriptPath}:`, error.message);
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
        let result;
        
        // Ejecutar según el tipo de script
        if (phase.script.endsWith('.sql')) {
            result = await executeSQLScript(scriptPath);
        } else if (phase.script.endsWith('.js')) {
            result = await executeJSScript(scriptPath);
        } else {
            throw new Error(`Tipo de script no soportado: ${phase.script}`);
        }
        
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
 * Función para crear backup antes de la migración
 */
async function createBackup() {
    try {
        logger.debug('💾 Creando backup de la base de datos...');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = `backup_multitenant_migration_${timestamp}.sql`;
        const backupPath = path.join(MIGRATION_CONFIG.scriptsPath, '..', 'backups', backupFile);
        
        // Crear directorio de backups si no existe
        const backupsDir = path.dirname(backupPath);
        await fs.mkdir(backupsDir, { recursive: true });
        
        const command = `pg_dump "${MIGRATION_CONFIG.databaseUrl}" > "${backupPath}"`;
        await execAsync(command);
        
        logger.debug(`✅ Backup creado: ${backupPath}`);
        return { success: true, backupPath };
        
    } catch (error) {
        logger.error('❌ Error creando backup:', error.message);
        return { success: false, error: error.message };
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
 * Función principal de migración
 */
async function executeMigration(options = {}) {
    const {
        skipBackup = false,
        skipOptional = false,
        stopOnError = true
    } = options;
    
    logger.debug('🚀 Iniciando migración gradual a multitenant...');
    
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
        
        // 2. Crear backup (opcional)
        if (!skipBackup) {
            logger.debug('2️⃣ Creando backup...');
            const backup = await createBackup();
            if (!backup.success) {
                logger.warn('⚠️  No se pudo crear backup, continuando...');
            } else {
                logger.debug('✅ Backup creado');
            }
        }
        
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
            logger.debug('🎉 Migración completada exitosamente');
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
        report.recommendations.push('✅ Migración completada exitosamente');
        report.recommendations.push('🔍 Verificar que las APIs funcionan correctamente');
        report.recommendations.push('📊 Monitorear performance de las consultas');
    } else {
        report.recommendations.push('❌ Revisar errores y ejecutar fases fallidas');
        report.recommendations.push('💾 Considerar restaurar desde backup si es necesario');
    }
    
    return report;
}

/**
 * Función para ejecutar solo testing
 */
async function runTestingOnly() {
    logger.debug('🧪 Ejecutando solo testing de migración...');
    
    try {
        const { generateTestReport } = require('./migrate-payroll-multitenant-phase5.js');
        const report = await generateTestReport();
        
        logger.debug('🎉 Testing completado');
        return report;
        
    } catch (error) {
        logger.error('❌ Error en testing:', error.message);
        return { success: false, error: error.message };
    }
}

// Exportar funciones
module.exports = {
    executeMigration,
    generateMigrationReport,
    runTestingOnly,
    validatePrerequisites,
    createBackup
};

// Ejecutar si se llama directamente
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0] || 'migrate';
    
    switch (command) {
        case 'migrate':
            executeMigration()
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
            
        case 'test':
            runTestingOnly()
                .then(report => {
                    console.log('🧪 Testing completado:', report.success ? 'ÉXITO' : 'CON ERRORES');
                    process.exit(report.success ? 0 : 1);
                })
                .catch(error => {
                    console.error('❌ Error en testing:', error.message);
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
            
        default:
            console.log('Uso: node execute-multitenant-migration.js [migrate|test|validate]');
            process.exit(1);
    }
}
