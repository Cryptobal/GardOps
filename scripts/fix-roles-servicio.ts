import { query } from '../src/lib/database';

async function fixRolesServicio() {
  console.log('🔧 Verificando estructura de tabla roles_servicio...');
  
  try {
    // Verificar si la tabla existe
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'roles_servicio'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ La tabla roles_servicio no existe. Creándola...');
      
      await query(`
        CREATE TABLE roles_servicio (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nombre TEXT NOT NULL,
          dias_trabajo INTEGER DEFAULT 4,
          dias_descanso INTEGER DEFAULT 4,
          horas_turno INTEGER DEFAULT 12,
          hora_inicio TEXT DEFAULT '08:00',
          hora_termino TEXT DEFAULT '20:00',
          estado TEXT DEFAULT 'Activo',
          tenant_id UUID,
          created_at TIMESTAMP DEFAULT now(),
          updated_at TIMESTAMP DEFAULT now()
        )
      `);
      
      console.log('✅ Tabla roles_servicio creada');
    } else {
      console.log('✅ La tabla roles_servicio existe');
    }
    
    // Verificar columnas existentes
    const columns = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'roles_servicio'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Columnas actuales:');
    columns.rows.forEach((col: any) => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    // Agregar columnas faltantes si es necesario
    const columnNames = columns.rows.map((col: any) => col.column_name);
    
    if (!columnNames.includes('dias_trabajo')) {
      console.log('➕ Agregando columna dias_trabajo...');
      await query('ALTER TABLE roles_servicio ADD COLUMN dias_trabajo INTEGER DEFAULT 4');
    }
    
    if (!columnNames.includes('dias_descanso')) {
      console.log('➕ Agregando columna dias_descanso...');
      await query('ALTER TABLE roles_servicio ADD COLUMN dias_descanso INTEGER DEFAULT 4');
    }
    
    if (!columnNames.includes('horas_turno')) {
      console.log('➕ Agregando columna horas_turno...');
      await query('ALTER TABLE roles_servicio ADD COLUMN horas_turno INTEGER DEFAULT 12');
    }
    
    if (!columnNames.includes('hora_inicio')) {
      console.log('➕ Agregando columna hora_inicio...');
      await query('ALTER TABLE roles_servicio ADD COLUMN hora_inicio TEXT DEFAULT \'08:00\'');
    }
    
    if (!columnNames.includes('hora_termino')) {
      console.log('➕ Agregando columna hora_termino...');
      await query('ALTER TABLE roles_servicio ADD COLUMN hora_termino TEXT DEFAULT \'20:00\'');
    }
    
    if (!columnNames.includes('estado')) {
      console.log('➕ Agregando columna estado...');
      await query('ALTER TABLE roles_servicio ADD COLUMN estado TEXT DEFAULT \'Activo\'');
    }
    
    if (!columnNames.includes('updated_at')) {
      console.log('➕ Agregando columna updated_at...');
      await query('ALTER TABLE roles_servicio ADD COLUMN updated_at TIMESTAMP DEFAULT now()');
    }
    
    // Insertar algunos roles de ejemplo si la tabla está vacía
    const count = await query('SELECT COUNT(*) FROM roles_servicio');
    
    if (parseInt(count.rows[0].count) === 0) {
      console.log('📝 Insertando roles de ejemplo...');
      
      await query(`
        INSERT INTO roles_servicio (nombre, dias_trabajo, dias_descanso, horas_turno, hora_inicio, hora_termino) VALUES
        ('Noche 4x4x12', 4, 4, 12, '20:00', '08:00'),
        ('Día 4x4x12', 4, 4, 12, '08:00', '20:00'),
        ('Noche 5x2x12', 5, 2, 12, '20:00', '08:00'),
        ('Día 5x2x12', 5, 2, 12, '08:00', '20:00')
      `);
      
      console.log('✅ Roles de ejemplo insertados');
    }
    
    console.log('🎉 Verificación de roles_servicio completada');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixRolesServicio(); 