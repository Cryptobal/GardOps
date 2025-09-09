
## ✅ USUARIOS CON MÚLTIPLES ROLES: No detectados

## ⚠️ PROBLEMA: USUARIOS ACTIVOS SIN ROLES
Estos usuarios no pueden acceder al sistema.

- **carlos.irigoyen@gard.cl** (Carlos)
- **guardia@gardops.com** (Pedro)
- **supervisor@gardops.com** (Juan)

## ✅ PERMISOS DUPLICADOS: No detectados

## ✅ ROLES SIN PERMISOS: No detectados

## 📋 ESTRUCTURA DE TABLAS RBAC

- as_turnos_roles_servicio
- auditoria_rbac
- documentos_usuarios
- logs_usuarios
- permisos
- roles
- roles_permisos
- roles_servicio
- sueldo_historial_roles
- usuarios
- usuarios_permisos
- usuarios_roles

## 👤 ANÁLISIS DE CARLOS.IRIGOYEN@GARD.CL

- **Email**: carlos.irigoyen@gard.cl
- **Activo**: Sí
- **Rol (campo)**: admin
- **Tenant**: 1397e653-a702-4020-9702-3ae4f3f8b337
- **Número de roles**: 0
- **Roles**: NINGUNO
- **Total permisos**: 0

## 📈 ESTADÍSTICAS GENERALES

- **Usuarios activos**: 3
- **Usuarios inactivos**: 0
- **Total de roles**: 16
- **Total de permisos**: 152
- **Usuarios con roles**: 17
- **Total de tenants**: 1

# 💡 RECOMENDACIONES PARA SOLUCIONAR LOS PROBLEMAS

1. **IMPLEMENTAR UN ROL POR USUARIO**: Limitar a un solo rol por usuario para evitar conflictos
2. **LIMPIAR CACHÉ DE PERMISOS**: Implementar invalidación de caché cuando se modifican permisos
3. **ESTANDARIZAR NOMENCLATURA**: Usar consistentemente tablas sin prefijo rbac_
4. **ASIGNAR ROLES FALTANTES**: Asignar roles a todos los usuarios activos
5. **ELIMINAR DUPLICADOS**: Limpiar permisos y roles duplicados
6. **IMPLEMENTAR AUDITORÍA**: Registrar todos los cambios de permisos
7. **SIMPLIFICAR PERMISOS**: Considerar permisos directos en lugar de roles múltiples