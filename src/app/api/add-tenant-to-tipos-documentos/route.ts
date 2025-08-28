import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Agregando tenant_id a tipos_documentos...');

    // 1. Verificar y obtener tenant_id
    console.log('📋 Verificando tenant...');
    const tenantResult = await query('SELECT id FROM tenants WHERE nombre = $1 LIMIT 1', ['Gard']);
    
    let tenantId;
    if (tenantResult.rows.length === 0) {
      const newTenant = await query('INSERT INTO tenants (nombre, activo) VALUES ($1, $2) RETURNING id', ['Gard', true]);
      tenantId = newTenant.rows[0].id;
      console.log('✅ Tenant "Gard" creado con ID:', tenantId);
    } else {
      tenantId = tenantResult.rows[0].id;
      console.log('✅ Tenant "Gard" encontrado con ID:', tenantId);
    }

    // 2. Verificar si la columna tenant_id ya existe
    const checkColumn = await query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tipos_documentos' 
        AND column_name = 'tenant_id'
      ) as columna_existe
    `);

    if (checkColumn.rows[0].columna_existe) {
      console.log('ℹ️ Columna tenant_id ya existe en tipos_documentos');
    } else {
      // 3. Agregar columna tenant_id
      await query('ALTER TABLE tipos_documentos ADD COLUMN tenant_id UUID REFERENCES tenants(id)');
      console.log('✅ Columna tenant_id agregada a tipos_documentos');
      
      // 4. Actualizar registros existentes
      await query('UPDATE tipos_documentos SET tenant_id = $1 WHERE tenant_id IS NULL', [tenantId]);
      console.log('✅ Registros actualizados en tipos_documentos');
    }

    // 5. Verificar el resultado
    const verification = await query(`
      SELECT 
        COUNT(*) as total_registros,
        COUNT(tenant_id) as registros_con_tenant
      FROM tipos_documentos
    `);

    console.log('✅ Proceso completado exitosamente');
    console.log('📊 Resultados:', verification.rows[0]);

    return NextResponse.json({
      success: true,
      message: 'Tenant_id agregado exitosamente',
      tenant_id: tenantId,
      verification: verification.rows[0]
    });

  } catch (error) {
    console.error('❌ Error agregando tenant_id:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error agregando tenant_id',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
