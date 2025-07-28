"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Phone, Mail, Calendar, Badge as BadgeIcon, UserCheck, UserX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

interface GuardiaInstalacion {
  id: string;
  nombre: string;
  rut: string;
  email?: string;
  telefono?: string;
  puesto_asignado?: string;
  estado: "Activo" | "Inactivo" | "Licencia";
  fecha_asignacion: Date;
  horario_turno?: string;
}

interface GuardiasInstalacionProps {
  instalacionId: string;
  refreshTrigger?: number;
}

export default function GuardiasInstalacion({ instalacionId, refreshTrigger }: GuardiasInstalacionProps) {
  const [guardias, setGuardias] = useState<GuardiaInstalacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarGuardias();
  }, [instalacionId, refreshTrigger]);

  const cargarGuardias = async () => {
    try {
      setLoading(true);
      // Simular datos por ahora
      const mockGuardias: GuardiaInstalacion[] = [
        {
          id: "1",
          nombre: "Juan Pérez González",
          rut: "12.345.678-9",
          email: "juan.perez@gardops.cl",
          telefono: "+56 9 8765 4321",
          puesto_asignado: "Puesto Principal",
          estado: "Activo",
          fecha_asignacion: new Date("2024-01-15"),
          horario_turno: "08:00 - 20:00"
        },
        {
          id: "2",
          nombre: "María González Soto",
          rut: "98.765.432-1",
          email: "maria.gonzalez@gardops.cl",
          telefono: "+56 9 1234 5678",
          puesto_asignado: "Puesto Nocturno",
          estado: "Activo",
          fecha_asignacion: new Date("2024-02-01"),
          horario_turno: "20:00 - 08:00"
        },
        {
          id: "3",
          nombre: "Carlos Rodríguez Muñoz",
          rut: "11.222.333-4",
          email: "carlos.rodriguez@gardops.cl",
          telefono: "+56 9 9876 5432",
          estado: "Licencia",
          fecha_asignacion: new Date("2024-01-20"),
          horario_turno: "Rotativo"
        }
      ];
      setGuardias(mockGuardias);
    } catch (error) {
      console.error("Error cargando guardias:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "Activo":
        return <Badge className="bg-green-600">Activo</Badge>;
      case "Inactivo":
        return <Badge className="bg-red-600">Inactivo</Badge>;
      case "Licencia":
        return <Badge className="bg-amber-600">Licencia</Badge>;
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case "Activo":
        return <UserCheck className="h-4 w-4 text-green-500" />;
      case "Inactivo":
        return <UserX className="h-4 w-4 text-red-500" />;
      case "Licencia":
        return <Calendar className="h-4 w-4 text-amber-500" />;
      default:
        return <Users className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatearFecha = (fecha: Date) => {
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(fecha));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Guardias Asignados</h3>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Asignar Guardia
        </Button>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600/10 rounded-lg">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {guardias.filter(g => g.estado === "Activo").length}
                </p>
                <p className="text-sm text-muted-foreground">Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-600/10 rounded-lg">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  {guardias.filter(g => g.estado === "Licencia").length}
                </p>
                <p className="text-sm text-muted-foreground">Licencias</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/10 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {guardias.length}
                </p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de guardias */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guardia</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Puesto</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Asignado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guardias.map((guardia) => (
                <TableRow key={guardia.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="" />
                        <AvatarFallback>
                          {guardia.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{guardia.nombre}</div>
                        <div className="text-sm text-muted-foreground">{guardia.rut}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {guardia.email && (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {guardia.email}
                        </div>
                      )}
                      {guardia.telefono && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {guardia.telefono}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {guardia.puesto_asignado ? (
                      <div className="flex items-center gap-1">
                        <BadgeIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{guardia.puesto_asignado}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Sin asignar</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{guardia.horario_turno || "No definido"}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getEstadoIcon(guardia.estado)}
                      {getEstadoBadge(guardia.estado)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatearFecha(guardia.fecha_asignacion)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm">
                        Ver Perfil
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                        Remover
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {guardias.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No hay guardias asignados
              </h3>
              <p className="text-muted-foreground mb-4">
                Asigna guardias a esta instalación para comenzar
              </p>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Asignar Guardia
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}