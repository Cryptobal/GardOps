"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
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
  Trash2,
  RefreshCw,
  Settings,
  Filter,
  Save,
  X,
  Loader2,
  AlertTriangle,
  Users
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { ToastContainer } from '@/components/ui/toast'
import { SelectWithSearch } from "@/components/ui/select-with-search"

interface AsignacionOperativa {
  id: string
  instalacion_id: string
  puesto_operativo_id: string
  rol_servicio_id: string
  cantidad_guardias: number
  estado: string
  created_at: string
  updated_at: string
  puesto_operativo_id_name?: string
  rol_servicio_id_name?: string
}

interface PuestoOperativo {
  id: string
  nombre: string
  estado: string
}

interface RolServicio {
  id: string
  nombre: string
  estado: string
}

interface Instalacion {
  id: string
  nombre: string
  estado: string
}

export default function AsignacionesPage() {
  const { success, error: showError, ToastContainer } = useToast()
  
  const [asignaciones, setAsignaciones] = useState<AsignacionOperativa[]>([])
  const [puestosOperativos, setPuestosOperativos] = useState<PuestoOperativo[]>([])
  const [rolesServicio, setRolesServicio] = useState<RolServicio[]>([])
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  
  // Estados para el formulario
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [selectedAsignacion, setSelectedAsignacion] = useState<AsignacionOperativa | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Estados para confirmación de eliminación
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [asignacionToDelete, setAsignacionToDelete] = useState<AsignacionOperativa | null>(null)
  
  // Estado para filtro por instalación
  const [selectedInstalacionFilter, setSelectedInstalacionFilter] = useState<string>('all')

  // Datos del formulario
  const [formData, setFormData] = useState({
    instalacion_id: '',
    puesto_operativo_id: '',
    rol_servicio_id: '',
    cantidad_guardias: 1,
    estado: 'Activo',
    guardias_asignados: [] as { guardia_id: string }[]
  })

  // Función para cargar todos los datos necesarios
  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const [asignacionesRes, puestosRes, rolesRes, instalacionesRes] = await Promise.all([
        fetch(`/api/table-data/asignaciones_operativas?limit=100&offset=0&showInactive=${showInactive}`),
        fetch(`/api/table-data/puestos_operativos?limit=100&offset=0&showInactive=false`),
        fetch(`/api/table-data/roles_servicio?limit=100&offset=0&showInactive=false`),
        fetch(`/api/table-data/instalaciones?limit=100&offset=0&showInactive=false`)
      ])
      
      if (!asignacionesRes.ok || !puestosRes.ok || !rolesRes.ok || !instalacionesRes.ok) {
        throw new Error('Error al cargar datos')
      }
      
      const [asignacionesData, puestosData, rolesData, instalacionesData] = await Promise.all([
        asignacionesRes.json(),
        puestosRes.json(),
        rolesRes.json(),
        instalacionesRes.json()
      ])
      
      setAsignaciones(asignacionesData.data || [])
      setPuestosOperativos(puestosData.data || [])
      setRolesServicio(rolesData.data || [])
      setInstalaciones(instalacionesData.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      setError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [showInactive])

  const handleRefresh = () => {
    fetchData()
  }

  const handleCreateNew = () => {
    setFormMode('create')
    setSelectedAsignacion(null)
    setFormData({
      instalacion_id: '',
      puesto_operativo_id: '',
      rol_servicio_id: '',
      cantidad_guardias: 1,
      estado: 'Activo',
      guardias_asignados: [{ guardia_id: '' }]
    })
    setIsFormOpen(true)
  }

  const handleEdit = async (asignacion: AsignacionOperativa) => {
    setFormMode('edit')
    setSelectedAsignacion(asignacion)
    
    // Cargar guardias asignados actuales
    try {
      const response = await fetch(`/api/table-data/guardias_asignados?asignacion_operativa_id=${asignacion.id}`)
      const guardiasData = await response.json()
      const guardiasAsignados = guardiasData.data || []
      
      // Crear array con la cantidad correcta de guardias
      const guardiasArray = Array.from({ length: asignacion.cantidad_guardias }, (_, i) => {
        const guardiaAsignado = guardiasAsignados[i]
        return { guardia_id: guardiaAsignado?.guardia_id?.toString() || '' }
      })
      
      setFormData({
        instalacion_id: asignacion.instalacion_id,
        puesto_operativo_id: asignacion.puesto_operativo_id,
        rol_servicio_id: asignacion.rol_servicio_id,
        cantidad_guardias: asignacion.cantidad_guardias,
        estado: asignacion.estado,
        guardias_asignados: guardiasArray
      })
    } catch (error) {
      console.error('Error loading guardias asignados:', error)
      // Inicializar con array vacío si falla
      setFormData({
        instalacion_id: asignacion.instalacion_id,
        puesto_operativo_id: asignacion.puesto_operativo_id,
        rol_servicio_id: asignacion.rol_servicio_id,
        cantidad_guardias: asignacion.cantidad_guardias,
        estado: asignacion.estado,
        guardias_asignados: Array.from({ length: asignacion.cantidad_guardias }, () => ({ guardia_id: '' }))
      })
    }
    
    setIsFormOpen(true)
  }

  const handleDelete = (asignacion: AsignacionOperativa) => {
    setAsignacionToDelete(asignacion)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!asignacionToDelete) return

    try {
      setIsSubmitting(true)
      
      const response = await fetch(`/api/table-data/asignaciones_operativas?id=${asignacionToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar')
      }

      success('Asignación eliminada exitosamente')
      setIsDeleteDialogOpen(false)
      setAsignacionToDelete(null)
      handleRefresh()
    } catch (error) {
      console.error('Error deleting asignacion:', error)
      showError(error instanceof Error ? error.message : 'Error al eliminar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.instalacion_id || !formData.puesto_operativo_id || !formData.rol_servicio_id) {
      showError('Todos los campos son requeridos')
      return
    }

    try {
      setIsSubmitting(true)

      // Preparar payload sin guardias_asignados para la asignación operativa
      const asignacionPayload = {
        instalacion_id: formData.instalacion_id,
        puesto_operativo_id: formData.puesto_operativo_id,
        rol_servicio_id: formData.rol_servicio_id,
        cantidad_guardias: formData.cantidad_guardias,
        estado: formData.estado
      }

      let response: Response
      let asignacionId: string
      
      if (formMode === 'create') {
        response = await fetch(`/api/table-data/asignaciones_operativas`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(asignacionPayload),
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Error en la operación')
        }
        
        const responseData = await response.json()
        asignacionId = responseData.data.id
        
        // Crear guardias asignados para nueva asignación
        for (let index = 0; index < formData.guardias_asignados.length; index++) {
          const guardiaAsignado = formData.guardias_asignados[index]
          if (guardiaAsignado.guardia_id) {
            await fetch('/api/table-data/guardias_asignados', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                asignacion_operativa_id: asignacionId,
                guardia_id: parseInt(guardiaAsignado.guardia_id),
                estado: 'asignado',
                fecha_asignacion: new Date().toISOString().split('T')[0],
                observaciones: `Creado desde configuración el ${new Date().toLocaleDateString()}`
              }),
            })
          } else {
            // Crear registro pendiente para PPC
            await fetch('/api/table-data/guardias_asignados', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                asignacion_operativa_id: asignacionId,
                estado: 'pendiente'
              }),
            })
          }
        }
        
      } else if (selectedAsignacion) {
        response = await fetch(`/api/table-data/asignaciones_operativas?id=${selectedAsignacion.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(asignacionPayload),
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Error en la operación')
        }
        
        // Eliminar guardias asignados existentes
        await fetch(`/api/table-data/guardias_asignados?asignacion_operativa_id=${selectedAsignacion.id}`, {
          method: 'DELETE'
        })

        // Crear nuevos guardias asignados
        for (let index = 0; index < formData.guardias_asignados.length; index++) {
          const guardiaAsignado = formData.guardias_asignados[index]
          if (guardiaAsignado.guardia_id) {
            await fetch('/api/table-data/guardias_asignados', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                asignacion_operativa_id: selectedAsignacion.id,
                guardia_id: parseInt(guardiaAsignado.guardia_id),
                estado: 'asignado',
                fecha_asignacion: new Date().toISOString().split('T')[0],
                observaciones: `Actualizado desde configuración el ${new Date().toLocaleDateString()}`
              }),
            })
          } else {
            // Crear registro pendiente para PPC
            await fetch('/api/table-data/guardias_asignados', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                asignacion_operativa_id: selectedAsignacion.id,
                estado: 'pendiente'
              }),
            })
          }
        }
      } else {
        throw new Error('No se encontró la asignación a editar')
      }

      success(formMode === 'create' ? 'Asignación creada exitosamente' : 'Asignación actualizada exitosamente')
      setIsFormOpen(false)
      handleRefresh()
    } catch (error) {
      console.error('Error submitting form:', error)
      showError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isInactiveRecord = (asignacion: AsignacionOperativa): boolean => {
    return asignacion.estado === 'Inactivo'
  }

  const getInstalacionName = (instalacionId: string): string => {
    const instalacion = instalaciones.find(i => i.id === instalacionId)
    return instalacion?.nombre || 'Sin asignar'
  }

  // Cargar guardias para asignación
  const [guardias, setGuardias] = useState<any[]>([])

  useEffect(() => {
    const fetchGuardias = async () => {
      try {
        const response = await fetch(`/api/table-data/guardias?estado=Activo&limit=1000&offset=0`)
        const data = await response.json()
        setGuardias(data.data || [])
      } catch (error) {
        console.error('Error fetching guardias:', error)
      }
    }
    fetchGuardias()
  }, [])

  // Filtrar asignaciones por instalación seleccionada
  const filteredAsignaciones = selectedInstalacionFilter && selectedInstalacionFilter !== 'all'
    ? asignaciones.filter(asignacion => asignacion.instalacion_id === selectedInstalacionFilter)
    : asignaciones

  return (
    <>
      <ToastContainer />
      
      <div className="space-y-6">
        {/* Header minimalista */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold capitalize-first flex items-center gap-3">
                <Settings className="h-8 w-8 text-primary" />
                Asignaciones operativas
              </h1>
              <p className="text-muted-foreground mt-2">
                Configuración de asignaciones de guardias por puesto e instalación
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Botones eliminados - solo se usa formulario interno */}
            </div>
          </div>
        </motion.div>

                 {/* Controles simplificados */}
         <motion.div
           className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-card"
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.5, delay: 0.1 }}
         >
           <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
               <Filter className="h-4 w-4 text-muted-foreground" />
               <span className="text-sm font-medium">Filtrar por instalación:</span>
               <Select
                 value={selectedInstalacionFilter}
                 onValueChange={setSelectedInstalacionFilter}
               >
                 <SelectTrigger className="w-48">
                   <SelectValue placeholder="Todas las instalaciones" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">Todas las instalaciones</SelectItem>
                   {instalaciones.map((instalacion) => (
                     <SelectItem key={instalacion.id} value={instalacion.id}>
                       {instalacion.nombre}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             
             <div className="flex items-center gap-2">
               <span className="text-sm font-medium">Incluir inactivos:</span>
               <Switch
                 checked={showInactive}
                 onCheckedChange={setShowInactive}
               />
             </div>
           </div>
           
           <div className="text-sm text-muted-foreground">
             {filteredAsignaciones.length} asignaciones {showInactive ? 'totales' : 'activas'}
             {selectedInstalacionFilter && selectedInstalacionFilter !== 'all' && (
               <span className="ml-1">
                 en {getInstalacionName(selectedInstalacionFilter)}
               </span>
             )}
           </div>
         </motion.div>

        {/* Contenido principal */}
        <motion.div
          className="rounded-2xl border bg-card shadow-xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {error ? (
            <div className="p-8 text-center">
              <h3 className="text-lg font-semibold text-destructive mb-2">Error al cargar datos</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
          ) : isLoading ? (
            <div className="p-8 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-muted-foreground">Cargando asignaciones operativas...</p>
            </div>
                     ) : filteredAsignaciones.length === 0 ? (
            <div className="p-8 text-center">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                             <h3 className="text-lg font-semibold mb-2">Sin asignaciones</h3>
               <p className="text-muted-foreground mb-4">
                 {selectedInstalacionFilter && selectedInstalacionFilter !== 'all'
                   ? `No hay asignaciones ${showInactive ? '' : 'activas '}para ${getInstalacionName(selectedInstalacionFilter)}`
                   : showInactive ? 'No hay asignaciones registradas' : 'No hay asignaciones activas'
                 }
               </p>

            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Instalación</TableHead>
                    <TableHead className="font-semibold">Puesto operativo</TableHead>
                    <TableHead className="font-semibold">Rol de servicio</TableHead>
                    <TableHead className="font-semibold text-center">Cantidad guardias</TableHead>
                    <TableHead className="font-semibold text-center">Estado</TableHead>
                    <TableHead className="font-semibold text-center w-32">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                
                                 <TableBody>
                   {filteredAsignaciones.map((asignacion) => (
                    <TableRow 
                      key={asignacion.id} 
                      className={`hover:bg-muted/50 transition-colors ${
                        isInactiveRecord(asignacion) ? 'opacity-60' : ''
                      }`}
                    >
                      <TableCell className="font-medium">
                        {getInstalacionName(asignacion.instalacion_id)}
                      </TableCell>
                      <TableCell>{asignacion.puesto_operativo_id_name || 'Sin asignar'}</TableCell>
                      <TableCell>{asignacion.rol_servicio_id_name || 'Sin asignar'}</TableCell>
                      <TableCell className="text-center">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {asignacion.cantidad_guardias} guardia{asignacion.cantidad_guardias !== 1 ? 's' : ''}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          asignacion.estado === 'Activo' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {asignacion.estado}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(asignacion)}
                            className="h-8 w-8 p-0"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(asignacion)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
              {formMode === 'create' ? 'Crear asignación operativa' : 'Editar asignación operativa'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instalacion_id">
                Instalación <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.instalacion_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, instalacion_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar instalación" />
                </SelectTrigger>
                <SelectContent>
                  {instalaciones.map((instalacion) => (
                    <SelectItem key={instalacion.id} value={instalacion.id}>
                      {instalacion.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="puesto_operativo_id">
                Puesto operativo <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.puesto_operativo_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, puesto_operativo_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar puesto operativo" />
                </SelectTrigger>
                <SelectContent>
                  {puestosOperativos.map((puesto) => (
                    <SelectItem key={puesto.id} value={puesto.id}>
                      {puesto.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rol_servicio_id">
                Rol de servicio <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.rol_servicio_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, rol_servicio_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol de servicio" />
                </SelectTrigger>
                <SelectContent>
                  {rolesServicio.map((rol) => (
                    <SelectItem key={rol.id} value={rol.id}>
                      {rol.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

                         <div className="space-y-2">
               <Label htmlFor="cantidad_guardias">
                 Cantidad de guardias <span className="text-red-500">*</span>
               </Label>
               <Select
                 value={formData.cantidad_guardias.toString()}
                 onValueChange={(value) => {
                   const newCantidad = parseInt(value)
                   const newGuardias = Array.from({ length: newCantidad }, (_, i) => 
                     formData.guardias_asignados[i] || { guardia_id: '' }
                   )
                   setFormData(prev => ({ 
                     ...prev, 
                     cantidad_guardias: newCantidad,
                     guardias_asignados: newGuardias
                   }))
                 }}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Seleccionar cantidad" />
                 </SelectTrigger>
                 <SelectContent>
                   {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                     <SelectItem key={num} value={num.toString()}>
                       {num} guardia{num !== 1 ? 's' : ''}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>

             {/* Asignación de guardias específicos */}
             {formData.cantidad_guardias > 0 && (
               <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                 <Label className="text-sm font-medium flex items-center gap-2">
                   <Users className="h-4 w-4" />
                   Asignar guardias específicos ({formData.guardias_asignados.filter(g => g.guardia_id).length}/{formData.cantidad_guardias} asignados)
                 </Label>
                 
                 <p className="text-xs text-muted-foreground">
                   💡 Asigna guardias específicos o deja vacío para generar PPC automáticamente
                 </p>

                 <div className="space-y-2 max-h-60 overflow-y-auto">
                   {Array.from({ length: formData.cantidad_guardias }, (_, guardiaIndex) => {
                     const guardiaAsignado = formData.guardias_asignados[guardiaIndex] || { guardia_id: '' }
                     
                     // Obtener guardias ya seleccionados (excluyendo el actual)
                     const guardiasSeleccionados = formData.guardias_asignados
                       .filter((_, idx) => idx !== guardiaIndex)
                       .map(g => g.guardia_id)
                       .filter(Boolean)
                     
                     // Filtrar guardias disponibles
                     const guardiasDisponibles = guardias.filter(guardia => {
                       return guardia.estado === 'Activo' && 
                              !guardiasSeleccionados.includes(guardia.id.toString())
                     })
                     
                     // Crear opciones para el SelectWithSearch
                     const opcionesGuardias = [
                       {
                         value: 'sin-asignar',
                         label: 'Sin asignar (PPC)'
                       },
                       ...guardiasDisponibles.map(guardia => ({
                         value: guardia.id.toString(),
                         label: `${guardia.nombre} - ${guardia.rut}`
                       }))
                     ]
                     
                     return (
                       <div key={guardiaIndex} className="flex items-center gap-3 p-2 bg-background rounded border">
                         <span className="text-sm font-medium text-primary w-8">#{guardiaIndex + 1}</span>
                         <div className="flex-1">
                           <SelectWithSearch
                             options={opcionesGuardias}
                             value={guardiaAsignado.guardia_id?.toString() || 'sin-asignar'}
                             onValueChange={(guardiaId) => {
                               const updatedGuardias = [...formData.guardias_asignados]
                               while (updatedGuardias.length <= guardiaIndex) {
                                 updatedGuardias.push({ guardia_id: '' })
                               }
                               updatedGuardias[guardiaIndex] = { 
                                 guardia_id: guardiaId === 'sin-asignar' ? '' : guardiaId 
                               }
                               setFormData(prev => ({
                                 ...prev,
                                 guardias_asignados: updatedGuardias
                               }))
                             }}
                             placeholder="Seleccionar guardia"
                             searchPlaceholder="Buscar guardia por nombre o RUT..."
                             emptyMessage="No se encontraron guardias"
                             className="h-8"
                           />
                         </div>
                         <span className={`text-xs px-2 py-1 rounded-full ${
                           guardiaAsignado.guardia_id 
                             ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                             : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                         }`}>
                           {guardiaAsignado.guardia_id ? 'Asignado' : 'PPC'}
                         </span>
                       </div>
                     )
                   })}
                 </div>
                 
                 {formData.cantidad_guardias > 0 && (
                   <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                     <p className="text-xs text-blue-700 dark:text-blue-300">
                       📊 <strong>Resumen:</strong> {formData.guardias_asignados.filter(g => g.guardia_id).length} guardias asignados, 
                       {' '}{formData.cantidad_guardias - formData.guardias_asignados.filter(g => g.guardia_id).length} registros PPC se generarán automáticamente
                     </p>
                   </div>
                 )}
               </div>
             )}

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

      {/* Diálogo de confirmación de eliminación */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar eliminación
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-muted-foreground">
              ¿Está seguro de que desea eliminar esta asignación operativa?
            </p>
            
            {asignacionToDelete && (
              <div className="p-3 rounded-lg bg-muted border">
                <p className="text-sm">
                  <strong>Instalación:</strong> {getInstalacionName(asignacionToDelete.instalacion_id)}
                </p>
                <p className="text-sm">
                  <strong>Puesto:</strong> {asignacionToDelete.puesto_operativo_id_name}
                </p>
                <p className="text-sm">
                  <strong>Rol:</strong> {asignacionToDelete.rol_servicio_id_name}
                </p>
                <p className="text-sm">
                  <strong>Guardias:</strong> {asignacionToDelete.cantidad_guardias}
                </p>
              </div>
            )}
            
            <p className="text-xs text-destructive">
              Esta acción no se puede deshacer y eliminará también los guardias asignados relacionados.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmDelete}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 