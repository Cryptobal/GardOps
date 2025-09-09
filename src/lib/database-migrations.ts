import { 
  query, 
  checkConnection, 
  checkTableExists, 
  getColumnType, 
  hasData 
} from './database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
interface TableValidation {
  name: string;
  exists: boolean;
  hasUuidId: boolean;
  hasData: boolean;
  currentIdType?: string;
}

interface MigrationResult {
  success: boolean;
  message: string;
  warnings: string[];
  errors: string[];
}

export async function validateRequiredTables(): Promise<TableValidation[]> {
  const requiredTables = ['tenants', 'instalaciones', 'roles_servicio', 'guardias'];
  const validations: TableValidation[] = [];

  for (const tableName of requiredTables) {
    const exists = await checkTableExists(tableName);
    let hasUuidId = false;
    let currentIdType: string | undefined = undefined;
    let hasDataFlag = false;

    if (exists) {
      const typeResult = await getColumnType(tableName, 'id');
      currentIdType = typeResult || undefined;
      hasUuidId = currentIdType === 'uuid';
      hasDataFlag = await hasData(tableName);
    }

    validations.push({
      name: tableName,
      exists,
      hasUuidId,
      hasData: hasDataFlag,
      currentIdType
    });
  }

  return validations;
}

export async function migrateGuardiasWithData(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    message: '',
    warnings: [],
    errors: []
  };

  try {
    logger.debug('🔄 Iniciando migración preservando datos de guardias...');

    // 1. Verificar que tenants existe
    const tenantsExists = await checkTableExists('tenants');
    if (!tenantsExists) {
      // Crear tabla tenants básica
      await query(`
        CREATE TABLE tenants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nombre TEXT NOT NULL,
          activo BOOLEAN DEFAULT true,
          creado_en TIMESTAMP DEFAULT now()
        )
      `);
      logger.debug('✅ Tabla tenants creada');
    }

    // Asegurar que existe al menos un tenant
    const tenantCount = await query('SELECT COUNT(*) FROM tenants');
    if (parseInt(tenantCount.rows[0].count) === 0) {
      await query(`INSERT INTO tenants (nombre) VALUES ('GardOps')`);
      logger.debug('✅ Tenant por defecto "GardOps" creado');
    }

    // 2. Obtener datos actuales de guardias
    const guardiasData = await query('SELECT * FROM guardias');
    logger.debug(`📊 Encontrados ${guardiasData.rows.length} registros en guardias`);

    if (guardiasData.rows.length === 0) {
      result.warnings.push('⚠️ La tabla guardias está vacía, procediendo con recreación simple');
      const simpleResult = await fixGuardiasTable();
      return simpleResult;
    }

    // 3. Crear tabla temporal con nuevos datos
    await query('DROP TABLE IF EXISTS guardias_temp CASCADE');
    await query(`
      CREATE TABLE guardias_temp (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        legacy_id INTEGER,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL,
        email TEXT UNIQUE,
        telefono TEXT,
        activo BOOLEAN DEFAULT true,
        creado_en TIMESTAMP DEFAULT now()
      )
    `);

    // 4. Obtener tenant_id por defecto
    const tenantResult = await query('SELECT id FROM tenants LIMIT 1');
    if (tenantResult.rows.length === 0) {
      throw new Error('No se encontró ningún tenant en la base de datos');
    }
    const defaultTenantId = tenantResult.rows[0].id;

    // 5. Migrar datos preservando información
    for (const row of guardiasData.rows) {
      await query(`
        INSERT INTO guardias_temp (tenant_id, legacy_id, nombre, apellido, email, telefono, activo, creado_en)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        defaultTenantId,
        row.id, // Guardar el ID original como legacy_id
        row.nombre || 'Sin nombre',
        row.apellido || 'Sin apellido', 
        row.email,
        row.telefono,
        row.activo !== undefined ? row.activo : true,
        row.creado_en || new Date()
      ]);
    }

    logger.debug(`✅ ${guardiasData.rows.length} registros migrados a guardias_temp`);

    // 6. Eliminar tabla original y renombrar
    await query('DROP TABLE guardias CASCADE');
    await query('ALTER TABLE guardias_temp RENAME TO guardias');

    logger.debug('✅ Tabla guardias recreada con UUIDs preservando todos los datos');

    result.success = true;
    result.message = `✅ Migración completada: ${guardiasData.rows.length} registros preservados con UUIDs`;
    result.warnings.push(`ℹ️ Los IDs originales se guardaron en el campo 'legacy_id' para referencia`);
    result.warnings.push(`ℹ️ Todos los registros se asignaron al tenant por defecto 'GardOps'`);

    return result;

  } catch (error) {
    result.errors.push(`❌ Error en migración con datos: ${error}`);
    result.success = false;
    console.error(result.errors[result.errors.length - 1]);
    return result;
  }
}

export async function fixGuardiasTable(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    message: '',
    warnings: [],
    errors: []
  };

  try {
    const exists = await checkTableExists('guardias');
    
    if (!exists) {
      // Crear tabla guardias nueva
      await query(`
        CREATE TABLE guardias (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
          nombre TEXT NOT NULL,
          apellido TEXT NOT NULL,
          email TEXT UNIQUE,
          telefono TEXT,
          activo BOOLEAN DEFAULT true,
          creado_en TIMESTAMP DEFAULT now()
        )
      `);
      
      result.success = true;
      result.message = '✅ Tabla guardias creada con campo id UUID';
      logger.debug(result.message);
      return result;
    }

    // Verificar tipo de id en tabla existente
    const idType = await getColumnType('guardias', 'id');
    
    if (idType === 'uuid') {
      result.success = true;
      result.message = '✅ Tabla guardias ya tiene campo id UUID correcto';
      logger.debug(result.message);
      return result;
    }

    // La tabla existe pero id no es UUID
    const hasDataFlag = await hasData('guardias');
    
    if (hasDataFlag) {
      result.warnings.push(`⚠️ ADVERTENCIA: La tabla guardias tiene datos y su campo id no es UUID`);
      result.warnings.push(`   Para continuar, necesitas decidir si:`);
      result.warnings.push(`   1. Preservar los datos existentes (requiere migración manual)`);
      result.warnings.push(`   2. Eliminar la tabla y recrearla (se perderán los datos)`);
      
      result.errors.push(`❌ No se puede proceder automáticamente. Tabla guardias tiene datos con id tipo '${idType}'`);
      result.success = false;
      
      result.warnings.forEach((w: string) => console.log(w));
      result.errors.forEach((e: string) => console.log(e));
      
      return result;
    }

    // No tiene datos, podemos recrearla
    result.warnings.push(`⚠️ ADVERTENCIA: La tabla 'guardias' existe pero su campo 'id' es tipo '${idType}', no UUID`);
    result.warnings.push(`   Recreando tabla automáticamente (no tiene datos)...`);
    
    await query('DROP TABLE IF EXISTS guardias CASCADE');
    await query(`
      CREATE TABLE guardias (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL,
        email TEXT UNIQUE,
        telefono TEXT,
        activo BOOLEAN DEFAULT true,
        creado_en TIMESTAMP DEFAULT now()
      )
    `);

    result.success = true;
    result.message = '✅ Tabla guardias recreada con campo id UUID';
    
    result.warnings.forEach((w: string) => console.log(w));
    logger.debug(result.message);
    
    return result;

  } catch (error) {
    result.errors.push(`❌ Error procesando tabla guardias: ${error}`);
    result.success = false;
    console.error(result.errors[result.errors.length - 1]);
    return result;
  }
}

export async function validateOtherTablesUUID(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    message: '',
    warnings: [],
    errors: []
  };

  const tablesToCheck = ['tenants', 'instalaciones', 'roles_servicio'];
  const invalidTables: { name: string; type: string }[] = [];

  for (const tableName of tablesToCheck) {
    const exists = await checkTableExists(tableName);
    
    if (!exists) {
      result.warnings.push(`⚠️ Tabla '${tableName}' no existe`);
      continue;
    }

    const idType = await getColumnType(tableName, 'id');
    
    if (idType !== 'uuid') {
      invalidTables.push({ name: tableName, type: idType || 'unknown' });
    }
  }

  if (invalidTables.length > 0) {
    result.success = false;
    result.errors.push('❌ Error: Algunas tablas tienen campo id no-UUID:');
    invalidTables.forEach(table => {
      result.errors.push(`   - ${table.name}: tipo ${table.type}`);
    });
    result.errors.push('   Estas tablas deben tener campo id UUID antes de continuar.');
    
    result.errors.forEach((e: string) => console.log(e));
  } else {
    result.message = '✅ Todas las tablas requeridas tienen campo id UUID correcto';
    logger.debug(result.message);
  }

  return result;
}

export async function createPautasMensualesTable(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    message: '',
    warnings: [],
    errors: []
  };

  try {
    const exists = await checkTableExists('pautas_mensuales');
    
    if (exists) {
      result.message = '✅ Tabla pautas_mensuales ya existe';
      result.success = true;
      logger.debug(result.message);
      return result;
    }

    // Crear tabla pautas_mensuales
    await query(`
      CREATE TABLE IF NOT EXISTS pautas_mensuales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        instalacion_id UUID REFERENCES instalaciones(id) ON DELETE CASCADE,
        guardia_id UUID REFERENCES guardias(id) ON DELETE CASCADE,
        rol_servicio_id UUID REFERENCES roles_servicio(id) ON DELETE SET NULL,
        dia DATE NOT NULL,
        tipo TEXT CHECK (tipo IN ('turno', 'libre', 'licencia', 'permiso', 'falta_asignacion')) DEFAULT 'turno',
        observacion TEXT,
        creado_en TIMESTAMP DEFAULT now()
      )
    `);

    logger.debug('✅ Tabla pautas_mensuales creada con esquema optimizado para multitenencia');

    // Crear índices eficientes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_pautas_mensuales_tenant ON pautas_mensuales(tenant_id)
    `);
    logger.debug('✅ Índice idx_pautas_mensuales_tenant creado');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_pautas_mensuales_guardia ON pautas_mensuales(guardia_id)
    `);
    logger.debug('✅ Índice idx_pautas_mensuales_guardia creado');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_pautas_mensuales_dia ON pautas_mensuales(dia)
    `);
    logger.debug('✅ Índice idx_pautas_mensuales_dia creado');

    result.success = true;
    result.message = '✅ Tabla pautas_mensuales creada y validada con éxito, diseño multi-tenant aplicado.';
    logger.debug(result.message);

    return result;

  } catch (error) {
    result.errors.push(`❌ Error creando tabla pautas_mensuales: ${error}`);
    result.success = false;
    console.error(result.errors[result.errors.length - 1]);
    return result;
  }
}

