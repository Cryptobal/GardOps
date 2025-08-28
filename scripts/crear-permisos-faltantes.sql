-- Script para crear permisos faltantes
-- Ejecutar en Neon (SQL)
-- Este script usa ON CONFLICT DO NOTHING para no afectar permisos existentes

-- 1. Home
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('home.view', 'view home', 'home') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('home.create', 'create home', 'home') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('home.edit', 'edit home', 'home') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('home.delete', 'delete home', 'home') ON CONFLICT (clave) DO NOTHING;

-- 2. Clientes
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('clientes.view', 'view clientes', 'clientes') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('clientes.create', 'create clientes', 'clientes') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('clientes.edit', 'edit clientes', 'clientes') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('clientes.delete', 'delete clientes', 'clientes') ON CONFLICT (clave) DO NOTHING;

-- 3. Instalaciones
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('instalaciones.view', 'view instalaciones', 'instalaciones') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('instalaciones.create', 'create instalaciones', 'instalaciones') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('instalaciones.edit', 'edit instalaciones', 'instalaciones') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('instalaciones.delete', 'delete instalaciones', 'instalaciones') ON CONFLICT (clave) DO NOTHING;

-- 4. Guardias
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('guardias.view', 'view guardias', 'guardias') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('guardias.create', 'create guardias', 'guardias') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('guardias.edit', 'edit guardias', 'guardias') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('guardias.delete', 'delete guardias', 'guardias') ON CONFLICT (clave) DO NOTHING;

-- 5. Pauta Mensual
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('pauta_mensual.view', 'view pauta_mensual', 'pauta_mensual') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('pauta_mensual.create', 'create pauta_mensual', 'pauta_mensual') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('pauta_mensual.edit', 'edit pauta_mensual', 'pauta_mensual') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('pauta_mensual.delete', 'delete pauta_mensual', 'pauta_mensual') ON CONFLICT (clave) DO NOTHING;

-- 6. Pauta Diaria
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('pauta_diaria.view', 'view pauta_diaria', 'pauta_diaria') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('pauta_diaria.create', 'create pauta_diaria', 'pauta_diaria') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('pauta_diaria.edit', 'edit pauta_diaria', 'pauta_diaria') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('pauta_diaria.delete', 'delete pauta_diaria', 'pauta_diaria') ON CONFLICT (clave) DO NOTHING;

-- 7. Payroll
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('payroll.view', 'view payroll', 'payroll') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('payroll.create', 'create payroll', 'payroll') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('payroll.edit', 'edit payroll', 'payroll') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('payroll.delete', 'delete payroll', 'payroll') ON CONFLICT (clave) DO NOTHING;

-- 8. Configuración
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('configuracion.view', 'view configuracion', 'configuracion') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('configuracion.create', 'create configuracion', 'configuracion') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('configuracion.edit', 'edit configuracion', 'configuracion') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('configuracion.delete', 'delete configuracion', 'configuracion') ON CONFLICT (clave) DO NOTHING;

-- 9. Documentos
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('documentos.view', 'view documentos', 'documentos') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('documentos.create', 'create documentos', 'documentos') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('documentos.edit', 'edit documentos', 'documentos') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('documentos.delete', 'delete documentos', 'documentos') ON CONFLICT (clave) DO NOTHING;

-- 10. Alertas
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('alertas.view', 'view alertas', 'alertas') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('alertas.create', 'create alertas', 'alertas') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('alertas.edit', 'edit alertas', 'alertas') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('alertas.delete', 'delete alertas', 'alertas') ON CONFLICT (clave) DO NOTHING;

-- 11. Asignaciones
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('asignaciones.view', 'view asignaciones', 'asignaciones') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('asignaciones.create', 'create asignaciones', 'asignaciones') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('asignaciones.edit', 'edit asignaciones', 'asignaciones') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('asignaciones.delete', 'delete asignaciones', 'asignaciones') ON CONFLICT (clave) DO NOTHING;

