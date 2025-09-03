#!/usr/bin/env node

const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function checkOperadorReal() {
  try {
    console.log('🔍 VERIFICANDO PERMISOS REALES DEL ROL OPERADOR EN EL BACKEND...\n');
    
    const rolId = 'b2cd2001-0fd6-4345-b272-a8e20ad0768b'; // Operador
    
    // Ver permisos asignados
    const permisos = await sql`
      SELECT p.id, p.clave, p.descripcion, p.categoria
      FROM roles_permisos rp
      JOIN permisos p ON rp.permiso_id = p.id
      WHERE rp.rol_id = ${rolId}
      ORDER BY p.categoria, p.clave
    `;
    
    console.log(`🔑 PERMISOS DEL ROL OPERADOR: ${permisos.rows.length} permisos\n`);
    
    // Agrupar por categoría/módulo
    const porModulo = {};
    permisos.rows.forEach(p => {
      // Extraer el módulo del clave (ej: 'clientes.view' -> 'clientes')
      const modulo = p.clave.split('.')[0];
      if (!porModulo[modulo]) porModulo[modulo] = [];
      porModulo[modulo].push(p.clave);
    });
    
    console.log('📊 PERMISOS POR MÓDULO:');
    console.log('========================\n');
    
    // Módulos esperados
    const modulos = [
      'clientes', 'instalaciones', 'guardias', 'pauta-diaria', 'pauta_diaria',
      'pauta-mensual', 'pauta_mensual', 'documentos', 'reportes', 'usuarios',
      'roles', 'permisos', 'tenants', 'estructuras', 'sueldos', 'planillas',
      'logs', 'central_monitoring', 'configuracion', 'config', 'auditoria', 'rbac',
      'alertas', 'turnos', 'turnos_extras', 'pautas'
    ];
    
    modulos.forEach(modulo => {
      const permisos = porModulo[modulo] || [];
      if (permisos.length > 0) {
        console.log(`📂 ${modulo}:`);
        permisos.forEach(p => console.log(`  • ${p}`));
        
        // Determinar nivel
        let nivel = 'none';
        if (permisos.includes(`${modulo}.*`)) {
          nivel = 'ADMIN (wildcard)';
        } else if (permisos.length > 3) {
          nivel = 'ADMIN (muchos permisos)';
        } else if (permisos.some(p => p.includes('.edit') || p.includes('.create'))) {
          nivel = 'EDIT';
        } else if (permisos.some(p => p.includes('.view'))) {
          nivel = 'VIEW';
        } else {
          nivel = 'VIEW (algún permiso)';
        }
        console.log(`  → Nivel calculado: ${nivel}\n`);
      }
    });
    
    console.log('\n❌ MÓDULOS SIN PERMISOS:');
    modulos.forEach(modulo => {
      if (!porModulo[modulo] || porModulo[modulo].length === 0) {
        console.log(`  • ${modulo}: SIN ACCESO`);
      }
    });
    
    // Comparar con lo que muestra el frontend
    console.log('\n🔥 COMPARACIÓN CON FRONTEND:');
    console.log('================================');
    console.log('MÓDULO          | BACKEND         | FRONTEND (según imagen)');
    console.log('----------------|-----------------|------------------------');
    console.log('Clientes        | ' + (porModulo['clientes'] ? porModulo['clientes'].length + ' permisos' : 'SIN ACCESO') + '    | Editar ❌');
    console.log('Instalaciones   | ' + (porModulo['instalaciones'] ? porModulo['instalaciones'].length + ' permisos' : 'SIN ACCESO') + '    | Editar ❌');
    console.log('Guardias        | ' + (porModulo['guardias'] ? porModulo['guardias'].length + ' permisos' : 'SIN ACCESO') + '    | Editar ❌');
    console.log('Pauta Diaria    | ' + (porModulo['pauta-diaria'] || porModulo['pauta_diaria'] ? 'CON PERMISOS' : 'SIN ACCESO') + ' | Editar ✓ ❌');
    console.log('Documentos      | ' + (porModulo['documentos'] ? porModulo['documentos'].length + ' permisos' : 'SIN ACCESO') + '    | Editar ❌');
    
    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkOperadorReal();