export async function createPautasDiariasTable(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    message: '',
    warnings: [],
    errors: []
  };

  try {
    // Verificar que las tablas requeridas existan
    const requiredTables = ['pautas_mensuales', 'guardias'];
    for (const tableName of requiredTables) {
      const exists = await checkTableExists(tableName);
      if (!exists) {
        result.errors.push(`❌ Error: La tabla requerida '${tableName}' no existe`);
        result.success = false;
        return result;
      }

      // Verificar que el ID sea UUID
      const idType = await getColumnType(tableName, 'id');
      if (idType !== 'uuid') {
        result.errors.push(`❌ Error: La tabla '${tableName}' no tiene campo id UUID (actual: ${idType})`);
        result.success = false;
        return result;
      }
    }

    const exists = await checkTableExists('pautas_diarias');
    
    if (exists) {
      result.message = '✅ Tabla pautas_diarias ya existe';
      result.success = true;
      logger.debug(result.message);
      return result;
    }

    // Crear tabla pautas_diarias
    await query(`
      CREATE TABLE IF NOT EXISTS pautas_diarias (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        pauta_mensual_id UUID REFERENCES pautas_mensuales(id) ON DELETE CASCADE,
        fecha DATE NOT NULL,
        guardia_asignado_id UUID REFERENCES guardias(id) ON DELETE SET NULL,
        estado TEXT CHECK (estado IN ('asistio', 'licencia', 'falta_asignacion', 'permiso', 'libre', 'ppc', 'cobertura')) NOT NULL,
        cobertura_por_id UUID REFERENCES guardias(id) ON DELETE SET NULL,
        observacion TEXT,
        creado_en TIMESTAMP DEFAULT now()
      )
    `);

    logger.debug('✅ Tabla pautas_diarias creada con esquema completo para gestión operativa');

    // Crear índices para búsquedas eficientes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_pautas_diarias_tenant ON pautas_diarias(tenant_id)
    `);
    logger.debug('✅ Índice idx_pautas_diarias_tenant creado');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_pautas_diarias_fecha ON pautas_diarias(fecha)
    `);
    logger.debug('✅ Índice idx_pautas_diarias_fecha creado');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_pautas_diarias_estado ON pautas_diarias(estado)
    `);
    logger.debug('✅ Índice idx_pautas_diarias_estado creado');

    // Crear índice adicional para pauta mensual
    await query(`
      CREATE INDEX IF NOT EXISTS idx_pautas_diarias_pauta_mensual ON pautas_diarias(pauta_mensual_id)
    `);
    logger.debug('✅ Índice idx_pautas_diarias_pauta_mensual creado');

    result.success = true;
    result.message = '✅ Tabla pautas_diarias creada con éxito. Asistencia diaria lista para gestión operativa y pagos.';
    logger.debug(result.message);

    return result;

  } catch (error) {
    result.errors.push(`❌ Error creando tabla pautas_diarias: ${error}`);
    result.success = false;
    console.error(result.errors[result.errors.length - 1]);
    return result;
  }
}

export async function createPuestosPorCubrirTable(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    message: '',
    warnings: [],
    errors: []
  };

  try {
    // Verificar que las tablas requeridas existan
    const requiredTables = ['pautas_diarias', 'instalaciones', 'roles_servicio'];
    for (const tableName of requiredTables) {
      const exists = await checkTableExists(tableName);
      if (!exists) {
        result.errors.push(`❌ Error: La tabla requerida '${tableName}' no existe`);
        result.success = false;
        return result;
      }

      // Verificar que el ID sea UUID
      const idType = await getColumnType(tableName, 'id');
      if (idType !== 'uuid') {
        result.errors.push(`❌ Error: La tabla '${tableName}' no tiene campo id UUID (actual: ${idType})`);
        result.success = false;
        return result;
      }
    }

    const exists = await checkTableExists('puestos_por_cubrir');
    
    if (exists) {
      result.message = '✅ Tabla puestos_por_cubrir ya existe';
      result.success = true;
      logger.debug(result.message);
      return result;
    }

    // Crear tabla puestos_por_cubrir
    await query(`
      CREATE TABLE IF NOT EXISTS puestos_por_cubrir (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        pauta_diaria_id UUID REFERENCES pautas_diarias(id) ON DELETE CASCADE,
        instalacion_id UUID REFERENCES instalaciones(id) ON DELETE SET NULL,
        rol_servicio_id UUID REFERENCES roles_servicio(id) ON DELETE SET NULL,
        motivo TEXT CHECK (motivo IN ('falta_asignacion', 'falta_con_aviso', 'ausencia_temporal', 'renuncia')) DEFAULT 'falta_asignacion',
        observacion TEXT,
        creado_en TIMESTAMP DEFAULT now()
      )
    `);

    logger.debug('✅ Tabla puestos_por_cubrir creada para gestión de PPC');

    // Crear índices para búsquedas eficientes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_ppc_tenant ON puestos_por_cubrir(tenant_id)
    `);
    logger.debug('✅ Índice idx_ppc_tenant creado');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_ppc_instalacion ON puestos_por_cubrir(instalacion_id)
    `);
    logger.debug('✅ Índice idx_ppc_instalacion creado');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_ppc_motivo ON puestos_por_cubrir(motivo)
    `);
    logger.debug('✅ Índice idx_ppc_motivo creado');

    // Crear índice adicional para pauta diaria
    await query(`
      CREATE INDEX IF NOT EXISTS idx_ppc_pauta_diaria ON puestos_por_cubrir(pauta_diaria_id)
    `);
    logger.debug('✅ Índice idx_ppc_pauta_diaria creado');

    result.success = true;
    result.message = '✅ Tabla puestos_por_cubrir creada con éxito para gestión de PPC operativos.';
    logger.debug(result.message);

    return result;

  } catch (error) {
    result.errors.push(`❌ Error creando tabla puestos_por_cubrir: ${error}`);
    result.success = false;
    console.error(result.errors[result.errors.length - 1]);
    return result;
  }
}

