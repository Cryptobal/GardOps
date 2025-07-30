# Módulo de Optimización de Asignaciones

Este módulo permite optimizar las asignaciones de guardias a instalaciones basándose en la proximidad geográfica.

## Características

- **Búsqueda por proximidad**: Encuentra guardias cercanos a una instalación o instalaciones cercanas a un guardia
- **Cálculo de distancias**: Utiliza la fórmula de Haversine para calcular distancias reales entre coordenadas
- **Visualización en mapa**: Muestra las ubicaciones en Google Maps con marcadores diferenciados
- **Filtros avanzados**: Permite configurar radio de búsqueda y otros parámetros
- **Estadísticas en tiempo real**: Muestra métricas de los resultados encontrados

## Componentes

### `OptimizacionAsignacionesPage`
Página principal que integra todos los componentes del módulo.

### `StatsCards`
Muestra estadísticas de:
- Total de guardias con coordenadas
- Total de instalaciones activas
- Resultados encontrados
- Distancia promedio

### `FiltrosAvanzados`
Componente de filtros que incluye:
- Selector de tipo de referencia (Guardia/Instalación)
- Búsqueda con autocompletado
- Selector de distancia
- Filtros adicionales expandibles

## APIs

### `/api/guardias-con-coordenadas`
Obtiene guardias que tienen coordenadas geográficas válidas.

**Parámetros:**
- `tenantId`: ID del tenant actual

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nombre": "Juan Pérez",
      "direccion": "Las Condes 34",
      "ciudad": "Chiguayante",
      "comuna": "Chiguayante",
      "latitud": -36.9214,
      "longitud": -73.0167,
      "email": "juan@example.com",
      "telefono": "+56912345678",
      "estado": "Activo"
    }
  ]
}
```

### `/api/instalaciones-con-coordenadas`
Obtiene instalaciones activas con coordenadas geográficas válidas.

**Parámetros:**
- `tenantId`: ID del tenant actual

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nombre": "Aeródromo Victor Lafón",
      "direccion": "Ruta 160",
      "ciudad": "Chiguayante",
      "comuna": "Chiguayante",
      "latitud": -36.9214,
      "longitud": -73.0167,
      "estado": "Activo",
      "valor_turno_extra": 50000,
      "cliente_nombre": "Cliente ABC"
    }
  ]
}
```

## Funciones de utilidad

### `calcularDistancia(lat1, lon1, lat2, lon2)`
Calcula la distancia en kilómetros entre dos puntos usando la fórmula de Haversine.

### `buscarUbicacionesCercanas(referencia, ubicaciones, distanciaMaxima)`
Encuentra ubicaciones dentro del radio especificado, ordenadas por distancia.

## Uso

1. **Seleccionar tipo de referencia**: Elegir si buscar desde una instalación o un guardia
2. **Buscar referencia**: Usar el campo de búsqueda con autocompletado
3. **Configurar distancia**: Seleccionar el radio de búsqueda (5-50 km)
4. **Ver resultados**: Los resultados se muestran en el mapa y la tabla
5. **Analizar información**: Revisar detalles como contacto, cliente, valor de turno extra

## Dependencias

- Google Maps JavaScript API
- Componentes UI de shadcn/ui
- Lucide React para iconos
- Fórmula de Haversine para cálculos de distancia

## Consideraciones técnicas

- Los datos se cargan al montar el componente
- Los cálculos de distancia se realizan en el frontend para mejor rendimiento
- El mapa se actualiza automáticamente cuando cambian los filtros
- La tabla es responsive y muestra información adicional según el tipo de resultado 