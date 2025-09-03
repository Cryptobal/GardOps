"use client";

import { useCan } from "@/lib/permissions";
import { Users, Shield, Key, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function SeguridadPage() {
  const { allowed: canUsuarios } = useCan('usuarios.manage');
  const { allowed: canRolesRead } = useCan('rbac.roles.read');
  const { allowed: canPermisosRead } = useCan('rbac.permisos.read');
  const { allowed: canTenantsRead } = useCan('rbac.tenants.read');
  const { allowed: isPlatformAdmin, loading } = useCan('rbac.platform_admin');
  // Bypass SOLO para roles específicos de admin
  let adminBypass = false;
  try {
    if (typeof document !== 'undefined') {
      const m = (document.cookie || '').match(/(?:^|;\s*)auth_token=([^;]+)/);
      const token = m?.[1] ? decodeURIComponent(m[1]) : null;
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1] || '')) || {};
        adminBypass = payload?.rol === 'Super Admin' || 
                     payload?.rol === 'Platform Admin' || 
                     payload?.rol === 'Tenant Admin';
      }
    }
  } catch {}

  const sections = [
    {
      title: "👥 Usuarios",
      description: "Gestiona usuarios del sistema, activa o desactiva cuentas y asigna roles",
      icon: Users,
      href: "/configuracion/seguridad/usuarios",
      color: "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20",
      allowed: canUsuarios || canRolesRead || false,
    },
    {
      title: "🛡️ Roles",
      description: "Crea y edita roles, define conjuntos de permisos para diferentes funciones",
      icon: Shield,
      href: "/configuracion/seguridad/roles",
      color: "bg-green-500/10 hover:bg-green-500/20 border-green-500/20",
      allowed: canRolesRead,
    },
    {
      title: "🔑 Permisos",
      description: "Consulta el catálogo completo de permisos disponibles en el sistema",
      icon: Key,
      href: "/configuracion/seguridad/permisos",
      color: "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20",
      allowed: canPermisosRead,
    },
    {
      title: "🏢 Tenants",
      description: "Administra Tenants de la plataforma (puede requerir Super Admin)",
      icon: Users,
      href: "/configuracion/seguridad/tenants",
      color: "bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20",
      allowed: isPlatformAdmin || canTenantsRead,
    }
  ];

  const filteredSections = sections.filter((s) => adminBypass ? true : s.allowed !== false);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Lock className="h-8 w-8" />
          Administración de Seguridad
          {loading && (
            <Badge variant="secondary" className="text-xs ml-2">Verificando permisos...</Badge>
          )}
          {!loading && isPlatformAdmin && (
            <Badge variant="secondary" className="text-xs ml-2">Super Admin</Badge>
          )}
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestiona usuarios, roles y permisos del sistema (RBAC)
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredSections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className={`cursor-pointer transition-all hover:shadow-lg ${section.color}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">
                      {section.title}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {section.description}
                    </CardDescription>
                  </div>
                  <section.icon className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Click para acceder →
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-8 bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">ℹ️ Información Importante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Los cambios en roles y permisos tienen efecto inmediato en todo el sistema</p>
          <p>• Los usuarios desactivados no podrán acceder al sistema</p>
          <p>• Los roles del sistema no pueden ser modificados ni eliminados</p>
          <p>• Asegúrate de mantener al menos un usuario con permisos de administración</p>
        </CardContent>
      </Card>
    </div>
  );
}