export async function createTurnosExtrasTable(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    message: '',
    warnings: [],
    errors: []
  };

  try {
    // Verificar que las tablas requeridas existan
    const requiredTables = ['pautas_diarias', 'guardias', 'instalaciones'];
    for (const tableName of requiredTables) {
      const exists = await checkTableExists(tableName);
      if (!exists) {
        result.errors.push(`❌ Error: La tabla requerida '${tableName}' no existe`);
        result.success = false;
        return result;
      }

      // Verificar que el ID sea UUID
      const idType = await getColumnType(tableName, 'id');
      if (idType !== 'uuid') {
        result.errors.push(`❌ Error: La tabla '${tableName}' no tiene campo id UUID (actual: ${idType})`);
        result.success = false;
        return result;
      }
    }

    const exists = await checkTableExists('turnos_extras');
    
    if (exists) {
      result.message = '✅ Tabla turnos_extras ya existe';
      result.success = true;
      logger.debug(result.message);
      return result;
    }

    // Crear tabla turnos_extras
    await query(`
      CREATE TABLE IF NOT EXISTS turnos_extras (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        pauta_diaria_id UUID REFERENCES pautas_diarias(id) ON DELETE CASCADE,
        guardia_id UUID REFERENCES guardias(id) ON DELETE SET NULL,
        instalacion_origen_id UUID REFERENCES instalaciones(id) ON DELETE SET NULL,
        instalacion_destino_id UUID REFERENCES instalaciones(id) ON DELETE SET NULL,
        tipo TEXT CHECK (tipo IN ('cobertura', 'refuerzo', 'emergencia')) DEFAULT 'cobertura',
        aprobado_por TEXT,
        observacion TEXT,
        creado_en TIMESTAMP DEFAULT now()
      )
    `);

    logger.debug('✅ Tabla turnos_extras creada para gestión de turnos adicionales');

    // Crear índices para búsquedas eficientes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_turnos_extras_tenant ON turnos_extras(tenant_id)
    `);
    logger.debug('✅ Índice idx_turnos_extras_tenant creado');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_turnos_extras_guardia ON turnos_extras(guardia_id)
    `);
    logger.debug('✅ Índice idx_turnos_extras_guardia creado');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_turnos_extras_destino ON turnos_extras(instalacion_destino_id)
    `);
    logger.debug('✅ Índice idx_turnos_extras_destino creado');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_turnos_extras_tipo ON turnos_extras(tipo)
    `);
    logger.debug('✅ Índice idx_turnos_extras_tipo creado');

    // Crear índice adicional para pauta diaria
    await query(`
      CREATE INDEX IF NOT EXISTS idx_turnos_extras_pauta_diaria ON turnos_extras(pauta_diaria_id)
    `);
    logger.debug('✅ Índice idx_turnos_extras_pauta_diaria creado');

    result.success = true;
    result.message = '✅ Tabla turnos_extras creada con éxito para gestión de turnos adicionales y coberturas.';
    logger.debug(result.message);

    return result;

  } catch (error) {
    result.errors.push(`❌ Error creando tabla turnos_extras: ${error}`);
    result.success = false;
    console.error(result.errors[result.errors.length - 1]);
    return result;
  }
}

