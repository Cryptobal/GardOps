-- Crear índices para optimizar consultas en pagos_turnos_extras
CREATE INDEX IF NOT EXISTS idx_pagos_turnos_extras_guardia_id ON pagos_turnos_extras(guardia_id);
CREATE INDEX IF NOT EXISTS idx_pagos_turnos_extras_instalacion_id ON pagos_turnos_extras(instalacion_id);
CREATE INDEX IF NOT EXISTS idx_pagos_turnos_extras_fecha ON pagos_turnos_extras(fecha);
CREATE INDEX IF NOT EXISTS idx_pagos_turnos_extras_estado ON pagos_turnos_extras(estado);
CREATE INDEX IF NOT EXISTS idx_pagos_turnos_extras_puesto_id ON pagos_turnos_extras(puesto_id);
CREATE INDEX IF NOT EXISTS idx_pagos_turnos_extras_pauta_id ON pagos_turnos_extras(pauta_id); 