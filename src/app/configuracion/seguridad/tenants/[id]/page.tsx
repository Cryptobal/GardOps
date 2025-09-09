"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, Building2, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TenantData {
  tenant: {
    id: string;
    nombre: string;
    rut: string;
    activo: boolean;
    created_at: string;
  };
  admin: {
    id: string;
    email: string;
    nombre: string;
    apellido: string;
    activo: boolean;
  };
}

export default function EditarTenantPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<TenantData | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    tenant_nombre: '',
    tenant_rut: '',
    tenant_activo: true as boolean,
    admin_email: '',
    admin_nombre: '',
    admin_apellido: '',
    admin_password: '',
    admin_activo: true as boolean,
  });

  useEffect(() => {
    loadTenant();
  }, []);

  const loadTenant = async () => {
    try {
      devLogger.search(' Cargando tenant con ID:', params.id);
      const response = await fetch(`/api/admin/tenants/${params.id}`);
      logger.debug('📡 Response status:', response.status);
      
      const result = await response.json();
      logger.debug('📊 Response data:', result);
      
      if (result.ok) {
        setData(result.data);
        setFormData({
          tenant_nombre: result.data?.tenant?.nombre ?? '',
          tenant_rut: result.data?.tenant?.rut ?? '',
          tenant_activo: (result.data?.tenant?.activo ?? true) as boolean,
          admin_email: result.data?.admin?.email ?? '',
          admin_nombre: result.data?.admin?.nombre ?? '',
          admin_apellido: result.data?.admin?.apellido ?? '',
          admin_password: '',
          admin_activo: (result.data?.admin?.activo ?? true) as boolean,
        });
      } else {
        console.error('❌ Error en respuesta:', result);
        toast({
          title: "Error",
          description: result.error || "No se pudo cargar el tenant",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Error cargando tenant:', error);
      toast({
        title: "Error",
        description: "Error al cargar el tenant",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Filtrar solo los campos que han cambiado
      const changes: any = {};
      if (formData.tenant_nombre !== data?.tenant.nombre) changes.tenant_nombre = formData.tenant_nombre;
      if (formData.tenant_rut !== data?.tenant.rut) changes.tenant_rut = formData.tenant_rut;
      if (formData.tenant_activo !== data?.tenant.activo) changes.tenant_activo = formData.tenant_activo;
      if (formData.admin_email !== data?.admin.email) changes.admin_email = formData.admin_email;
      if (formData.admin_nombre !== data?.admin.nombre) changes.admin_nombre = formData.admin_nombre;
      if (formData.admin_apellido !== data?.admin.apellido) changes.admin_apellido = formData.admin_apellido;
      if (formData.admin_password) changes.admin_password = formData.admin_password;
      if (formData.admin_activo !== data?.admin.activo) changes.admin_activo = formData.admin_activo;

      const response = await fetch(`/api/admin/tenants/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(changes),
      });

      const result = await response.json();

      if (result.ok) {
        toast({
          title: "Éxito",
          description: "Tenant actualizado correctamente",
        });
        // Recargar datos
        await loadTenant();
        // Limpiar contraseña
        setFormData(prev => ({ ...prev, admin_password: '' }));
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo actualizar el tenant",
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error('Error actualizando tenant::', error);
      toast({
        title: "Error",
        description: "Error al actualizar el tenant",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Cargando tenant...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <p className="text-muted-foreground">No se encontró el tenant</p>
          <Button onClick={() => router.back()} className="mt-4">
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Editar Tenant</h1>
            <p className="text-muted-foreground">
              Modificar información del tenant y su administrador
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="flex items-center space-x-2">
          <Save className="h-4 w-4" />
          <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Información del Tenant */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Información del Tenant</span>
            </CardTitle>
            <CardDescription>
              Datos básicos de la empresa o organización
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenant_nombre">Nombre del Tenant</Label>
              <Input
                id="tenant_nombre"
                value={formData.tenant_nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, tenant_nombre: e.target.value }))}
                placeholder="Nombre de la empresa"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tenant_rut">RUT</Label>
              <Input
                id="tenant_rut"
                value={formData.tenant_rut}
                onChange={(e) => setFormData(prev => ({ ...prev, tenant_rut: e.target.value }))}
                placeholder="12.345.678-9"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Estado del Tenant</Label>
                <p className="text-sm text-muted-foreground">
                  {formData.tenant_activo ? 'Activo' : 'Inactivo'}
                </p>
              </div>
              <Switch
                checked={formData.tenant_activo}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, tenant_activo: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Información del Administrador */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Administrador</span>
            </CardTitle>
            <CardDescription>
              Datos del usuario administrador del tenant
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin_email" className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>Email</span>
              </Label>
              <Input
                id="admin_email"
                type="email"
                value={formData.admin_email}
                onChange={(e) => setFormData(prev => ({ ...prev, admin_email: e.target.value }))}
                placeholder="admin@empresa.com"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin_nombre">Nombre</Label>
                <Input
                  id="admin_nombre"
                  value={formData.admin_nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, admin_nombre: e.target.value }))}
                  placeholder="Nombre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_apellido">Apellido</Label>
                <Input
                  id="admin_apellido"
                  value={formData.admin_apellido}
                  onChange={(e) => setFormData(prev => ({ ...prev, admin_apellido: e.target.value }))}
                  placeholder="Apellido"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="admin_password" className="flex items-center space-x-2">
                <Lock className="h-4 w-4" />
                <span>Nueva Contraseña</span>
              </Label>
              <div className="relative">
                <Input
                  id="admin_password"
                  type={showPassword ? "text" : "password"}
                  value={formData.admin_password}
                  onChange={(e) => setFormData(prev => ({ ...prev, admin_password: e.target.value }))}
                  placeholder="Dejar vacío para mantener la actual"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Solo completa si quieres cambiar la contraseña
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Estado del Administrador</Label>
                <p className="text-sm text-muted-foreground">
                  {formData.admin_activo ? 'Activo' : 'Inactivo'}
                </p>
              </div>
              <Switch
                checked={formData.admin_activo}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, admin_activo: checked }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium">ID del Tenant</p>
              <p className="text-muted-foreground font-mono">{data.tenant.id}</p>
            </div>
            <div>
              <p className="font-medium">ID del Administrador</p>
              <p className="text-muted-foreground font-mono">{data.admin.id}</p>
            </div>
            <div>
              <p className="font-medium">Fecha de Creación</p>
              <p className="text-muted-foreground">
                {new Date(data.tenant.created_at).toLocaleDateString('es-CL')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
