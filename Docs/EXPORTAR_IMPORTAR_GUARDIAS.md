# 📊 Sistema de Exportar/Importar Guardias - GardOps

## 🎯 **Descripción General**

Este sistema permite **exportar** todos los guardias de la base de datos a un archivo Excel, **importar** modificaciones masivas desde Excel, y **crear nuevos guardias masivamente**, manteniendo la integridad de los datos existentes.

## 🚀 **Características Principales**

- ✅ **Exportación completa** - Todos los campos de guardias en Excel
- ✅ **Importación inteligente** - Solo actualiza campos modificados
- ✅ **Creación masiva** - Crea nuevos guardias desde Excel
- ✅ **Validación automática** - Verifica datos antes de importar
- ✅ **Preserva robots** - No elimina información existente
- ✅ **Rollback seguro** - Si algo sale mal, no se pierde información
- ✅ **Formato estándar** - Excel compatible con todas las versiones

## 📋 **Campos Incluidos en la Exportación**

### **Información Básica**
- ID (UUID único del guardia)
- Nombre, Apellido Paterno, Apellido Materno
- RUT, Email, Teléfono
- Dirección, Ciudad, Comuna, Región
- Estado (Activo/Inactivo)
- Tipo de Guardia (Contratado/Esporádico)

### **Información de Servicio**
- Fecha OS10
- Instalación Asignada
- Rol Actual
- Sueldo Base
- Bonos (Movilización, Colación, Responsabilidad)

### **Información Personal**
- Sexo, Nacionalidad, Fecha de Nacimiento
- AFP, Descuento AFP
- Previsión de Salud
- Cotiza Sobre 7
- Monto Pactado en UF
- Es Pensionado
- Asignación Familiar, Tramo Asignación

### **Información Física**
- Talla Camisa, Talla Pantalón, Talla Zapato
- Altura (cm), Peso (kg)

### **Metadatos**
- Fecha de Creación
- Fecha de Última Actualización

## 🔄 **Cómo Usar el Sistema**

### **📥 Opción 1: Exportar y Modificar Guardias Existentes**

#### **Paso 1: Exportar Datos Actuales**
1. Ve a la página **Guardias** (`/guardias`)
2. Haz clic en el botón **"Exportar Excel"** 📥
3. Se descargará un archivo `guardias_YYYY-MM-DD.xlsx`
4. **IMPORTANTE**: Este archivo contiene TODOS los datos actuales

#### **Paso 2: Modificar en Excel**
1. Abre el archivo descargado en **Microsoft Excel** o **Google Sheets**
2. **NO MODIFIQUES** la columna **ID** (es la clave para identificar guardias)
3. Modifica solo los campos que necesites actualizar
4. **Guarda el archivo** (mantén formato .xlsx)

#### **Paso 3: Importar Modificaciones**
1. En la página de Guardias, haz clic en **"Importar Excel"** 📤
2. Selecciona el archivo modificado
3. El sistema procesará automáticamente las actualizaciones
4. Verás un resumen de cuántos guardias se actualizaron

### **🆕 Opción 2: Crear Nuevos Guardias Masivamente**

#### **Paso 1: Descargar Plantilla**
1. Ve a la página **Guardias** (`/guardias`)
2. Haz clic en el botón **"Plantilla"** 📋
3. Se descargará `plantilla_nuevos_guardias.xlsx` con campos de ejemplo

#### **Paso 2: Llenar Datos en Excel**
1. Abre la plantilla en **Microsoft Excel** o **Google Sheets**
2. **DEJA VACÍA** la columna **ID** (se genera automáticamente)
3. Llena los campos obligatorios: Nombre, Apellido Paterno, Apellido Materno, RUT, Email
4. Completa los campos opcionales según necesites
5. **Guarda el archivo** (mantén formato .xlsx)

#### **Paso 3: Importar Nuevos Guardias**
1. Haz clic en **"Importar Excel"** 📤
2. Selecciona el archivo con los nuevos guardias
3. El sistema creará automáticamente los nuevos registros
4. Verás un resumen de cuántos guardias se crearon

## ⚠️ **Reglas Importantes**

### **✅ Lo que SÍ puedes hacer:**

#### **Para Guardias Existentes:**
- Modificar cualquier campo excepto el ID
- Cambiar valores de texto, números, fechas
- Cambiar valores booleanos (Sí/No, 1/0)
- Actualizar múltiples guardias a la vez
- Dejar campos vacíos (se mantienen los valores existentes)

#### **Para Nuevos Guardias:**
- Crear múltiples guardias a la vez
- Llenar solo los campos obligatorios
- Agregar información opcional según necesites
- Usar la plantilla oficial del sistema

### **❌ Lo que NO puedes hacer:**
- Modificar la columna ID en guardias existentes
- Eliminar filas completas
- Cambiar el formato de las columnas
- Usar formatos de fecha no estándar

### **🔒 Seguridad de Datos:**
- **Siempre se hace backup** antes de importar
- **Solo se actualizan campos modificados**
- **No se elimina información existente**
- **Validación automática** de todos los datos

## 📊 **Formato de Datos Esperado**

