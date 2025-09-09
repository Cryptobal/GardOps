# 📊 Sistema de Exportar/Importar Clientes e Instalaciones - GardOps

## 🎯 **Descripción General**

Este sistema permite **exportar** todos los clientes e instalaciones de la base de datos a archivos Excel, **importar** modificaciones masivas desde Excel, y **crear nuevos registros masivamente**, manteniendo la integridad de los datos existentes.

## 🚀 **Características Principales**

- ✅ **Exportación completa** - Todos los campos de clientes e instalaciones en Excel
- ✅ **Importación inteligente** - Solo actualiza campos modificados
- ✅ **Creación masiva** - Crea nuevos registros desde Excel
- ✅ **Validación automática** - Verifica datos antes de importar
- ✅ **Preserva relaciones** - Mantiene las relaciones entre clientes e instalaciones
- ✅ **Rollback seguro** - Si algo sale mal, no se pierde información
- ✅ **Formato estándar** - Excel compatible con todas las versiones

## 📋 **Módulo de Clientes**

### **Campos Incluidos en la Exportación**

#### **Información Básica**
- ID (UUID único del cliente)
- Nombre (Nombre de fantasía)
- RUT Empresa
- Representante Legal
- RUT Representante
- Email, Teléfono
- Dirección, Ciudad, Comuna
- Latitud, Longitud (coordenadas GPS)
- Razón Social
- Estado (Activo/Inactivo)

#### **Estadísticas**
- Instalaciones (cantidad de instalaciones asociadas)
- Fecha de Creación
- Fecha de Última Actualización

### **🔄 Cómo Usar el Sistema de Clientes**

#### **📥 Opción 1: Exportar y Modificar Clientes Existentes**

##### **Paso 1: Exportar Datos Actuales**
1. Ve a la página **Clientes** (`/clientes`)
2. Haz clic en el botón **"Exportar Excel"** 📥
3. Se descargará un archivo `clientes_YYYY-MM-DD.xlsx`
4. **IMPORTANTE**: Este archivo contiene TODOS los datos actuales

##### **Paso 2: Modificar en Excel**
1. Abre el archivo descargado en **Microsoft Excel** o **Google Sheets**
2. **NO MODIFIQUES** la columna **ID** (es la clave para identificar clientes)
3. Modifica solo los campos que necesites actualizar
4. **Guarda el archivo** (mantén formato .xlsx)

##### **Paso 3: Importar Modificaciones**
1. En la página de Clientes, haz clic en **"Importar Excel"** 📤
2. Selecciona el archivo modificado
3. El sistema procesará automáticamente las actualizaciones
4. Verás un resumen de cuántos clientes se actualizaron

#### **🆕 Opción 2: Crear Nuevos Clientes Masivamente**

##### **Paso 1: Descargar Plantilla**
1. Ve a la página **Clientes** (`/clientes`)
2. Haz clic en el botón **"Plantilla"** 📋
3. Se descargará `plantilla_nuevos_clientes.xlsx` con campos de ejemplo

##### **Paso 2: Llenar Datos en Excel**
1. Abre la plantilla en **Microsoft Excel** o **Google Sheets**
2. **DEJA VACÍA** la columna **ID** (se genera automáticamente)
3. Llena los campos obligatorios: **Nombre**, **RUT Empresa**
4. Completa los campos opcionales según necesites
5. **Guarda el archivo** (mantén formato .xlsx)

##### **Paso 3: Importar Nuevos Clientes**
1. Haz clic en **"Importar Excel"** 📤
2. Selecciona el archivo con los nuevos clientes
3. El sistema creará automáticamente los nuevos registros
4. Verás un resumen de cuántos clientes se crearon

## 📋 **Módulo de Instalaciones**

### **Campos Incluidos en la Exportación**

#### **Información Básica**
- ID (UUID único de la instalación)
- Nombre de la Instalación
- Cliente (nombre del cliente asociado)
- RUT Cliente
- Dirección, Ciudad, Comuna
- Latitud, Longitud (coordenadas GPS)
- Teléfono
- Valor Turno Extra
- Estado (Activo/Inactivo)

#### **Estadísticas Operacionales**
- Puestos Operativos (cantidad de puestos activos)
- Guardias Asignados (cantidad de guardias asignados)
- Fecha de Creación
- Fecha de Última Actualización

### **🔄 Cómo Usar el Sistema de Instalaciones**

#### **📥 Opción 1: Exportar y Modificar Instalaciones Existentes**

##### **Paso 1: Exportar Datos Actuales**
1. Ve a la página **Instalaciones** (`/instalaciones`)
2. Haz clic en el botón **"Exportar Excel"** 📥
3. Se descargará un archivo `instalaciones_YYYY-MM-DD.xlsx`
4. **IMPORTANTE**: Este archivo contiene TODOS los datos actuales

##### **Paso 2: Modificar en Excel**
1. Abre el archivo descargado en **Microsoft Excel** o **Google Sheets**
2. **NO MODIFIQUES** la columna **ID** (es la clave para identificar instalaciones)
3. Modifica solo los campos que necesites actualizar
4. **IMPORTANTE**: Si cambias el cliente, usa el **RUT Cliente** o **Cliente** exacto
5. **Guarda el archivo** (mantén formato .xlsx)

