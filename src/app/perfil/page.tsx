"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, Lock, Eye, EyeOff, Save, AlertCircle } from "lucide-react";
import { rbacFetch } from "@/lib/rbacClient";

interface UserProfile {
  id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  activo: boolean;
  tenant_id: string | null;
  fecha_creacion: string;
}

export default function PerfilPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Formulario de datos personales
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
  });
  
  // Formulario de cambio de contraseña
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  
  // Validaciones en tiempo real
  const passwordErrors = {
    current: !passwordData.currentPassword.trim() ? 'Contraseña actual requerida' : '',
    new: !passwordData.newPassword.trim() ? 'Nueva contraseña requerida' : 
         passwordData.newPassword.length < 6 ? 'Mínimo 6 caracteres' : '',
    confirm: !passwordData.confirmPassword.trim() ? 'Confirmar contraseña requerida' :
            passwordData.newPassword !== passwordData.confirmPassword ? 'Las contraseñas no coinciden' : ''
  };
  
  const isPasswordFormValid = passwordData.currentPassword.trim() && 
                            passwordData.newPassword.trim() && 
                            passwordData.confirmPassword.trim() &&
                            passwordData.newPassword.length >= 6 &&
                            passwordData.newPassword === passwordData.confirmPassword &&
                            passwordData.currentPassword !== passwordData.newPassword;
  
  const { success: toastSuccess, error: toastError, addToast: toast } = useToast();

  // Cargar perfil del usuario
  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await rbacFetch('/api/me/profile');
      
      if (!response.ok) {
        throw new Error('Error al cargar perfil');
      }
      
      const data = await response.json();
      setProfile(data.profile);
      setFormData({
        nombre: data.profile.nombre || "",
        apellido: data.profile.apellido || "",
      });
    } catch (error) {
      logger.error('Error cargando perfil::', error);
      setError("Error al cargar el perfil");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Actualizar datos personales
  const updateProfile = async () => {
    try {
      setSaving(true);
      const response = await rbacFetch('/api/me/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar perfil');
      }
      
      toast ? toast({ title: 'Perfil actualizado', type: 'success' }) : logger.debug('Perfil actualizado');
      await loadProfile(); // Recargar datos
    } catch (error: any) {
      logger.error('Error actualizando perfil::', error);
      toast ? toast({ title: 'Error', description: error.message, type: 'error' }) : console.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Cambiar contraseña
  const changePassword = async () => {
    // Validaciones del frontend
    if (!passwordData.currentPassword.trim()) {
      toast ? toast({ title: 'Error', description: 'Debes ingresar tu contraseña actual', type: 'error' }) : console.error('Contraseña actual requerida');
      return;
    }
    
    if (!passwordData.newPassword.trim()) {
      toast ? toast({ title: 'Error', description: 'Debes ingresar una nueva contraseña', type: 'error' }) : console.error('Nueva contraseña requerida');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast ? toast({ title: 'Error', description: 'La nueva contraseña debe tener al menos 6 caracteres', type: 'error' }) : console.error('Contraseña muy corta');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast ? toast({ title: 'Error', description: 'Las contraseñas nuevas no coinciden', type: 'error' }) : console.error('Contraseñas no coinciden');
      return;
    }
    
    if (passwordData.currentPassword === passwordData.newPassword) {
      toast ? toast({ title: 'Error', description: 'La nueva contraseña debe ser diferente a la actual', type: 'error' }) : console.error('Contraseña igual a la actual');
      return;
    }
    
    try {
      setChangingPassword(true);
      const response = await rbacFetch('/api/me/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cambiar contraseña');
      }
      
      toast ? toast({ title: 'Contraseña actualizada', type: 'success' }) : logger.debug('Contraseña actualizada');
      
      // Limpiar formulario
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswords({
        current: false,
        new: false,
        confirm: false,
      });
    } catch (error: any) {
      logger.error('Error cambiando contraseña::', error);
      toast ? toast({ title: 'Error', description: error.message, type: 'error' }) : console.error(error.message);
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Cargando perfil...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <h2 className="text-lg font-semibold text-destructive">Error</h2>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <Button onClick={loadProfile} className="mt-4">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <User className="h-8 w-8" />
          Mi Perfil
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestiona tus datos personales y configuración de cuenta
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Datos Personales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Datos Personales
            </CardTitle>
            <CardDescription>
              Actualiza tu información personal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                value={profile?.email || ""}
                disabled
                className="mt-1 bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                El email no se puede modificar
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Tu nombre"
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Apellido</label>
              <Input
                value={formData.apellido}
                onChange={(e) => setFormData(prev => ({ ...prev, apellido: e.target.value }))}
                placeholder="Tu apellido"
                className="mt-1"
              />
            </div>
            
            <div className="flex items-center gap-2 pt-2">
              <Badge variant={profile?.activo ? "default" : "secondary"}>
                {profile?.activo ? "Activo" : "Inactivo"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Miembro desde: {profile?.fecha_creacion ? new Date(profile.fecha_creacion).toLocaleDateString() : "N/A"}
              </span>
            </div>
            
            <Button
              onClick={updateProfile}
              disabled={saving}
              className="w-full"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Cambio de Contraseña */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Cambiar Contraseña
            </CardTitle>
            <CardDescription>
              Actualiza tu contraseña de acceso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-blue-800 text-sm">
            <strong>💡 Recordatorio:</strong> Tu contraseña actual es <code className="bg-blue-100 px-1 rounded">caco123</code>
          </p>
        </div>
            <div className="relative">
              <label className="text-sm font-medium">Contraseña Actual</label>
              <Input
                type={showPasswords.current ? "text" : "password"}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Tu contraseña actual (caco123)"
                className={`mt-1 pr-10 ${passwordErrors.current ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-6 h-8 w-8 p-0"
                onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
              >
                {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              {passwordErrors.current && (
                <p className="text-red-500 text-xs mt-1">{passwordErrors.current}</p>
              )}
            </div>
            
            <div className="relative">
              <label className="text-sm font-medium">Nueva Contraseña</label>
              <Input
                type={showPasswords.new ? "text" : "password"}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Nueva contraseña (mín. 6 caracteres)"
                className={`mt-1 pr-10 ${passwordErrors.new ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-6 h-8 w-8 p-0"
                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
              >
                {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              {passwordErrors.new && (
                <p className="text-red-500 text-xs mt-1">{passwordErrors.new}</p>
              )}
            </div>
            
            <div className="relative">
              <label className="text-sm font-medium">Confirmar Nueva Contraseña</label>
              <Input
                type={showPasswords.confirm ? "text" : "password"}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirma la nueva contraseña"
                className={`mt-1 pr-10 ${passwordErrors.confirm ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-6 h-8 w-8 p-0"
                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
              >
                {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              {passwordErrors.confirm && (
                <p className="text-red-500 text-xs mt-1">{passwordErrors.confirm}</p>
              )}
            </div>
            
            <Button
              onClick={changePassword}
              disabled={changingPassword || !isPasswordFormValid}
              className="w-full"
            >
              {changingPassword ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Cambiando...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Cambiar Contraseña
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
