# 📅 Sistema de Gestión de Vencimientos y Alertas Documentales - GardOps

## 🎯 Descripción

Sistema completo de gestión de vencimientos y alertas documentales de clase mundial. Permite configurar tipos de documentos con fechas de vencimiento automáticas, generar alertas inteligentes antes del vencimiento y visualizar un dashboard profesional de alertas.

## ✨ Características Principales

### 🧠 Gestión Inteligente de Vencimientos
- **Configuración por tipo**: Cada tipo de documento puede configurarse para requerir o no vencimiento
- **Alertas automáticas**: Sistema configurable de días antes de alerta (7, 15, 30, 45, 60, 90 días)
- **Múltiples módulos**: Soporte para clientes, guardias, instalaciones
- **Fechas mock**: Soporte para testing con fechas simuladas

### 📊 Dashboard Profesional
- **KPIs visuales**: Resumen con métricas de vencidos, críticos, advertencia y normales
- **Filtros avanzados**: Por módulo, estado de lectura, criticidad
- **Vista detallada**: Modal con información completa de cada alerta
- **Estados de lectura**: Marcar alertas como leídas/no leídas

### 🔧 Automatización Completa
- **Generación automática**: Escaneo de documentos y generación de alertas
- **Prevención de duplicados**: No genera alertas repetidas para el mismo documento
- **Cálculo dinámico**: Días restantes calculados en tiempo real
- **Limpieza automática**: Gestión de alertas vencidas

## 🗄️ Estructura de Base de Datos

### Tabla: `tipos_documentos` (Modificada)
```sql
ALTER TABLE tipos_documentos
ADD COLUMN requiere_vencimiento BOOLEAN DEFAULT false,
ADD COLUMN dias_antes_alarma INT DEFAULT 30;
```

**Campos nuevos:**
- `requiere_vencimiento`: Si el tipo requiere fecha de vencimiento
- `dias_antes_alarma`: Días antes del vencimiento para generar alerta

### Tabla: `documentos` (Modificada)
```sql
ALTER TABLE documentos
ADD COLUMN fecha_vencimiento DATE;
```

**Campo nuevo:**
- `fecha_vencimiento`: Fecha de vencimiento del documento (opcional)

### Tabla: `alertas_documentos` (Nueva)
```sql
CREATE TABLE alertas_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  dias_restantes INT NOT NULL,
  mensaje TEXT NOT NULL,
  creada_en TIMESTAMP DEFAULT now(),
  leida BOOLEAN DEFAULT false,
  tenant_id UUID NOT NULL
);
```

**Índices creados:**
- `idx_alertas_documentos_documento_id` 
- `idx_alertas_documentos_tenant_leida`
- `idx_alertas_documentos_dias_restantes`

## 🚀 APIs Implementadas

### `/api/migrate-alertas-documentos` (GET)
**Descripción**: Migración completa del sistema
- Agrega campos de vencimiento a tipos_documentos
- Agrega campo fecha_vencimiento a documentos  
- Crea tabla alertas_documentos con índices

### `/api/alertas-documentos` (GET)
**Descripción**: Obtener alertas de documentos
**Parámetros**: 
- `no_leidas=true`: Solo alertas no leídas

**Respuesta**:
```json
{
  "success": true,
  "data": [...],
  "resumen": {
    "total": 15,
    "vencidos": 2,
    "criticos": 3,
    "advertencia": 8,
    "normales": 2
  }
}
```

### `/api/alertas-documentos` (POST)
**Descripción**: Generar alertas automáticamente
- Escanea documentos con vencimiento
- Calcula días restantes
- Crea alertas según configuración de tipo
- Previene duplicados

**Respuesta**:
```json
{
  "success": true,
  "alertas_creadas": 5,
  "alertas_ya_existentes": 2,
  "fecha_procesamiento": "2024-01-15"
}
```

### `/api/alertas-documentos` (PUT)
**Descripción**: Marcar alerta como leída/no leída
**Body**:
```json
{
  "alerta_id": "uuid",
  "leida": true
}
```

### `/api/tipos-documentos` (Modificado)
**Descripción**: CRUD de tipos de documentos con campos de vencimiento
**Campos nuevos en POST/PUT**:
- `requiere_vencimiento`: boolean
- `dias_antes_alarma`: integer

### `/api/upload-document` (Modificado)
**Descripción**: Subida de documentos con fecha de vencimiento
**Campo nuevo en FormData**:
- `fecha_vencimiento`: string (YYYY-MM-DD)

