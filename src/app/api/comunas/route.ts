import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

// Cache para evitar verificaciones repetitivas
let comunasTableVerified = false;

// GET /api/comunas - Obtener todas las comunas
export async function GET() {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'comunas', action: 'read:list' });
if (deny) return deny;

  try {
    // Verificar tabla solo una vez por sesión
    if (!comunasTableVerified) {
      await ensureComunasTable();
      comunasTableVerified = true;
    }
    
    // Obtener comunas de la base de datos
    const result = await query(`
      SELECT id, nombre, region 
      FROM comunas 
      ORDER BY nombre
    `);
    
    const comunas = result.rows || [];
    
    return NextResponse.json({ success: true, data: comunas });
  } catch (error) {
    console.error('❌ Error en GET /api/comunas:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener comunas' },
      { status: 500 }
    );
  }
}

// Función para asegurar que la tabla comunas existe
async function ensureComunasTable() {
  try {
    // Verificar si la tabla ya existe
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'comunas'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      // Crear tabla si no existe
      await query(`
        CREATE TABLE comunas (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nombre VARCHAR(100) NOT NULL UNIQUE,
          region VARCHAR(100) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      // Insertar comunas comunes de Chile
      await query(`
        INSERT INTO comunas (nombre, region) VALUES
        ('Santiago', 'Región Metropolitana'),
        ('Providencia', 'Región Metropolitana'),
        ('Las Condes', 'Región Metropolitana'),
        ('Ñuñoa', 'Región Metropolitana'),
        ('Maipú', 'Región Metropolitana'),
        ('Valparaíso', 'Región de Valparaíso'),
        ('Viña del Mar', 'Región de Valparaíso'),
        ('Quilpué', 'Región de Valparaíso'),
        ('Villa Alemana', 'Región de Valparaíso'),
        ('Concepción', 'Región del Biobío'),
        ('Talcahuano', 'Región del Biobío'),
        ('Chillán', 'Región del Biobío'),
        ('La Serena', 'Región de Coquimbo'),
        ('Coquimbo', 'Región de Coquimbo'),
        ('Antofagasta', 'Región de Antofagasta'),
        ('Calama', 'Región de Antofagasta'),
        ('Iquique', 'Región de Tarapacá'),
        ('Arica', 'Región de Arica y Parinacota'),
        ('Temuco', 'Región de La Araucanía'),
        ('Valdivia', 'Región de Los Ríos'),
        ('Puerto Montt', 'Región de Los Lagos'),
        ('Punta Arenas', 'Región de Magallanes')
      `);
      
      console.log('✅ Tabla comunas creada con datos iniciales');
    } else {
      console.log('✅ Tabla comunas ya existe');
    }
  } catch (error) {
    console.error('❌ Error verificando tabla comunas:', error);
    throw error;
  }
} 