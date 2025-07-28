"use client";

import { useState, useEffect } from "react";
import { Shield, Plus, Edit, Trash2, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

interface PuestoOperativo {
  id: string;
  nombre: string;
  tipo_turno: string;
  horario_inicio: string;
  horario_fin: string;
  estado: "Cubierto" | "Descubierto" | "Pendiente";
  guardia_asignado?: string;
  ultima_actualizacion: Date;
}

interface PuestosOperativosProps {
  instalacionId: string;
  refreshTrigger?: number;
}

export default function PuestosOperativos({ instalacionId, refreshTrigger }: PuestosOperativosProps) {
  const [puestos, setPuestos] = useState<PuestoOperativo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarPuestos();
  }, [instalacionId, refreshTrigger]);

  const cargarPuestos = async () => {
    try {
      setLoading(true);
      // Simular datos por ahora
      const mockPuestos: PuestoOperativo[] = [
        {
          id: "1",
          nombre: "Puesto Principal",
          tipo_turno: "24 horas",
          horario_inicio: "00:00",
          horario_fin: "23:59",
          estado: "Cubierto",
          guardia_asignado: "Juan Pérez",
          ultima_actualizacion: new Date()
        },
        {
          id: "2",
          nombre: "Puesto Secundario",
          tipo_turno: "12 horas",
          horario_inicio: "08:00",
          horario_fin: "20:00",
          estado: "Descubierto",
          ultima_actualizacion: new Date()
        },
        {
          id: "3",
          nombre: "Puesto Nocturno",
          tipo_turno: "12 horas",
          horario_inicio: "20:00",
          horario_fin: "08:00",
          estado: "Pendiente",
          ultima_actualizacion: new Date()
        }
      ];
      setPuestos(mockPuestos);
    } catch (error) {
      console.error("Error cargando puestos:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "Cubierto":
        return <Badge className="bg-green-600">Cubierto</Badge>;
      case "Descubierto":
        return <Badge className="bg-red-600">Descubierto</Badge>;
      case "Pendiente":
        return <Badge className="bg-amber-600">Pendiente</Badge>;
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case "Cubierto":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "Descubierto":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "Pendiente":
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <Shield className="h-4 w-4 text-muted-foreground" />;
    }
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
        <h3 className="text-lg font-medium">Puestos Operativos</h3>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Puesto
        </Button>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {puestos.filter(p => p.estado === "Cubierto").length}
                </p>
                <p className="text-sm text-muted-foreground">Cubiertos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-600/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {puestos.filter(p => p.estado === "Descubierto").length}
                </p>
                <p className="text-sm text-muted-foreground">Descubiertos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-600/10 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  {puestos.filter(p => p.estado === "Pendiente").length}
                </p>
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de puestos */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Puesto</TableHead>
                <TableHead>Tipo de Turno</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Guardia</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {puestos.map((puesto) => (
                <TableRow key={puesto.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {getEstadoIcon(puesto.estado)}
                      {puesto.nombre}
                    </div>
                  </TableCell>
                  <TableCell>{puesto.tipo_turno}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {puesto.horario_inicio} - {puesto.horario_fin}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getEstadoBadge(puesto.estado)}
                  </TableCell>
                  <TableCell>
                    {puesto.guardia_asignado ? (
                      <span className="text-sm">{puesto.guardia_asignado}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Sin asignar</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {puestos.length === 0 && (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No hay puestos operativos
              </h3>
              <p className="text-muted-foreground mb-4">
                Crea el primer puesto operativo para esta instalación
              </p>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Crear Puesto
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}