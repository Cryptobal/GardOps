-- Script para verificar permisos por módulo
-- Ejecutar en Neon (SQL)

-- 1. Listar todos los permisos existentes
SELECT id, clave, descripcion, categoria
FROM permisos
ORDER BY categoria NULLS FIRST, clave;

-- 2. Contar permisos por categoría
SELECT categoria, COUNT(*) as total
FROM permisos
GROUP BY categoria
ORDER BY categoria NULLS FIRST;

-- 3. Verificar permisos por módulo específico
-- Home
SELECT 'HOME' as modulo, clave, descripcion
FROM permisos
WHERE clave LIKE 'home.%'
ORDER BY clave;

-- Clientes
SELECT 'CLIENTES' as modulo, clave, descripcion
FROM permisos
WHERE clave LIKE 'clientes.%'
ORDER BY clave;

-- Instalaciones
SELECT 'INSTALACIONES' as modulo, clave, descripcion
FROM permisos
WHERE clave LIKE 'instalaciones.%'
ORDER BY clave;

-- Guardias
SELECT 'GUARDIAS' as modulo, clave, descripcion
FROM permisos
WHERE clave LIKE 'guardias.%'
ORDER BY clave;

-- Pauta Mensual
SELECT 'PAUTA_MENSUAL' as modulo, clave, descripcion
FROM permisos
WHERE clave LIKE 'pauta_mensual.%' OR clave LIKE 'pauta-mensual.%'
ORDER BY clave;

-- Pauta Diaria
SELECT 'PAUTA_DIARIA' as modulo, clave, descripcion
FROM permisos
WHERE clave LIKE 'pauta_diaria.%' OR clave LIKE 'pauta-diaria.%'
ORDER BY clave;

-- Payroll
SELECT 'PAYROLL' as modulo, clave, descripcion
FROM permisos
WHERE clave LIKE 'payroll.%'
ORDER BY clave;

-- Configuración
SELECT 'CONFIGURACION' as modulo, clave, descripcion
FROM permisos
WHERE clave LIKE 'configuracion.%' OR clave LIKE 'config.%'
ORDER BY clave;

-- Documentos
SELECT 'DOCUMENTOS' as modulo, clave, descripcion
FROM permisos
WHERE clave LIKE 'documentos.%'
ORDER BY clave;

-- Alertas
SELECT 'ALERTAS' as modulo, clave, descripcion
FROM permisos
WHERE clave LIKE 'alertas.%'
ORDER BY clave;

-- Asignaciones
SELECT 'ASIGNACIONES' as modulo, clave, descripcion
FROM permisos
WHERE clave LIKE 'asignaciones.%'
ORDER BY clave;

-- Turnos Extras
SELECT 'TURNOS_EXTRAS' as modulo, clave, descripcion
FROM permisos
WHERE clave LIKE 'turnos_extras.%'
ORDER BY clave;

-- Usuarios
SELECT 'USUARIOS' as modulo, clave, descripcion
FROM permisos
WHERE clave LIKE 'usuarios.%'
ORDER BY clave;

-- Roles
SELECT 'ROLES' as modulo, clave, descripcion
FROM permisos
WHERE clave LIKE 'roles.%' OR clave LIKE 'rbac.%'
ORDER BY clave;

-- Permisos
SELECT 'PERMISOS' as modulo, clave, descripcion
FROM permisos
WHERE clave LIKE 'permisos.%'
ORDER BY clave;

-- Tenants
SELECT 'TENANTS' as modulo, clave, descripcion
FROM permisos
WHERE clave LIKE 'tenants.%'
ORDER BY clave;

-- PPC
SELECT 'PPC' as modulo, clave, descripcion
FROM permisos
WHERE clave LIKE 'ppc.%'
ORDER BY clave;

-- Estructuras
SELECT 'ESTRUCTURAS' as modulo, clave, descripcion
FROM permisos
WHERE clave LIKE 'estructuras.%'
ORDER BY clave;

-- Sueldos
SELECT 'SUELDOS' as modulo, clave, descripcion
FROM permisos
WHERE clave LIKE 'sueldos.%'
ORDER BY clave;

-- Planillas
SELECT 'PLANILLAS' as modulo, clave, descripcion
FROM permisos
WHERE clave LIKE 'planillas.%'
ORDER BY clave;

-- Logs
SELECT 'LOGS' as modulo, clave, descripcion
FROM permisos
WHERE clave LIKE 'logs.%'
ORDER BY clave;

-- 4. Permisos no clasificados
SELECT 'NO_CLASIFICADOS' as modulo, clave, descripcion
FROM permisos
WHERE clave NOT LIKE 'home.%'
  AND clave NOT LIKE 'clientes.%'
  AND clave NOT LIKE 'instalaciones.%'
  AND clave NOT LIKE 'guardias.%'
  AND clave NOT LIKE 'pauta_mensual.%'
  AND clave NOT LIKE 'pauta_diaria.%'
  AND clave NOT LIKE 'pauta-mensual.%'
  AND clave NOT LIKE 'pauta-diaria.%'
  AND clave NOT LIKE 'payroll.%'
  AND clave NOT LIKE 'configuracion.%'
  AND clave NOT LIKE 'config.%'
  AND clave NOT LIKE 'documentos.%'
  AND clave NOT LIKE 'alertas.%'
  AND clave NOT LIKE 'asignaciones.%'
  AND clave NOT LIKE 'turnos_extras.%'
  AND clave NOT LIKE 'usuarios.%'
  AND clave NOT LIKE 'roles.%'
  AND clave NOT LIKE 'rbac.%'
  AND clave NOT LIKE 'permisos.%'
  AND clave NOT LIKE 'tenants.%'
  AND clave NOT LIKE 'ppc.%'
  AND clave NOT LIKE 'estructuras.%'
  AND clave NOT LIKE 'sueldos.%'
  AND clave NOT LIKE 'planillas.%'
  AND clave NOT LIKE 'logs.%'
ORDER BY clave;
