# 🔧 SOLUCIÓN: PROBLEMAS EN FORMULARIO DE POSTULACIÓN

## 📋 PROBLEMAS IDENTIFICADOS Y RESUELTOS

### 1. ✅ **Autocompletado de Google Maps no completa Comuna y Ciudad**
**Problema:** Al seleccionar una dirección desde el autocompletado de Google Maps, los campos de comuna y ciudad no se estaban llenando automáticamente.

**Causa:** La función `handlePlaceSelect` no estaba actualizando el campo `direccion`, y la lógica para extraer comuna y ciudad no era lo suficientemente robusta.

**Solución:**
```typescript
const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
  if (place.address_components && place.formatted_address) {
    let comuna = '';
    let ciudad = '';

    for (const component of place.address_components) {
      const types = component.types;
      
      // Buscar comuna en diferentes tipos
      if (types.includes('sublocality_level_1') || 
          types.includes('sublocality') || 
          types.includes('administrative_area_level_3')) {
        comuna = component.long_name;
      }
      // Buscar ciudad en diferentes tipos
      if (types.includes('locality') || 
          types.includes('administrative_area_level_2')) {
        if (!ciudad) ciudad = component.long_name;
      }
      // Si no hay ciudad, usar administrative_area_level_1 (región)
      if (!ciudad && types.includes('administrative_area_level_1')) {
        ciudad = component.long_name;
      }
    }

    // Actualizar dirección, comuna y ciudad
    setFormData(prev => ({
      ...prev,
      direccion: place.formatted_address || prev.direccion, // <-- AGREGADO
      comuna: comuna || 'No encontrada',
      ciudad: ciudad || 'No encontrada'
    }));
  }
};
```

**Cambios clave:**
- ✅ Agregada actualización del campo `direccion` con `place.formatted_address`
- ✅ Mejorada lógica de búsqueda de comuna incluyendo `administrative_area_level_3`
- ✅ Mejorada lógica de búsqueda de ciudad incluyendo `administrative_area_level_2`
- ✅ Fallback a `administrative_area_level_1` (región) si no hay ciudad

---

### 2. ✅ **Calendarios de Vencimiento (OS10) no eran Nativos**
**Problema:** Los calendarios para fechas de vencimiento usaban un componente custom `DatePickerComponent` en lugar de un input nativo.

**Solución:**
```typescript
// ANTES:
<DatePickerComponent
  value={doc.fecha_vencimiento || ''}
  onChange={(dateStr: string) => {
    const newDocs = [...documentos];
    newDocs[index].fecha_vencimiento = dateStr;
    setDocumentos(newDocs);
  }}
  placeholder="Seleccionar fecha de vencimiento"
  className="mt-1"
/>

// DESPUÉS:
<Input
  type="date"
  value={doc.fecha_vencimiento || ''}
  onChange={(e) => {
    const newDocs = [...documentos];
    newDocs[index].fecha_vencimiento = e.target.value;
    setDocumentos(newDocs);
  }}
  placeholder="Seleccionar fecha de vencimiento"
  className="mt-1"
/>
```

**Cambios clave:**
- ✅ Reemplazado `DatePickerComponent` por `<Input type="date">`
- ✅ Calendario nativo del navegador, más simple y accesible
- ✅ Mejor experiencia en mobile

---

### 3. ✅ **Fecha de Nacimiento ya usaba Calendario Nativo**
**Estado:** Ya estaba correctamente implementado con `<Input type="date">`.

**Nota:** Este campo ya funcionaba correctamente, no requirió cambios.

---

### 4. ✅ **Modo Día/Noche no funcionaba correctamente**
**Problema:** 
- El tema no persistía al recargar la página
- La clase `dark` no se aplicaba correctamente al cargar
- No se guardaba en `localStorage`

**Solución:**
```typescript
// Estado inicial con lectura de localStorage
const [isDarkMode, setIsDarkMode] = useState(() => {
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  }
  return false;
});

// useEffect para aplicar tema al cargar
useEffect(() => {
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}, []);

// Función toggleTheme mejorada
const toggleTheme = () => {
  const newTheme = !isDarkMode;
  setIsDarkMode(newTheme);
  
  // Guardar en localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    
    // Aplicar clase al documento
    if (newTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
};
```

