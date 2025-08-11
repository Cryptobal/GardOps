"use client";

import { useCan } from "@/lib/permissions";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Users, Shield, Key, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function SeguridadPage() {
  const { allowed: canAdminRbac, loading: permissionLoading } = useCan('rbac.admin');
  const router = useRouter();

  useEffect(() => {
    if (!permissionLoading && !canAdminRbac) {
      router.push("/");
    }
  }, [canAdminRbac, permissionLoading, router]);

  if (permissionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!canAdminRbac) {
    return null;
  }

  const sections = [
    {
      title: "👥 Usuarios",
      description: "Gestiona usuarios del sistema, activa o desactiva cuentas y asigna roles",
      icon: Users,
      href: "/configuracion/seguridad/usuarios",
      color: "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20"
    },
    {
      title: "🛡️ Roles",
      description: "Crea y edita roles, define conjuntos de permisos para diferentes funciones",
      icon: Shield,
      href: "/configuracion/seguridad/roles",
      color: "bg-green-500/10 hover:bg-green-500/20 border-green-500/20"
    },
    {
      title: "🔑 Permisos",
      description: "Consulta el catálogo completo de permisos disponibles en el sistema",
      icon: Key,
      href: "/configuracion/seguridad/permisos",
      color: "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Lock className="h-8 w-8" />
          Administración de Seguridad
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestiona usuarios, roles y permisos del sistema (RBAC)
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
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
