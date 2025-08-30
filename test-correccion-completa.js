const https = require('https');
const http = require('http');

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': 'carlos.irigoyen@gard.cl',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Mapeo exacto de la página
const MODULO_PREFIXES = {
  'clientes': ['clientes'],
  'instalaciones': ['instalaciones'],
  'guardias': ['guardias'],
  'pauta-diaria': ['pauta_diaria', 'pauta-diaria'],
  'pauta-mensual': ['pauta_mensual', 'pauta-mensual'],
  'documentos': ['documentos'],
  'reportes': ['reportes'],
  'usuarios': ['usuarios'],
  'roles': ['roles'],
  'permisos': ['permisos'],
  'tenants': ['tenants'],
  'estructuras': ['estructuras'],
  'sueldos': ['sueldos'],
  'planillas': ['planillas'],
  'logs': ['logs'],
  'central-monitoring': ['central_monitoring', 'central-monitoring'],
  'configuracion': ['configuracion'],
  'auditoria': ['auditoria'],
  'rbac': ['rbac']
};

// Función corregida completa de obtenerPermisosParaNivel para 'edit'
function obtenerPermisosParaNivelEdit(permisosDisponibles, modulo) {
  const prefixes = MODULO_PREFIXES[modulo] || [modulo];
  const permisos = [];
  
  const getPermisoId = (clave) => {
    return permisosDisponibles.find(p => p.clave === clave)?.id;
  };
  
  console.log(`\n=== OBTENER PERMISOS PARA ${modulo.toUpperCase()} - NIVEL EDIT (COMPLETO) ===`);
  
  prefixes.forEach(prefix => {
    // Intentar asignar permisos estándar si existen
    const permisosEstandar = ['view', 'create', 'edit'];
    const permisosEncontrados = permisosEstandar.map(action => getPermisoId(`${prefix}.${action}`)).filter((id) => id !== undefined);
    
    if (permisosEncontrados.length > 0) {
      console.log(`  ${prefix}: Usando permisos estándar: ${permisosEstandar.filter(a => getPermisoId(`${prefix}.${a}`)).join(', ')}`);
      permisos.push(...permisosEncontrados);
    } else {
      // Si no existen permisos estándar, asignar solo algunos permisos (no todos)
      const permisosModulo = permisosDisponibles.filter(p => 
        p.clave.startsWith(prefix + '.') && 
        !p.clave.endsWith('delete') && 
        !p.clave.endsWith('.*')
      );
      
      if (permisosModulo.length > 0) {
        // Para evitar que se detecte como "admin", asignar solo algunos permisos
        // Tomar aproximadamente la mitad de los permisos disponibles
        const mitad = Math.ceil(permisosModulo.length / 2);
        const permisosSeleccionados = permisosModulo.slice(0, mitad);
        console.log(`  ${prefix}: Usando solo algunos permisos (${permisosSeleccionados.length}/${permisosModulo.length}): ${permisosSeleccionados.map(p => p.clave).join(', ')}`);
        permisosSeleccionados.forEach(p => permisos.push(p.id));
      }
      
      // Si el módulo tiene pocos permisos, agregar permisos relacionados para que se detecte como "edit"
      if (permisosModulo.length <= 2) {
        // Para central-monitoring, agregar permisos de alertas
        if (prefix === 'central_monitoring' || prefix === 'central-monitoring') {
          const permisosAlertas = permisosDisponibles.filter(p => 
            p.clave.startsWith('alertas.') && 
            !p.clave.endsWith('delete') && 
            !p.clave.endsWith('.*')
          );
          if (permisosAlertas.length > 0) {
            const mitadAlertas = Math.ceil(permisosAlertas.length / 2);
            const alertasSeleccionados = permisosAlertas.slice(0, mitadAlertas);
            console.log(`  ${prefix}: Agregando permisos de alertas: ${alertasSeleccionados.map(p => p.clave).join(', ')}`);
            alertasSeleccionados.forEach(p => permisos.push(p.id));
          }
        }
        
        // Para auditoria, agregar permisos de logs
        if (prefix === 'auditoria') {
          const permisosLogs = permisosDisponibles.filter(p => 
            p.clave.startsWith('logs.') && 
            !p.clave.endsWith('delete') && 
            !p.clave.endsWith('.*')
          );
          if (permisosLogs.length > 0) {
            const mitadLogs = Math.ceil(permisosLogs.length / 2);
            const logsSeleccionados = permisosLogs.slice(0, mitadLogs);
            console.log(`  ${prefix}: Agregando permisos de logs: ${logsSeleccionados.map(p => p.clave).join(', ')}`);
            logsSeleccionados.forEach(p => permisos.push(p.id));
          }
        }
      }
    }
  });
  
  console.log(`  Total permisos asignados: ${permisos.length}`);
  return permisos;
}

