-- Agregar campo teléfono a la tabla instalaciones
-- Formato: 9 dígitos para números celulares chilenos

-- Agregar columna telefono si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instalaciones' AND column_name = 'telefono'
  ) THEN
    ALTER TABLE instalaciones ADD COLUMN telefono VARCHAR(9);
    
    -- Agregar comentario
    COMMENT ON COLUMN instalaciones.telefono IS 'Teléfono de contacto de la instalación (formato: 9 dígitos para celulares chilenos)';
    
    -- Crear índice para búsquedas eficientes
    CREATE INDEX IF NOT EXISTS idx_instalaciones_telefono ON instalaciones(telefono);
    
    -- Agregar constraint para validar formato (opcional, solo números)
    ALTER TABLE instalaciones ADD CONSTRAINT chk_instalaciones_telefono_formato 
      CHECK (telefono IS NULL OR (LENGTH(telefono) = 9 AND telefono ~ '^[0-9]+$'));
      
    RAISE NOTICE 'Campo telefono agregado exitosamente a la tabla instalaciones';
  ELSE
    RAISE NOTICE 'El campo telefono ya existe en la tabla instalaciones';
  END IF;
END $$;

-- Mostrar la estructura actualizada
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'instalaciones' 
ORDER BY ordinal_position;
