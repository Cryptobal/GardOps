"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { FileText, Clock, DollarSign, MapPin, Lock, User } from "lucide-react";
import Link from "next/link";
import { useCan } from "@/lib/permissions";

export default function ConfiguracionPage() {
  const { allowed: canAdminRbac } = useCan('rbac.admin');
  
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center sm:text-left">
        <h2 className="text-2xl font-bold heading-gradient">Configuración del Sistema</h2>
        <p className="text-muted-foreground">
          Configuración general y parámetros del sistema
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Mi Perfil */}
        <Link href="/perfil">
          <Card className="card-elegant hover:shadow-lg transition-all duration-200 cursor-pointer group h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <User className="h-5 w-5 text-indigo-500 flex-shrink-0" />
                Mi Perfil
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-muted-foreground text-sm leading-relaxed">
                Gestionar mis datos personales y cambiar contraseña
              </p>
              <div className="mt-4 flex items-center text-indigo-500 text-sm font-medium group-hover:underline">
                Gestionar perfil →
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Tipos de Documentos */}
        <Link href="/configuracion/tipos-documentos">
          <Card className="card-elegant hover:shadow-lg transition-all duration-200 cursor-pointer group h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                Tipos de Documentos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-muted-foreground text-sm leading-relaxed">
                Configurar tipos de documentos por módulo (Clientes, Guardias, Instalaciones)
              </p>
              <div className="mt-4 flex items-center text-blue-500 text-sm font-medium group-hover:underline">
                Gestionar tipos →
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Roles de Servicio */}
        <Link href="/configuracion/roles-servicio">
          <Card className="card-elegant hover:shadow-lg transition-all duration-200 cursor-pointer group h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Clock className="h-5 w-5 text-green-500 flex-shrink-0" />
                Roles de Servicio
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-muted-foreground text-sm leading-relaxed">
                Configurar roles de servicio, ciclos de trabajo y horarios para turnos
              </p>
              <div className="mt-4 flex items-center text-green-500 text-sm font-medium group-hover:underline">
                Gestionar roles →
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Tipos de Puesto */}
        <Link href="/configuracion/tipos-puesto">
          <Card className="card-elegant hover:shadow-lg transition-all duration-200 cursor-pointer group h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <MapPin className="h-5 w-5 text-orange-500 flex-shrink-0" />
                Tipos de Puesto
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-muted-foreground text-sm leading-relaxed">
                Configurar tipos de puestos operativos con emojis y colores personalizados
              </p>
              <div className="mt-4 flex items-center text-orange-500 text-sm font-medium group-hover:underline">
                Gestionar tipos →
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Estructuras Unificadas */}
        <Link href="/payroll/estructuras-unificadas">
          <Card className="card-elegant hover:shadow-lg transition-all duration-200 cursor-pointer group h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <DollarSign className="h-5 w-5 text-purple-500 flex-shrink-0" />
                🏗️ Estructuras Unificadas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-muted-foreground text-sm leading-relaxed">
                Gestiona estructuras de servicio y por guardia desde una interfaz unificada
              </p>
              <div className="mt-4 flex items-center text-purple-500 text-sm font-medium group-hover:underline">
                Gestionar estructuras →
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Administración de Seguridad RBAC (siempre clickeable) */}
        <Link href="/configuracion/seguridad">
          <Card className="card-elegant hover:shadow-lg transition-all duration-200 cursor-pointer group h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Lock className="h-5 w-5 text-red-500 flex-shrink-0" />
                🔒 Seguridad
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-muted-foreground text-sm leading-relaxed">
                Administrar usuarios, roles y permisos del sistema (RBAC)
              </p>
              <div className="mt-4 flex items-center text-red-500 text-sm font-medium group-hover:underline">
                Gestionar seguridad →
              </div>
              {!canAdminRbac && (
                <div className="mt-2 text-gray-400 text-xs">Puede requerir permiso: rbac.admin</div>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
} 