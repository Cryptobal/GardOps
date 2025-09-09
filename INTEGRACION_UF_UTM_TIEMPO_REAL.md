# Integración de Valores UF/UTM en Tiempo Real

## Resumen

Se ha implementado una integración completa para obtener los valores UF (Unidad de Fomento) y UTM (Unidad Tributaria Mensual) en tiempo real desde las APIs oficiales de la Comisión para el Mercado Financiero (CMF) de Chile. Esta integración reemplaza los valores estáticos por datos actualizados automáticamente.

## Características Implementadas

### 1. Página de Monitoreo UF/UTM
- **Ruta**: `/payroll/valores-utm-uf`
- **Funcionalidad**: Muestra los valores UF y UTM en tiempo real
- **Características**:
  - Actualización automática al cargar la página
  - Botón de actualización manual
  - Visualización de URLs de las APIs utilizadas
  - Enlaces a documentación oficial
  - Manejo de errores con mensajes informativos

### 2. Endpoint API para Valores UF/UTM
- **Ruta**: `/api/payroll/valores-utm-uf`
- **Método**: GET
- **Funcionalidad**: Obtiene valores UF/UTM desde APIs de CMF
- **Respuesta**:
```json
{
  "success": true,
  "data": {
    "uf": {
      "valor": 35000,
      "fecha": "2025-01-15"
    },
    "utm": {
      "valor": 65000,
      "fecha": "2025-01-15"
    },
    "timestamp": "2025-01-15T10:30:00.000Z",
    "source": "CMF Chile APIs"
  }
}
```

### 3. Utilidades para Cálculos
- **Archivo**: `src/lib/payroll-utils.ts`
- **Funciones principales**:
  - `fetchUFUTMValues()`: Obtiene valores UF/UTM
  - `getCurrentUFValue()`: Obtiene valor UF actual
  - `getCurrentUTMValue()`: Obtiene valor UTM actual
  - `calculateImpuestoUnico()`: Calcula impuesto único con UF actual
  - `calculateGratificacion()`: Calcula gratificación con UF actual
  - `calculateTopeImponibleAFP()`: Calcula tope AFP con UF actual
  - `calculateTopeImponibleISAPRE()`: Calcula tope ISAPRE con UF actual

### 4. Integración en Parámetros
- **Ruta**: `/payroll/parametros`
- **Funcionalidad**: Los campos UF/UTM ahora muestran valores en tiempo real
- **Características**:
  - Actualización automática al cargar la página
  - Botón de actualización manual
  - Indicador de fuente de datos (CMF)
  - Formato de moneda chilena

### 5. Ejemplo de Cálculo
- **Ruta**: `/payroll/calculo-ejemplo`
- **Funcionalidad**: Demuestra cálculos completos usando valores UF/UTM
- **Características**:
  - Cálculo de impuesto único con tramos actuales
  - Cálculo de gratificación legal con tope UF
  - Cálculo de topes imponibles AFP/ISAPRE
  - Desglose completo de sueldo líquido

### 6. Indicadores Globales en Navbar
- **Componente**: `UFUTMIndicator`
- **Ubicación**: Navbar principal (visible en todas las páginas)
- **Características**:
  - Muestra valores UF/UTM en tiempo real
  - Versión compacta para pantallas medianas
  - Tooltips con información detallada
  - Botón de actualización manual
  - Indicador de última actualización
  - Actualización automática cada 30 minutos

## Configuración de APIs

### Credenciales Utilizadas
```typescript
const API_KEY = 'd9f76c741ee20ccf0e776ecdf58c32102cfa9806';
```

### URLs de las APIs
- **UF**: `https://api.cmfchile.cl/api-sbifv3/recursos_api/uf?apikey=${API_KEY}&formato=json`
- **UTM**: `https://api.cmfchile.cl/api-sbifv3/recursos_api/utm?apikey=${API_KEY}&formato=json`

### Documentación Oficial
- **UF**: https://api.cmfchile.cl/documentacion/UF.html
- **UTM**: https://api.cmfchile.cl/documentacion/UTM.html

## Uso en el Sistema

### 1. Obtener Valores UF/UTM
```typescript
import { getCurrentUFValue, getCurrentUTMValue } from '@/lib/payroll-utils';

// Obtener valor UF actual
const ufValue = await getCurrentUFValue();

// Obtener valor UTM actual
const utmValue = await getCurrentUTMValue();
```

