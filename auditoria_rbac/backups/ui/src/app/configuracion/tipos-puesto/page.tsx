'use client';

import { useState, useEffect } from 'react';
import { useCan } from '@/lib/permissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save,
  X,
  ArrowLeft,
  Shield,
  AlertCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TipoPuesto {
  id: string;
  nombre: string;
  descripcion: string;
  emoji: string;
  color: string;
  orden: number;
  activo: boolean;
  cantidad_puestos_usando: number;
  puede_eliminar: boolean;
  created_at: string;
  updated_at: string;
}

const EMOJIS_DISPONIBLES = [
  { emoji: '🚪', label: 'Puerta' },
  { emoji: '🚶', label: 'Persona' },
  { emoji: '📹', label: 'Cámara' },
  { emoji: '👮', label: 'Guardia' },
  { emoji: '🛡️', label: 'Escudo' },
  { emoji: '🏢', label: 'Edificio' },
  { emoji: '🚗', label: 'Auto' },
  { emoji: '🔄', label: 'Ciclo' },
  { emoji: '⭐', label: 'Estrella' },
  { emoji: '🚓', label: 'Patrulla' },
  { emoji: '🎛️', label: 'Control' },
  { emoji: '📦', label: 'Caja' },
  { emoji: '🔐', label: 'Candado' },
  { emoji: '📍', label: 'Pin' },
  { emoji: '🚨', label: 'Sirena' },
  { emoji: '💼', label: 'Maletín' },
  { emoji: '🏠', label: 'Casa' },
  { emoji: '🌐', label: 'Global' },
  { emoji: '📡', label: 'Antena' },
  { emoji: '🔍', label: 'Lupa' }
];

const COLORES_DISPONIBLES = [
  { value: 'gray', label: 'Gris', class: 'bg-gray-500' },
  { value: 'blue', label: 'Azul', class: 'bg-blue-500' },
  { value: 'green', label: 'Verde', class: 'bg-green-500' },
  { value: 'yellow', label: 'Amarillo', class: 'bg-yellow-500' },
  { value: 'orange', label: 'Naranja', class: 'bg-orange-500' },
  { value: 'red', label: 'Rojo', class: 'bg-red-500' },
  { value: 'purple', label: 'Morado', class: 'bg-purple-500' },
  { value: 'indigo', label: 'Índigo', class: 'bg-indigo-500' },
  { value: 'teal', label: 'Turquesa', class: 'bg-teal-500' },
  { value: 'emerald', label: 'Esmeralda', class: 'bg-emerald-500' },
  { value: 'sky', label: 'Cielo', class: 'bg-sky-500' },
  { value: 'slate', label: 'Pizarra', class: 'bg-slate-500' }
];