**Cambios clave:**
- ✅ Inicialización del estado leyendo `localStorage`
- ✅ `useEffect` para aplicar la clase `dark` al cargar la página
- ✅ Guardar preferencia en `localStorage` al cambiar
- ✅ Aplicar clase correctamente usando `add`/`remove` en lugar de `toggle`

---

### 5. ✅ **Documentos eliminados no se guardaban correctamente**
**Problema:** Al eliminar documentos en la configuración y presionar "Guardar", los documentos no se eliminaban de la base de datos.

**Causa:** El endpoint API `/api/setup-document-types` solo actualizaba documentos existentes, pero no eliminaba los que ya no estaban en el array enviado.

**Solución:**
```typescript
// Obtener todos los documentos existentes para este tenant
const documentosExistentes = await client.query(`
  SELECT id FROM documentos_tipos WHERE modulo = 'guardias' AND tenant_id = $1
`, [tenantId]);

const idsExistentes = new Set(documentosExistentes.rows.map(row => row.id));
const idsEnviados = new Set(tipos_documentos.filter(t => t.id && !t.id.startsWith('nuevo-')).map(t => t.id));

// Eliminar documentos que ya no están en el array enviado
const idsAEliminar = Array.from(idsExistentes).filter(id => !idsEnviados.has(id));
if (idsAEliminar.length > 0) {
  await client.query(`
    DELETE FROM documentos_tipos 
    WHERE id = ANY($1) AND tenant_id = $2
  `, [idsAEliminar, tenantId]);
  logger.debug(`🗑️ ${idsAEliminar.length} documentos eliminados`);
}

// Actualizar cada tipo de documento existente
let actualizados = 0;
for (const tipo of tipos_documentos) {
  if (tipo.id && !tipo.id.startsWith('nuevo-')) {
    await client.query(`
      UPDATE documentos_tipos 
      SET 
        requiere_vencimiento = $1,
        dias_antes_alarma = $2,
        activo = $3
      WHERE id = $4 AND tenant_id = $5
    `, [tipo.requiere_vencimiento, tipo.dias_antes_alarma, tipo.activo, tipo.id, tenantId]);
    actualizados++;
  }
}

logger.debug(`✅ ${actualizados} tipos de documentos actualizados, ${idsAEliminar.length} eliminados`);
```

**Cambios clave:**
- ✅ Obtener todos los IDs de documentos existentes en la BD
- ✅ Comparar con los IDs enviados desde el frontend
- ✅ Eliminar los documentos que ya no están en el array
- ✅ Logging detallado de documentos actualizados y eliminados

---

## 📁 ARCHIVOS MODIFICADOS

1. **`src/app/postulacion/[tenantId]/page.tsx`**
   - Función `handlePlaceSelect` corregida
   - `DatePickerComponent` reemplazado por `<Input type="date">`
   - Estado `isDarkMode` con lectura de `localStorage`
   - Función `toggleTheme` mejorada
   - `useEffect` para aplicar tema al cargar

2. **`src/app/api/setup-document-types/route.ts`**
   - Lógica de eliminación de documentos agregada
   - Comparación de IDs existentes vs enviados
   - Logging mejorado

---

## 🎯 RESULTADO FINAL

### ✅ **PROBLEMAS RESUELTOS:**
1. **Autocompletado de Google Maps** - Ahora completa dirección, comuna y ciudad
2. **Calendarios nativos** - Input type="date" en vencimiento de OS10
3. **Fecha de nacimiento** - Ya funcionaba correctamente
4. **Modo día/noche** - Persiste en localStorage y aplica correctamente
5. **Sincronización de documentos** - Eliminar documentos ahora funciona correctamente

### 🚀 **CÓMO USAR:**

1. **Dirección:** Escribe en el campo y selecciona de Google Maps - dirección, comuna y ciudad se llenarán automáticamente
2. **Fecha de vencimiento OS10:** Usa el calendario nativo del navegador
3. **Modo día/noche:** Click en el botón Sol/Luna - la preferencia se guarda
4. **Documentos:** En configuración, elimina documentos y presiona "Guardar" - ahora se eliminan correctamente

---

## 📝 **NOTAS TÉCNICAS:**

- **Google Maps:** Maneja múltiples tipos de `address_components` para Chile
- **Calendarios nativos:** Mejor experiencia mobile y accesibilidad
- **Tema:** Persiste en `localStorage` y sincroniza con `document.documentElement.classList`
- **Documentos:** Sincronización completa entre frontend y backend usando comparación de IDs