### 2. Calcular Impuesto Único
```typescript
import { calculateImpuestoUnico } from '@/lib/payroll-utils';

const resultado = await calculateImpuestoUnico(800000);
console.log(`Impuesto: ${resultado.impuesto}`);
console.log(`Tramo: ${resultado.tramo}`);
```

### 3. Calcular Gratificación
```typescript
import { calculateGratificacion } from '@/lib/payroll-utils';

const resultado = await calculateGratificacion(800000, 12);
console.log(`Gratificación: ${resultado.gratificacion}`);
```

### 4. Calcular Topes Imponibles
```typescript
import { calculateTopeImponibleAFP, calculateTopeImponibleISAPRE } from '@/lib/payroll-utils';

const topeAFP = await calculateTopeImponibleAFP();
const topeISAPRE = await calculateTopeImponibleISAPRE();
```

## Beneficios de la Integración

### 1. Precisión en Cálculos
- Los valores UF/UTM se actualizan automáticamente
- Elimina errores por valores desactualizados
- Cálculos siempre basados en valores oficiales

### 2. Cumplimiento Legal
- Valores obtenidos directamente de la CMF
- Cumplimiento con normativa chilena
- Actualización automática de topes y límites

### 3. Automatización
- Sin intervención manual para actualizar valores
- Reducción de errores humanos
- Procesos más eficientes

### 4. Transparencia
- Fuente de datos claramente identificada
- Trazabilidad de valores utilizados
- Documentación de APIs utilizadas

## Manejo de Errores

### 1. Fallback a Valores por Defecto
Si las APIs no están disponibles, el sistema utiliza valores por defecto:
- UF: 39,280.76 CLP
- UTM: 68,647 CLP

### 2. Parsing de Valores
Los valores de las APIs vienen en formato chileno (punto como separador de miles, coma como separador decimal):
- UF: "39.280,76" → 39280.76
- UTM: "68.647" → 68647

El sistema incluye una función `parseChileanNumber()` que convierte correctamente estos formatos a números.

### 3. Logging de Errores
Todos los errores se registran en la consola para debugging:
```typescript
console.error('Error fetching UF:', error);
console.error('Error fetching UTM:', error);
```

### 4. Mensajes de Error Informativos
La interfaz muestra mensajes claros cuando hay problemas:
- "Error al obtener valor UF: [detalle]"
- "Error al obtener valor UTM: [detalle]"

## Próximos Pasos

### 1. Integración Completa
- Integrar valores UF/UTM en todos los cálculos de payroll existentes
- Actualizar endpoints de cálculo de sueldos
- Migrar datos históricos si es necesario

### 2. Optimización
- Implementar caché para reducir llamadas a APIs
- Configurar actualización automática periódica
- Optimizar manejo de errores

### 3. Monitoreo
- Implementar alertas cuando las APIs no estén disponibles
- Dashboard de estado de las APIs
- Métricas de uso y rendimiento

## Archivos Creados/Modificados

### Nuevos Archivos
- `src/app/payroll/valores-utm-uf/page.tsx`
- `src/app/payroll/calculo-ejemplo/page.tsx`
- `src/app/api/payroll/valores-utm-uf/route.ts`
- `src/app/api/payroll/calculo-ejemplo/route.ts`
- `src/lib/payroll-utils.ts`
- `src/components/shared/UFUTMIndicator.tsx`

### Archivos Modificados
- `src/app/payroll/page.tsx` (agregado menú)
- `src/app/payroll/parametros/page.tsx` (integración UF/UTM)
- `src/components/layout/navbar.tsx` (indicadores UF/UTM globales)

## Consideraciones de Seguridad

### 1. API Key
- La API key está hardcodeada en el código
- Considerar mover a variables de entorno
- Implementar rotación de API keys

### 2. Rate Limiting
- Las APIs de CMF pueden tener límites de uso
- Implementar throttling si es necesario
- Monitorear uso de APIs

### 3. Validación de Datos
- Validar respuestas de las APIs
- Implementar timeouts para requests
- Manejar casos edge en los datos

## Conclusión

La integración de valores UF/UTM en tiempo real representa una mejora significativa en la precisión y automatización del sistema de payroll. Los cálculos ahora se basan en valores oficiales actualizados, reduciendo errores y mejorando el cumplimiento normativo.

La implementación es robusta, con manejo de errores apropiado y una interfaz clara para monitorear los valores. El sistema está listo para ser integrado completamente en todos los cálculos de payroll existentes.

