"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { 
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { 
  Plus,
  Edit,
  UserX,
  RefreshCw,
  MapPin,
  Filter,
  Save,
  X,
  Loader2
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { ToastContainer } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface PuestoOperativo {
  id: string
  nombre: string
  estado: string
  created_at: string
  updated_at: string
}

export default function PuestosOperativosPage() {
  const { success, error: showError, ToastContainer } = useToast()
  
  const [puestos, setPuestos] = useState<PuestoOperativo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  
  // Estados para el formulario
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [selectedPuesto, setSelectedPuesto] = useState<PuestoOperativo | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Estados para confirmación de eliminación
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [puestoToDelete, setPuestoToDelete] = useState<PuestoOperativo | null>(null)
  
  // Datos del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    estado: 'Activo'
  })

  const fetchPuestos = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/table-data/puestos_operativos?limit=100&offset=0&showInactive=${showInactive}`)
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setPuestos(data.data || [])
    } catch (error) {
      console.error('Error fetching puestos:', error)
      setError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPuestos()
  }, [showInactive])

  const handleRefresh = () => {
    fetchPuestos()
  }

  const handleCreateNew = () => {
    setFormMode('create')
    setSelectedPuesto(null)
    setFormData({ nombre: '', estado: 'Activo' })
    setIsFormOpen(true)
  }

  const handleEdit = (puesto: PuestoOperativo) => {
    setFormMode('edit')
    setSelectedPuesto(puesto)
    setFormData({ nombre: puesto.nombre, estado: puesto.estado })
    setIsFormOpen(true)
  }

  const handleInactivate = (puesto: PuestoOperativo) => {
    setPuestoToDelete(puesto)
    setIsDeleteDialogOpen(true)
  }

  const confirmInactivate = async () => {
    if (!puestoToDelete) return

    try {
      setIsSubmitting(true)
      
      const response = await fetch(`/api/table-data/puestos_operativos?id=${puestoToDelete.id}&action=inactivate`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al inactivar')
      }

      success('Puesto inactivado exitosamente')
      setIsDeleteDialogOpen(false)
      setPuestoToDelete(null)
      handleRefresh()
    } catch (error) {
      console.error('Error inactivating puesto:', error)
      showError(error instanceof Error ? error.message : 'Error al inactivar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nombre.trim()) {
      showError('El nombre del puesto es requerido')
      return
    }

    try {
      setIsSubmitting(true)

      let response: Response
      
      if (formMode === 'create') {
        response = await fetch(`/api/table-data/puestos_operativos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        })
      } else if (selectedPuesto) {
        response = await fetch(`/api/table-data/puestos_operativos?id=${selectedPuesto.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        })
      } else {
        throw new Error('No se encontró el puesto a editar')
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error en la operación')
      }

      success(formMode === 'create' ? 'Puesto creado exitosamente' : 'Puesto actualizado exitosamente')
      setIsFormOpen(false)
      handleRefresh()
    } catch (error) {
      console.error('Error submitting form:', error)
      showError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isInactiveRecord = (puesto: PuestoOperativo): boolean => {
    return puesto.estado === 'Inactivo'
  }

  return (
    <>
      <ToastContainer />
      
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold capitalize-first flex items-center gap-3">
                <MapPin className="h-8 w-8 text-primary" />
                Puestos operativos
              </h1>
              <p className="text-muted-foreground mt-2">
                Configuración de puestos operativos para asignación en instalaciones
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={handleCreateNew}
                variant="default"
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nuevo puesto
              </Button>
              
              <Button
                onClick={handleRefresh}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Controls */}
        <motion.div
          className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Incluir inactivos:</span>
              <Switch
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                {puestos.length} puestos {showInactive ? 'totales' : 'activos'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          className="rounded-2xl border bg-card shadow-xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {error ? (
            <div className="p-8 text-center">
              <h3 className="text-lg font-semibold text-destructive mb-2">Error al cargar datos</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={handleRefresh} variant="outline">Reintentar</Button>
            </div>
          ) : isLoading ? (
            <div className="p-8 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-muted-foreground">Cargando puestos operativos...</p>
            </div>
          ) : puestos.length === 0 ? (
            <div className="p-8 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin puestos</h3>
              <p className="text-muted-foreground mb-4">
                {showInactive ? 'No hay puestos registrados' : 'No hay puestos activos'}
              </p>
              <Button onClick={handleCreateNew} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Crear primer puesto
              </Button>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Nombre del puesto</TableHead>
                    <TableHead className="font-semibold text-center">Estado</TableHead>
                    <TableHead className="font-semibold text-center">Fecha creación</TableHead>
                    <TableHead className="font-semibold text-center w-32">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                
                <TableBody>
                  {puestos.map((puesto) => (
                    <TableRow 
                      key={puesto.id} 
                      className={`hover:bg-muted/50 transition-colors ${
                        isInactiveRecord(puesto) ? 'opacity-60' : ''
                      }`}
                    >
                      <TableCell className="font-medium">{puesto.nombre}</TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          puesto.estado === 'Activo' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {puesto.estado}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {new Date(puesto.created_at).toLocaleDateString('es-ES')}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(puesto)}
                            className="h-8 w-8 p-0"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!isInactiveRecord(puesto) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleInactivate(puesto)}
                              className="h-8 w-8 p-0 text-orange-600 hover:text-orange-800"
                              title="Inactivar"
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </motion.div>
      </div>

      {/* Formulario */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize-first">
              {formMode === 'create' ? 'Crear puesto operativo' : 'Editar puesto operativo'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">
                Nombre del puesto <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej: Guardia acceso, CCTV, Supervisor móvil"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select 
                value={formData.estado} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, estado: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Activo">Activo</SelectItem>
                  <SelectItem value="Inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsFormOpen(false)}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <Save className="h-4 w-4 mr-2" />
                {formMode === 'create' ? 'Crear' : 'Actualizar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación de inactivación */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Confirmar inactivación"
        description={`¿Está seguro de que desea inactivar el puesto "${puestoToDelete?.nombre}"?`}
        confirmText="Inactivar"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={confirmInactivate}
        loading={isSubmitting}
      >
        {puestoToDelete && (
          <div className="p-3 rounded-lg bg-muted border">
            <p className="text-sm">
              <strong>Puesto:</strong> {puestoToDelete.nombre}
            </p>
          </div>
        )}
      </ConfirmDialog>
    </>
  )
} 