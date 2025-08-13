"use client";

import { useCan } from "@/lib/permissions";
import { Users, Shield, Key, Lock, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function SeguridadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { allowed: canUsuarios } = useCan('usuarios.manage');
  const { allowed: canRolesRead } = useCan('rbac.roles.read');
  const { allowed: canPermisosRead } = useCan('rbac.permisos.read');
  const { allowed: canTenantsRead } = useCan('rbac.tenants.read');
  const { allowed: isPlatformAdmin, loading } = useCan('rbac.platform_admin');
  const pathname = usePathname();

  const sections = [
    {
      id: "usuarios",
      title: "Usuarios",
      icon: Users,
      href: "/configuracion/seguridad/usuarios",
      allowed: canUsuarios || canRolesRead || false,
    },
    {
      id: "roles",
      title: "Roles",
      icon: Shield,
      href: "/configuracion/seguridad/roles",
      allowed: canRolesRead,
    },
    {
      id: "permisos",
      title: "Permisos",
      icon: Key,
      href: "/configuracion/seguridad/permisos",
      allowed: canPermisosRead,
    },
    {
      id: "tenants",
      title: "Tenants",
      icon: Users,
      href: "/configuracion/seguridad/tenants",
      allowed: isPlatformAdmin || canTenantsRead,
    }
  ];

  const filteredSections = sections.filter((s) => s.allowed !== false);

  // Determinar la sección activa basada en la URL
  const getActiveSection = () => {
    if (pathname.includes('/usuarios')) return 'usuarios';
    if (pathname.includes('/roles')) return 'roles';
    if (pathname.includes('/permisos')) return 'permisos';
    if (pathname.includes('/tenants')) return 'tenants';
    return null; // En la página principal
  };

  const activeSection = getActiveSection();

  // Si estamos en la página principal, no mostrar tabs
  if (!activeSection) {
    return <>{children}</>;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header con navegación */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/configuracion">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a Configuración
            </Button>
          </Link>
        </div>
        
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

      {/* Navegación por Tabs */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 border-b pb-2">
          {filteredSections.map((section) => (
            <Link key={section.id} href={section.href}>
              <Button
                variant={activeSection === section.id ? "default" : "ghost"}
                size="sm"
                className={`flex items-center gap-2 transition-all ${
                  activeSection === section.id 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted"
                }`}
              >
                <section.icon className="h-4 w-4" />
                {section.title}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* Contenido de la página */}
      <div className="min-h-[600px]">
        {children}
      </div>
    </div>
  );
}
