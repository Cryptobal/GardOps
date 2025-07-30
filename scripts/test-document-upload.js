const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testDocumentUpload() {
  try {
    console.log('🔍 Verificando conexión a la base de datos...');
    
    // Verificar conexión
    const client = await pool.connect();
    console.log('✅ Conexión exitosa a la base de datos');
    
    // Verificar si la tabla documentos existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'documentos'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Tabla "documentos" existe');
      
      // Verificar estructura de la tabla
      const structure = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'documentos'
        ORDER BY ordinal_position;
      `);
      
      console.log('📋 Estructura de la tabla documentos:');
      structure.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
      
      // Verificar si la columna fecha_vencimiento existe
      const fechaVencimientoExists = structure.rows.some(row => row.column_name === 'fecha_vencimiento');
      if (!fechaVencimientoExists) {
        console.log('⚠️ Columna fecha_vencimiento no existe, agregándola...');
        await client.query('ALTER TABLE documentos ADD COLUMN fecha_vencimiento DATE');
        console.log('✅ Columna fecha_vencimiento agregada');
      } else {
        console.log('✅ Columna fecha_vencimiento existe');
      }
      
      // Verificar si la columna contenido_archivo existe
      const contenidoArchivoExists = structure.rows.some(row => row.column_name === 'contenido_archivo');
      if (!contenidoArchivoExists) {
        console.log('⚠️ Columna contenido_archivo no existe, agregándola...');
        await client.query('ALTER TABLE documentos ADD COLUMN contenido_archivo BYTEA');
        console.log('✅ Columna contenido_archivo agregada');
      } else {
        console.log('✅ Columna contenido_archivo existe');
      }
      
    } else {
      console.log('❌ Tabla "documentos" no existe');
      
      // Crear la tabla si no existe
      console.log('🔨 Creando tabla documentos...');
      await client.query(`
        CREATE TABLE documentos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          modulo VARCHAR(50) NOT NULL,
          entidad_id UUID NOT NULL,
          nombre_original VARCHAR(255) NOT NULL,
          tipo VARCHAR(100),
          url VARCHAR(500),
          contenido_archivo BYTEA,
          tamaño BIGINT NOT NULL,
          tipo_documento_id UUID,
          fecha_vencimiento DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Tabla documentos creada');
    }
    
    // Verificar tabla tipos_documentos
    const tiposTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tipos_documentos'
      );
    `);
    
    if (tiposTableCheck.rows[0].exists) {
      console.log('✅ Tabla "tipos_documentos" existe');
      
      // Verificar si hay tipos de documentos
      const tiposCount = await client.query('SELECT COUNT(*) FROM tipos_documentos');
      console.log(`📊 Hay ${tiposCount.rows[0].count} tipos de documentos`);
      
      if (parseInt(tiposCount.rows[0].count) === 0) {
        console.log('⚠️ No hay tipos de documentos, agregando algunos...');
        await client.query(`
          INSERT INTO tipos_documentos (modulo, nombre, requiere_vencimiento, dias_antes_alarma) VALUES
          ('instalaciones', 'Certificado de Bomberos', true, 30),
          ('instalaciones', 'Permiso Municipal', true, 60),
          ('instalaciones', 'Manual de Procedimientos', false, 0),
          ('clientes', 'Contrato de Servicio', true, 90),
          ('clientes', 'Certificado de Seguridad', true, 45),
          ('guardias', 'Certificado de Capacitación', true, 365),
          ('guardias', 'Examen Médico', true, 180)
        `);
        console.log('✅ Tipos de documentos agregados');
      }
    } else {
      console.log('❌ Tabla "tipos_documentos" no existe');
      
      // Crear la tabla si no existe
      console.log('🔨 Creando tabla tipos_documentos...');
      await client.query(`
        CREATE TABLE tipos_documentos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          modulo VARCHAR(50) NOT NULL,
          nombre VARCHAR(255) NOT NULL,
          requiere_vencimiento BOOLEAN DEFAULT false,
          dias_antes_alarma INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Tabla tipos_documentos creada');
    }
    
    client.release();
    console.log('✅ Prueba completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    await pool.end();
  }
}

testDocumentUpload(); 