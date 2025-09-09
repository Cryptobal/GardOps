# 🔐 Implementación de Sistema RBAC

## 📋 Resumen

Este documento describe la implementación del sistema RBAC (Role-Based Access Control) para la base de datos PostgreSQL en Neon.

## 🏗️ Estructura de Tablas

El sistema RBAC implementa las siguientes tablas:

### 1. **usuarios** (existente, actualizada)
```sql
- id: UUID (PK)
- email: TEXT (UNIQUE)
- nombre: TEXT
- activo: BOOLEAN (DEFAULT true)
- tenant_id: UUID (FK → tenants, nullable)
```

### 2. **roles**
```sql
- id: UUID (PK)
- nombre: TEXT
- descripcion: TEXT
- tenant_id: UUID (FK → tenants, nullable)
- UNIQUE(tenant_id, nombre)
```

### 3. **permisos**
```sql
- id: UUID (PK)
- clave: TEXT (UNIQUE)
- descripcion: TEXT
```

### 4. **usuarios_roles**
```sql
- usuario_id: UUID (FK → usuarios)
- rol_id: UUID (FK → roles)
- PRIMARY KEY(usuario_id, rol_id)
```

### 5. **roles_permisos**
```sql
- rol_id: UUID (FK → roles)
- permiso_id: UUID (FK → permisos)
- PRIMARY KEY(rol_id, permiso_id)
```

## 🚀 Instalación

### Paso 1: Auditar Estado Actual
```bash
# Verificar qué tablas RBAC existen actualmente
npx tsx scripts/audit-rbac-tables.ts
```

### Paso 2: Ejecutar Migración
```bash
# Crear las tablas RBAC (idempotente - solo crea lo que falta)
npx tsx scripts/execute-rbac-migration.ts
```

### Paso 3: Verificar con Smoke Test
```bash
# Ejecutar pruebas (con ROLLBACK automático)
npx tsx scripts/rbac-smoke.ts
```

## 📝 Scripts Disponibles

### 1. **audit-rbac-tables.ts**
Audita el estado actual de las tablas RBAC en la base de datos.
- Lista todas las tablas relacionadas con RBAC
- Muestra estructura de columnas
- Identifica constraints y foreign keys
- Proporciona recomendaciones

### 2. **create-rbac-tables-idempotent.sql**
Script SQL idempotente que:
- Crea solo las tablas que faltan
- No modifica tablas existentes (excepto agregar columnas faltantes)
- Incluye seeds mínimos de permisos y roles
- Crea vistas útiles y función helper

### 3. **execute-rbac-migration.ts**
Ejecuta el SQL de migración:
- Lee y ejecuta el archivo SQL statement por statement
- Maneja errores esperados (ej: "already exists")
- Proporciona resumen detallado de la ejecución
- Verifica el resultado final

### 4. **rbac-smoke.ts**
Prueba el sistema RBAC:
- Lista roles y permisos existentes
- Crea un usuario demo
- Lo asocia al rol admin
- Verifica permisos efectivos
- Prueba la función helper `fn_usuario_tiene_permiso`
- **IMPORTANTE**: Todos los cambios se revierten con ROLLBACK

## 🔑 Permisos Predefinidos

El sistema incluye los siguientes permisos base:

| Clave | Descripción |
|-------|-------------|
| `turnos.*` | Acceso completo al módulo de turnos |
| `turnos.view` | Ver turnos y pautas |
| `turnos.edit` | Editar turnos y marcar asistencia |
| `payroll.*` | Acceso completo al módulo de payroll |
| `payroll.view` | Ver información de payroll |
| `payroll.edit` | Editar información de payroll |
| `maestros.*` | Acceso completo a datos maestros |
| `maestros.view` | Ver datos maestros |
| `maestros.edit` | Editar datos maestros |
| `usuarios.manage` | Gestionar usuarios y roles |
| `documentos.manage` | Gestionar documentos |
| `config.manage` | Gestionar configuración del sistema |

## 👥 Roles Predefinidos

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| `admin` | Administrador del sistema | Todos los permisos |
| `supervisor` | Supervisor operativo | turnos.view, turnos.edit, maestros.view, documentos.manage |
| `operador` | Operador básico | turnos.view, maestros.view |

## 🔧 Funciones Helper

### fn_usuario_tiene_permiso(email, permiso)
Verifica si un usuario tiene un permiso específico:
```sql
SELECT fn_usuario_tiene_permiso('usuario@email.com', 'turnos.edit');
```
- Soporta permisos exactos y wildcards (ej: `turnos.*`)
- Retorna `TRUE` o `FALSE`

## 📊 Vistas Disponibles

### v_usuarios_permisos
Vista completa de usuarios con sus roles y permisos:
```sql
SELECT * FROM v_usuarios_permisos WHERE email = 'usuario@email.com';
```

### v_check_permiso
Vista simplificada para verificación rápida:
```sql
SELECT * FROM v_check_permiso WHERE email = 'usuario@email.com';
```

## ⚠️ Notas Importantes

1. **Compatibilidad**: El sistema coexiste con las tablas `rbac_*` existentes (con prefijo)
2. **Multi-tenant**: Los roles pueden ser globales (tenant_id NULL) o por tenant
3. **Cascada**: Las foreign keys tienen `ON DELETE CASCADE` para mantener integridad
4. **Idempotencia**: Los scripts pueden ejecutarse múltiples veces sin errores

## 🔍 Verificación Post-Instalación

Para verificar que el sistema está correctamente instalado:

```sql
-- Verificar tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('usuarios', 'roles', 'permisos', 'usuarios_roles', 'roles_permisos');

-- Contar registros
SELECT 
  (SELECT COUNT(*) FROM permisos) as permisos,
  (SELECT COUNT(*) FROM roles) as roles,
  (SELECT COUNT(*) FROM usuarios_roles) as asignaciones;

-- Probar función helper
SELECT fn_usuario_tiene_permiso('admin@example.com', 'turnos.edit');
```

## 🐛 Troubleshooting

### Error: "relation already exists"
- Es normal si las tablas ya existen
- El script es idempotente y omitirá creación de objetos existentes

### Error: "tenant_id does not exist"
- Asegúrate de que existe la tabla `tenants` con al menos un registro
- Puedes crear un tenant de prueba si es necesario

### Error en foreign keys
- Verifica que las tablas referenciadas existen
- Asegúrate de que los tipos de datos coinciden (UUID)

## 📚 Referencias

- [PostgreSQL RBAC Best Practices](https://www.postgresql.org/docs/current/user-manag.html)
- [Neon Database Documentation](https://neon.tech/docs)

---

**Última actualización**: ${new Date().toISOString().split('T')[0]}