## 🧩 Componentes UI Actualizados

### 1. Configuración de Tipos de Documentos
**Archivo**: `src/app/configuracion/tipos-documentos/page.tsx`

**Nuevas funcionalidades**:
- Switch para activar vencimiento por tipo
- Select de días antes de alerta (7, 15, 30, 45, 60, 90)
- Visualización de badges de vencimiento en lista
- Validaciones de formulario

### 2. DocumentUploader Mejorado
**Archivo**: `src/components/DocumentUploader.tsx`

**Nuevas funcionalidades**:
- Campo de fecha de vencimiento condicional
- Validación automática según tipo seleccionado
- Información de días de alerta
- Restricción de fechas pasadas

### 3. Dashboard de Alertas Completo
**Archivo**: `src/app/alertas/page.tsx`

**Funcionalidades**:
- KPIs visuales con gradientes
- Filtros por módulo y estado
- Lista de alertas con criticidad
- Modal de detalle de alerta
- Acciones de lectura/no lectura
- Generación manual de alertas

## 🎨 Estados de Criticidad

### 🚨 Vencido (Rojo)
- Documentos que ya vencieron
- Badge destructive
- Días restantes negativos

### ⚠️ Crítico (Rojo)
- Vence en ≤ 10 días
- Badge destructive  
- Máxima prioridad

### ⏰ Advertencia (Amarillo)
- Vence en ≤ 30 días
- Badge secondary
- Prioridad media

### 📄 Normal (Verde)
- Vence en > 30 días
- Badge default
- Prioridad baja

## 🧪 Testing y Mock

### Variable de Entorno Mock
```env
MOCK_TODAY=2025-08-01
```

**Uso**: Para testing, permite simular fechas específicas y probar el comportamiento de vencimientos.

### Flujo de Prueba
1. Configurar un tipo de documento con vencimiento
2. Subir documento con fecha de vencimiento próxima
3. Usar `MOCK_TODAY` para simular fechas futuras
4. Generar alertas y verificar funcionamiento
5. Probar filtros y estados de lectura

## 📝 Uso del Sistema

### 1. Configuración de Tipos
1. Ir a `/configuracion/tipos-documentos`
2. Crear o editar tipo de documento
3. Activar "¿Requiere vencimiento?"
4. Seleccionar días antes de alerta
5. Guardar configuración

### 2. Subida de Documentos
1. Usar DocumentUploader en cualquier módulo
2. Seleccionar tipo que requiere vencimiento
3. Completar fecha de vencimiento (obligatoria)
4. Subir documento normalmente

### 3. Gestión de Alertas
1. Ir a `/alertas`
2. Ver dashboard con KPIs
3. Usar filtros para navegar
4. Generar alertas manualmente o automáticamente
5. Marcar como leídas según corresponda

## 🔄 Automatización Sugerida

### CRON Diario
```javascript
// Ejecutar diariamente a las 8:00 AM
const generarAlertasDiarias = async () => {
  await fetch('/api/alertas-documentos', { method: 'POST' });
};
```

### Integración con Notificaciones
El sistema está preparado para integrarse con:
- Emails automáticos
- Notificaciones push
- Webhooks a sistemas externos
- Slack/Teams notifications

## 🛡️ Seguridad

- **Autenticación**: Todos los endpoints requieren sesión activa
- **Tenant isolation**: Alertas separadas por tenant
- **Validaciones**: Fechas, permisos y datos requeridos
- **SQL injection**: Uso de parámetros preparados
- **XSS protection**: Sanitización de entrada

## 🎯 Roadmap Futuro

### Corto Plazo
- [ ] Notificaciones por email
- [ ] Exportación de alertas a PDF/Excel
- [ ] Alertas por WhatsApp/SMS

### Mediano Plazo  
- [ ] Machine Learning para predecir vencimientos
- [ ] Integración con calendario empresarial
- [ ] Dashboard ejecutivo con métricas avanzadas

### Largo Plazo
- [ ] Workflow de aprobaciones
- [ ] Versionado de documentos
- [ ] Blockchain para auditabilidad

## 📞 Soporte

Para soporte técnico o consultas sobre el sistema:
- **Desarrollador**: Carlos Irigoyen
- **Email**: carlos.irigoyen@gard.cl
- **Sistema**: GardOps v1.0

---

**🎉 ¡Sistema de vencimientos y alertas documentales implementado exitosamente!**

El sistema está listo para uso en producción con todas las funcionalidades de clase mundial implementadas. 