-- Migración para agregar campos del formulario de postulación a la tabla guardias
-- Ejecutar este script para preparar la tabla para el nuevo sistema

-- 1. Agregar campos de información personal
ALTER TABLE guardias 
ADD COLUMN IF NOT EXISTS apellido_paterno TEXT,
ADD COLUMN IF NOT EXISTS apellido_materno TEXT,
ADD COLUMN IF NOT EXISTS sexo VARCHAR(20) CHECK (sexo IN ('Masculino', 'Femenino')),
ADD COLUMN IF NOT EXISTS nacionalidad VARCHAR(50) DEFAULT 'Chilena',
ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;

-- 2. Agregar campos de ubicación geográfica
ALTER TABLE guardias 
ADD COLUMN IF NOT EXISTS ciudad VARCHAR(100),
ADD COLUMN IF NOT EXISTS comuna VARCHAR(100),
ADD COLUMN IF NOT EXISTS region VARCHAR(100),
ADD COLUMN IF NOT EXISTS latitud DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitud DECIMAL(11, 8);

-- 3. Agregar campos previsionales
ALTER TABLE guardias 
ADD COLUMN IF NOT EXISTS afp VARCHAR(100),
ADD COLUMN IF NOT EXISTS descuento_afp DECIMAL(3,2) DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS prevision_salud VARCHAR(50),
ADD COLUMN IF NOT EXISTS cotiza_sobre_7 BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS monto_pactado_uf DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS es_pensionado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS asignacion_familiar BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tramo_asignacion VARCHAR(10) CHECK (tramo_asignacion IN ('A', 'B', 'C'));

-- 4. Agregar campos bancarios
ALTER TABLE guardias 
ADD COLUMN IF NOT EXISTS banco_id UUID REFERENCES bancos(id),
ADD COLUMN IF NOT EXISTS tipo_cuenta VARCHAR(20) CHECK (tipo_cuenta IN ('CCT', 'CCV', 'CAH', 'RUT')),
ADD COLUMN IF NOT EXISTS numero_cuenta TEXT;

-- 5. Agregar campos físicos
ALTER TABLE guardias 
ADD COLUMN IF NOT EXISTS talla_camisa VARCHAR(10) CHECK (talla_camisa IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL')),
ADD COLUMN IF NOT EXISTS talla_pantalon VARCHAR(10) CHECK (talla_pantalon IN ('38', '40', '42', '44', '46', '48', '50', '52', '54')),
ADD COLUMN IF NOT EXISTS talla_zapato INTEGER CHECK (talla_zapato BETWEEN 35 AND 46),
ADD COLUMN IF NOT EXISTS altura_cm INTEGER CHECK (altura_cm BETWEEN 140 AND 210),
ADD COLUMN IF NOT EXISTS peso_kg INTEGER CHECK (peso_kg BETWEEN 40 AND 120);

-- 6. Agregar campos de postulación
ALTER TABLE guardias 
ADD COLUMN IF NOT EXISTS fecha_postulacion TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS estado_postulacion VARCHAR(20) DEFAULT 'pendiente' CHECK (estado_postulacion IN ('pendiente', 'revisando', 'aprobada', 'rechazada')),
ADD COLUMN IF NOT EXISTS ip_postulacion INET,
ADD COLUMN IF NOT EXISTS user_agent_postulacion TEXT;

-- 7. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_guardias_estado_postulacion ON guardias(estado_postulacion);
CREATE INDEX IF NOT EXISTS idx_guardias_fecha_postulacion ON guardias(fecha_postulacion);
CREATE INDEX IF NOT EXISTS idx_guardias_banco_id ON guardias(banco_id);
CREATE INDEX IF NOT EXISTS idx_guardias_afp ON guardias(afp);
CREATE INDEX IF NOT EXISTS idx_guardias_prevision_salud ON guardias(prevision_salud);

-- 8. Verificar la migración
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'guardias' 
AND column_name IN (
    'apellido_paterno', 'apellido_materno', 'sexo', 'nacionalidad', 'fecha_nacimiento',
    'ciudad', 'comuna', 'region', 'latitud', 'longitud',
    'afp', 'descuento_afp', 'prevision_salud', 'cotiza_sobre_7', 'monto_pactado_uf',
    'es_pensionado', 'asignacion_familiar', 'tramo_asignacion',
    'banco_id', 'tipo_cuenta', 'numero_cuenta',
    'talla_camisa', 'talla_pantalon', 'talla_zapato', 'altura_cm', 'peso_kg',
    'fecha_postulacion', 'estado_postulacion', 'ip_postulacion', 'user_agent_postulacion'
)
ORDER BY column_name;
