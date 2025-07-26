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
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer"
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
  Building,
  Filter,
  Save,
  X,
  Loader2,
  MapPin,
  Clock,
  Users,
  Settings,
  Trash2,
  AlertTriangle
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { ToastContainer } from '@/components/ui/toast'
import { SelectWithSearch } from "@/components/ui/select-with-search"
import { AddressAutocomplete } from "@/components/address-autocomplete"
import { MapView } from "@/components/map-view"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface Instalacion {
  id: string
  nombre: string
  direccion: string
  estado: string
  cliente_id: string
  cliente_id_name?: string
  lat?: number | null
  lng?: number | null
  created_at: string
  updated_at: string
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

export default function InstalacionesPage() {
  const { success, error: showError, ToastContainer } = useToast()
  
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([])
  const [puestosOperativos, setPuestosOperativos] = useState<PuestoOperativo[]>([])
  const [rolesServicio, setRolesServicio] = useState<RolServicio[]>([])
  const [guardias, setGuardias] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  
  // Estados para el formulario principal
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [selectedInstalacion, setSelectedInstalacion] = useState<Instalacion | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [viewingInstalacion, setViewingInstalacion] = useState<Instalacion | null>(null)
  
  // Estados para asignaciones operativas
  const [isAsignacionesOpen, setIsAsignacionesOpen] = useState(false)
  const [currentInstalacionId, setCurrentInstalacionId] = useState<string>('')
  const [asignaciones, setAsignaciones] = useState<AsignacionOperativa[]>([])
  const [isLoadingAsignaciones, setIsLoadingAsignaciones] = useState(false)
  
  // Datos del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    cliente_id: '',
    estado: 'Activa',
    lat: null as number | null,
    lng: null as number | null
  })

  // Datos del formulario de asignaciones
  const [asignacionData, setAsignacionData] = useState({
    puesto_operativo_id: '',
    roles_servicio: [] as { rol_id: string, cantidad: number, guardias_asignados: { guardia_id: string }[] }[]
  })

  // Estados para editar/eliminar asignaciones
  const [isEditingAsignacion, setIsEditingAsignacion] = useState(false)
  const [selectedAsignacion, setSelectedAsignacion] = useState<AsignacionOperativa | null>(null)
  const [isDeleteAsignacionOpen, setIsDeleteAsignacionOpen] = useState(false)
  const [asignacionToDelete, setAsignacionToDelete] = useState<AsignacionOperativa | null>(null)
  
  // Estados para confirmación de eliminación de instalaciones
  const [isDeleteInstallationOpen, setIsDeleteInstallationOpen] = useState(false)
  const [installationToDelete, setInstallationToDelete] = useState<Instalacion | null>(null)
  

  const [editAsignacionData, setEditAsignacionData] = useState({
    instalacion_id: '',
    puesto_operativo_id: '',
    rol_servicio_id: '',
    cantidad_guardias: 1,
    estado: 'Activo',
    guardias_asignados: [] as { guardia_id: string }[]
  })

  // Fetch de todos los datos necesarios
  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const [instalacionesRes, puestosRes, rolesRes, guardiasRes] = await Promise.all([
        fetch(`/api/table-data/instalaciones?limit=100&offset=0&showInactive=${showInactive}`),
        fetch(`/api/table-data/puestos_operativos?limit=100&offset=0&showInactive=false`),
        fetch(`/api/table-data/roles_servicio?limit=100&offset=0&showInactive=false`),
        fetch(`/api/table-data/guardias?estado=Activo&limit=1000&offset=0`)
      ])
      
      if (!instalacionesRes.ok || !puestosRes.ok || !rolesRes.ok || !guardiasRes.ok) {
        throw new Error('Error al cargar datos')
      }
      
      const [instalacionesData, puestosData, rolesData, guardiasData] = await Promise.all([
        instalacionesRes.json(),
        puestosRes.json(),
        rolesRes.json(),
        guardiasRes.json()
      ])
      
      setInstalaciones(instalacionesData.data || [])
      setPuestosOperativos(puestosData.data || [])
      setRolesServicio(rolesData.data || [])
      setGuardias(guardiasData.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      setError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAsignaciones = async (instalacionId: string) => {
    try {
      setIsLoadingAsignaciones(true)
      const response = await fetch(`/api/table-data/asignaciones_operativas?instalacion_id=${instalacionId}`)
      
      if (!response.ok) {
        throw new Error('Error al cargar asignaciones')
      }
      
      const data = await response.json()
      setAsignaciones(data.data || [])
    } catch (error) {
      console.error('Error fetching asignaciones:', error)
      showError('Error al cargar asignaciones operativas')
    } finally {
      setIsLoadingAsignaciones(false)
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
    setSelectedInstalacion(null)
    setFormData({ 
      nombre: '', 
      direccion: '', 
      cliente_id: '', 
      estado: 'Activa',
      lat: null,
      lng: null
    })
    setIsFormOpen(true)
  }

  const handleEdit = (instalacion: Instalacion) => {
    setFormMode('edit')
    setSelectedInstalacion(instalacion)
    setFormData({
      nombre: instalacion.nombre || '',
      direccion: instalacion.direccion || '',
      cliente_id: instalacion.cliente_id || '',
      estado: instalacion.estado || 'Activa',
      lat: (instalacion as any).lat || null,
      lng: (instalacion as any).lng || null
    })
    setIsFormOpen(true)
  }

  const handleInactivate = (instalacion: Instalacion) => {
    setInstallationToDelete(instalacion)
    setIsDeleteInstallationOpen(true)
  }

  const confirmInactivate = async () => {
    if (!installationToDelete) return

    try {
      setIsSubmitting(true)
      
      const response = await fetch(`/api/table-data/instalaciones?id=${installationToDelete.id}&action=inactivate`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al inactivar')
      }

      success('Instalación inactivada exitosamente')
      setIsDeleteInstallationOpen(false)
      setInstallationToDelete(null)
      handleRefresh()
    } catch (error) {
      console.error('Error inactivating instalacion:', error)
      showError(error instanceof Error ? error.message : 'Error al inactivar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleManageAsignaciones = (instalacion: Instalacion) => {
    setCurrentInstalacionId(instalacion.id)
    setAsignacionData({
      puesto_operativo_id: '',
      roles_servicio: []
    })
    fetchAsignaciones(instalacion.id)
    setIsAsignacionesOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nombre.trim() || !formData.direccion.trim()) {
      showError('Nombre y dirección son requeridos')
      return
    }

    try {
      setIsSubmitting(true)

      // Limpiar datos para enviar solo campos con valores válidos
      const cleanData = Object.entries(formData).reduce((acc, [key, value]) => {
        // Incluir campos requeridos aunque estén vacíos
        if (['nombre', 'estado'].includes(key)) {
          acc[key] = value
        }
        // Incluir coordenadas siempre (incluso si son null para limpiar valores previos)
        else if (['lat', 'lng'].includes(key)) {
          acc[key] = value
        }
        // Incluir otros campos solo si tienen valor
        else if (value !== null && value !== '' && value !== undefined) {
          acc[key] = value
        }
        return acc
      }, {} as Record<string, any>)

      console.log('🚀 Datos a enviar al API:', cleanData)
      console.log('📝 FormData original:', formData)

      let response: Response
      
      if (formMode === 'create') {
        response = await fetch(`/api/table-data/instalaciones`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cleanData),
        })
      } else if (selectedInstalacion) {
        response = await fetch(`/api/table-data/instalaciones?id=${selectedInstalacion.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cleanData),
        })
      } else {
        throw new Error('No se encontró la instalación a editar')
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error en la operación')
      }

      success(formMode === 'create' ? 'Instalación creada exitosamente' : 'Instalación actualizada exitosamente')
      setIsFormOpen(false)
      handleRefresh()
    } catch (error) {
      console.error('Error submitting form:', error)
      showError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setIsSubmitting(false)
    }
  }

  const addRolToAsignacion = () => {
    setAsignacionData(prev => ({
      ...prev,
      roles_servicio: [...prev.roles_servicio, { rol_id: '', cantidad: 1, guardias_asignados: [{ guardia_id: '' }] }]
    }))
  }

  const removeRolFromAsignacion = (index: number) => {
    setAsignacionData(prev => ({
      ...prev,
      roles_servicio: prev.roles_servicio.filter((_, i) => i !== index)
    }))
  }

  const updateRolAsignacion = (index: number, field: 'rol_id' | 'cantidad' | 'guardias_asignados', value: string | number | { guardia_id: string }[]) => {
    setAsignacionData(prev => ({
      ...prev,
      roles_servicio: prev.roles_servicio.map((rol, i) => {
        if (i === index) {
          let updatedRol = { ...rol }
          
          // Manejar diferentes tipos de actualizaciones
          if (field === 'guardias_asignados') {
            updatedRol.guardias_asignados = value as { guardia_id: string }[]
          } else {
            updatedRol = { ...rol, [field]: value }
          }
          
          // Si se cambió la cantidad, ajustar el array de guardias
          if (field === 'cantidad') {
            const nuevaCantidad = Number(value)
            const currentGuardias = updatedRol.guardias_asignados.length
            
            if (nuevaCantidad > currentGuardias) {
              // Agregar guardias vacíos
              const guardiasToAdd = nuevaCantidad - currentGuardias
              updatedRol.guardias_asignados = [
                ...updatedRol.guardias_asignados,
                ...Array(guardiasToAdd).fill({ guardia_id: '' })
              ]
            } else if (nuevaCantidad < currentGuardias) {
              // Quitar guardias extras
              updatedRol.guardias_asignados = updatedRol.guardias_asignados.slice(0, nuevaCantidad)
            }
          }
          return updatedRol
        }
        return rol
      })
    }))
  }

  const updateGuardiaAsignacion = (rolIndex: number, guardiaIndex: number, guardiaId: string) => {
    setAsignacionData(prev => ({
      ...prev,
      roles_servicio: prev.roles_servicio.map((rol, i) => 
        i === rolIndex 
          ? {
              ...rol,
              guardias_asignados: rol.guardias_asignados.map((guardia, j) =>
                j === guardiaIndex ? { guardia_id: guardiaId } : guardia
              )
            }
          : rol
      )
    }))
  }

  const handleSubmitAsignaciones = async () => {
    if (!asignacionData.puesto_operativo_id || asignacionData.roles_servicio.length === 0) {
      showError('Debe seleccionar un puesto operativo y al menos un rol de servicio')
      return
    }

    // Verificar que todos los roles tengan datos completos
    for (const rol of asignacionData.roles_servicio) {
      if (!rol.rol_id || rol.cantidad < 1) {
        showError('Todos los roles deben tener selección y cantidad válida')
        return
      }
    }

    try {
      setIsSubmitting(true)

      // Crear asignaciones para cada rol
      for (const rol of asignacionData.roles_servicio) {
        const asignacionPayload = {
          instalacion_id: currentInstalacionId,
          puesto_operativo_id: asignacionData.puesto_operativo_id,
          rol_servicio_id: rol.rol_id,
          cantidad_guardias: rol.cantidad
        }

        const response = await fetch('/api/table-data/asignaciones_operativas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(asignacionPayload),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Error al crear asignación')
        }

        // Si hay guardias asignados específicos, crearlos
        const asignacionCreada = await response.json()
        const asignacionId = asignacionCreada.data.id

        for (let index = 0; index < rol.guardias_asignados.length; index++) {
          const guardiaAsignacion = rol.guardias_asignados[index]
          if (guardiaAsignacion.guardia_id) {
            const guardiaPayload = {
              asignacion_operativa_id: asignacionId,
              guardia_id: parseInt(guardiaAsignacion.guardia_id),
              estado: 'asignado',
              fecha_asignacion: new Date().toISOString().split('T')[0],
              observaciones: `Asignado desde instalaciones el ${new Date().toLocaleDateString()}`
            }

            const guardiaResponse = await fetch('/api/table-data/guardias_asignados', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(guardiaPayload),
            })

            if (guardiaResponse.ok) {
              const guardiaData = await guardiaResponse.json()
              
              // Actualizar el registro PPC correspondiente a cubierto
              const ppcPayload = {
                estado: 'cubierto',
                guardia_asignado_id: guardiaData.data.id,
                observaciones: `Guardia ${guardias.find(g => g.id == guardiaAsignacion.guardia_id)?.nombre} asignado desde instalaciones`
              }

              // Buscar el registro PPC que corresponde a esta asignación
              const ppcResponse = await fetch(`/api/table-data/ppc_registros?asignacion_operativa_id=${asignacionId}`)
              if (ppcResponse.ok) {
                const ppcData = await ppcResponse.json()
                if (ppcData.data && ppcData.data[index]) {
                  const ppcId = ppcData.data[index].id
                  await fetch(`/api/table-data/ppc_registros?id=${ppcId}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(ppcPayload),
                  })
                }
              }
            }
          }
        }
      }

      success('Asignaciones operativas creadas exitosamente')
      setAsignacionData({
        puesto_operativo_id: '',
        roles_servicio: []
      })
      fetchAsignaciones(currentInstalacionId)
    } catch (error) {
      console.error('Error creating asignaciones:', error)
      showError(error instanceof Error ? error.message : 'Error al crear asignaciones')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Funciones para editar/eliminar asignaciones
  const handleEditAsignacion = async (asignacion: AsignacionOperativa) => {
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
      
      setEditAsignacionData({
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
      setEditAsignacionData({
        instalacion_id: asignacion.instalacion_id,
        puesto_operativo_id: asignacion.puesto_operativo_id,
        rol_servicio_id: asignacion.rol_servicio_id,
        cantidad_guardias: asignacion.cantidad_guardias,
        estado: asignacion.estado,
        guardias_asignados: Array.from({ length: asignacion.cantidad_guardias }, () => ({ guardia_id: '' }))
      })
    }
    
    setIsEditingAsignacion(true)
  }

  const handleDeleteAsignacion = (asignacion: AsignacionOperativa) => {
    setAsignacionToDelete(asignacion)
    setIsDeleteAsignacionOpen(true)
  }

  const confirmDeleteAsignacion = async () => {
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
      setIsDeleteAsignacionOpen(false)
      setAsignacionToDelete(null)
      fetchAsignaciones(currentInstalacionId)
    } catch (error) {
      console.error('Error deleting asignacion:', error)
      showError(error instanceof Error ? error.message : 'Error al eliminar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitEditAsignacion = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedAsignacion) return

    try {
      setIsSubmitting(true)

      // Actualizar asignación operativa
      const asignacionPayload = {
        instalacion_id: editAsignacionData.instalacion_id,
        puesto_operativo_id: editAsignacionData.puesto_operativo_id,
        rol_servicio_id: editAsignacionData.rol_servicio_id,
        cantidad_guardias: editAsignacionData.cantidad_guardias,
        estado: editAsignacionData.estado
      }

      const response = await fetch(`/api/table-data/asignaciones_operativas?id=${selectedAsignacion.id}`, {
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

      // Actualizar guardias asignados
      // Primero eliminar guardias existentes
      await fetch(`/api/table-data/guardias_asignados?asignacion_operativa_id=${selectedAsignacion.id}`, {
        method: 'DELETE'
      })

      // Crear nuevos guardias asignados
      for (let index = 0; index < editAsignacionData.guardias_asignados.length; index++) {
        const guardiaAsignado = editAsignacionData.guardias_asignados[index]
        if (guardiaAsignado.guardia_id) {
          const guardiaPayload = {
            asignacion_operativa_id: selectedAsignacion.id,
            guardia_id: parseInt(guardiaAsignado.guardia_id),
            estado: 'asignado',
            fecha_asignacion: new Date().toISOString().split('T')[0],
            observaciones: `Actualizado desde instalaciones el ${new Date().toLocaleDateString()}`
          }

          await fetch('/api/table-data/guardias_asignados', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(guardiaPayload),
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

      success('Asignación actualizada exitosamente')
      setIsEditingAsignacion(false)
      setSelectedAsignacion(null)
      fetchAsignaciones(currentInstalacionId)
    } catch (error) {
      console.error('Error updating asignacion:', error)
      showError(error instanceof Error ? error.message : 'Error al actualizar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isInactiveRecord = (instalacion: Instalacion): boolean => {
    return instalacion.estado === 'Inactiva'
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
                <Building className="h-8 w-8 text-primary" />
                Instalaciones
              </h1>
              <p className="text-muted-foreground mt-2">
                Gestión de instalaciones y asignaciones operativas
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Botones eliminados - solo se usa formulario interno */}
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
                {instalaciones.length} instalaciones {showInactive ? 'totales' : 'activas'}
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
              <p className="text-muted-foreground">{error}</p>
            </div>
          ) : isLoading ? (
            <div className="p-8 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-muted-foreground">Cargando instalaciones...</p>
            </div>
          ) : instalaciones.length === 0 ? (
            <div className="p-8 text-center">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin instalaciones</h3>
              <p className="text-muted-foreground">
                {showInactive ? 'No hay instalaciones registradas' : 'No hay instalaciones activas'}
              </p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Nombre</TableHead>
                    <TableHead className="font-semibold">Dirección</TableHead>
                    <TableHead className="font-semibold">Cliente</TableHead>
                    <TableHead className="font-semibold text-center">Estado</TableHead>
                    <TableHead className="font-semibold text-center">Fecha creación</TableHead>
                    <TableHead className="font-semibold text-center w-64">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                
                <TableBody>
                  {instalaciones.map((instalacion) => (
                    <TableRow 
                      key={instalacion.id} 
                      className={`hover:bg-muted/50 transition-colors ${
                        isInactiveRecord(instalacion) ? 'opacity-60' : ''
                      }`}
                    >
                      <TableCell className="font-medium">{instalacion.nombre}</TableCell>
                      <TableCell>{instalacion.direccion}</TableCell>
                      <TableCell>{instalacion.cliente_id_name || '-'}</TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          instalacion.estado === 'Activa' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {instalacion.estado}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {new Date(instalacion.created_at).toLocaleDateString('es-ES')}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {((instalacion as any).lat && (instalacion as any).lng) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                console.log('🗺️ Click en botón mapa:', instalacion.nombre, {
                                  lat: (instalacion as any).lat,
                                  lng: (instalacion as any).lng,
                                  direccion: instalacion.direccion
                                })
                                setViewingInstalacion(
                                  viewingInstalacion?.id === instalacion.id ? null : instalacion
                                )
                              }}
                              className={`h-8 w-8 p-0 ${viewingInstalacion?.id === instalacion.id ? "bg-blue-100 dark:bg-blue-900 text-blue-600" : ""}`}
                              title="Ver mapa"
                            >
                              <MapPin className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(instalacion)}
                            className="h-8 w-8 p-0"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleManageAsignaciones(instalacion)}
                            className="h-8 px-3 text-blue-600 hover:text-blue-800 border-blue-200 hover:border-blue-300"
                            title="Gestionar asignaciones operativas"
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            <span className="text-xs">Asignar</span>
                          </Button>
                          {!isInactiveRecord(instalacion) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleInactivate(instalacion)}
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

      {/* Vista del Mapa */}
      {viewingInstalacion && (viewingInstalacion as any).lat && (viewingInstalacion as any).lng && (
        <motion.div 
          className="mt-6 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <MapPin className="h-5 w-5 text-red-500" />
                Ubicación: {viewingInstalacion.nombre}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                📍 {viewingInstalacion.direccion}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Coordenadas: {(viewingInstalacion as any).lat?.toFixed(6)}, {(viewingInstalacion as any).lng?.toFixed(6)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewingInstalacion(null)}
              className="text-xs"
            >
              ✕ Cerrar mapa
            </Button>
          </div>
          <MapView
            lat={(viewingInstalacion as any).lat}
            lng={(viewingInstalacion as any).lng}
            address={viewingInstalacion.direccion}
            height="400px"
          />
        </motion.div>
      )}

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && viewingInstalacion && (
        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
          <strong>🐛 Debug:</strong> viewingInstalacion = {JSON.stringify({
            id: viewingInstalacion.id,
            nombre: viewingInstalacion.nombre,
            lat: (viewingInstalacion as any).lat,
            lng: (viewingInstalacion as any).lng
          }, null, 2)}
        </div>
      )}

      {/* Formulario de Instalación */}
      <Drawer open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DrawerContent className="max-w-lg h-full overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle className="capitalize-first">
              {formMode === 'create' ? 'Crear instalación' : 'Editar instalación'}
            </DrawerTitle>
            <DrawerDescription>
              {formMode === 'create' 
                ? 'Complete la información para crear una nueva instalación con dirección real.' 
                : 'Modifique los datos de la instalación existente.'}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-6 pb-6 space-y-6 overflow-y-auto max-h-[calc(100vh-120px)]">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nombre">
                  Nombre de la instalación <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej: Sede Central, Sucursal Norte"
                  required
                />
              </div>

              <div className="space-y-2">
                <AddressAutocomplete
                  label="Dirección"
                  value={formData.direccion}
                  onChange={(address, placeDetails) => {
                    const newFormData = { 
                      ...formData, 
                      direccion: address,
                      lat: null as number | null,
                      lng: null as number | null
                    }
                    
                    // Guardar coordenadas si están disponibles
                    if (placeDetails?.geometry?.location) {
                      const lat = placeDetails.geometry.location.lat()
                      const lng = placeDetails.geometry.location.lng()
                      newFormData.lat = lat
                      newFormData.lng = lng
                      console.log('✅ Coordenadas guardadas:', { lat, lng, address })
                    } else {
                      console.log('⚠️ Sin coordenadas disponibles - placeDetails:', !!placeDetails, 'address:', address)
                    }
                    
                    setFormData(newFormData)
                  }}
                  placeholder="Buscar dirección real..."
                  required
                />
                
                {/* Botón de prueba para coordenadas */}
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const testCoords = {
                        lat: -33.4489,
                        lng: -70.6693
                      }
                      setFormData(prev => ({
                        ...prev,
                        lat: testCoords.lat,
                        lng: testCoords.lng
                      }))
                      console.log('🧪 Coordenadas de prueba establecidas:', testCoords)
                    }}
                    className="text-xs"
                  >
                    🧪 Probar coordenadas (Santiago)
                  </Button>
                  
                  {(formData.lat && formData.lng) && (
                    <div className="mt-1 p-2 bg-green-50 dark:bg-green-950/30 rounded border text-xs">
                      📍 Coordenadas: {formData.lat?.toFixed(6)}, {formData.lng?.toFixed(6)}
                    </div>
                  )}
                </div>
              </div>

              {/* Mapa en el drawer */}
              {(formData.lat && formData.lng) && (
                <div className="space-y-2">
                  <Label>📍 Vista previa de ubicación</Label>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <MapView
                      lat={formData.lat}
                      lng={formData.lng}
                      address={formData.direccion}
                      height="200px"
                    />
                  </div>
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
                    <SelectItem value="Activa">Activa</SelectItem>
                    <SelectItem value="Inactiva">Inactiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DrawerFooter className="px-0 pt-6">
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsFormOpen(false)}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    <Save className="h-4 w-4 mr-2" />
                    {formMode === 'create' ? 'Crear' : 'Actualizar'}
                  </Button>
                </div>
              </DrawerFooter>
            </form>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Formulario de Asignaciones Operativas */}
      <Dialog open={isAsignacionesOpen} onOpenChange={setIsAsignacionesOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="capitalize-first">
              Asignaciones operativas
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Asignaciones existentes */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Asignaciones actuales
              </h3>
              
              {isLoadingAsignaciones ? (
                <div className="p-4 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Cargando asignaciones...</p>
                </div>
              ) : asignaciones.length === 0 ? (
                <p className="text-muted-foreground p-4 text-center">
                  No hay asignaciones operativas configuradas
                </p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Puesto operativo</TableHead>
                        <TableHead>Rol de servicio</TableHead>
                        <TableHead className="text-center">Cantidad guardias</TableHead>
                        <TableHead className="text-center w-32">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {asignaciones.map((asignacion) => (
                        <TableRow key={asignacion.id}>
                          <TableCell>{asignacion.puesto_operativo_id_name}</TableCell>
                          <TableCell>{asignacion.rol_servicio_id_name}</TableCell>
                          <TableCell className="text-center">{asignacion.cantidad_guardias}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditAsignacion(asignacion)}
                                className="h-8 w-8 p-0"
                                title="Editar"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAsignacion(asignacion)}
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
            </div>

            {/* Nueva asignación */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Plus className="h-5 w-5" />
                Nueva asignación operativa
              </h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Puesto operativo <span className="text-red-500">*</span></Label>
                  <Select
                    value={asignacionData.puesto_operativo_id}
                    onValueChange={(value) => setAsignacionData(prev => ({ ...prev, puesto_operativo_id: value }))}
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

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Roles de servicio asociados</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addRolToAsignacion}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar rol
                    </Button>
                  </div>

                  {asignacionData.roles_servicio.map((rol, index) => (
                    <div key={index} className="space-y-3">
                      <div className="flex items-end gap-3 p-3 border rounded-lg">
                        <div className="flex-1 space-y-2">
                          <Label>Rol de servicio</Label>
                          <Select
                            value={rol.rol_id}
                            onValueChange={(value) => updateRolAsignacion(index, 'rol_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar rol" />
                            </SelectTrigger>
                            <SelectContent>
                              {rolesServicio.map((rolOption) => (
                                <SelectItem key={rolOption.id} value={rolOption.id}>
                                  {rolOption.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="w-40 space-y-2">
                          <Label>Cantidad guardias</Label>
                          <Select
                            value={rol.cantidad.toString()}
                            onValueChange={(value) => {
                              const newCantidad = parseInt(value)
                              updateRolAsignacion(index, 'cantidad', newCantidad)
                              // Ajustar la cantidad de guardias asignados
                              const newGuardias = Array.from({ length: newCantidad }, (_, i) => 
                                rol.guardias_asignados[i] || { guardia_id: '' }
                              )
                              updateRolAsignacion(index, 'guardias_asignados', newGuardias)
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Cantidad" />
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

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeRolFromAsignacion(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Asignación de guardias específicos */}
                      {rol.cantidad > 0 && (
                        <div className="ml-3 p-4 bg-muted/30 rounded-lg border-l-4 border-blue-200">
                          <Label className="text-sm font-medium flex items-center gap-2 mb-4">
                            <Users className="h-4 w-4" />
                            Asignar guardias específicos ({rol.guardias_asignados.filter(g => g.guardia_id).length}/{rol.cantidad} asignados)
                          </Label>
                          
                          <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">
                              💡 Asigna guardias específicos o deja vacío para generar PPC automáticamente
                            </p>
                            
                            <div className="grid grid-cols-1 gap-3">
                              {Array.from({ length: rol.cantidad }, (_, guardiaIndex) => {
                                const guardiaAsignado = rol.guardias_asignados[guardiaIndex] || { guardia_id: '' }
                                
                                // Obtener guardias ya seleccionados en este rol (excluyendo el actual)
                                const guardiasSeleccionados = rol.guardias_asignados
                                  .filter((_, idx) => idx !== guardiaIndex)
                                  .map(g => g.guardia_id)
                                  .filter(Boolean)
                                
                                // Filtrar guardias disponibles
                                const guardiasDisponibles = guardias.filter(guardia => 
                                  guardia.estado === 'Activo' && !guardiasSeleccionados.includes(guardia.id.toString())
                                )
                                
                                return (
                                  <div key={guardiaIndex} className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-sm font-medium text-primary w-12">
                                        #{guardiaIndex + 1}
                                      </span>
                                      <div className="flex-1">
                                        <Select
                                          value={guardiaAsignado.guardia_id?.toString() || 'sin-asignar'}
                                          onValueChange={(guardiaId) => {
                                            updateGuardiaAsignacion(index, guardiaIndex, guardiaId === 'sin-asignar' ? '' : guardiaId)
                                          }}
                                        >
                                          <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Seleccionar guardia" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="sin-asignar">
                                              <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                                Sin asignar (genera PPC)
                                              </div>
                                            </SelectItem>
                                            {guardiasDisponibles.map((guardia) => (
                                              <SelectItem key={guardia.id} value={guardia.id.toString()}>
                                                <div className="flex items-center gap-2">
                                                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                  {guardia.nombre} - {guardia.rut}
                                                  {guardia.instalacion_id_name && (
                                                    <span className="text-xs text-muted-foreground">
                                                      {' '}({guardia.instalacion_id_name})
                                                    </span>
                                                  )}
                                                </div>
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                      {guardiaAsignado.guardia_id ? (
                                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                          Asignado
                                        </span>
                                      ) : (
                                        <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                          PPC
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                            
                            {rol.cantidad > 0 && (
                              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                  📊 <strong>Resumen:</strong> {rol.guardias_asignados.filter(g => g.guardia_id).length} guardias asignados, 
                                  {' '}{rol.cantidad - rol.guardias_asignados.filter(g => g.guardia_id).length} registros PPC se generarán automáticamente
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    onClick={handleSubmitAsignaciones}
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    <Save className="h-4 w-4 mr-2" />
                    Guardar asignaciones
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsAsignacionesOpen(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Formulario de edición de asignación */}
      <Dialog open={isEditingAsignacion} onOpenChange={setIsEditingAsignacion}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize-first">
              Editar asignación operativa
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitEditAsignacion} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="puesto_operativo_id">
                Puesto operativo <span className="text-red-500">*</span>
              </Label>
              <Select
                value={editAsignacionData.puesto_operativo_id}
                onValueChange={(value) => setEditAsignacionData(prev => ({ ...prev, puesto_operativo_id: value }))}
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
                value={editAsignacionData.rol_servicio_id}
                onValueChange={(value) => setEditAsignacionData(prev => ({ ...prev, rol_servicio_id: value }))}
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
                 value={editAsignacionData.cantidad_guardias.toString()}
                 onValueChange={(value) => {
                   const newCantidad = parseInt(value)
                   const newGuardias = Array.from({ length: newCantidad }, (_, i) => 
                     editAsignacionData.guardias_asignados[i] || { guardia_id: '' }
                   )
                   setEditAsignacionData(prev => ({ 
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
             {editAsignacionData.cantidad_guardias > 0 && (
               <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                 <Label className="text-sm font-medium flex items-center gap-2">
                   <Users className="h-4 w-4" />
                   Asignar guardias específicos ({editAsignacionData.guardias_asignados.filter(g => g.guardia_id).length}/{editAsignacionData.cantidad_guardias} asignados)
                 </Label>
                 
                 <p className="text-xs text-muted-foreground">
                   💡 Asigna guardias específicos o deja vacío para generar PPC automáticamente
                 </p>

                 <div className="space-y-2 max-h-60 overflow-y-auto">
                   {Array.from({ length: editAsignacionData.cantidad_guardias }, (_, guardiaIndex) => {
                     const guardiaAsignado = editAsignacionData.guardias_asignados[guardiaIndex] || { guardia_id: '' }
                     
                     // Obtener guardias ya seleccionados (excluyendo el actual)
                     const guardiasSeleccionados = editAsignacionData.guardias_asignados
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
                               const updatedGuardias = [...editAsignacionData.guardias_asignados]
                               while (updatedGuardias.length <= guardiaIndex) {
                                 updatedGuardias.push({ guardia_id: '' })
                               }
                               updatedGuardias[guardiaIndex] = { 
                                 guardia_id: guardiaId === 'sin-asignar' ? '' : guardiaId 
                               }
                               setEditAsignacionData(prev => ({
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
                   
                   {editAsignacionData.cantidad_guardias > 0 && (
                     <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                       <p className="text-xs text-blue-700 dark:text-blue-300">
                         📊 <strong>Resumen:</strong> {editAsignacionData.guardias_asignados.filter(g => g.guardia_id).length} guardias asignados, 
                         {' '}{editAsignacionData.cantidad_guardias - editAsignacionData.guardias_asignados.filter(g => g.guardia_id).length} registros PPC se generarán automáticamente
                       </p>
                     </div>
                   )}
                 </div>
               )}

            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select 
                value={editAsignacionData.estado} 
                onValueChange={(value) => setEditAsignacionData(prev => ({ ...prev, estado: value }))}
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
                onClick={() => setIsEditingAsignacion(false)}
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
                Actualizar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog open={isDeleteAsignacionOpen} onOpenChange={setIsDeleteAsignacionOpen}>
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
              onClick={() => setIsDeleteAsignacionOpen(false)}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmDeleteAsignacion}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación de eliminación de instalación */}
      <ConfirmDialog
        open={isDeleteInstallationOpen}
        onOpenChange={setIsDeleteInstallationOpen}
        title="Confirmar inactivación"
        description={`¿Está seguro de que desea inactivar la instalación "${installationToDelete?.nombre}"?`}
        confirmText="Inactivar"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={confirmInactivate}
        loading={isSubmitting}
      >
        {installationToDelete && (
          <div className="p-3 rounded-lg bg-muted border">
            <p className="text-sm">
              <strong>Instalación:</strong> {installationToDelete.nombre}
            </p>
            <p className="text-sm">
              <strong>Dirección:</strong> {installationToDelete.direccion}
            </p>
            <p className="text-sm">
              <strong>Cliente:</strong> {installationToDelete.cliente_id_name}
            </p>
          </div>
        )}
      </ConfirmDialog>
    </>
  )
} 