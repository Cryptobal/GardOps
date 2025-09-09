# 🔑 Credenciales del Usuario Agente

## 👤 **Usuario: agente@gard.cl**

### **Credenciales de Acceso:**
- **Email**: `agente@gard.cl`
- **Password**: `agente123`
- **Nombre**: Agente Operativo
- **Rol**: Operador
- **Tenant**: Gard
- **Estado**: Activo

### **Permisos:**
- Acceso básico al sistema
- Permisos de Operador (no es Super Admin)
- Puede ver y gestionar operaciones básicas

## 🚀 **Cómo Usar:**

### **1. Login en la Aplicación:**
1. Ve a la página de login
2. Ingresa las credenciales:
   - Email: `agente@gard.cl`
   - Password: `agente123`
3. Haz clic en "Iniciar Sesión"

### **2. Script de Actualización:**
Si necesitas actualizar la contraseña o recrear el usuario:

```bash
# Ejecutar script de actualización
node scripts/update-agente-password.js
```

## ⚠️ **Notas Importantes:**

- **Password hasheado**: En la base de datos está encriptado por seguridad
- **Rol limitado**: No tiene permisos de administrador
- **Tenant Gard**: Está en la empresa principal, no en el demo
- **Solo lectura**: Este usuario es para pruebas y operaciones básicas

## 🔧 **Troubleshooting:**

### **Error 401 - Credenciales Incorrectas:**
- Verifica que el usuario existe en la BD
- Ejecuta el script de actualización
- Asegúrate de que el cambio se haya desplegado en Vercel

### **Usuario No Encontrado:**
- Ejecuta: `node scripts/update-agente-password.js`
- Verifica que el tenant "Gard" existe
- Confirma que el rol "Operador" está disponible

## 📝 **Historial de Cambios:**

- **2025-01-XX**: Usuario creado con password `agente123gardops-salt-2024`
- **2025-01-XX**: Password actualizado a `agente123`
- **2025-01-XX**: Rol Operador asignado
- **2025-01-XX**: Usuario activado en tenant Gard
