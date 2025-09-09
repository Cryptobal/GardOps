-- RBAC base idempotente (Tenants, Usuarios, Roles, Permisos) + funciones
-- Extensiones requeridas
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- Tenants
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique,
  activo boolean not null default true,
  created_at timestamp not null default now()
);

-- Usuarios
create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null references tenants(id) on delete set null,
  email text not null unique,
  nombre text,
  password text,
  activo boolean not null default true,
  created_at timestamp not null default now()
);

-- Roles / Permisos
create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null references tenants(id) on delete cascade,
  nombre text not null,
  clave text not null,
  unique(tenant_id, clave)
);

create table if not exists permisos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null references tenants(id) on delete cascade,
  nombre text not null,
  clave text not null,
  unique(tenant_id, clave)
);

create table if not exists usuarios_roles (
  usuario_id uuid references usuarios(id) on delete cascade,
  rol_id uuid references roles(id) on delete cascade,
  primary key (usuario_id, rol_id)
);

create table if not exists roles_permisos (
  rol_id uuid references roles(id) on delete cascade,
  permiso_id uuid references permisos(id) on delete cascade,
  primary key (rol_id, permiso_id)
);

-- Índices útiles
create index if not exists idx_usuarios_tenant on usuarios(tenant_id);
create index if not exists idx_roles_tenant on roles(tenant_id);
create index if not exists idx_permisos_tenant on permisos(tenant_id);

-- Permisos base globales (platform_admin) y CRUD
with up as (
  select null::uuid as tenant_id
)
insert into permisos(id, tenant_id, nombre, clave)
select gen_random_uuid(), up.tenant_id, x.nombre, x.clave
from up, (values
  ('Admin Plataforma', 'rbac.platform_admin'),
  ('Ver Usuarios', 'rbac.usuarios.read'),
  ('Editar Usuarios', 'rbac.usuarios.write'),
  ('Ver Roles', 'rbac.roles.read'),
  ('Editar Roles', 'rbac.roles.write'),
  ('Ver Permisos', 'rbac.permisos.read'),
  ('Editar Permisos', 'rbac.permisos.write'),
  ('Ver Tenants', 'rbac.tenants.read'),
  ('Editar Tenants', 'rbac.tenants.write')
) as x(nombre, clave)
on conflict do nothing;

-- Rol platform_admin global
insert into roles (id, tenant_id, nombre, clave)
values (gen_random_uuid(), null, 'Platform Admin', 'platform_admin')
on conflict do nothing;

-- Conecta rol platform_admin a permiso rbac.platform_admin
insert into roles_permisos(rol_id, permiso_id)
select r.id, p.id
from roles r, permisos p
where r.clave='platform_admin' and r.tenant_id is null
  and p.clave='rbac.platform_admin' and p.tenant_id is null
on conflict do nothing;

-- Función: verificar permiso por email
create or replace function public.fn_usuario_tiene_permiso(p_email text, p_permiso text)
returns boolean language sql stable as $$
  with u as (
    select id, tenant_id from usuarios where lower(email)=lower(p_email) and activo=true
  )
  select exists(
    select 1
    from u
    join usuarios_roles ur on ur.usuario_id=u.id
    join roles r on r.id=ur.rol_id
    join roles_permisos rp on rp.rol_id=r.id
    join permisos p on p.id=rp.permiso_id
    where (p.clave = p_permiso or p.clave like split_part(p_permiso, '.', 1) || '.%')
  );
$$;

-- Función: crear tenant + owner y rol admin del tenant
create or replace function public.fn_create_tenant(
  p_nombre text, p_slug text, p_owner_email text, p_owner_nombre text default null
) returns table(tenant_id uuid, owner_id uuid, created boolean)
language plpgsql as $$
declare v_tid uuid; v_uid uuid; v_created boolean:=false;
begin
  select id into v_tid from tenants where slug=p_slug;
  if v_tid is null then
    insert into tenants(id,nombre,slug) values (gen_random_uuid(), p_nombre, p_slug)
    returning id into v_tid;
    v_created := true;
  end if;
  select id into v_uid from usuarios where lower(email)=lower(p_owner_email);
  if v_uid is null then
    insert into usuarios(id,tenant_id,email,nombre,activo)
    values (gen_random_uuid(), v_tid, lower(p_owner_email), coalesce(p_owner_nombre,p_owner_email), true)
    returning id into v_uid;
  else
    update usuarios set tenant_id=coalesce(tenant_id,v_tid) where id=v_uid;
  end if;
  -- crea rol admin del tenant y asigna permisos básicos
  insert into roles(id,tenant_id,nombre,clave)
  values (gen_random_uuid(), v_tid, 'Admin', 'admin')
  on conflict do nothing;
  insert into usuarios_roles(usuario_id, rol_id)
  select v_uid, r.id from roles r where r.tenant_id=v_tid and r.clave='admin'
  on conflict do nothing;
  return query select v_tid, v_uid, v_created;
end;
$$;


