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
  RefreshCw,
  AlertCircle,
  Filter,
  Save,
  X,
  Loader2,
  Calendar,
  MapPin,
  Clock,
  Users,
  FileText,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { ToastContainer } from '@/components/ui/toast'
import { SelectWithSearch } from "@/components/ui/select-with-search"

interface PPCRegistro {
  id: string
  instalacion_id: string
  puesto_operativo_id: string
  rol_servicio_id: string
  asignacion_operativa_id: string
  guardia_asignado_id: string | null
  estado: 'pendiente' | 'cubierto' | 'justificado'
  fecha_creacion: string
  observaciones: string | null
  instalacion_id_name?: string
  puesto_operativo_id_name?: string
  rol_servicio_id_name?: string
  created_at: string
  updated_at: string
}

interface Instalacion {
  id: string
  nombre: string
  estado: string
}

interface EstadisticasPPC {
  total: number
  pendientes: number
  cubiertos: number
  justificados: number
  porcentajeCubierto: number
}

export default function PPCPage() {
  const { success, error: showError, ToastContainer } = useToast()
  
  const [registros, setRegistros] = useState<PPCRegistro[]>([])
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([])
  const [guardias, setGuardias] = useState<any[]>([])
  const [estadisticas, setEstadisticas] = useState<EstadisticasPPC>({
    total: 0,
    pendientes: 0,
    cubiertos: 0,
    justificados: 0,
    porcentajeCubierto: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Estados para formulario de edición
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedRegistro, setSelectedRegistro] = useState<PPCRegistro | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Estados para asignación de guardia
  const [isAsignarGuardiaOpen, setIsAsignarGuardiaOpen] = useState(false)
  const [asignandoRegistro, setAsignandoRegistro] = useState<PPCRegistro | null>(null)
  const [selectedGuardiaId, setSelectedGuardiaId] = useState<string>('')
  
  // Filtros
  const [filtros, setFiltros] = useState({
    instalacion_id: 'all',
    estado: 'todos',
    fecha_desde: '',
    fecha_hasta: ''
  })
  
  // Datos del formulario
  const [formData, setFormData] = useState({
    estado: 'pendiente' as 'pendiente' | 'cubierto' | 'justificado',
    observaciones: ''
  })

  // Fetch de instalaciones para filtros
  const fetchInstalaciones = async () => {
    try {
      const response = await fetch('/api/table-data/instalaciones?limit=100&offset=0&showInactive=false')
      if (response.ok) {
        const data = await response.json()
        setInstalaciones(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching instalaciones:', error)
    }
  }

  // Fetch de guardias para asignación
  const fetchGuardias = async () => {
    try {
      const response = await fetch('/api/table-data/guardias?estado=Activo&limit=1000&offset=0')
      if (response.ok) {
        const data = await response.json()
        setGuardias(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching guardias:', error)
    }
  }

  // Fetch de registros PPC con filtros
  const fetchRegistrosPPC = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        limit: '100',
        offset: '0'
      })
      
      if (filtros.instalacion_id) params.append('instalacion_id', filtros.instalacion_id)
      if (filtros.estado !== 'todos') params.append('estado', filtros.estado)
      if (filtros.fecha_desde) params.append('fecha_desde', filtros.fecha_desde)
      if (filtros.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta)
      
      const response = await fetch(`/api/table-data/ppc_registros?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setRegistros(data.data || [])
      
      // Calcular estadísticas
      const registrosData = data.data || []
      const total = registrosData.length
      const pendientes = registrosData.filter((r: PPCRegistro) => r.estado === 'pendiente').length
      const cubiertos = registrosData.filter((r: PPCRegistro) => r.estado === 'cubierto').length
      const justificados = registrosData.filter((r: PPCRegistro) => r.estado === 'justificado').length
      const porcentajeCubierto = total > 0 ? Math.round(((cubiertos + justificados) / total) * 100) : 0
      
      setEstadisticas({
        total,
        pendientes,
        cubiertos,
        justificados,
        porcentajeCubierto
      })
      
    } catch (error) {
      console.error('Error fetching PPC registros:', error)
      setError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInstalaciones()
    fetchGuardias()
  }, [])

  useEffect(() => {
    fetchRegistrosPPC()
  }, [filtros])

  const handleRefresh = () => {
    fetchRegistrosPPC()
  }

  const handleEdit = (registro: PPCRegistro) => {
    setSelectedRegistro(registro)
    setFormData({
      estado: registro.estado,
      observaciones: registro.observaciones || ''
    })
    setIsFormOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedRegistro) return

    try {
      setIsSubmitting(true)

      const response = await fetch(`/api/table-data/ppc_registros?id=${selectedRegistro.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error en la operación')
      }

      success('Registro PPC actualizado exitosamente')
      setIsFormOpen(false)
      handleRefresh()
    } catch (error) {
      console.error('Error submitting form:', error)
      showError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getEstadoBadge = (estado: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium"
    switch (estado) {
      case 'pendiente':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`
      case 'cubierto':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
      case 'justificado':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200`
    }
  }

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Clock className="h-4 w-4" />
      case 'cubierto':
        return <CheckCircle className="h-4 w-4" />
      case 'justificado':
        return <FileText className="h-4 w-4" />
      default:
        return <XCircle className="h-4 w-4" />
    }
  }

  const handleAsignarGuardia = (registro: PPCRegistro) => {
    setAsignandoRegistro(registro)
    setSelectedGuardiaId('')
    setIsAsignarGuardiaOpen(true)
  }

  const handleSubmitAsignarGuardia = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!asignandoRegistro || !selectedGuardiaId) return

    try {
      setIsSubmitting(true)

      // Crear registro en guardias_asignados
      const guardiaAsignado = {
        asignacion_operativa_id: asignandoRegistro.asignacion_operativa_id,
        guardia_id: parseInt(selectedGuardiaId),
        estado: 'asignado',
        fecha_asignacion: new Date().toISOString().split('T')[0],
        observaciones: `Asignado desde PPC el ${new Date().toLocaleDateString()}`
      }

      const guardiaResponse = await fetch('/api/table-data/guardias_asignados', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(guardiaAsignado),
      })

      if (!guardiaResponse.ok) {
        const errorData = await guardiaResponse.json()
        throw new Error(errorData.error || 'Error creando asignación de guardia')
      }

      const guardiaData = await guardiaResponse.json()

      // Actualizar el registro PPC
      const ppcUpdate = {
        estado: 'cubierto',
        guardia_asignado_id: guardiaData.data.id,
        observaciones: (asignandoRegistro.observaciones || '') + `\nGuardia asignado: ${guardias.find(g => g.id == selectedGuardiaId)?.nombre} el ${new Date().toLocaleDateString()}`
      }

      const ppcResponse = await fetch(`/api/table-data/ppc_registros?id=${asignandoRegistro.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ppcUpdate),
      })

      if (!ppcResponse.ok) {
        const errorData = await ppcResponse.json()
        throw new Error(errorData.error || 'Error actualizando registro PPC')
      }

      success('Guardia asignado exitosamente')
      setIsAsignarGuardiaOpen(false)
      handleRefresh()
    } catch (error) {
      console.error('Error asignando guardia:', error)
      showError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setIsSubmitting(false)
    }
  }

  const clearFiltros = () => {
    setFiltros({
      instalacion_id: 'all',
      estado: 'todos',
      fecha_desde: '',
      fecha_hasta: ''
    })
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
                <AlertCircle className="h-8 w-8 text-primary" />
                Personal de puesto de control (PPC)
              </h1>
              <p className="text-muted-foreground mt-2">
                Gestión centralizada de puestos pendientes de cobertura
              </p>
            </div>
            
            <div className="flex items-center gap-2">
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

        {/* Estadísticas */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-5 gap-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="rounded-2xl border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{estadisticas.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{estadisticas.pendientes}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cubiertos</p>
                <p className="text-2xl font-bold text-green-600">{estadisticas.cubiertos}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Justificados</p>
                <p className="text-2xl font-bold text-blue-600">{estadisticas.justificados}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">% Cobertura</p>
                <p className="text-2xl font-bold text-primary">{estadisticas.porcentajeCubierto}%</p>
              </div>
              <AlertCircle className="h-8 w-8 text-primary" />
            </div>
          </div>
        </motion.div>

        {/* Filtros */}
        <motion.div
          className="rounded-2xl border bg-card p-6 shadow-xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros de búsqueda
            </h3>
            <Button variant="outline" size="sm" onClick={clearFiltros}>
              Limpiar filtros
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Instalación</Label>
              <Select
                value={filtros.instalacion_id}
                onValueChange={(value) => setFiltros(prev => ({ ...prev, instalacion_id: value }))}
              >
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={filtros.estado}
                onValueChange={(value) => setFiltros(prev => ({ ...prev, estado: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="cubierto">Cubierto</SelectItem>
                  <SelectItem value="justificado">Justificado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha desde</Label>
              <Input
                type="date"
                value={filtros.fecha_desde}
                onChange={(e) => setFiltros(prev => ({ ...prev, fecha_desde: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha hasta</Label>
              <Input
                type="date"
                value={filtros.fecha_hasta}
                onChange={(e) => setFiltros(prev => ({ ...prev, fecha_hasta: e.target.value }))}
              />
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          className="rounded-2xl border bg-card shadow-xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {error ? (
            <div className="p-8 text-center">
              <h3 className="text-lg font-semibold text-destructive mb-2">Error al cargar datos</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
          ) : isLoading ? (
            <div className="p-8 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-muted-foreground">Cargando registros PPC...</p>
            </div>
          ) : registros.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin registros PPC</h3>
              <p className="text-muted-foreground mb-4">
                No hay registros de PPC que coincidan con los filtros aplicados
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
                    <TableHead className="font-semibold text-center">Estado</TableHead>
                    <TableHead className="font-semibold text-center">Fecha creación</TableHead>
                    <TableHead className="font-semibold">Observaciones</TableHead>
                    <TableHead className="font-semibold text-center w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                
                <TableBody>
                  {registros.map((registro) => (
                    <TableRow 
                      key={registro.id} 
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="font-medium">{registro.instalacion_id_name}</TableCell>
                      <TableCell>{registro.puesto_operativo_id_name}</TableCell>
                      <TableCell>{registro.rol_servicio_id_name}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getEstadoIcon(registro.estado)}
                          <span className={getEstadoBadge(registro.estado)}>
                            {registro.estado.charAt(0).toUpperCase() + registro.estado.slice(1)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {new Date(registro.fecha_creacion).toLocaleDateString('es-ES')}
                      </TableCell>
                      <TableCell className="max-w-48 truncate">
                        {registro.observaciones || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(registro)}
                            className="h-8 w-8 p-0"
                            title="Editar estado"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {registro.estado === 'pendiente' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAsignarGuardia(registro)}
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-800"
                              title="Asignar guardia"
                            >
                              <Users className="h-4 w-4" />
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

      {/* Formulario de edición */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="capitalize-first">
              Editar registro PPC
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Instalación</Label>
              <Input 
                value={selectedRegistro?.instalacion_id_name || ''} 
                disabled 
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>Puesto operativo</Label>
              <Input 
                value={selectedRegistro?.puesto_operativo_id_name || ''} 
                disabled 
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>Rol de servicio</Label>
              <Input 
                value={selectedRegistro?.rol_servicio_id_name || ''} 
                disabled 
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">
                Estado <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.estado} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, estado: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="cubierto">Cubierto</SelectItem>
                  <SelectItem value="justificado">Justificado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Input
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                placeholder="Comentarios adicionales..."
              />
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
                Actualizar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal para asignar guardia */}
      <Dialog open={isAsignarGuardiaOpen} onOpenChange={setIsAsignarGuardiaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Asignar Guardia
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmitAsignarGuardia} className="space-y-4">
            <div className="space-y-2">
              <Label>Instalación</Label>
              <Input 
                value={asignandoRegistro?.instalacion_id_name || ''} 
                disabled 
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>Puesto operativo</Label>
              <Input 
                value={asignandoRegistro?.puesto_operativo_id_name || ''} 
                disabled 
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>Rol de servicio</Label>
              <Input 
                value={asignandoRegistro?.rol_servicio_id_name || ''} 
                disabled 
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guardia">
                Seleccionar Guardia <span className="text-red-500">*</span>
              </Label>
              <SelectWithSearch
                options={guardias
                  .filter(g => g.estado === 'Activo')
                  .map((guardia) => ({
                    value: guardia.id.toString(),
                    label: `${guardia.nombre} - ${guardia.rut}${guardia.instalacion_id_name ? ` (${guardia.instalacion_id_name})` : ''}`
                  }))}
                value={selectedGuardiaId}
                onValueChange={setSelectedGuardiaId}
                placeholder="Seleccione un guardia..."
                searchPlaceholder="Buscar por nombre o RUT..."
                emptyMessage="No se encontraron guardias."
              />
            </div>

            <DialogFooter className="gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAsignarGuardiaOpen(false)}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !selectedGuardiaId}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <Users className="h-4 w-4 mr-2" />
                Asignar Guardia
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
} 