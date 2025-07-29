# 🔧 CONFIGURAR BASE DE DATOS PARA VER CLIENTES E INSTALACIONES

## 🚨 **PROBLEMA IDENTIFICADO**
Tu aplicación no puede conectarse a la base de datos Neon porque la `DATABASE_URL` no está configurada correctamente.

## ✅ **SOLUCIÓN PASO A PASO**

### **1. Configurar Credenciales de Neon**

#### Opción A: Si ya tienes una base de datos en Neon
1. Ve a tu dashboard de [Neon](https://neon.tech)
2. Copia la cadena de conexión de tu base de datos
3. Abre el archivo `.env.local` en tu editor
4. Reemplaza esta línea:
   ```
   DATABASE_URL="postgresql://username:password@hostname/database?sslmode=require"
   ```
   
   Con tu cadena real de Neon:
   ```
   DATABASE_URL="postgresql://tu_usuario:tu_password@tu_host.neon.tech/tu_database?sslmode=require"
   ```

#### Opción B: Si NO tienes base de datos en Neon
1. Ve a [neon.tech](https://neon.tech) y crea una cuenta gratis
2. Crea un nuevo proyecto/base de datos
3. Copia la cadena de conexión que te proporcionen
4. Pégala en `.env.local` como se indica arriba

### **2. Ejecutar Migraciones**

Una vez configurada la `DATABASE_URL`:

1. **Ir a la página de migraciones:**
   ```
   http://localhost:3000/test-migration
   ```

2. **Hacer clic en "Ejecutar Migración"** - Esto creará todas las tablas necesarias:
   - ✅ `tenants` (inquilinos)
   - ✅ `clientes` (nueva tabla)
   - ✅ `instalaciones` (mejorada)
   - ✅ `guardias`
   - ✅ `pautas_mensuales`
   - ✅ `pautas_diarias`
   - ✅ Y todas las demás...

### **3. Verificar que Funciona**

Después de ejecutar las migraciones exitosamente:

1. **Ver Clientes:**
   ```
   http://localhost:3000/clientes
   ```

2. **Ver Instalaciones:**
   ```
   http://localhost:3000/instalaciones
   ```

Al principio estarán vacías, pero podrás:
- ✅ Ver las páginas sin errores
- ✅ Hacer búsquedas
- ✅ Ver el mensaje "No hay clientes/instalaciones registradas"
- ✅ Botones para agregar nuevos (próximamente funcionales)

### **4. Agregar Datos de Prueba (Opcional)**

Si quieres datos de prueba inmediatamente, puedes usar este SQL directamente en Neon:

```sql
-- Insertar cliente de prueba
INSERT INTO clientes (tenant_id, nombre, razon_social, rut, email, telefono, direccion) 
SELECT id, 'Empresa Demo', 'Empresa Demo S.A.', '12.345.678-9', 'demo@empresa.com', '+56912345678', 'Av. Providencia 123, Santiago'
FROM tenants LIMIT 1;

-- Insertar instalación de prueba
INSERT INTO instalaciones (tenant_id, cliente_id, nombre, direccion, tipo, codigo)
SELECT t.id, c.id, 'Sucursal Centro', 'Av. Libertador 456, Santiago', 'comercial', 'SUC-001'
FROM tenants t, clientes c 
WHERE c.nombre = 'Empresa Demo' LIMIT 1;
```

## 🎯 **RESULTADO ESPERADO**

Después de seguir estos pasos:

✅ **Base de datos conectada**
✅ **Tablas creadas**
✅ **Páginas de clientes e instalaciones funcionando**
✅ **APIs respondiendo correctamente**
✅ **Listo para agregar datos**

## 🚨 **Si Hay Problemas**

### Error: "No se pudo conectar a la base de datos"
- Verifica que la `DATABASE_URL` esté correcta
- Asegúrate de que tu base de datos Neon esté activa
- Verifica que no tengas caracteres especiales sin escapar en la URL

### Error: "Tabla no existe"
- Ejecuta las migraciones desde `/test-migration`
- Si falla, verifica los logs en la consola del navegador

### Las páginas siguen vacías
- Verifica que las migraciones se ejecutaron exitosamente
- Agrega datos de prueba usando el SQL proporcionado arriba
- O usa las APIs para crear datos programáticamente

## 📞 **SIGUIENTE PASO**

1. **Configura tu DATABASE_URL en .env.local**
2. **Ejecuta las migraciones**
3. **Visita /clientes e /instalaciones**
4. **¡Deberías ver las páginas funcionando!**