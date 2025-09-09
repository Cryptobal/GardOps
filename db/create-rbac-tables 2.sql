-- RBAC básico multi-tenant (nomenclatura existente rbac_*)
-- Ejecutar en Neon (SQL) - Paso 1

-- Extensión para UUID si no está
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Permisos globales
CREATE TABLE IF NOT EXISTS rbac_permisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- 2) Roles por tenant
CREATE TABLE IF NOT EXISTS rbac_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (tenant_id, code)
);

-- 3) Asignación rol → permisos
CREATE TABLE IF NOT EXISTS rbac_roles_permisos (
  role_id UUID REFERENCES rbac_roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES rbac_permisos(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

-- 4) Asignación usuario → roles
CREATE TABLE IF NOT EXISTS rbac_usuarios_roles (
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  role_id UUID REFERENCES rbac_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (usuario_id, role_id)
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_rbac_roles_tenant_code ON rbac_roles(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_rbac_usuarios_roles_usuario ON rbac_usuarios_roles(usuario_id);
CREATE INDEX IF NOT EXISTS idx_rbac_roles_permisos_role ON rbac_roles_permisos(role_id);

-- 5) Seed de permisos mínimos (ampliable luego)
INSERT INTO rbac_permisos (code, description) VALUES
  ('pauta.view', 'Ver Pauta Diaria'),
  ('pauta.edit', 'Editar Pauta Diaria'),
  ('config.manage', 'Administrar configuración y seguridad')
ON CONFLICT (code) DO NOTHING;

-- 6) Seed de roles base por cada tenant existente
-- admin: full; supervisor: ver/editar pauta; operador: solo ver pauta
INSERT INTO rbac_roles (tenant_id, code, name, description, is_system)
SELECT t.id, r.code, r.name, r.description, true
FROM tenants t
CROSS JOIN (VALUES
  ('admin', 'Administrador', 'Acceso total al sistema'),
  ('supervisor', 'Supervisor', 'Gestión operativa: ver/editar pauta'),
  ('operador', 'Operador', 'Operación básica: ver pauta')
) AS r(code, name, description)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- 7) Asignación de permisos a roles
-- admin → todos
INSERT INTO rbac_roles_permisos (role_id, permission_id)
SELECT ro.id, pe.id
FROM rbac_roles ro
JOIN rbac_permisos pe ON true
WHERE ro.code = 'admin'
ON CONFLICT DO NOTHING;

-- supervisor → pauta.view + pauta.edit
INSERT INTO rbac_roles_permisos (role_id, permission_id)
SELECT ro.id, pe.id
FROM rbac_roles ro
JOIN rbac_permisos pe ON pe.code IN ('pauta.view','pauta.edit')
WHERE ro.code = 'supervisor'
ON CONFLICT DO NOTHING;

-- operador → pauta.view
INSERT INTO rbac_roles_permisos (role_id, permission_id)
SELECT ro.id, pe.id
FROM rbac_roles ro
JOIN rbac_permisos pe ON pe.code = 'pauta.view'
WHERE ro.code = 'operador'
ON CONFLICT DO NOTHING;

-- 8) Mapear usuarios existentes a roles (solo si el texto coincide)
-- Nota: mantiene compatibilidad con la columna usuarios.rol
INSERT INTO rbac_usuarios_roles (usuario_id, role_id)
SELECT u.id, r.id
FROM usuarios u
JOIN rbac_roles r
  ON r.tenant_id = u.tenant_id
 AND lower(u.rol) = r.code
WHERE lower(u.rol) IN ('admin','supervisor','operador')
ON CONFLICT DO NOTHING;

-- 9) Vista de permisos por usuario (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_matviews WHERE matviewname = 'rbac_v_permisos_usuario'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_views WHERE viewname = 'rbac_v_permisos_usuario'
  ) THEN
    CREATE VIEW rbac_v_permisos_usuario AS
    SELECT 
      u.id AS usuario_id,
      u.email,
      u.tenant_id,
      r.code AS role_code,
      p.code AS permiso_code
    FROM usuarios u
    JOIN rbac_usuarios_roles ur ON ur.usuario_id = u.id
    JOIN rbac_roles r ON r.id = ur.role_id
    JOIN rbac_roles_permisos rp ON rp.role_id = r.id
    JOIN rbac_permisos p ON p.id = rp.permission_id;
  END IF;
END $$;

-- Listo: tablas y seed de RBAC verificadas/creadas


