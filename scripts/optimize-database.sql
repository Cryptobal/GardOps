-- Script para optimizar la base de datos y mejorar el rendimiento
-- Ejecutar con: psql $DATABASE_URL -f scripts/optimize-database.sql

-- 1. Verificar y crear índices faltantes para instalaciones
CREATE INDEX IF NOT EXISTS idx_instalaciones_nombre ON instalaciones(nombre);
CREATE INDEX IF NOT EXISTS idx_instalaciones_cliente_id ON instalaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_instalaciones_estado ON instalaciones(estado);
CREATE INDEX IF NOT EXISTS idx_instalaciones_ciudad ON instalaciones(ciudad);
CREATE INDEX IF NOT EXISTS idx_instalaciones_comuna ON instalaciones(comuna);
CREATE INDEX IF NOT EXISTS idx_instalaciones_created_at ON instalaciones(created_at);

-- 2. Verificar y crear índices para clientes
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_estado ON clientes(estado);
CREATE INDEX IF NOT EXISTS idx_clientes_created_at ON clientes(created_at);

-- 3. Verificar y crear índices para comunas
CREATE INDEX IF NOT EXISTS idx_comunas_nombre ON comunas(nombre);
CREATE INDEX IF NOT EXISTS idx_comunas_region ON comunas(region);

-- 4. Analizar las tablas para optimizar el planificador
ANALYZE instalaciones;
ANALYZE clientes;
ANALYZE comunas;

-- 5. Verificar estadísticas de las tablas
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats 
WHERE tablename IN ('instalaciones', 'clientes', 'comunas')
ORDER BY tablename, attname;

-- 6. Mostrar información de índices
SELECT 
  t.tablename,
  indexname,
  c.reltuples AS num_rows,
  pg_size_pretty(pg_relation_size(quote_ident(t.schemaname)||'.'||quote_ident(t.tablename)::regclass)) AS table_size,
  pg_size_pretty(pg_relation_size(quote_ident(t.schemaname)||'.'||quote_ident(t.indexname)::regclass)) AS index_size
FROM pg_tables t
LEFT JOIN pg_indexes i ON t.tablename = i.tablename
LEFT JOIN pg_class c ON c.relname = t.tablename
WHERE t.tablename IN ('instalaciones', 'clientes', 'comunas')
ORDER BY t.tablename, indexname;

-- 7. Verificar configuración de PostgreSQL
SHOW shared_buffers;
SHOW effective_cache_size;
SHOW work_mem;
SHOW maintenance_work_mem; 