"use client"

import React, { useState, useEffect } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UbicacionAutocomplete } from '@/components/UbicacionAutocomplete'
import { useAlertDialog } from '@/components/ui/alert-dialog'
import { Loader2, X, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GuardiaFormData {
  nombre: string
  apellido_paterno: string
  apellido_materno: string
  rut: string
  fecha_nacimiento: string
  celular: string
  instalacion_id: string
  jornada: string
  direccion: string
  lat: number | null
  lng: number | null
  comuna: string
  ciudad: string
  banco_id: string
  tipo_cuenta: string
  salud_id: string
  afp_id: string
  email: string
  estado: string
}

interface Instalacion {
  id: string
  nombre: string
}

interface AFP {
  id: string
  nombre: string
}

interface Isapre {
  id: string
  nombre: string
}

interface Banco {
  id: string
  codigo: string
  nombre: string
}

interface GuardiaFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void  // Cambiar de onClose a onOpenChange
  editData?: any
  onSuccess?: () => void
}

  const initialFormData: GuardiaFormData = {
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    rut: '',
    fecha_nacimiento: '',
    celular: '',
    instalacion_id: '',
    jornada: '',
    direccion: '',
    lat: null,
    lng: null,
    comuna: '',
    ciudad: '',
    banco_id: '',
    tipo_cuenta: '',
    salud_id: '',
    afp_id: '',
    email: '',
    estado: 'Activo'
  }

// Validaciones
const validateRut = (rut: string): boolean => {
  const rutRegex = /^\d{7,8}-[\dKk]$/
  return rutRegex.test(rut)
}

