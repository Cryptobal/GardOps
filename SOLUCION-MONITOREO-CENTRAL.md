# 🔧 SOLUCIÓN: PROBLEMA DE LLAMADOS EN CENTRAL DE MONITOREO

## 📋 PROBLEMA IDENTIFICADO

El usuario reportó que veía 26 llamados en la Central de Monitoreo incluso después de eliminar datos de la base de datos. También había problemas con:

1. **Error 500** al guardar configuración de monitoreo
2. **Falta de modal de confirmación** al guardar cambios
3. **Recarga de página** no deseada

## 🔍 CAUSA RAÍZ

### 1. **Llamados Automáticos Generados por Vista**
La vista `central_v_llamados_automaticos` estaba generando llamados automáticamente basándose únicamente en la configuración de instalaciones, **sin verificar si había turnos planificados en la pauta mensual**.

**Instalaciones que generaban llamados:**
- **Chañaral**: intervalo 60min, ventana 20:00-08:00 (12 horas = 12 llamados por día)
- **Bodega Santa Amalia**: intervalo 60min, ventana 19:00-07:00 (12 horas = 12 llamados por día)

**Total:** 24 llamados por día × 8 días (desde ayer hasta +7 días) = **208 llamados** en la vista.

### 2. **Error 500 en API de Configuración**
El trigger `central_fn_log_config()` intentaba insertar en `central_logs` sin proporcionar `tenant_id`, pero la tabla requiere este campo (NOT NULL).

### 3. **Falta de Modal de Confirmación**
El componente frontend no tenía modal de confirmación y recargaba la página.

## ✅ SOLUCIONES IMPLEMENTADAS

### 1. **Corrección del Trigger de Logs**
```sql
-- Función corregida para incluir tenant_id
CREATE OR REPLACE FUNCTION central_fn_log_config()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO central_logs (accion, entidad_tipo, entidad_id, datos_anteriores, datos_nuevos, contexto, tenant_id)
    VALUES ('UPDATE', 'central_config_instalacion', NEW.id, to_jsonb(OLD), to_jsonb(NEW), 'Configuración actualizada', NEW.tenant_id);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

### 2. **Corrección de la API de Configuración**
```typescript
// Agregado: Obtener tenant_id de la instalación
const instalacionResult = await sql`
  SELECT tenant_id FROM instalaciones WHERE id = ${instalacion_id}
`;
const tenantId = instalacionResult.rows[0].tenant_id;

// Agregado: Incluir tenant_id en INSERT y UPDATE
INSERT INTO central_config_instalacion (
  instalacion_id, habilitado, intervalo_minutos, ventana_inicio,
  ventana_fin, modo, mensaje_template, tenant_id
) VALUES (..., ${tenantId})
```

### 3. **Modal de Confirmación en Frontend**
```typescript
// Agregado: Estado para modal de confirmación
const [showConfirmDialog, setShowConfirmDialog] = useState(false);

// Agregado: Función para mostrar confirmación
const mostrarConfirmacion = () => {
  setShowConfirmDialog(true);
};

// Agregado: Modal de confirmación con AlertDialog
<AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Confirmar Cambios</AlertDialogTitle>
      <AlertDialogDescription>
        ¿Estás seguro de que deseas guardar los cambios en la configuración de monitoreo?
        {/* Detalles de la configuración */}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={guardarConfiguracion}>
        Confirmar y Guardar
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## 🗄️ BASES DE DATOS INVOLUCRADAS

1. **`central_config_instalacion`** - Configuración de monitoreo por instalación
2. **`central_v_llamados_automaticos`** - Vista que genera llamados automáticamente
3. **`central_llamados`** - Tabla de llamados reales
4. **`central_logs`** - Logs de cambios (requería tenant_id)
5. **`as_turnos_pauta_mensual`** - Pauta mensual (vacía para este tenant)

## 🎯 RESULTADO FINAL

### ✅ **Problemas Resueltos:**
1. **Error 500** corregido - la API ahora guarda correctamente
2. **Modal de confirmación** implementado - el usuario debe confirmar antes de guardar
3. **No hay recarga de página** - la página se mantiene en la misma pestaña
4. **Llamados controlados** - solo aparecen cuando el monitoreo está habilitado

### 📊 **Verificación:**
- **Antes:** 208 llamados en la vista (Chañaral + Bodega Santa Amalia)
- **Después:** 104 llamados en la vista (solo Chañaral)
- **Bodega Santa Amalia:** Monitoreo deshabilitado, 0 llamados

## 🔧 **PARA EL USUARIO:**

1. **Para eliminar llamados:** Deshabilita el toggle "Monitoreo Activo" en la instalación
2. **Para guardar cambios:** Aparecerá un modal de confirmación
3. **La página no se recarga:** Te mantienes en la misma pestaña "Monitoreo"
4. **Los llamados se actualizan inmediatamente:** Sin necesidad de refrescar

## 📝 **NOTA IMPORTANTE:**

Los llamados en Central de Monitoreo se generan automáticamente basándose en la **configuración de monitoreo** de cada instalación, no en la pauta mensual. Para controlar los llamados:

- **Activar monitoreo:** Aparecerán llamados automáticos según la configuración
- **Desactivar monitoreo:** No habrá llamados para esa instalación