export default function TiposPuestoPage() {
  const { allowed } = useCan('config.tipos_puesto.view');
  if (!allowed) {
    return (
      <div className="p-6">
        <div className="rounded-xl border p-6 text-center text-muted-foreground">
          Acceso denegado
        </div>
      </div>
    );
  }
  const router = useRouter();
  const { toast } = useToast();
  const [tipos, setTipos] = useState<TipoPuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<TipoPuesto | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    emoji: '📍',
    color: 'gray',
    orden: 99,
    activo: true
  });
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  useEffect(() => {
    cargarTipos();
  }, [mostrarInactivos]);

  const cargarTipos = async () => {
    try {
      const params = new URLSearchParams();
      if (mostrarInactivos) params.append('incluir_inactivos', 'true');
      
      const response = await fetch(`/api/tipos-puesto?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setTipos(data.data);
      }
    } catch (error) {
      console.error('Error cargando tipos de puesto:', error);
      toast.error('Error al cargar los tipos de puesto');
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = (tipo?: TipoPuesto) => {
    if (tipo) {
      setEditando(tipo);
      setFormData({
        nombre: tipo.nombre,
        descripcion: tipo.descripcion || '',
        emoji: tipo.emoji,
        color: tipo.color,
        orden: tipo.orden,
        activo: tipo.activo
      });
    } else {
      setEditando(null);
      setFormData({
        nombre: '',
        descripcion: '',
        emoji: '📍',
        color: 'gray',
        orden: tipos.length + 1,
        activo: true
      });
    }
    setModalOpen(true);
  };

  const cerrarModal = () => {
    setModalOpen(false);
    setEditando(null);
    setFormData({
      nombre: '',
      descripcion: '',
      emoji: '📍',
      color: 'gray',
      orden: 99,
      activo: true
    });
  };

  const guardarTipo = async () => {
    if (!formData.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    setGuardando(true);
    try {
      const url = editando 
        ? `/api/tipos-puesto/${editando.id}`
        : '/api/tipos-puesto';
      
      const method = editando ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(editando ? 'Tipo actualizado correctamente' : 'Tipo creado correctamente');
        cerrarModal();
        cargarTipos();
      } else {
        toast.error(data.error || 'Error al guardar el tipo');
      }
    } catch (error) {
      console.error('Error guardando tipo:', error);
      toast.error('Error al guardar el tipo de puesto');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarTipo = async (tipo: TipoPuesto) => {
    if (!confirm(`¿Estás seguro de eliminar el tipo "${tipo.nombre}"?`)) {
      return;
    }

    setEliminando(tipo.id);
    try {
      const response = await fetch(`/api/tipos-puesto/${tipo.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Tipo eliminado correctamente');
        cargarTipos();
      } else {
        toast.error(data.error || 'Error al eliminar el tipo');
      }
    } catch (error) {
      console.error('Error eliminando tipo:', error);
      toast.error('Error al eliminar el tipo de puesto');
    } finally {
      setEliminando(null);
    }
  };

  const toggleActivo = async (tipo: TipoPuesto) => {
    try {
      const response = await fetch(`/api/tipos-puesto/${tipo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !tipo.activo })
      });

      if (response.ok) {
        toast.success(tipo.activo ? 'Tipo inactivado' : 'Tipo activado');
        cargarTipos();
      }
    } catch (error) {
      console.error('Error actualizando estado:', error);
      toast.error('Error al actualizar el estado');
    }
  };

  const getBadgeColor = (color: string) => {
    const colorMap: { [key: string]: string } = {
      gray: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
      green: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
      yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
      orange: 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100',
      red: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100',
      purple: 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100',
      indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-100',
      teal: 'bg-teal-100 text-teal-800 dark:bg-teal-800 dark:text-teal-100',
      emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100',
      sky: 'bg-sky-100 text-sky-800 dark:bg-sky-800 dark:text-sky-100',
      slate: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
    };
    return colorMap[color] || colorMap.gray;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Tipos de Puesto</h1>
            <p className="text-sm text-muted-foreground">
              Administra los tipos de puestos operativos disponibles
            </p>
          </div>
        </div>
        <Button onClick={() => abrirModal()}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Tipo
        </Button>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {tipos.filter(t => t.activo).length} tipos activos
              </span>
              {tipos.filter(t => !t.activo).length > 0 && (
                <span className="text-sm text-muted-foreground">
                  • {tipos.filter(t => !t.activo).length} inactivos
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="mostrar-inactivos" className="text-sm">
                Mostrar inactivos
              </label>
              <Switch
                id="mostrar-inactivos"
                checked={mostrarInactivos}
                onCheckedChange={setMostrarInactivos}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de tipos */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Orden</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-center">En Uso</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tipos.map((tipo) => (
                <TableRow key={tipo.id} className={!tipo.activo ? 'opacity-50' : ''}>
                  <TableCell className="font-mono text-xs">
                    {tipo.orden}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{tipo.emoji}</span>
                      <div>
                        <div className="font-medium">{tipo.nombre}</div>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getBadgeColor(tipo.color)}`}
                        >
                          {tipo.color}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {tipo.descripcion || 'Sin descripción'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {tipo.cantidad_puestos_usando > 0 ? (
                      <Badge variant="secondary">
                        {tipo.cantidad_puestos_usando}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={tipo.activo}
                      onCheckedChange={() => toggleActivo(tipo)}
                      aria-label={`${tipo.activo ? 'Desactivar' : 'Activar'} ${tipo.nombre}`}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => abrirModal(tipo)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {tipo.puede_eliminar && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => eliminarTipo(tipo)}
                          disabled={eliminando === tipo.id}
                        >
                          {eliminando === tipo.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-500" />
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de creación/edición */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editando ? 'Editar Tipo de Puesto' : 'Nuevo Tipo de Puesto'}
            </DialogTitle>
            <DialogDescription>
              {editando 
                ? 'Modifica los datos del tipo de puesto'
                : 'Crea un nuevo tipo de puesto para usar en las instalaciones'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Emoji */}
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right">Emoji</label>
              <div className="col-span-3">
                <Select
                  value={formData.emoji}
                  onValueChange={(value) => setFormData({ ...formData, emoji: value })}
                >
                  <SelectTrigger>
                    <SelectValue>
                      <span className="flex items-center gap-2">
                        <span className="text-xl">{formData.emoji}</span>
                        <span className="text-sm">
                          {EMOJIS_DISPONIBLES.find(e => e.emoji === formData.emoji)?.label || 'Seleccionar'}
                        </span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {EMOJIS_DISPONIBLES.map((item) => (
                      <SelectItem key={item.emoji} value={item.emoji}>
                        <span className="flex items-center gap-2">
                          <span className="text-xl">{item.emoji}</span>
                          <span>{item.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Nombre */}
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right">Nombre</label>
              <Input
                className="col-span-3"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Portería Principal"
                maxLength={100}
              />
            </div>

            {/* Descripción */}
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right">Descripción</label>
              <Input
                className="col-span-3"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción opcional"
              />
            </div>

            {/* Color */}
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right">Color</label>
              <div className="col-span-3">
                <Select
                  value={formData.color}
                  onValueChange={(value) => setFormData({ ...formData, color: value })}
                >
                  <SelectTrigger>
                    <SelectValue>
                      <span className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${COLORES_DISPONIBLES.find(c => c.value === formData.color)?.class}`} />
                        <span>{COLORES_DISPONIBLES.find(c => c.value === formData.color)?.label}</span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {COLORES_DISPONIBLES.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <span className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded ${color.class}`} />
                          <span>{color.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Orden */}
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right">Orden</label>
              <Input
                type="number"
                className="col-span-3"
                value={formData.orden}
                onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })}
                min={0}
                max={999}
              />
            </div>

            {/* Vista previa */}
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right">Vista previa</label>
              <div className="col-span-3">
                <Badge className={getBadgeColor(formData.color)}>
                  <span className="mr-1">{formData.emoji}</span>
                  {formData.nombre || 'Nombre del tipo'}
                </Badge>
              </div>
            </div>

            {editando && editando.cantidad_puestos_usando > 0 && (
              <div className="col-span-4">
                <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800 dark:text-yellow-200">
                    Este tipo está siendo usado por {editando.cantidad_puestos_usando} puesto(s)
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cerrarModal} disabled={guardando}>
              Cancelar
            </Button>
            <Button onClick={guardarTipo} disabled={guardando}>
              {guardando ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editando ? 'Actualizar' : 'Crear'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