const validateCelular = (celular: string): boolean => {
  const celularRegex = /^[56]\d{8}$/
  return celularRegex.test(celular)
}

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Componente de mapa simple
const MapPreview = ({ lat, lng }: { lat?: number | null, lng?: number | null }) => {
  if (!lat || !lng) {
    return (
      <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/25">
        <div className="text-center text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">Selecciona una ubicación para ver el mapa</p>
        </div>
      </div>
    )
  }

  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=400x300&markers=color:red%7C${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`

  return (
    <div className="w-full h-48 bg-muted rounded-lg overflow-hidden border">
      <img 
        src={mapUrl} 
        alt="Ubicación en el mapa" 
        className="w-full h-full object-cover"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
          e.currentTarget.nextElementSibling?.classList.remove('hidden')
        }}
      />
      <div className="hidden w-full h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <MapPin className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">No se pudo cargar el mapa</p>
        </div>
      </div>
    </div>
  )
}

export function GuardiaForm({ open, onOpenChange, editData, onSuccess }: GuardiaFormProps) {
  const [formData, setFormData] = useState<GuardiaFormData>(initialFormData)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Estado para opciones de selects
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([])
  const [afps, setAfps] = useState<AFP[]>([])
  const [isapres, setIsapres] = useState<Isapre[]>([])
  const [bancos, setBancos] = useState<Banco[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  // Hook para alertas modernas
  const { showError, showSuccess, AlertDialog } = useAlertDialog()

  // Opciones estáticas
  const tiposCuenta = [
    'cuenta corriente',
    'cuenta vista', 
    'cuenta ahorro',
    'cuenta rut'
  ]

  const estadosOptions = ['Activo', 'Inactivo']

  // Cargar opciones de selects
  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true)
      try {
        const [instalacionesRes, afpsRes, isapresRes, bancosRes] = await Promise.all([
          fetch('/api/instalaciones?estado=Activa'),
          fetch('/api/afps'),
          fetch('/api/isapres'),
          fetch('/api/bancos')
        ])

        const [instalacionesData, afpsData, isapresData, bancosData] = await Promise.all([
          instalacionesRes.json(),
          afpsRes.json(),
          isapresRes.json(),
          bancosRes.json()
        ])

        if (instalacionesData.success) {
          console.log('Instalaciones cargadas:', instalacionesData.data?.length || 0)
          setInstalaciones(instalacionesData.data || [])
        } else {
          console.error('Error cargando instalaciones:', instalacionesData)
        }
        
        if (afpsData.success) {
          console.log('AFPs cargadas:', afpsData.data?.length || 0)
          setAfps(afpsData.data || [])
        } else {
          console.error('Error cargando AFPs:', afpsData)
        }
        
        if (isapresData.success) {
          console.log('ISAPREs cargadas:', isapresData.data?.length || 0)
          setIsapres(isapresData.data || [])
        } else {
          console.error('Error cargando ISAPREs:', isapresData)
        }
        
        if (bancosData.success) {
          console.log('Bancos cargados:', bancosData.data?.length || 0)
          setBancos(bancosData.data || [])
        } else {
          console.error('Error cargando bancos:', bancosData)
        }
      } catch (error) {
        console.error('Error cargando opciones:', error)
      } finally {
        setLoadingOptions(false)
      }
    }

    if (open) {
      loadOptions()
    }
  }, [open])

  // Resetear formulario cuando se abre/cierra
  useEffect(() => {
    if (open) {
      if (editData) {
        // Limpiar datos nulos o undefined
        const cleanedData = Object.keys(editData).reduce((acc, key) => {
          const value = editData[key]
          if (value === null || value === undefined) {
            acc[key] = ''
          } else {
            acc[key] = value
          }
          return acc
        }, {} as any)
        
        setFormData(prev => ({ ...prev, ...cleanedData }))
      } else {
        setFormData(initialFormData)
      }
      setErrors({})
    }
  }, [open, editData])

  const handleInputChange = (field: keyof GuardiaFormData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Limpiar error del campo cuando se modifica
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleUbicacionSelect = (ubicacion: { direccion: string, lat: number, lng: number, comuna: string, ciudad: string }) => {
    setFormData(prev => ({
      ...prev,
      direccion: ubicacion.direccion,
      lat: ubicacion.lat,
      lng: ubicacion.lng,
      comuna: ubicacion.comuna,
      ciudad: ubicacion.ciudad
    }))
  }

  // Helper para verificar si un campo está vacío (maneja null, undefined y strings vacíos)
  const isEmpty = (value: any): boolean => {
    return !value || (typeof value === 'string' && !value.trim())
  }

  const getValidationErrors = (): Record<string, string> => {
    const newErrors: Record<string, string> = {}

    // Campos obligatorios
    if (isEmpty(formData.nombre)) newErrors.nombre = 'Nombre es obligatorio'
    if (isEmpty(formData.apellido_paterno)) newErrors.apellido_paterno = 'Apellido paterno es obligatorio'
    if (isEmpty(formData.apellido_materno)) newErrors.apellido_materno = 'Apellido materno es obligatorio'
    if (isEmpty(formData.rut)) newErrors.rut = 'RUT es obligatorio'
    if (isEmpty(formData.fecha_nacimiento)) newErrors.fecha_nacimiento = 'Fecha de nacimiento es obligatoria'
    if (isEmpty(formData.celular)) newErrors.celular = 'Celular es obligatorio'
    if (isEmpty(formData.instalacion_id)) newErrors.instalacion_id = 'Instalación es obligatoria'
    if (isEmpty(formData.jornada)) newErrors.jornada = 'Jornada es obligatoria'
    if (isEmpty(formData.direccion)) newErrors.direccion = 'Dirección es obligatoria'
    if (isEmpty(formData.banco_id)) newErrors.banco_id = 'Banco es obligatorio'
    if (isEmpty(formData.tipo_cuenta)) newErrors.tipo_cuenta = 'Tipo de cuenta es obligatorio'
    if (isEmpty(formData.salud_id)) newErrors.salud_id = 'Salud es obligatoria'
    if (isEmpty(formData.afp_id)) newErrors.afp_id = 'AFP es obligatoria'
    if (isEmpty(formData.email)) newErrors.email = 'Email es obligatorio'
    if (isEmpty(formData.estado)) newErrors.estado = 'Estado es obligatorio'

    // Validaciones específicas
    if (formData.rut && !validateRut(formData.rut)) {
      newErrors.rut = 'RUT debe tener formato: 12345678-9'
    }
    
    if (formData.celular && !validateCelular(formData.celular)) {
      newErrors.celular = 'Celular debe empezar por 5 o 6 y tener 9 dígitos'
    }
    
    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Email debe tener formato válido'
    }

    return newErrors
  }

  const validateForm = (): boolean => {
    const newErrors = getValidationErrors()
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    // Validar y obtener errores directamente
    const validationErrors = getValidationErrors()
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      
      // Mostrar alerta con los campos faltantes
      const errorMessages = Object.values(validationErrors).filter(Boolean)
      const firstErrors = errorMessages.slice(0, 3) // Mostrar solo los primeros 3 errores
      let message = `Por favor, complete los siguientes campos:\n\n• ${firstErrors.join('\n• ')}`
      if (errorMessages.length > 3) {
        message += `\n\n... y ${errorMessages.length - 3} más`
      }
      
      showError(message, 'Campos obligatorios')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/guardias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.success) {
        showSuccess("Guardia creado con éxito")
        console.log("Guardia creado con éxito")
        onSuccess?.()
        onOpenChange(false)
      } else {
        console.error('Error:', result.error)
        showError(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error al guardar guardia:', error)
      showError('Error al guardar guardia')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent side="right" className="dark:bg-black w-full sm:max-w-2xl h-full overflow-y-auto">
          <DrawerHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle>
                  {editData ? 'Editar Guardia' : 'Nuevo Guardia'}
                </DrawerTitle>
                <DrawerDescription>
                  Complete todos los campos para {editData ? 'actualizar' : 'crear'} el guardia
                </DrawerDescription>
              </div>
              {/* Eliminar el botón de cierre duplicado - DrawerContent ya incluye uno automáticamente */}
            </div>
          </DrawerHeader>

          <div className="flex-1 p-6 space-y-6">
            {loadingOptions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Cargando opciones...</span>
              </div>
            ) : (
              <>
                {/* Información Personal */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Información Personal</h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="nombre">Nombre *</Label>
                      <Input
                        id="nombre"
                        value={formData.nombre}
                        onChange={(e) => handleInputChange('nombre', e.target.value)}
                        placeholder="Ingrese el nombre"
                        className={errors.nombre ? 'border-red-500' : ''}
                      />
                      {errors.nombre && <p className="text-sm text-red-500 mt-1">{errors.nombre}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="apellido_paterno">Apellido Paterno *</Label>
                        <Input
                          id="apellido_paterno"
                          value={formData.apellido_paterno}
                          onChange={(e) => handleInputChange('apellido_paterno', e.target.value)}
                          placeholder="Apellido paterno"
                          className={errors.apellido_paterno ? 'border-red-500' : ''}
                        />
                        {errors.apellido_paterno && <p className="text-sm text-red-500 mt-1">{errors.apellido_paterno}</p>}
                      </div>

                      <div>
                        <Label htmlFor="apellido_materno">Apellido Materno *</Label>
                        <Input
                          id="apellido_materno"
                          value={formData.apellido_materno}
                          onChange={(e) => handleInputChange('apellido_materno', e.target.value)}
                          placeholder="Apellido materno"
                          className={errors.apellido_materno ? 'border-red-500' : ''}
                        />
                        {errors.apellido_materno && <p className="text-sm text-red-500 mt-1">{errors.apellido_materno}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="rut">RUT *</Label>
                        <Input
                          id="rut"
                          value={formData.rut}
                          onChange={(e) => handleInputChange('rut', e.target.value)}
                          placeholder="12345678-9"
                          className={errors.rut ? 'border-red-500' : ''}
                        />
                        {errors.rut && <p className="text-sm text-red-500 mt-1">{errors.rut}</p>}
                      </div>

                      <div>
                        <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento *</Label>
                        <Input
                          id="fecha_nacimiento"
                          type="date"
                          value={formData.fecha_nacimiento}
                          onChange={(e) => handleInputChange('fecha_nacimiento', e.target.value)}
                          className={errors.fecha_nacimiento ? 'border-red-500' : ''}
                        />
                        {errors.fecha_nacimiento && <p className="text-sm text-red-500 mt-1">{errors.fecha_nacimiento}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="celular">Celular *</Label>
                        <Input
                          id="celular"
                          value={formData.celular}
                          onChange={(e) => handleInputChange('celular', e.target.value)}
                          placeholder="569XXXXXXXX"
                          className={errors.celular ? 'border-red-500' : ''}
                        />
                        {errors.celular && <p className="text-sm text-red-500 mt-1">{errors.celular}</p>}
                      </div>

                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          placeholder="correo@ejemplo.com"
                          className={errors.email ? 'border-red-500' : ''}
                        />
                        {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Información Laboral */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Información Laboral</h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="instalacion_id">Instalación *</Label>
                      <Select value={formData.instalacion_id} onValueChange={(value) => handleInputChange('instalacion_id', value)}>
                        <SelectTrigger className={errors.instalacion_id ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Seleccione una instalación" />
                        </SelectTrigger>
                        <SelectContent>
                          {instalaciones.map((instalacion) => (
                            <SelectItem key={instalacion.id} value={instalacion.id}>
                              {instalacion.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.instalacion_id && <p className="text-sm text-red-500 mt-1">{errors.instalacion_id}</p>}
                    </div>

                    <div>
                      <Label htmlFor="jornada">Jornada *</Label>
                      <Input
                        id="jornada"
                        value={formData.jornada}
                        onChange={(e) => handleInputChange('jornada', e.target.value)}
                        placeholder="Ej: Diurno, Nocturno, 12x12"
                        className={errors.jornada ? 'border-red-500' : ''}
                      />
                      {errors.jornada && <p className="text-sm text-red-500 mt-1">{errors.jornada}</p>}
                    </div>

                    <div>
                      <Label htmlFor="estado">Estado *</Label>
                      <Select value={formData.estado} onValueChange={(value) => handleInputChange('estado', value)}>
                        <SelectTrigger className={errors.estado ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Seleccione estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {estadosOptions.map((estado) => (
                            <SelectItem key={estado} value={estado}>
                              {estado}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.estado && <p className="text-sm text-red-500 mt-1">{errors.estado}</p>}
                    </div>
                  </div>
                </div>

                {/* Ubicación */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Ubicación</h3>
                  
                  <div>
                    <Label>Dirección *</Label>
                    <UbicacionAutocomplete
                      value={formData.direccion}
                      onSelect={handleUbicacionSelect}
                      placeholder="Buscar dirección..."
                      error={errors.direccion}
                    />
                    {errors.direccion && <p className="text-sm text-red-500 mt-1">{errors.direccion}</p>}
                  </div>

                  {/* Previsualización del mapa */}
                  <div>
                    <Label>Previsualización del Mapa</Label>
                    <MapPreview lat={formData.lat} lng={formData.lng} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="lat">Latitud</Label>
                      <Input
                        id="lat"
                        value={formData.lat || ''}
                        readOnly
                        placeholder="Automático"
                        className="bg-muted"
                      />
                    </div>

                    <div>
                      <Label htmlFor="lng">Longitud</Label>
                      <Input
                        id="lng"
                        value={formData.lng || ''}
                        readOnly
                        placeholder="Automático"
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="comuna">Comuna</Label>
                      <Input
                        id="comuna"
                        value={formData.comuna}
                        readOnly
                        placeholder="Automático"
                        className="bg-muted"
                      />
                    </div>

                    <div>
                      <Label htmlFor="ciudad">Ciudad</Label>
                      <Input
                        id="ciudad"
                        value={formData.ciudad}
                        readOnly
                        placeholder="Automático"
                        className="bg-muted"
                      />
                    </div>
                  </div>
                </div>

                {/* Información Bancaria y Previsional */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Información Bancaria y Previsional</h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="banco">Banco *</Label>
                      <Select value={formData.banco_id} onValueChange={(value) => handleInputChange('banco_id', value)}>
                        <SelectTrigger className={errors.banco_id ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Seleccione un banco" />
                        </SelectTrigger>
                        <SelectContent>
                          {bancos.map((banco) => (
                            <SelectItem key={banco.id} value={banco.id}>
                              {banco.codigo} - {banco.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.banco_id && <p className="text-sm text-red-500 mt-1">{errors.banco_id}</p>}
                    </div>

                    <div>
                      <Label htmlFor="tipo_cuenta">Tipo de Cuenta *</Label>
                      <Select value={formData.tipo_cuenta} onValueChange={(value) => handleInputChange('tipo_cuenta', value)}>
                        <SelectTrigger className={errors.tipo_cuenta ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Seleccione tipo de cuenta" />
                        </SelectTrigger>
                        <SelectContent>
                          {tiposCuenta.map((tipo) => (
                            <SelectItem key={tipo} value={tipo}>
                              {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.tipo_cuenta && <p className="text-sm text-red-500 mt-1">{errors.tipo_cuenta}</p>}
                    </div>

                    <div>
                      <Label htmlFor="salud">Salud *</Label>
                      <Select value={formData.salud_id} onValueChange={(value) => handleInputChange('salud_id', value)}>
                        <SelectTrigger className={errors.salud_id ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Seleccione sistema de salud" />
                        </SelectTrigger>
                        <SelectContent>
                          {isapres.map((isapre) => (
                            <SelectItem key={isapre.id} value={isapre.id}>
                              {isapre.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.salud_id && <p className="text-sm text-red-500 mt-1">{errors.salud_id}</p>}
                    </div>

                    <div>
                      <Label htmlFor="afp">AFP *</Label>
                      <Select value={formData.afp_id} onValueChange={(value) => handleInputChange('afp_id', value)}>
                        <SelectTrigger className={errors.afp_id ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Seleccione AFP" />
                        </SelectTrigger>
                        <SelectContent>
                          {afps.map((afp) => (
                            <SelectItem key={afp.id} value={afp.id}>
                              {afp.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.afp_id && <p className="text-sm text-red-500 mt-1">{errors.afp_id}</p>}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <DrawerFooter className="border-t">
            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={isLoading || loadingOptions}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Guardia'
                )}
              </Button>
              <Button 
                variant="outline" 
                disabled={isLoading}
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      
      {/* Componente de alerta moderna */}
      <AlertDialog />
    </>
  )
}
