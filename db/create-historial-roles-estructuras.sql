-- =====================================================
-- CREACIÓN DE TABLAS DE HISTORIAL PARA ROLES Y ESTRUCTURAS
-- =====================================================
-- Objetivo: Auditoría completa de cambios en roles de servicio y estructuras
-- Fecha: $(date)
-- Sistema: GardOps

-- =====================================================
-- 1. TABLA DE HISTORIAL DE ROLES DE SERVICIO
-- =====================================================

CREATE TABLE IF NOT EXISTS historial_roles_servicio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rol_servicio_id UUID NOT NULL REFERENCES as_turnos_roles_servicio(id) ON DELETE CASCADE,
  accion VARCHAR(50) NOT NULL CHECK (accion IN (
    'CREACION', 
    'ACTUALIZACION', 
    'INACTIVACION', 
    'REACTIVACION', 
    'ELIMINACION'
  )),
  fecha_accion TIMESTAMP NOT NULL DEFAULT NOW(),
  detalles TEXT,
  usuario_id UUID, -- Opcional: para auditoría de usuario
  datos_anteriores JSONB, -- Datos antes del cambio
  datos_nuevos JSONB, -- Datos después del cambio
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Índices para optimizar consultas
  CONSTRAINT idx_historial_roles_servicio_id UNIQUE(id),
  CONSTRAINT idx_historial_roles_servicio_rol_id UNIQUE(rol_servicio_id, fecha_accion)
);

-- Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_historial_roles_servicio_rol_id 
ON historial_roles_servicio(rol_servicio_id);

CREATE INDEX IF NOT EXISTS idx_historial_roles_servicio_accion 
ON historial_roles_servicio(accion);

CREATE INDEX IF NOT EXISTS idx_historial_roles_servicio_fecha 
ON historial_roles_servicio(fecha_accion);

-- =====================================================
-- 2. TABLA DE HISTORIAL DE ESTRUCTURAS DE SERVICIO
-- =====================================================

CREATE TABLE IF NOT EXISTS historial_estructuras_servicio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rol_servicio_id UUID NOT NULL REFERENCES as_turnos_roles_servicio(id) ON DELETE CASCADE,
  estructura_id UUID NOT NULL REFERENCES sueldo_estructuras_roles(id) ON DELETE CASCADE,
  accion VARCHAR(50) NOT NULL CHECK (accion IN (
    'CREACION', 
    'ACTUALIZACION', 
    'INACTIVACION', 
    'REACTIVACION', 
    'NUEVA_ESTRUCTURA'
  )),
  fecha_accion TIMESTAMP NOT NULL DEFAULT NOW(),
  detalles TEXT,
  usuario_id UUID, -- Opcional: para auditoría de usuario
  datos_anteriores JSONB, -- Datos antes del cambio
  datos_nuevos JSONB, -- Datos después del cambio
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Índices para optimizar consultas
  CONSTRAINT idx_historial_estructuras_id UNIQUE(id),
  CONSTRAINT idx_historial_estructuras_rol_estructura UNIQUE(rol_servicio_id, estructura_id, fecha_accion)
);

-- Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_historial_estructuras_rol_id 
ON historial_estructuras_servicio(rol_servicio_id);

CREATE INDEX IF NOT EXISTS idx_historial_estructuras_estructura_id 
ON historial_estructuras_servicio(estructura_id);

CREATE INDEX IF NOT EXISTS idx_historial_estructuras_accion 
ON historial_estructuras_servicio(accion);

CREATE INDEX IF NOT EXISTS idx_historial_estructuras_fecha 
ON historial_estructuras_servicio(fecha_accion);

-- =====================================================
-- 3. COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE historial_roles_servicio IS 'Historial completo de cambios en roles de servicio para auditoría';
COMMENT ON COLUMN historial_roles_servicio.accion IS 'Tipo de acción realizada (CREACION, ACTUALIZACION, INACTIVACION, REACTIVACION, ELIMINACION)';
COMMENT ON COLUMN historial_roles_servicio.datos_anteriores IS 'Datos del rol antes del cambio (JSON)';
COMMENT ON COLUMN historial_roles_servicio.datos_nuevos IS 'Datos del rol después del cambio (JSON)';

COMMENT ON TABLE historial_estructuras_servicio IS 'Historial completo de cambios en estructuras de servicio para auditoría';
COMMENT ON COLUMN historial_estructuras_servicio.accion IS 'Tipo de acción realizada (CREACION, ACTUALIZACION, INACTIVACION, REACTIVACION, NUEVA_ESTRUCTURA)';
COMMENT ON COLUMN historial_estructuras_servicio.datos_anteriores IS 'Datos de la estructura antes del cambio (JSON)';
COMMENT ON COLUMN historial_estructuras_servicio.datos_nuevos IS 'Datos de la estructura después del cambio (JSON)';

-- =====================================================
-- 4. VERIFICACIÓN DE CREACIÓN
-- =====================================================

DO $$
BEGIN
  -- Verificar que las tablas se crearon correctamente
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'historial_roles_servicio') THEN
    RAISE NOTICE '✅ Tabla historial_roles_servicio creada exitosamente';
  ELSE
    RAISE EXCEPTION '❌ Error: No se pudo crear historial_roles_servicio';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'historial_estructuras_servicio') THEN
    RAISE NOTICE '✅ Tabla historial_estructuras_servicio creada exitosamente';
  ELSE
    RAISE EXCEPTION '❌ Error: No se pudo crear historial_estructuras_servicio';
  END IF;
  
  RAISE NOTICE '🎉 Tablas de historial creadas correctamente';
END $$;