export async function createUsuariosTable(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    message: '',
    warnings: [],
    errors: []
  };

  try {
    const exists = await checkTableExists('usuarios');
    
    if (!exists) {
      // Crear tabla usuarios nueva con todas las columnas
      await query(`
        CREATE TABLE usuarios (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          nombre TEXT NOT NULL,
          apellido TEXT NOT NULL,
          rol TEXT CHECK (rol IN ('admin', 'supervisor', 'guardia')) DEFAULT 'guardia',
          activo BOOLEAN DEFAULT true,
          fecha_creacion TIMESTAMP DEFAULT now(),
          ultimo_acceso TIMESTAMP,
          telefono TEXT,
          avatar TEXT
        )
      `);

      logger.debug('✅ Tabla usuarios creada con todas las columnas');

      // Crear índices
      await query(`CREATE INDEX IF NOT EXISTS idx_usuarios_tenant ON usuarios(tenant_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol)`);
      
      logger.debug('✅ Índices de usuarios creados');

      result.success = true;
      result.message = '✅ Tabla usuarios creada con soporte multi-tenant';
      logger.debug(result.message);
      return result;
    }

    // La tabla existe, verificar y agregar columnas faltantes una por una
    logger.debug('🔧 Verificando columnas de tabla usuarios existente...');

    // Obtener tenant por defecto para valores por defecto
    const tenantResult = await query('SELECT id FROM tenants LIMIT 1');
    if (tenantResult.rows.length === 0) {
      throw new Error('No se encontró ningún tenant en la base de datos');
    }
    const defaultTenantId = tenantResult.rows[0].id;

    // Verificar y agregar tenant_id
    const tenantIdExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios' 
        AND column_name = 'tenant_id'
      )
    `);

    if (!tenantIdExists.rows[0].exists) {
      await query(`ALTER TABLE usuarios ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE`);
      await query(`UPDATE usuarios SET tenant_id = $1 WHERE tenant_id IS NULL`, [defaultTenantId]);
      await query(`ALTER TABLE usuarios ALTER COLUMN tenant_id SET NOT NULL`);
      await query(`CREATE INDEX IF NOT EXISTS idx_usuarios_tenant ON usuarios(tenant_id)`);
      logger.debug('✅ Columna tenant_id agregada');
    }

    // Verificar y agregar password
    const passwordExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios' 
        AND column_name = 'password'
      )
    `);

    if (!passwordExists.rows[0].exists) {
      await query(`ALTER TABLE usuarios ADD COLUMN password TEXT`);
      // Asignar contraseña temporal para registros existentes
      await query(`UPDATE usuarios SET password = 'temp123' WHERE password IS NULL`);
      await query(`ALTER TABLE usuarios ALTER COLUMN password SET NOT NULL`);
      console.log('✅ Columna password agregada (contraseña temporal para usuarios existentes)');
    }

    // Verificar y agregar otras columnas necesarias
    const columnsToAdd = [
      { name: 'email', type: 'TEXT UNIQUE' },
      { name: 'nombre', type: 'TEXT' },
      { name: 'apellido', type: 'TEXT' },
      { name: 'rol', type: 'TEXT CHECK (rol IN (\'admin\', \'supervisor\', \'guardia\')) DEFAULT \'guardia\'' },
      { name: 'activo', type: 'BOOLEAN DEFAULT true' },
      { name: 'fecha_creacion', type: 'TIMESTAMP DEFAULT now()' },
      { name: 'ultimo_acceso', type: 'TIMESTAMP' },
      { name: 'telefono', type: 'TEXT' },
      { name: 'avatar', type: 'TEXT' }
    ];

    for (const column of columnsToAdd) {
      const columnExists = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'usuarios' 
          AND column_name = $1
        )
      `, [column.name]);

      if (!columnExists.rows[0].exists) {
        await query(`ALTER TABLE usuarios ADD COLUMN ${column.name} ${column.type}`);
        logger.debug(`✅ Columna ${column.name} agregada`);

        // Valores por defecto para columnas críticas
        if (column.name === 'email') {
          await query(`UPDATE usuarios SET email = CONCAT('user', id, '@gardops.com') WHERE email IS NULL`);
          await query(`ALTER TABLE usuarios ALTER COLUMN email SET NOT NULL`);
        } else if (column.name === 'nombre') {
          await query(`UPDATE usuarios SET nombre = 'Usuario' WHERE nombre IS NULL`);
          await query(`ALTER TABLE usuarios ALTER COLUMN nombre SET NOT NULL`);
        } else if (column.name === 'apellido') {
          await query(`UPDATE usuarios SET apellido = 'Sistema' WHERE apellido IS NULL`);
          await query(`ALTER TABLE usuarios ALTER COLUMN apellido SET NOT NULL`);
        }
      }
    }

    // Crear índices adicionales
    await query(`CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol)`);

    logger.debug('✅ Tabla usuarios verificada y actualizada con todas las columnas');

    result.success = true;
    result.message = '✅ Tabla usuarios migrada completamente con soporte multi-tenant';
    result.warnings.push(`ℹ️ Usuarios existentes actualizados con valores por defecto`);
    logger.debug(result.message);

    return result;

  } catch (error) {
    result.errors.push(`❌ Error creando/migrando tabla usuarios: ${error}`);
    result.success = false;
    console.error(result.errors[result.errors.length - 1]);
    return result;
  }
}

export async function runDatabaseMigrations(preserveData: boolean = false): Promise<MigrationResult> {
  // 🛡️ FUNCIÓN DESHABILITADA PARA PREVENIR MODIFICACIONES AUTOMÁTICAS
  logger.debug('🚫 runDatabaseMigrations DESHABILITADA - Previniendo modificaciones automáticas de BD');
  
  const finalResult: MigrationResult = {
    success: true,
    message: 'Migraciones deshabilitadas - BD preservada sin cambios',
    warnings: ['Función de migraciones deshabilitada por seguridad'],
    errors: []
  };

  return finalResult;

  // CÓDIGO ORIGINAL DESHABILITADO (PRESERVADO PARA REFERENCIA):
  /*
  const finalResult: MigrationResult = {
    success: false,
    message: '',
    warnings: [],
    errors: []
  };

  logger.debug('🚀 Iniciando migración de base de datos...\n');

  try {
    // 1. Verificar conexión
    const connected = await checkConnection();
    if (!connected) {
      finalResult.errors.push('❌ No se pudo conectar a la base de datos');
      return finalResult;
    }
    logger.debug('✅ Conexión a base de datos establecida\n');

    // 2. Validar otras tablas UUID primero (pero permitir que no existan)
    logger.debug('🔍 Validando tablas requeridas...');
    // Crear tablas básicas si no existen
    await createBasicTablesIfNeeded();

    // 3. Arreglar tabla guardias
    logger.debug('\n🔧 Procesando tabla guardias...');
    let guardiasResult: MigrationResult;
    
    if (preserveData) {
      guardiasResult = await migrateGuardiasWithData();
    } else {
      guardiasResult = await fixGuardiasTable();
    }
    
    finalResult.warnings.push(...guardiasResult.warnings);
    finalResult.errors.push(...guardiasResult.errors);

    if (!guardiasResult.success) {
      finalResult.success = false;
      return finalResult;
    }

    // 4. Crear tabla pautas_mensuales
    logger.debug('\n📋 Creando tabla pautas_mensuales...');
    const pautasResult = await createPautasMensualesTable();
    finalResult.warnings.push(...pautasResult.warnings);
    finalResult.errors.push(...pautasResult.errors);

    if (!pautasResult.success) {
      finalResult.success = false;
      return finalResult;
    }

    // 5. Crear tabla pautas_diarias
    logger.debug('\n📋 Creando tabla pautas_diarias...');
    const pautasDiariasResult = await createPautasDiariasTable();
    finalResult.warnings.push(...pautasDiariasResult.warnings);
    finalResult.errors.push(...pautasDiariasResult.errors);

    if (!pautasDiariasResult.success) {
      finalResult.success = false;
      return finalResult;
    }

    // 6. Crear tabla puestos_por_cubrir
    logger.debug('\n📋 Creando tabla puestos_por_cubrir...');
    const ppcResult = await createPuestosPorCubrirTable();
    finalResult.warnings.push(...ppcResult.warnings);
    finalResult.errors.push(...ppcResult.errors);

    if (!ppcResult.success) {
      finalResult.success = false;
      return finalResult;
    }

    // 7. Crear tabla turnos_extras
    logger.debug('\n📋 Creando tabla turnos_extras...');
    const turnosExtrasResult = await createTurnosExtrasTable();
    finalResult.warnings.push(...turnosExtrasResult.warnings);
    finalResult.errors.push(...turnosExtrasResult.errors);

    if (!turnosExtrasResult.success) {
      finalResult.success = false;
      return finalResult;
    }

    // 8. Crear tabla usuarios
    logger.debug('\n📋 Creando tabla usuarios...');
    const usuariosResult = await createUsuariosTable();
    finalResult.warnings.push(...usuariosResult.warnings);
    finalResult.errors.push(...usuariosResult.errors);

    if (!usuariosResult.success) {
      finalResult.success = false;
      return finalResult;
    }

    // Éxito total
    finalResult.success = true;
    finalResult.message = '🎉 Migración completada exitosamente';
    logger.debug(`\n${finalResult.message}`);

    return finalResult;

  } catch (error) {
    finalResult.errors.push(`❌ Error general en migración: ${error}`);
    finalResult.success = false;
    console.error(finalResult.errors[finalResult.errors.length - 1]);
    return finalResult;
  }
  */
}

async function createBasicTablesIfNeeded(): Promise<void> {
  // Crear tabla tenants si no existe
  const tenantsExists = await checkTableExists('tenants');
  if (!tenantsExists) {
    await query(`
      CREATE TABLE tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre TEXT NOT NULL,
        activo BOOLEAN DEFAULT true,
        creado_en TIMESTAMP DEFAULT now()
      )
    `);
    
    await query(`
      INSERT INTO tenants (nombre) VALUES ('GardOps')
    `);
    logger.debug('✅ Tabla tenants creada con tenant por defecto');
  }

  // Crear tabla instalaciones si no existe
  const instalacionesExists = await checkTableExists('instalaciones');
  if (!instalacionesExists) {
    await query(`
      CREATE TABLE instalaciones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        nombre TEXT NOT NULL,
        direccion TEXT,
        activo BOOLEAN DEFAULT true,
        creado_en TIMESTAMP DEFAULT now()
      )
    `);
    logger.debug('✅ Tabla instalaciones creada');
  }

  // Crear tabla roles_servicio si no existe
  const rolesExists = await checkTableExists('roles_servicio');
  if (!rolesExists) {
    await query(`
      CREATE TABLE roles_servicio (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        activo BOOLEAN DEFAULT true,
        creado_en TIMESTAMP DEFAULT now()
      )
    `);
    logger.debug('✅ Tabla roles_servicio creada');
  }
} 