import { query } from '../src/lib/database';

async function checkAndFixClientesTable() {
  try {
    console.log('🔍 Verificando estructura de tabla clientes...');
    
    // Verificar si la tabla existe
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'clientes'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('📊 Tabla clientes no existe. Creándola...');
      
      await query(`
        CREATE TABLE clientes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nombre TEXT NOT NULL,
          rut TEXT NOT NULL,
          representante_legal TEXT,
          rut_representante TEXT,
          email TEXT,
          telefono TEXT,
          direccion TEXT,
          latitud FLOAT,
          longitud FLOAT,
          ciudad TEXT,
          comuna TEXT,
          razon_social TEXT,
          estado TEXT DEFAULT 'Activo',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          tenant_id UUID
        );
      `);
      
      // Crear índices
      await query(`
        CREATE INDEX idx_clientes_rut ON clientes(rut);
        CREATE INDEX idx_clientes_nombre ON clientes(nombre);
        CREATE INDEX idx_clientes_estado ON clientes(estado);
        CREATE INDEX idx_clientes_created_at ON clientes(created_at);
      `);
      
      console.log('✅ Tabla clientes creada exitosamente');
    } else {
      console.log('✅ Tabla clientes ya existe');
      
      // Verificar columnas existentes
      const columns = await query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'clientes' 
        ORDER BY ordinal_position;
      `);
      
      console.log('📋 Columnas actuales:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
      });
      
      // Verificar si faltan columnas importantes
      const existingColumns = columns.rows.map(col => col.column_name);
      const requiredColumns = [
        'id', 'nombre', 'rut', 'representante_legal', 'rut_representante',
        'email', 'telefono', 'direccion', 'latitud', 'longitud',
        'ciudad', 'comuna', 'razon_social', 'estado', 'created_at', 'updated_at'
      ];
      
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length > 0) {
        console.log('⚠️ Faltan columnas:', missingColumns);
        
        // Agregar columnas faltantes
        for (const column of missingColumns) {
          try {
            let alterQuery = '';
            switch (column) {
              case 'rut':
                alterQuery = 'ALTER TABLE clientes ADD COLUMN rut TEXT';
                break;
              case 'representante_legal':
                alterQuery = 'ALTER TABLE clientes ADD COLUMN representante_legal TEXT';
                break;
              case 'rut_representante':
                alterQuery = 'ALTER TABLE clientes ADD COLUMN rut_representante TEXT';
                break;
              case 'ciudad':
                alterQuery = 'ALTER TABLE clientes ADD COLUMN ciudad TEXT';
                break;
              case 'comuna':
                alterQuery = 'ALTER TABLE clientes ADD COLUMN comuna TEXT';
                break;
              case 'razon_social':
                alterQuery = 'ALTER TABLE clientes ADD COLUMN razon_social TEXT';
                break;
              case 'estado':
                alterQuery = 'ALTER TABLE clientes ADD COLUMN estado TEXT DEFAULT \'Activo\'';
                break;
              case 'updated_at':
                alterQuery = 'ALTER TABLE clientes ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()';
                break;
              default:
                console.log(`⚠️ Columna ${column} no manejada automáticamente`);
                continue;
            }
            
            await query(alterQuery);
            console.log(`✅ Columna ${column} agregada`);
          } catch (error) {
            console.log(`❌ Error agregando columna ${column}:`, error);
          }
        }
      } else {
        console.log('✅ Todas las columnas requeridas están presentes');
      }
    }
    
    // Verificar datos existentes
    const clientCount = await query('SELECT COUNT(*) as count FROM clientes');
    console.log(`📊 Total de clientes en la base de datos: ${clientCount.rows[0].count}`);
    
    if (parseInt(clientCount.rows[0].count) > 0) {
      // Mostrar algunos ejemplos
      const sampleClients = await query('SELECT id, nombre, rut, estado FROM clientes LIMIT 3');
      console.log('📋 Ejemplos de clientes:');
      sampleClients.rows.forEach(client => {
        console.log(`  - ${client.nombre} (RUT: ${client.rut}, Estado: ${client.estado || 'N/A'})`);
      });
    }
    
    console.log('✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error verificando tabla clientes:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  checkAndFixClientesTable()
    .then(() => {
      console.log('🎉 Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en script:', error);
      process.exit(1);
    });
}

export { checkAndFixClientesTable }; 