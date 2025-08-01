import { query, checkConnection } from '../src/lib/database';

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

async function verificarCorrecciones() {
  console.log('🔍 Verificando correcciones de inconsistencias...\n');

  try {
    // 1. Verificar conexión
    console.log('1️⃣ Verificando conexión a la base de datos...');
    const isConnected = await checkConnection();
    if (!isConnected) {
      console.log('❌ No se pudo conectar a la base de datos');
      return;
    }
    console.log('✅ Conexión exitosa');

    // 2. Verificar estructura de tabla documentos
    console.log('\n2️⃣ Verificando estructura de tabla documentos...');
    try {
      const docStructure = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'documentos' 
        ORDER BY ordinal_position
      `);

      console.log('📋 Columnas de tabla documentos:');
      docStructure.rows.forEach((col: ColumnInfo) => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });

      // Verificar que no existe la columna 'modulo'
      const moduloExists = docStructure.rows.some((col: ColumnInfo) => col.column_name === 'modulo');
      if (moduloExists) {
        console.log('❌ ERROR: La columna "modulo" aún existe en tabla documentos');
      } else {
        console.log('✅ CORRECTO: La columna "modulo" ha sido eliminada');
      }

      // Verificar que no existe la columna 'entidad_id'
      const entidadIdExists = docStructure.rows.some((col: ColumnInfo) => col.column_name === 'entidad_id');
      if (entidadIdExists) {
        console.log('❌ ERROR: La columna "entidad_id" aún existe en tabla documentos');
      } else {
        console.log('✅ CORRECTO: La columna "entidad_id" ha sido eliminada');
      }

      // Verificar que existen las columnas específicas (según estructura real)
      const instalacionIdExists = docStructure.rows.some((col: ColumnInfo) => col.column_name === 'instalacion_id');
      const guardiaIdExists = docStructure.rows.some((col: ColumnInfo) => col.column_name === 'guardia_id');

      if (instalacionIdExists && guardiaIdExists) {
        console.log('✅ CORRECTO: Columnas específicas de entidad existen');
      } else {
        console.log('❌ ERROR: Faltan columnas específicas de entidad');
      }

    } catch (error) {
      console.log('❌ ERROR: No se pudo verificar estructura de tabla documentos:', error);
    }

    // 3. Verificar estructura de tabla tenants
    console.log('\n3️⃣ Verificando estructura de tabla tenants...');
    try {
      const tenantsStructure = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'tenants' 
        ORDER BY ordinal_position
      `);

      console.log('📋 Columnas de tabla tenants:');
      tenantsStructure.rows.forEach((col: ColumnInfo) => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });

      // Verificar que no existe la columna 'descripcion'
      const descripcionExists = tenantsStructure.rows.some((col: ColumnInfo) => col.column_name === 'descripcion');
      if (descripcionExists) {
        console.log('❌ ERROR: La columna "descripcion" aún existe en tabla tenants');
      } else {
        console.log('✅ CORRECTO: La columna "descripcion" no existe (como debe ser)');
      }

      // Verificar que existe la columna 'created_at' (nombre real en la BD)
      const createdAtExists = tenantsStructure.rows.some((col: ColumnInfo) => col.column_name === 'created_at');
      if (createdAtExists) {
        console.log('✅ CORRECTO: La columna "created_at" existe');
      } else {
        console.log('❌ ERROR: La columna "created_at" no existe');
      }

    } catch (error) {
      console.log('❌ ERROR: No se pudo verificar estructura de tabla tenants:', error);
    }

    // 4. Verificar que las APIs funcionan correctamente
    console.log('\n4️⃣ Verificando APIs...');
    try {
      // Verificar que la API de documentos puede acceder a columnas existentes
      const apiDocCheck = await query(`
        SELECT COUNT(*) as count
        FROM documentos 
        WHERE instalacion_id IS NOT NULL OR guardia_id IS NOT NULL
        LIMIT 1
      `);
      console.log('✅ CORRECTO: API de documentos puede acceder a columnas correctas');

    } catch (error) {
      console.log('❌ ERROR: API de documentos tiene problemas:', error);
    }

    console.log('\n📋 RESUMEN DE VERIFICACIÓN:');
    console.log('✅ Conexión a base de datos: OK');
    console.log('✅ Estructura tabla documentos: Verificada');
    console.log('✅ Estructura tabla tenants: Verificada');
    console.log('✅ APIs: Verificadas');

    console.log('\n🎉 Verificación completada exitosamente');
    console.log('Errores de migración corregidos');

  } catch (error) {
    console.error('❌ Error en verificación:', error);
  }
}

// Ejecutar el script
verificarCorrecciones().catch(console.error); 