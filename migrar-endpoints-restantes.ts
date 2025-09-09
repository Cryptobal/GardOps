// Script para migrar automáticamente endpoints restantes
// que usan tablas obsoletas del modelo ADO

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const endpointsAMigrar = [
  {
    file: 'src/app/api/pauta-mensual/crear/route.ts',
    replacements: [
      {
        from: 'FROM as_turnos_configuracion tc',
        to: 'FROM as_turnos_puestos_operativos po'
      },
      {
        from: 'INNER JOIN as_turnos_roles_servicio rs ON tc.rol_servicio_id = rs.id',
        to: 'INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id'
      },
      {
        from: 'WHERE tc.instalacion_id = $1 AND tc.estado = \'Activo\'',
        to: 'WHERE po.instalacion_id = $1'
      },
      {
        from: 'FROM as_turnos_ppc ppc',
        to: 'FROM as_turnos_puestos_operativos po'
      },
      {
        from: 'INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id',
        to: 'WHERE po.es_ppc = true'
      },
      {
        from: 'INNER JOIN as_turnos_asignaciones ta ON g.id = ta.guardia_id',
        to: 'INNER JOIN as_turnos_puestos_operativos po ON g.id = po.guardia_id'
      },
      {
        from: 'INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id',
        to: 'WHERE po.es_ppc = false'
      },
      {
        from: 'WHERE tr.instalacion_id = $1',
        to: 'WHERE po.instalacion_id = $1'
      },
      {
        from: 'AND ta.estado = \'Activa\'',
        to: 'AND po.es_ppc = false'
      }
    ]
  },
  {
    file: 'src/app/api/pauta-mensual/verificar-roles/route.ts',
    replacements: [
      {
        from: 'FROM as_turnos_configuracion tc',
        to: 'FROM as_turnos_puestos_operativos po'
      },
      {
        from: 'INNER JOIN as_turnos_roles_servicio rs ON tc.rol_servicio_id = rs.id',
        to: 'INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id'
      },
      {
        from: 'WHERE tc.instalacion_id = $1 AND tc.estado = \'Activo\'',
        to: 'WHERE po.instalacion_id = $1'
      },
      {
        from: 'FROM as_turnos_ppc ppc',
        to: 'FROM as_turnos_puestos_operativos po'
      },
      {
        from: 'INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id',
        to: 'WHERE po.es_ppc = true'
      },
      {
        from: 'INNER JOIN as_turnos_asignaciones ta ON g.id = ta.guardia_id',
        to: 'INNER JOIN as_turnos_puestos_operativos po ON g.id = po.guardia_id'
      },
      {
        from: 'INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id',
        to: 'WHERE po.es_ppc = false'
      },
      {
        from: 'WHERE tr.instalacion_id = $1',
        to: 'WHERE po.instalacion_id = $1'
      },
      {
        from: 'AND ta.estado = \'Activa\'',
        to: 'AND po.es_ppc = false'
      }
    ]
  }
];

function migrarArchivo(filePath: string, replacements: any[]) {
  try {
    const content = readFileSync(filePath, 'utf8');
    let newContent = content;
    
    replacements.forEach((replacement, index) => {
      newContent = newContent.replace(replacement.from, replacement.to);
      console.log(`  ✅ Reemplazo ${index + 1}: ${replacement.from} → ${replacement.to}`);
    });
    
    writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ Archivo migrado: ${filePath}`);
  } catch (error) {
    console.error(`❌ Error migrando ${filePath}:`, error);
  }
}

console.log('🚀 Iniciando migración automática de endpoints restantes...\n');

endpointsAMigrar.forEach(({ file, replacements }) => {
  console.log(`📁 Migrando: ${file}`);
  migrarArchivo(file, replacements);
  console.log('');
});

console.log('✅ Migración automática completada'); 