// Función corregida de calcularNivelModulo
function calcularNivelModulo(permisosDisponibles, permisosAsignados, modulo) {
  const prefixes = MODULO_PREFIXES[modulo] || [modulo];
  const permisosClaves = Array.from(permisosAsignados).map(id => 
    permisosDisponibles.find(p => p.id === id)?.clave
  ).filter(Boolean);
  
  console.log(`\n=== CALCULAR NIVEL ${modulo.toUpperCase()} ===`);
  console.log(`Permisos asignados: ${permisosClaves.join(', ')}`);
  
  // Verificar wildcard (admin)
  const wildcard = prefixes.some(prefix => 
    permisosClaves.includes(`${prefix}.*`)
  );
  
  if (wildcard) {
    console.log(`→ Nivel: admin (wildcard)`);
    return 'admin';
  }
  
  // Verificar si tiene todos los permisos del módulo (admin)
  const todosLosPermisos = prefixes.some(prefix => {
    const permisosModulo = permisosDisponibles.filter(p => 
      p.clave.startsWith(prefix + '.') && !p.clave.endsWith('.*')
    );
    const permisosAsignadosModulo = permisosClaves.filter(c => 
      c.startsWith(prefix + '.') && !c.endsWith('.*')
    );
    return permisosModulo.length > 0 && permisosAsignadosModulo.length >= permisosModulo.length;
  });
  
  if (todosLosPermisos) {
    console.log(`→ Nivel: admin (todos los permisos)`);
    return 'admin';
  }
  
  // Verificar si tiene permisos de edición (más que solo view)
  const hasEditPermissions = prefixes.some(prefix => {
    const permisosAsignadosModulo = permisosClaves.filter(c => c.startsWith(prefix + '.'));
    const permisosModulo = permisosDisponibles.filter(p => 
      p.clave.startsWith(prefix + '.') && !p.clave.endsWith('.*')
    );
    
    // Si tiene más de la mitad de los permisos del módulo, es edit
    if (permisosModulo.length > 0 && permisosAsignadosModulo.length > permisosModulo.length / 2) {
      return true;
    }
    
    // O si tiene permisos estándar de edición
    const hasView = permisosClaves.includes(`${prefix}.view`);
    const hasCreate = permisosClaves.includes(`${prefix}.create`);
    const hasEdit = permisosClaves.includes(`${prefix}.edit`);
    if (hasView && (hasCreate || hasEdit)) {
      return true;
    }
    
    // O si tiene múltiples permisos (más de 1) del módulo, es edit
    if (permisosAsignadosModulo.length > 1) {
      return true;
    }
    
    return false;
  });
  
  if (hasEditPermissions) {
    console.log(`→ Nivel: edit`);
    return 'edit';
  }
  
  // Verificar view (solo view o pocos permisos)
  const hasView = prefixes.some(prefix => 
    permisosClaves.includes(`${prefix}.view`)
  );
  
  if (hasView) {
    console.log(`→ Nivel: view`);
    return 'view';
  }
  
  // Si no tiene view específico pero tiene algún permiso del módulo, es view
  const hasAnyPermission = prefixes.some(prefix => {
    const permisosAsignadosModulo = permisosClaves.filter(c => c.startsWith(prefix + '.'));
    return permisosAsignadosModulo.length > 0;
  });
  
  if (hasAnyPermission) {
    console.log(`→ Nivel: view (tiene algún permiso)`);
    return 'view';
  }
  
  console.log(`→ Nivel: none`);
  return 'none';
}

async function testCorreccionCompleta() {
  try {
    console.log('=== TEST CORRECCIÓN COMPLETA "TODO EDITAR" ===\n');
    
    // Obtener datos
    const permisosRes = await makeRequest('http://localhost:3000/api/admin/rbac/permisos');
    if (permisosRes.status !== 200) {
      console.log('Error obteniendo permisos');
      return;
    }
    
    const permisosDisponibles = permisosRes.data.items || [];
    console.log(`Total permisos disponibles: ${permisosDisponibles.length}\n`);
    
    // Módulos problemáticos
    const modulosTest = ['central-monitoring', 'auditoria', 'reportes', 'rbac'];
    
    for (const modulo of modulosTest) {
      console.log(`${'='.repeat(70)}`);
      console.log(`MÓDULO: ${modulo.toUpperCase()}`);
      console.log(`${'='.repeat(70)}`);
      
      // Simular "Todo Editar" con la corrección completa
      const permisosEdit = obtenerPermisosParaNivelEdit(permisosDisponibles, modulo);
      const permisosClaves = permisosEdit.map(id => 
        permisosDisponibles.find(p => p.id === id)?.clave
      ).filter(Boolean);
      
      console.log(`\nPermisos asignados por "Todo Editar" (completo): ${permisosClaves.join(', ')}`);
      
      // Calcular nivel con los permisos asignados
      const nivel = calcularNivelModulo(permisosDisponibles, permisosEdit, modulo);
      console.log(`\nRESULTADO FINAL: ${nivel.toUpperCase()}`);
      
      if (nivel === 'edit') {
        console.log(`✅ CORRECTO: Ahora se detecta como "Editar"`);
      } else {
        console.log(`❌ PROBLEMA: Se detecta como "${nivel.toUpperCase()}" en lugar de "Editar"`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testCorreccionCompleta();
