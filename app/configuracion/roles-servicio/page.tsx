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
  Clock,
  Filter,
  Save,
  X,
  Loader2
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { ToastContainer } from '@/components/ui/toast'

interface RolServicio {
  id: string
  nombre: string
  dias_trabajo: number
  dias_descanso: number
  horas_turno: number
  hora_inicio: string
  hora_termino: string
  estado: string
  created_at: string
  updated_at: string
}

export default function RolesServicioPage() {
  const { success, error: showError, ToastContainer } = useToast()
  
  const [roles, setRoles] = useState<RolServicio[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  
  // Estados para el formulario
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [selectedRol, setSelectedRol] = useState<RolServicio | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Datos del formulario
  const [formData, setFormData] = useState({
    dias_trabajo: 1,
    dias_descanso: 1,
    horas_turno: 8, // Cambiar a valor directo
    hora_inicio: '08:00',
    hora_termino: '16:00',
    estado: 'Activo'
  })

  // Función para calcular horas automáticamente (mantener para referencia)
  const calculateHours = (horaInicio: string, horaTermino: string): number => {
    const [inicioHora, inicioMin] = horaInicio.split(':').map(Number)
    const [terminoHora, terminoMin] = horaTermino.split(':').map(Number)
    
    const inicioMinutos = inicioHora * 60 + inicioMin
    let terminoMinutos = terminoHora * 60 + terminoMin
    
    // Si es turno nocturno (hora inicio > hora término), agregar 24 horas al término
    if (inicioMinutos > terminoMinutos) {
      terminoMinutos += 24 * 60
    }
    
    const diferenciaMinutos = terminoMinutos - inicioMinutos
    return Math.round((diferenciaMinutos / 60) * 10) / 10 // Redondear a 1 decimal
  }

  // Usar horas del formulario directamente
  const horasCalculadas = formData.horas_turno

  // Opciones para horas (00:00 a 23:30 en pasos de 30 min)
  const timeOptions = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour = h.toString().padStart(2, '0')
      const minute = m.toString().padStart(2, '0')
      timeOptions.push(`${hour}:${minute}`)
    }
  }

  // Función para generar el nombre automáticamente
  const generateRoleName = (data: typeof formData, horasCalculadas: number): string => {
    const horaInicioNum = parseFloat(data.hora_inicio.replace(':', '.'))
    const horaTerminoNum = parseFloat(data.hora_termino.replace(':', '.'))
    
    const tipoTurno = horaInicioNum < horaTerminoNum ? 'Día' : 'Noche'
    
    return `${tipoTurno} ${data.dias_trabajo}x${data.dias_descanso}x${horasCalculadas} / ${data.hora_inicio} ${data.hora_termino}`
  }

  const fetchRoles = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/table-data/roles_servicio?limit=100&offset=0&showInactive=${showInactive}`)
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setRoles(data.data || [])
    } catch (error) {
      console.error('Error fetching roles:', error)
      setError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRoles()
  }, [showInactive])

  const handleRefresh = () => {
    fetchRoles()
  }

  const handleCreateNew = () => {
    setFormMode('create')
    setSelectedRol(null)
    setFormData({
      dias_trabajo: 1,
      dias_descanso: 1,
      horas_turno: 8,
      hora_inicio: '08:00',
      hora_termino: '16:00',
      estado: 'Activo'
    })
    setIsFormOpen(true)
  }

  const handleEdit = (rol: RolServicio) => {
    setFormMode('edit')
    setSelectedRol(rol)
    setFormData({
      dias_trabajo: rol.dias_trabajo,
      dias_descanso: rol.dias_descanso,
      horas_turno: rol.horas_turno,
      hora_inicio: rol.hora_inicio,
      hora_termino: rol.hora_termino,
      estado: rol.estado
    })
    setIsFormOpen(true)
  }

  const handleInactivate = async (rol: RolServicio) => {
    if (!confirm(`¿Está seguro de que desea inactivar el rol "${rol.nombre}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/table-data/roles_servicio?id=${rol.id}&action=inactivate`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al inactivar')
      }

      success('Rol inactivado exitosamente')
      handleRefresh()
    } catch (error) {
      console.error('Error inactivating rol:', error)
      showError(error instanceof Error ? error.message : 'Error al inactivar')
    }
  }

  // Función para verificar duplicados
  const checkForDuplicates = (data: typeof formData): boolean => {
    return roles.some(rol => 
      rol.dias_trabajo === data.dias_trabajo &&
      rol.dias_descanso === data.dias_descanso &&
      rol.horas_turno === data.horas_turno &&
      rol.hora_inicio === data.hora_inicio &&
      rol.hora_termino === data.hora_termino &&
      rol.estado === 'Activo' &&
      (formMode === 'create' || rol.id !== selectedRol?.id) // Excluir el registro actual en modo edición
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setIsSubmitting(true)

      // Verificar duplicados antes de enviar
      if (checkForDuplicates(formData)) {
        const nombrePreview = generateRoleName(formData, horasCalculadas)
        showError(`Ya existe un rol activo con estas características: "${nombrePreview}"`)
        setIsSubmitting(false)
        return
      }

      // Generar el nombre automáticamente
      const nombre = generateRoleName(formData, formData.horas_turno)
      
      const submitData = {
        ...formData,
        nombre
      }

      let response: Response
      
      if (formMode === 'create') {
        response = await fetch(`/api/table-data/roles_servicio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData),
        })
      } else if (selectedRol) {
        response = await fetch(`/api/table-data/roles_servicio?id=${selectedRol.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData),
        })
      } else {
        throw new Error('No se encontró el rol a editar')
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error en la operación')
      }

      success(formMode === 'create' ? 'Rol creado exitosamente' : 'Rol actualizado exitosamente')
      setIsFormOpen(false)
      handleRefresh()
    } catch (error) {
      console.error('Error submitting form:', error)
      showError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isInactiveRecord = (rol: RolServicio): boolean => {
    return rol.estado === 'Inactivo'
  }

  // Preview del nombre que se generará
  const previewName = generateRoleName(formData, horasCalculadas)

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
                <Clock className="h-8 w-8 text-primary" />
                Roles de servicio
              </h1>
              <p className="text-muted-foreground mt-2">
                Configuración de roles con horarios y ciclos de trabajo específicos
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
                Nuevo rol
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
                {roles.length} roles {showInactive ? 'totales' : 'activos'}
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
              <p className="text-muted-foreground">Cargando roles de servicio...</p>
            </div>
          ) : roles.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin roles</h3>
              <p className="text-muted-foreground mb-4">
                {showInactive ? 'No hay roles registrados' : 'No hay roles activos'}
              </p>
              <Button onClick={handleCreateNew} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Crear primer rol
              </Button>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Nombre del rol</TableHead>
                    <TableHead className="font-semibold text-center">Ciclo trabajo</TableHead>
                    <TableHead className="font-semibold text-center">Horas turno</TableHead>
                    <TableHead className="font-semibold text-center">Horario</TableHead>
                    <TableHead className="font-semibold text-center">Estado</TableHead>
                    <TableHead className="font-semibold text-center w-32">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                
                <TableBody>
                  {roles.map((rol) => (
                    <TableRow 
                      key={rol.id} 
                      className={`hover:bg-muted/50 transition-colors ${
                        isInactiveRecord(rol) ? 'opacity-60' : ''
                      }`}
                    >
                      <TableCell className="font-medium">{rol.nombre}</TableCell>
                      <TableCell className="text-center">
                        {rol.dias_trabajo}x{rol.dias_descanso}
                      </TableCell>
                      <TableCell className="text-center">
                        {rol.horas_turno}h
                      </TableCell>
                      <TableCell className="text-center">
                        {rol.hora_inicio} - {rol.hora_termino}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          rol.estado === 'Activo' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {rol.estado}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(rol)}
                            className="h-8 w-8 p-0"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!isInactiveRecord(rol) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleInactivate(rol)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="capitalize-first">
              {formMode === 'create' ? 'Crear rol de servicio' : 'Editar rol de servicio'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Preview del nombre generado */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <Label className="text-sm font-medium text-muted-foreground">Nombre que se generará:</Label>
              <p className="text-lg font-semibold mt-1">{previewName}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Configuración: <span className="font-medium">{horasCalculadas} horas por turno</span>
              </p>
            </div>

            {/* Campos del formulario */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dias_trabajo">
                  Días de trabajo <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={formData.dias_trabajo.toString()} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, dias_trabajo: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 30 }, (_, i) => i + 1).map(day => (
                      <SelectItem key={day} value={day.toString()}>
                        {day} {day === 1 ? 'día' : 'días'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dias_descanso">
                  Días de descanso <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={formData.dias_descanso.toString()} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, dias_descanso: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 30 }, (_, i) => i + 1).map(day => (
                      <SelectItem key={day} value={day.toString()}>
                        {day} {day === 1 ? 'día' : 'días'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="horas_turno">
                  Horas turno <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={formData.horas_turno.toString()} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, horas_turno: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(hour => (
                      <SelectItem key={hour} value={hour.toString()}>
                        {hour} {hour === 1 ? 'hora' : 'horas'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hora_inicio">
                  Hora inicio <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={formData.hora_inicio} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, hora_inicio: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    {timeOptions.map(time => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hora_termino">
                Hora término <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.hora_termino} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, hora_termino: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {timeOptions.map(time => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
    </>
  )
} 