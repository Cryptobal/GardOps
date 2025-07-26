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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  AlertTriangle,
  MoreVertical,
  Building2,
  Navigation,
  Phone,
  Mail
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

interface Cliente {
  id: string
  nombre: string
}

export default function InstalacionesPage() {
  // Estados móviles
  const [isMobileView, setIsMobileView] = useState(false)
  
  // Estados existentes
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  
  // Estados de formulario
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Estados del formulario de instalaciones
  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  
  // Estados para vista de mapa
  const [viewingInstalacion, setViewingInstalacion] = useState<Instalacion | null>(null)
  
  // Estados para gestión de asignaciones
  const [selectedInstalacion, setSelectedInstalacion] = useState<Instalacion | null>(null)
  const [asignaciones, setAsignaciones] = useState<AsignacionOperativa[]>([])
  const [puestosOperativos, setPuestosOperativos] = useState<PuestoOperativo[]>([])
  const [rolesServicio, setRolesServicio] = useState<RolServicio[]>([])
  const [isAsignacionesOpen, setIsAsignacionesOpen] = useState(false)
  const [isLoadingAsignaciones, setIsLoadingAsignaciones] = useState(false)
  
  // Estados para nueva asignación
  const [newAsignacionData, setNewAsignacionData] = useState({
    puesto_operativo_id: '',
    roles_servicio: [] as { rol_id: string, cantidad: number, guardias_asignados: { guardia_id: string }[] }[]
  })
  
  // Estados para edición de asignación
  const [editAsignacionData, setEditAsignacionData] = useState({
    id: '',
    puesto_operativo_id: '',
    rol_servicio_id: '',
    cantidad_guardias: 1,
    guardias_asignados: [] as { guardia_id: string }[]
  })
  const [isEditAsignacionOpen, setIsEditAsignacionOpen] = useState(false)
  const [selectedAsignacion, setSelectedAsignacion] = useState<AsignacionOperativa | null>(null)
  
  // Estados para guardias
  const [guardias, setGuardias] = useState<any[]>([])
  
  // Estados para confirmación de eliminación
  const [isDeleteInstallationOpen, setIsDeleteInstallationOpen] = useState(false)
  const [installationToDelete, setInstallationToDelete] = useState<Instalacion | null>(null)
  
  // Estados para eliminación de asignación
  const [isDeleteAsignacionOpen, setIsDeleteAsignacionOpen] = useState(false)
  const [asignacionToDelete, setAsignacionToDelete] = useState<AsignacionOperativa | null>(null)
  
  const { success, error: showError, ToastContainer } = useToast()

  // Detectar vista móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
    setIsEditing(false)
    setEditingId(null)
    setNombre('')
    setDireccion('')
    setClienteId('')
    setLat(null)
    setLng(null)
    setIsFormOpen(true)
  }

  const handleEdit = (instalacion: Instalacion) => {
    setIsEditing(true)
    setEditingId(instalacion.id)
    setNombre(instalacion.nombre || '')
    setDireccion(instalacion.direccion || '')
    setClienteId(instalacion.cliente_id || '')
    setLat((instalacion as any).lat || null)
    setLng((instalacion as any).lng || null)
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
    setSelectedInstalacion(instalacion)
    setNewAsignacionData({
      puesto_operativo_id: '',
      roles_servicio: []
    })
    fetchAsignaciones(instalacion.id)
    setIsAsignacionesOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nombre.trim() || !direccion.trim()) {
      showError('Nombre y dirección son requeridos')
      return
    }

    try {
      setIsSubmitting(true)

      // Limpiar datos para enviar solo campos con valores válidos
      const cleanData = Object.entries({
        nombre,
        direccion,
        cliente_id: clienteId,
        estado: 'Activa', // Estado por defecto
        lat,
        lng
      }).reduce((acc, [key, value]) => {
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
      console.log('📝 FormData original:', { nombre, direccion, clienteId, lat, lng })

      let response: Response
      
      if (editingId) {
        response = await fetch(`/api/table-data/instalaciones?id=${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cleanData),
        })
      } else {
        response = await fetch(`/api/table-data/instalaciones`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cleanData),
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error en la operación')
      }

      success(editingId ? 'Instalación actualizada exitosamente' : 'Instalación creada exitosamente')
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
    setNewAsignacionData(prev => ({
      ...prev,
      roles_servicio: [...prev.roles_servicio, { rol_id: '', cantidad: 1, guardias_asignados: [{ guardia_id: '' }] }]
    }))
  }

  const removeRolFromAsignacion = (index: number) => {
    setNewAsignacionData(prev => ({
      ...prev,
      roles_servicio: prev.roles_servicio.filter((_, i) => i !== index)
    }))
  }

  const updateRolAsignacion = (index: number, field: 'rol_id' | 'cantidad' | 'guardias_asignados', value: string | number | { guardia_id: string }[]) => {
    setNewAsignacionData(prev => ({
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
    setNewAsignacionData(prev => ({
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
    if (!newAsignacionData.puesto_operativo_id || newAsignacionData.roles_servicio.length === 0) {
      showError('Debe seleccionar un puesto operativo y al menos un rol de servicio')
      return
    }

    // Verificar que todos los roles tengan datos completos
    for (const rol of newAsignacionData.roles_servicio) {
      if (!rol.rol_id || rol.cantidad < 1) {
        showError('Todos los roles deben tener selección y cantidad válida')
        return
      }
    }

    try {
      setIsSubmitting(true)

      // Crear asignaciones para cada rol
      for (const rol of newAsignacionData.roles_servicio) {
        const asignacionPayload = {
          instalacion_id: selectedInstalacion?.id || '', // Asegurarse de que selectedInstalacion esté definido
          puesto_operativo_id: newAsignacionData.puesto_operativo_id,
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
      setNewAsignacionData({
        puesto_operativo_id: '',
        roles_servicio: []
      })
      fetchAsignaciones(selectedInstalacion?.id || '')
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
        id: asignacion.id,
        puesto_operativo_id: asignacion.puesto_operativo_id,
        rol_servicio_id: asignacion.rol_servicio_id,
        cantidad_guardias: asignacion.cantidad_guardias,
        guardias_asignados: guardiasArray
      })
    } catch (error) {
      console.error('Error loading guardias asignados:', error)
      // Inicializar con array vacío si falla
      setEditAsignacionData({
        id: asignacion.id,
        puesto_operativo_id: asignacion.puesto_operativo_id,
        rol_servicio_id: asignacion.rol_servicio_id,
        cantidad_guardias: asignacion.cantidad_guardias,
        guardias_asignados: Array.from({ length: asignacion.cantidad_guardias }, () => ({ guardia_id: '' }))
      })
    }
    
    setIsEditAsignacionOpen(true)
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
      fetchAsignaciones(selectedInstalacion?.id || '')
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
        id: editAsignacionData.id, // Usar el ID de la asignación existente
        puesto_operativo_id: editAsignacionData.puesto_operativo_id,
        rol_servicio_id: editAsignacionData.rol_servicio_id,
        cantidad_guardias: editAsignacionData.cantidad_guardias,
        estado: 'Activo' // Estado por defecto
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
      setIsEditAsignacionOpen(false)
      setSelectedAsignacion(null)
      fetchAsignaciones(selectedInstalacion?.id || '')
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

  // Función para formatear valor para móviles
  const formatMobileValue = (value: any, field: string) => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'string' && value.length > 30) {
      return value.substring(0, 30) + '...'
    }
    if (field === 'created_at') {
      return new Date(value).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      })
    }
    return String(value)
  }

  // Renderizar vista móvil como tarjetas
  const renderMobileInstalaciones = () => {
    if (!instalaciones?.length) return null

    return (
      <div className="space-y-4">
        {instalaciones.map((instalacion, index) => (
          <motion.div
            key={instalacion.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card className={`relative mobile-card mobile-interactive ${
              isInactiveRecord(instalacion) ? 'opacity-60 bg-muted/30' : ''
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    {/* Nombre de instalación */}
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm">{instalacion.nombre}</span>
                    </div>
                    
                    {/* Dirección */}
                    <div className="flex items-center gap-2">
                      <Navigation className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {formatMobileValue(instalacion.direccion, 'direccion')}
                      </span>
                    </div>
                  </div>
                  
                  {/* Acciones en dropdown para móvil */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 mobile-touch-button">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {((instalacion as any).lat && (instalacion as any).lng) && (
                        <DropdownMenuItem onClick={() => {
                          setViewingInstalacion(
                            viewingInstalacion?.id === instalacion.id ? null : instalacion
                          )
                        }}>
                          <MapPin className="h-4 w-4 mr-2" />
                          Ver Mapa
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleEdit(instalacion)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleManageAsignaciones(instalacion)}>
                        <Settings className="h-4 w-4 mr-2" />
                        Asignaciones
                      </DropdownMenuItem>
                      {!isInactiveRecord(instalacion) && (
                        <DropdownMenuItem 
                          onClick={() => handleInactivate(instalacion)}
                          className="text-orange-600"
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Inactivar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {/* Campos adicionales */}
                <div className="space-y-2">
                  <div className="mobile-card-field">
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Cliente</span>
                    </div>
                    <span className="text-sm font-medium text-right max-w-[60%]">
                      {instalacion.cliente_id_name || 'Sin asignar'}
                    </span>
                  </div>
                  
                  <div className="mobile-card-field">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Creado</span>
                    </div>
                    <span className="text-sm font-medium">
                      {formatMobileValue(instalacion.created_at, 'created_at')}
                    </span>
                  </div>
                </div>
                
                {/* Estado del registro */}
                <div className="mt-3 pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Estado</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      instalacion.estado === 'Activa'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {instalacion.estado}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    )
  }

  return (
    <>
      <ToastContainer />
      
      <div className="space-y-6 p-4 md:p-6">
        {/* Header optimizado para móvil */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Building className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                  {isMobileView && <Building2 className="h-5 w-5 text-muted-foreground" />}
                </div>
                Instalaciones
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                {isMobileView 
                  ? "Gestión de instalaciones y asignaciones" 
                  : "Gestión de instalaciones y asignaciones operativas"
                }
              </p>
            </div>
            
            {/* Botón optimizado para móvil */}
            <Button 
              onClick={handleCreateNew} 
              className={`gap-2 ${isMobileView ? 'w-full sm:w-auto' : ''}`}
              size={isMobileView ? "lg" : "default"}
            >
              <Plus className="h-4 w-4" />
              {isMobileView ? "Nueva Instalación" : "Nueva Instalación"}
            </Button>
          </div>

          {/* Indicador de vista móvil */}
          {isMobileView && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3"
            >
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Building className="h-4 w-4" />
                <span className="text-sm font-medium">Vista Móvil Optimizada</span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Todas las acciones están disponibles en formato de tarjetas
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Controls optimizados para móvil */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
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
                {isMobileView ? 'Vista móvil' : `${instalaciones.length} instalaciones`} • {instalaciones.length} {showInactive ? 'totales' : 'activas'}
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
            <>
              {/* Vista móvil */}
              {isMobileView ? (
                <div className="p-4">
                  {renderMobileInstalaciones()}
                </div>
              ) : (
                /* Vista desktop (tabla original) */
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
            </>
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

      {/* Formulario de Instalación optimizado para móvil */}
      <Drawer open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DrawerContent className={`${isMobileView ? 'w-full' : 'max-w-lg'} h-full overflow-y-auto`}>
          <DrawerHeader>
            <DrawerTitle className="capitalize-first">
              {isEditing ? 'Editar instalación' : 'Crear instalación'}
            </DrawerTitle>
            <DrawerDescription>
              {isEditing 
                ? 'Modifique los datos de la instalación existente.' 
                : 'Complete la información para crear una nueva instalación con dirección real.'}
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
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Sede Central, Sucursal Norte"
                  required
                />
              </div>

              <div className="space-y-2">
                <AddressAutocomplete
                  label="Dirección"
                  value={direccion}
                  onChange={(address, placeDetails) => {
                    const newDireccion = address
                    
                    // Guardar coordenadas si están disponibles
                    if (placeDetails?.geometry?.location) {
                      const lat = placeDetails.geometry.location.lat()
                      const lng = placeDetails.geometry.location.lng()
                      setLat(lat)
                      setLng(lng)
                      console.log('✅ Coordenadas guardadas:', { lat, lng, address })
                    } else {
                      console.log('⚠️ Sin coordenadas disponibles - placeDetails:', !!placeDetails, 'address:', address)
                    }
                    
                    setDireccion(newDireccion)
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
                      setLat(testCoords.lat)
                      setLng(testCoords.lng)
                      console.log('🧪 Coordenadas de prueba establecidas:', testCoords)
                    }}
                    className="text-xs"
                  >
                    🧪 Probar coordenadas (Santiago)
                  </Button>
                  
                  {(lat && lng) && (
                    <div className="mt-1 p-2 bg-green-50 dark:bg-green-950/30 rounded border text-xs">
                      📍 Coordenadas: {lat?.toFixed(6)}, {lng?.toFixed(6)}
                    </div>
                  )}
                </div>
              </div>

              {/* Mapa en el drawer */}
              {(lat && lng) && (
                <div className="space-y-2">
                  <Label>📍 Vista previa de ubicación</Label>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <MapView
                      lat={lat}
                      lng={lng}
                      address={direccion}
                      height="200px"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente</Label>
                <Select 
                  value={clienteId} 
                  onValueChange={(value) => setClienteId(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select 
                  value="Activa" 
                  onValueChange={(value) => {}}
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
                    {isEditing ? 'Actualizar' : 'Crear'}
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
                    value={newAsignacionData.puesto_operativo_id}
                    onValueChange={(value) => setNewAsignacionData(prev => ({ ...prev, puesto_operativo_id: value }))}
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

                  {newAsignacionData.roles_servicio.map((rol, index) => (
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

                                // Crear opciones para el SelectWithSearch
                                const opcionesGuardias = [
                                  {
                                    value: 'sin-asignar',
                                    label: '🟡 Sin asignar (genera PPC)'
                                  },
                                  ...guardiasDisponibles.map((guardia) => ({
                                    value: guardia.id.toString(),
                                    label: `🟢 ${guardia.nombre} - ${guardia.rut}${guardia.instalacion_id_name ? ` (${guardia.instalacion_id_name})` : ''}`
                                  }))
                                ]
                                
                                return (
                                  <div key={guardiaIndex} className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-sm font-medium text-primary w-12">
                                        #{guardiaIndex + 1}
                                      </span>
                                      <div className="flex-1">
                                        <SelectWithSearch
                                          options={opcionesGuardias}
                                          value={guardiaAsignado.guardia_id?.toString() || 'sin-asignar'}
                                          onValueChange={(guardiaId) => {
                                            updateGuardiaAsignacion(index, guardiaIndex, guardiaId === 'sin-asignar' ? '' : guardiaId)
                                          }}
                                          placeholder="Seleccionar guardia"
                                          searchPlaceholder="Buscar guardia por nombre o RUT..."
                                          emptyMessage="No se encontraron guardias"
                                          className="w-full"
                                        />
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
      <Dialog open={isEditAsignacionOpen} onOpenChange={setIsEditAsignacionOpen}>
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
                  value="Activo" 
                  onValueChange={(value) => {}}
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
                onClick={() => setIsEditAsignacionOpen(false)}
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