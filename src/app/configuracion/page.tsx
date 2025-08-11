"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Settings, Save, FileText, Users, Building, Shield, Clock, DollarSign, MapPin, Lock, Key } from "lucide-react";
import Link from "next/link";
import { useCan } from "@/lib/permissions";

export default function ConfiguracionPage() {
  const { allowed: canAdminRbac } = useCan('rbac.admin');
  
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold heading-gradient">Configuración del Sistema</h2>
          <p className="text-muted-foreground">
            Configuración general y parámetros del sistema
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Save className="h-4 w-4" />
          Guardar Cambios
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Tipos de Documentos */}
        <Link href="/configuracion/tipos-documentos">
          <Card className="card-elegant hover:shadow-lg transition-all duration-200 cursor-pointer group">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Tipos de Documentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Configurar tipos de documentos por módulo (Clientes, Guardias, Instalaciones)
              </p>
              <div className="mt-4 flex items-center text-blue-500 text-sm group-hover:underline">
                Gestionar tipos →
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Roles de Servicio */}
        <Link href="/configuracion/roles-servicio">
          <Card className="card-elegant hover:shadow-lg transition-all duration-200 cursor-pointer group">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-500" />
                Roles de Servicio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Configurar roles de servicio, ciclos de trabajo y horarios para turnos
              </p>
              <div className="mt-4 flex items-center text-green-500 text-sm group-hover:underline">
                Gestionar roles →
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Tipos de Puesto */}
        <Link href="/configuracion/tipos-puesto">
          <Card className="card-elegant hover:shadow-lg transition-all duration-200 cursor-pointer group">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-orange-500" />
                Tipos de Puesto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Configurar tipos de puestos operativos con emojis y colores personalizados
              </p>
              <div className="mt-4 flex items-center text-orange-500 text-sm group-hover:underline">
                Gestionar tipos →
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Estructuras de Servicio */}
        <Link href="/configuracion/estructuras-servicio">
          <Card className="card-elegant hover:shadow-lg transition-all duration-200 cursor-pointer group">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-500" />
                Estructuras de Servicio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Configurar estructuras salariales, bonificaciones y descuentos por rol de servicio
              </p>
              <div className="mt-4 flex items-center text-purple-500 text-sm group-hover:underline">
                Gestionar estructuras →
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Configuración de Usuarios */}
        <Card className="card-elegant opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-500" />
              Usuarios y Permisos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Configurar usuarios, roles y permisos del sistema
            </p>
            <div className="mt-4 text-gray-400 text-sm">
              Próximamente
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Instalaciones */}
        <Card className="card-elegant opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-gray-500" />
              Configuración de Instalaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Configurar parámetros específicos de instalaciones
            </p>
            <div className="mt-4 text-gray-400 text-sm">
              Próximamente
            </div>
          </CardContent>
        </Card>

        {/* Administración de Seguridad RBAC */}
        {canAdminRbac ? (
          <Link href="/configuracion/seguridad">
            <Card className="card-elegant hover:shadow-lg transition-all duration-200 cursor-pointer group">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-red-500" />
                  🔒 Seguridad
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Administrar usuarios, roles y permisos del sistema (RBAC)
                </p>
                <div className="mt-4 flex items-center text-red-500 text-sm group-hover:underline">
                  Gestionar seguridad →
                </div>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Card className="card-elegant opacity-60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-gray-500" />
                🔒 Seguridad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Administrar usuarios, roles y permisos del sistema (RBAC)
              </p>
              <div className="mt-4 text-gray-400 text-sm">
                Requiere permiso: rbac.admin
              </div>
            </CardContent>
          </Card>
        )}

        {/* Configuración General */}
        <Card className="card-elegant opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-500" />
              Configuración General
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Parámetros generales del sistema
            </p>
            <div className="mt-4 text-gray-400 text-sm">
              Próximamente
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 