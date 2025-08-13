# 📋 Guía: Cómo Asignar Roles a Usuarios

## 🎯 Resumen

Esta funcionalidad permite asignar y desasignar roles a usuarios del sistema de forma intuitiva y en tiempo real.

## 🚀 Cómo Usar

### 1. Acceder a la Página de Usuarios
- Ve a **Configuración > Seguridad > Usuarios**
- URL: `http://localhost:3000/configuracion/seguridad/usuarios`

### 2. Gestionar Roles de un Usuario
1. **Encuentra el usuario** en la tabla
2. **Haz click en el ícono de configuración** (⚙️) en la columna "Roles"
3. **Se abrirá un modal** con todos los roles disponibles
4. **Marca/desmarca los checkboxes** de los roles que quieres asignar/desasignar
5. **Los cambios se guardan automáticamente** al hacer click en los checkboxes

## 🎨 Interfaz de Usuario

### Tabla de Usuarios
- **Columna "Roles"**: Muestra un ícono de configuración (⚙️) para cada usuario
- **Estado**: Indica si el usuario está activo o inactivo
- **Acciones**: Botón para activar/desactivar usuarios

### Modal de Gestión de Roles
- **Información del usuario**: Nombre y email
- **Lista de roles**: Checkboxes para cada rol disponible
- **Estado en tiempo real**: Los checkboxes se actualizan automáticamente
- **Notificaciones**: Toast messages para confirmar cambios

## 🔧 Funcionalidades Técnicas

### Endpoints Utilizados
- **GET** `/api/admin/rbac/usuarios/[id]/roles` - Obtener roles de un usuario
- **POST** `/api/admin/rbac/usuarios/[id]/roles` - Asignar/desasignar roles

### Parámetros del POST
```json
{
  "rol_id": "uuid-del-rol",
  "action": "add" | "remove"
}
```

### Respuestas
- **Éxito**: `{ "ok": true }`
- **Error**: `{ "ok": false, "error": "mensaje" }`

## 📊 Roles Disponibles

### Roles del Sistema
- **Platform Admin**: Administrador global de la plataforma
- **Admin**: Administrador del tenant
- **Jefe de Turno**: Supervisor de turnos
- **supervisor**: Supervisor general
- **operador**: Operador del sistema
- **admin**: Administrador (alternativo)

### Características de los Roles
- **Multi-tenant**: Algunos roles están asociados a tenants específicos
- **Globales**: Los Platform Admin son globales (tenant_id = null)
- **Jerarquía**: Los Platform Admin tienen acceso total

## 🛡️ Seguridad

### Validaciones
- **Autenticación**: Requiere usuario autenticado
- **Permisos**: Solo Platform Admin puede gestionar roles
- **Tenant**: Los roles de tenant solo se pueden asignar a usuarios del mismo tenant
- **Existencia**: Valida que el usuario y rol existan

### Protecciones
- **Conflictos**: Evita asignaciones duplicadas con `ON CONFLICT DO NOTHING`
- **Integridad**: Mantiene consistencia en la base de datos
- **Auditoría**: Logs de todas las operaciones

## 📈 Estadísticas Actuales

- **Total usuarios**: 4
- **Total roles**: 7
- **Total asignaciones**: 9
- **Usuarios con roles**: 7

## 🎯 Casos de Uso

### 1. Asignar Rol a Nuevo Usuario
1. Crear usuario en la página de usuarios
2. Hacer click en el ícono de configuración
3. Marcar los roles apropiados
4. Los cambios se guardan automáticamente

### 2. Cambiar Roles de Usuario Existente
1. Encontrar el usuario en la tabla
2. Hacer click en el ícono de configuración
3. Marcar/desmarcar roles según necesidad
4. Los cambios se aplican inmediatamente

### 3. Remover Todos los Roles
1. Abrir el modal de gestión de roles
2. Desmarcar todos los checkboxes
3. El usuario quedará sin roles asignados

## 🔍 Troubleshooting

### Problemas Comunes

#### Error 403 - No tienes permisos
- **Causa**: El usuario no tiene permisos de Platform Admin
- **Solución**: Asignar el rol "Platform Admin" al usuario

#### Error 404 - Usuario no encontrado
- **Causa**: El ID del usuario no existe
- **Solución**: Verificar que el usuario existe en la base de datos

#### Error 404 - Rol no encontrado
- **Causa**: El ID del rol no existe
- **Solución**: Verificar que el rol existe en la base de datos

#### Error 403 - Rol de otro tenant
- **Causa**: Intentando asignar rol de un tenant diferente
- **Solución**: Solo asignar roles del mismo tenant o roles globales

### Logs de Debug
Los logs muestran:
- Usuario que realiza la acción
- ID del usuario objetivo
- ID del rol
- Acción (add/remove)
- Resultado de la operación

## 🚀 Próximas Mejoras

### Funcionalidades Planificadas
- **Bulk operations**: Asignar roles a múltiples usuarios
- **Role templates**: Plantillas predefinidas de roles
- **Audit trail**: Historial completo de cambios de roles
- **Role inheritance**: Herencia de roles
- **Temporary roles**: Roles con fecha de expiración

### Mejoras de UX
- **Drag & drop**: Arrastrar roles para asignar
- **Search/filter**: Buscar roles específicos
- **Role descriptions**: Descripciones detalladas de cada rol
- **Role permissions preview**: Ver permisos del rol antes de asignar

## 📞 Soporte

Para problemas o preguntas:
1. Revisar los logs del servidor
2. Verificar permisos del usuario
3. Comprobar que los IDs existen
4. Contactar al equipo de desarrollo

---

**Última actualización**: Diciembre 2024
**Versión**: 1.0.0
**Estado**: ✅ Funcional y probado
