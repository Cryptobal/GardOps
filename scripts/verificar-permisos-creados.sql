-- Script para verificar permisos creados
-- Ejecutar en Neon (SQL)

-- 1. Contar total de permisos
SELECT 'TOTAL PERMISOS' as tipo, COUNT(*) as cantidad
FROM permisos;

-- 2. Contar permisos por categoría
SELECT 
  categoria,
  COUNT(*) as total_permisos,
  STRING_AGG(clave, ', ' ORDER BY clave) as permisos
FROM permisos
GROUP BY categoria
ORDER BY categoria NULLS FIRST;

-- 3. Verificar módulos específicos
SELECT 'HOME' as modulo, COUNT(*) as total
FROM permisos
WHERE clave LIKE 'home.%';

SELECT 'CLIENTES' as modulo, COUNT(*) as total
FROM permisos
WHERE clave LIKE 'clientes.%';

SELECT 'INSTALACIONES' as modulo, COUNT(*) as total
FROM permisos
WHERE clave LIKE 'instalaciones.%';

SELECT 'GUARDIAS' as modulo, COUNT(*) as total
FROM permisos
WHERE clave LIKE 'guardias.%';

SELECT 'PAUTA_MENSUAL' as modulo, COUNT(*) as total
FROM permisos
WHERE clave LIKE 'pauta_mensual.%';

SELECT 'PAUTA_DIARIA' as modulo, COUNT(*) as total
FROM permisos
WHERE clave LIKE 'pauta_diaria.%';

SELECT 'PAYROLL' as modulo, COUNT(*) as total
FROM permisos
WHERE clave LIKE 'payroll.%';

SELECT 'CONFIGURACION' as modulo, COUNT(*) as total
FROM permisos
WHERE clave LIKE 'configuracion.%';

SELECT 'DOCUMENTOS' as modulo, COUNT(*) as total
FROM permisos
WHERE clave LIKE 'documentos.%';

SELECT 'ALERTAS' as modulo, COUNT(*) as total
FROM permisos
WHERE clave LIKE 'alertas.%';

SELECT 'ASIGNACIONES' as modulo, COUNT(*) as total
FROM permisos
WHERE clave LIKE 'asignaciones.%';

SELECT 'TURNOS_EXTRAS' as modulo, COUNT(*) as total
FROM permisos
WHERE clave LIKE 'turnos_extras.%';

SELECT 'USUARIOS' as modulo, COUNT(*) as total
FROM permisos
WHERE clave LIKE 'usuarios.%';

SELECT 'ROLES' as modulo, COUNT(*) as total
FROM permisos
WHERE clave LIKE 'roles.%';

SELECT 'PERMISOS' as modulo, COUNT(*) as total
FROM permisos
WHERE clave LIKE 'permisos.%';

SELECT 'TENANTS' as modulo, COUNT(*) as total
FROM permisos
WHERE clave LIKE 'tenants.%';

SELECT 'PPC' as modulo, COUNT(*) as total
FROM permisos
WHERE clave LIKE 'ppc.%';

SELECT 'ESTRUCTURAS' as modulo, COUNT(*) as total
FROM permisos
WHERE clave LIKE 'estructuras.%';

SELECT 'SUELDOS' as modulo, COUNT(*) as total
FROM permisos
WHERE clave LIKE 'sueldos.%';

SELECT 'PLANILLAS' as modulo, COUNT(*) as total
FROM permisos
WHERE clave LIKE 'planillas.%';

SELECT 'LOGS' as modulo, COUNT(*) as total
FROM permisos
WHERE clave LIKE 'logs.%';

-- 4. Verificar permisos especiales del Super Admin
SELECT 'PERMISOS ESPECIALES SUPER ADMIN' as tipo, clave, categoria
FROM permisos
WHERE clave LIKE 'rbac.%' OR clave LIKE '%admin%' OR clave LIKE '%platform%'
ORDER BY clave;

-- 5. Verificar permisos básicos (view, create, edit, delete)
SELECT 'PERMISOS BÁSICOS' as tipo, COUNT(*) as total
FROM permisos
WHERE clave LIKE '%.view' OR clave LIKE '%.create' OR clave LIKE '%.edit' OR clave LIKE '%.delete';

-- 6. Mostrar todos los permisos ordenados
SELECT 'TODOS LOS PERMISOS' as tipo, clave, descripcion, categoria
FROM permisos
ORDER BY categoria NULLS FIRST, clave;