-- 12. Turnos Extras
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('turnos_extras.view', 'view turnos_extras', 'turnos_extras') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('turnos_extras.create', 'create turnos_extras', 'turnos_extras') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('turnos_extras.edit', 'edit turnos_extras', 'turnos_extras') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('turnos_extras.delete', 'delete turnos_extras', 'turnos_extras') ON CONFLICT (clave) DO NOTHING;

-- 13. Usuarios
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('usuarios.view', 'view usuarios', 'usuarios') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('usuarios.create', 'create usuarios', 'usuarios') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('usuarios.edit', 'edit usuarios', 'usuarios') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('usuarios.delete', 'delete usuarios', 'usuarios') ON CONFLICT (clave) DO NOTHING;

-- 14. Roles
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('roles.view', 'view roles', 'roles') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('roles.create', 'create roles', 'roles') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('roles.edit', 'edit roles', 'roles') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('roles.delete', 'delete roles', 'roles') ON CONFLICT (clave) DO NOTHING;

-- 15. Permisos
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('permisos.view', 'view permisos', 'permisos') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('permisos.create', 'create permisos', 'permisos') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('permisos.edit', 'edit permisos', 'permisos') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('permisos.delete', 'delete permisos', 'permisos') ON CONFLICT (clave) DO NOTHING;

-- 16. Tenants
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('tenants.view', 'view tenants', 'tenants') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('tenants.create', 'create tenants', 'tenants') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('tenants.edit', 'edit tenants', 'tenants') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('tenants.delete', 'delete tenants', 'tenants') ON CONFLICT (clave) DO NOTHING;

-- 17. PPC
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('ppc.view', 'view ppc', 'ppc') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('ppc.create', 'create ppc', 'ppc') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('ppc.edit', 'edit ppc', 'ppc') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('ppc.delete', 'delete ppc', 'ppc') ON CONFLICT (clave) DO NOTHING;

-- 18. Estructuras
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('estructuras.view', 'view estructuras', 'estructuras') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('estructuras.create', 'create estructuras', 'estructuras') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('estructuras.edit', 'edit estructuras', 'estructuras') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('estructuras.delete', 'delete estructuras', 'estructuras') ON CONFLICT (clave) DO NOTHING;

-- 19. Sueldos
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('sueldos.view', 'view sueldos', 'sueldos') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('sueldos.create', 'create sueldos', 'sueldos') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('sueldos.edit', 'edit sueldos', 'sueldos') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('sueldos.delete', 'delete sueldos', 'sueldos') ON CONFLICT (clave) DO NOTHING;

-- 20. Planillas
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('planillas.view', 'view planillas', 'planillas') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('planillas.create', 'create planillas', 'planillas') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('planillas.edit', 'edit planillas', 'planillas') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('planillas.delete', 'delete planillas', 'planillas') ON CONFLICT (clave) DO NOTHING;

-- 21. Logs
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('logs.view', 'view logs', 'logs') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('logs.create', 'create logs', 'logs') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('logs.edit', 'edit logs', 'logs') ON CONFLICT (clave) DO NOTHING;
INSERT INTO permisos (clave, descripcion, categoria) VALUES ('logs.delete', 'delete logs', 'logs') ON CONFLICT (clave) DO NOTHING;

-- Verificar resultado
SELECT 'PERMISOS CREADOS' as resultado, COUNT(*) as total
FROM permisos
WHERE clave LIKE '%.view' OR clave LIKE '%.create' OR clave LIKE '%.edit' OR clave LIKE '%.delete';

-- Mostrar permisos por módulo
SELECT 
  categoria,
  COUNT(*) as total_permisos,
  STRING_AGG(clave, ', ' ORDER BY clave) as permisos
FROM permisos
WHERE categoria IN ('home', 'clientes', 'instalaciones', 'guardias', 'pauta_mensual', 'pauta_diaria', 'payroll', 'configuracion', 'documentos', 'alertas', 'asignaciones', 'turnos_extras', 'usuarios', 'roles', 'permisos', 'tenants', 'ppc', 'estructuras', 'sueldos', 'planillas', 'logs')
GROUP BY categoria
ORDER BY categoria;