### **Campos Booleanos (Sí/No):**
- **Activo**: "Sí", "SI", "S", "1", true → Se convierte a `true`
- **Cotiza Sobre 7**: "Sí", "SI", "S", "1", true → Se convierte a `true`
- **Es Pensionado**: "Sí", "SI", "S", "1", true → Se convierte a `true`
- **Asignación Familiar**: "Sí", "SI", "S", "1", true → Se convierte a `true`

### **Campos Obligatorios para Nuevos Guardias:**
- **Nombre**: Texto (no puede estar vacío)
- **Apellido Paterno**: Texto (no puede estar vacío)
- **Apellido Materno**: Texto (puede estar vacío)
- **RUT**: Formato chileno (ej: 12345678-9)
- **Email**: Formato de email válido

### **Campos de Fecha:**
- **Fecha Nacimiento**: Cualquier formato de fecha válido
- **Fecha OS10**: Cualquier formato de fecha válido
- Se convierten automáticamente a formato YYYY-MM-DD

### **Campos Numéricos:**
- **Descuento AFP**: Número decimal (ej: 1.00)
- **Monto Pactado UF**: Número decimal (ej: 87.80)
- **Altura (cm)**: Número entero (ej: 175)
- **Peso (kg)**: Número entero (ej: 70)
- **Talla Zapato**: Número entero (ej: 42)

## 🚨 **Manejo de Errores**

### **Errores Comunes y Soluciones:**

1. **"Falta ID del guardia"**
   - Verifica que la columna ID no esté vacía
   - No modifiques la columna ID

2. **"Guardia con ID X no existe"**
   - El ID en el Excel no coincide con la base de datos
   - Usa siempre el archivo exportado recientemente

3. **"Error interno del servidor"**
   - Verifica que el archivo sea Excel válido (.xlsx, .xls)
   - Intenta con un archivo más pequeño

### **Validaciones Automáticas:**
- ✅ Formato de archivo correcto
- ✅ Existencia de guardias
- ✅ Tipos de datos válidos
- ✅ Conversiones automáticas
- ✅ Rollback en caso de error

## 📈 **Casos de Uso Típicos**

### **🔄 Actualización Masiva de Guardias Existentes:**

#### **1. Actualización de Contactos**
- Exportar guardias
- Modificar emails y teléfonos en Excel
- Importar cambios

#### **2. Actualización de Información Previsional**
- Exportar guardias
- Modificar AFP, previsión de salud
- Importar cambios

#### **3. Actualización de Ubicaciones**
- Exportar guardias
- Modificar ciudades, comunas, regiones
- Importar cambios

#### **4. Actualización de Tallas y Medidas**
- Exportar guardias
- Modificar tallas de uniforme
- Importar cambios

### **🆕 Creación Masiva de Nuevos Guardias:**

#### **5. Onboarding de Personal Nuevo**
- Descargar plantilla
- Llenar datos de nuevos empleados
- Importar para crear registros

#### **6. Migración desde Otros Sistemas**
- Preparar Excel con datos de otros sistemas
- Usar plantilla como base
- Importar para migrar datos

#### **7. Postulantes Aprobados**
- Lista de postulantes aprobados
- Llenar información completa
- Crear registros masivamente

## 🔧 **Soporte Técnico**

### **Si tienes problemas:**

1. **Verifica el formato del archivo** (.xlsx o .xls)
2. **Revisa los logs** en la consola del navegador
3. **Usa el archivo exportado** como base (no crees uno desde cero)
4. **Contacta al equipo técnico** si persisten los errores

### **Información de Debug:**
- Todos los procesos se registran en la consola
- Se muestran mensajes de éxito y error
- Se cuenta cuántos guardias se actualizaron
- Se detallan errores específicos por fila

## 📝 **Ejemplos de Uso Completo**

### **🔄 Ejemplo 1: Actualización Masiva**
```
1. 📥 Exportar → Se descarga "guardias_2025-01-20.xlsx"
2. ✏️ Modificar en Excel:
   - Fila 3: Cambiar email de "juan@old.com" a "juan@new.com"
   - Fila 7: Cambiar teléfono de "123456789" a "987654321"
   - Fila 12: Cambiar AFP de "Capital" a "Cuprum"
3. 📤 Importar → Se actualizan 3 guardias
4. ✅ Verificar → Los cambios aparecen en la interfaz
```

### **🆕 Ejemplo 2: Creación Masiva**
```
1. 📋 Plantilla → Se descarga "plantilla_nuevos_guardias.xlsx"
2. ✏️ Llenar en Excel:
   - Fila 2: Juan Pérez, juan@email.com, +56912345678
   - Fila 3: María González, maria@email.com, +56987654321
   - Fila 4: Carlos Silva, carlos@email.com, +56911223344
3. 📤 Importar → Se crean 3 nuevos guardias
4. ✅ Verificar → Los nuevos guardias aparecen en la lista
```

## 🎉 **Beneficios del Sistema**

- **⏱️ Ahorro de tiempo**: Actualiza cientos de guardias en minutos
- **🔒 Seguridad**: No se pierde información existente
- **✅ Precisión**: Validación automática de datos
- **📊 Trazabilidad**: Logs completos de todas las operaciones
- **🔄 Flexibilidad**: Solo actualiza lo que cambia
- **💼 Profesional**: Interfaz intuitiva y fácil de usar

---

**Desarrollado por el equipo de GardOps** 🚀
**Última actualización**: Enero 2025