##### **Paso 3: Importar Modificaciones**
1. En la página de Instalaciones, haz clic en **"Importar Excel"** 📤
2. Selecciona el archivo modificado
3. El sistema procesará automáticamente las actualizaciones
4. Verás un resumen de cuántas instalaciones se actualizaron

#### **🆕 Opción 2: Crear Nuevas Instalaciones Masivamente**

##### **Paso 1: Descargar Plantilla**
1. Ve a la página **Instalaciones** (`/instalaciones`)
2. Haz clic en el botón **"Plantilla"** 📋
3. Se descargará `plantilla_nuevas_instalaciones.xlsx` con campos de ejemplo

##### **Paso 2: Llenar Datos en Excel**
1. Abre la plantilla en **Microsoft Excel** o **Google Sheets**
2. **DEJA VACÍA** la columna **ID** (se genera automáticamente)
3. Llena los campos obligatorios: **Nombre**, **Dirección**
4. **IMPORTANTE**: Para asociar con cliente, usa **Cliente** (nombre) o **RUT Cliente**
5. Completa los campos opcionales según necesites
6. **Guarda el archivo** (mantén formato .xlsx)

##### **Paso 3: Importar Nuevas Instalaciones**
1. Haz clic en **"Importar Excel"** 📤
2. Selecciona el archivo con las nuevas instalaciones
3. El sistema creará automáticamente los nuevos registros
4. Verás un resumen de cuántas instalaciones se crearon

## ⚠️ **Reglas Importantes**

### **✅ Lo que SÍ puedes hacer:**

#### **Para Registros Existentes:**
- Modificar cualquier campo excepto el ID
- Cambiar valores de texto, números, fechas
- Actualizar múltiples registros a la vez
- Dejar campos vacíos (se mantienen los valores existentes)
- Cambiar asociaciones de clientes (en instalaciones)

#### **Para Nuevos Registros:**
- Crear múltiples registros a la vez
- Llenar solo los campos obligatorios
- Agregar información opcional según necesites
- Usar las plantillas oficiales del sistema

### **❌ Lo que NO puedes hacer:**

#### **Campos Protegidos:**
- **NUNCA modifiques** la columna **ID** - es la clave única
- No cambies el formato de fechas del sistema
- No uses caracteres especiales en RUTs (solo números y guión)

#### **Validaciones del Sistema:**
- Los **RUTs** deben tener formato válido (12345678-9)
- Los **emails** deben tener formato válido
- Las **coordenadas** deben ser números válidos
- Los **clientes** deben existir en el sistema (para instalaciones)

## 🔧 **Funcionalidades Técnicas**

### **Validaciones Automáticas**
- ✅ Verificación de formato de archivos Excel
- ✅ Validación de campos obligatorios
- ✅ Verificación de existencia de relaciones (cliente-instalación)
- ✅ Validación de formatos de datos (emails, coordenadas, números)
- ✅ Control de duplicados por ID

### **Manejo de Errores**
- 📝 Reporte detallado de errores por fila
- 🔄 Procesamiento fila por fila (no se detiene en errores)
- 📊 Resumen final con estadísticas de importación
- 🛡️ Rollback automático si hay errores críticos

### **Rendimiento**
- ⚡ Procesamiento optimizado para archivos grandes
- 📊 Consultas eficientes a la base de datos
- 🔄 Actualización solo de campos modificados
- 💾 Gestión eficiente de memoria para archivos Excel

## 🚨 **Consejos de Uso**

### **Antes de Importar**
1. **Haz una copia de seguridad** de tus datos importantes
2. **Prueba con pocos registros** primero
3. **Revisa el formato** de los campos obligatorios
4. **Verifica las relaciones** entre clientes e instalaciones

### **Durante la Importación**
1. **No cierres** el navegador durante el proceso
2. **Espera** el mensaje de confirmación
3. **Revisa** el resumen de resultados
4. **Anota** cualquier error reportado

### **Después de la Importación**
1. **Verifica** que los datos se importaron correctamente
2. **Revisa** las relaciones entre registros
3. **Actualiza** las páginas para ver los cambios
4. **Reporta** cualquier inconsistencia

## 📞 **Soporte**

Si encuentras algún problema:

1. **Revisa** esta documentación
2. **Verifica** el formato de tus archivos Excel
3. **Consulta** los mensajes de error del sistema
4. **Contacta** al administrador del sistema con detalles específicos

---

## ✨ **Beneficios del Sistema**

- 🚀 **Ahorro de tiempo** - Carga masiva en minutos
- 📊 **Datos consistentes** - Validaciones automáticas
- 🔄 **Flexibilidad** - Actualiza solo lo que necesites
- 🛡️ **Seguridad** - Preserva la integridad de datos
- 📱 **Fácil de usar** - Interfaz intuitiva y responsive

¡El sistema está diseñado para hacer tu trabajo más eficiente y seguro! 🎉
