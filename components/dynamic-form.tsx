'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2, Save, X, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface SchemaField {
  column_name: string
  data_type: string
  is_nullable: string
  column_default?: string
  character_maximum_length?: number
}

interface DynamicFormProps {
  tableName: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  mode: 'create' | 'edit'
  initialData?: Record<string, any>
  title?: string
}

export function DynamicForm({
  tableName,
  isOpen,
  onClose,
  onSuccess,
  mode,
  initialData = {},
  title
}: DynamicFormProps) {
  const [schema, setSchema] = useState<SchemaField[]>([])
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Campos que no se deben mostrar en el formulario
  const hiddenFields = [
    'id',
    'uuid',
    'created_at',
    'updated_at',
    'lat',
    'lng',
    'latitude',
    'longitude'
  ]

  // Cargar esquema de la tabla
  useEffect(() => {
    if (isOpen && tableName) {
      loadTableSchema()
    }
  }, [isOpen, tableName])

  // Inicializar datos del formulario
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData(initialData)
    } else {
      // Determinar el valor de estado por defecto según la tabla
      const defaultActiveState = tableName === 'instalaciones' ? 'Activa' : 'Activo'
      setFormData({ estado: defaultActiveState })
    }
  }, [mode, initialData, tableName])

  const loadTableSchema = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/table-schema/${tableName}`)
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setSchema(data.schema || [])
    } catch (error) {
      console.error('Error cargando esquema:', error)
      setError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsSubmitting(true)
      setError(null)

      // Preparar datos para enviar (filtrar campos vacíos y ocultos)
      const submitData = Object.fromEntries(
        Object.entries(formData).filter(([key, value]) => 
          !hiddenFields.includes(key) && 
          value !== '' && 
          value !== null && 
          value !== undefined
        )
      )

      let response: Response
      
      if (mode === 'create') {
        response = await fetch(`/api/table-data/${tableName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData),
        })
      } else {
        response = await fetch(`/api/table-data/${tableName}?id=${initialData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData),
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error en la operación')
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error enviando formulario:', error)
      setError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = () => {
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    try {
      setIsDeleting(true)
      setError(null)

      const response = await fetch(`/api/table-data/${tableName}?id=${initialData.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar')
      }

      setIsDeleteDialogOpen(false)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error eliminando registro:', error)
      setError(error instanceof Error ? error.message : 'Error al eliminar')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleInputChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }))
  }

  const formatFieldName = (fieldName: string) => {
    // Mapeo de nombres especiales
    const specialNames: { [key: string]: string } = {
      'instalacion_id': 'Instalación',
      'cliente_id': 'Cliente',
      'guardia_id': 'Guardia',
      'usuario_id': 'Usuario',
      'empresa_id': 'Empresa',
      'puesto_id': 'Puesto',
      'turno_id': 'Turno',
      'estado': 'Estado'
    }

    if (specialNames[fieldName.toLowerCase()]) {
      return specialNames[fieldName.toLowerCase()]
    }

    return fieldName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  }

  const getFieldType = (field: SchemaField): 'text' | 'number' | 'email' | 'textarea' | 'select' | 'date' => {
    const columnName = field.column_name.toLowerCase()
    const dataType = field.data_type.toLowerCase()

    // Campo estado siempre es select
    if (columnName === 'estado') return 'select'

    // Campos de email
    if (columnName.includes('email') || columnName.includes('correo')) return 'email'

    // Campos de texto largo
    if (columnName.includes('descripcion') || 
        columnName.includes('observacion') || 
        columnName.includes('nota') ||
        columnName.includes('comentario') ||
        field.character_maximum_length && field.character_maximum_length > 255) {
      return 'textarea'
    }

    // Campos numéricos
    if (dataType.includes('integer') || 
        dataType.includes('numeric') || 
        dataType.includes('decimal') ||
        dataType.includes('money')) {
      return 'number'
    }

    // Campos de fecha
    if (dataType.includes('timestamp') || 
        dataType.includes('date') || 
        dataType.includes('time')) {
      return 'date'
    }

    return 'text'
  }

  const renderField = (field: SchemaField) => {
    const fieldName = field.column_name
    const fieldType = getFieldType(field)
    const isRequired = field.is_nullable === 'NO' && !field.column_default
    const value = formData[fieldName] || ''

    if (hiddenFields.includes(fieldName)) {
      return null
    }

    // Determinar opciones de estado según la tabla
    const getStateOptions = () => {
      if (tableName === 'instalaciones') {
        return [
          { value: 'Activa', label: 'Activa' },
          { value: 'Inactiva', label: 'Inactiva' }
        ]
      } else {
        return [
          { value: 'Activo', label: 'Activo' },
          { value: 'Inactivo', label: 'Inactivo' }
        ]
      }
    }

    return (
      <div key={fieldName} className="space-y-2">
        <Label htmlFor={fieldName}>
          {formatFieldName(fieldName)}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </Label>
        
        {fieldType === 'select' && fieldName === 'estado' ? (
          <Select value={value} onValueChange={(val) => handleInputChange(fieldName, val)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              {getStateOptions().map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : fieldType === 'textarea' ? (
          <Textarea
            id={fieldName}
            value={value}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            placeholder={`Ingrese ${formatFieldName(fieldName).toLowerCase()}`}
            required={isRequired}
            rows={4}
          />
        ) : (
          <Input
            id={fieldName}
            type={fieldType}
            value={value}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            placeholder={`Ingrese ${formatFieldName(fieldName).toLowerCase()}`}
            required={isRequired}
          />
        )}
      </div>
    )
  }

  const visibleFields = schema.filter(field => !hiddenFields.includes(field.column_name))

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="capitalize-first">
            {title || `${mode === 'create' ? 'Crear' : 'Editar'} ${tableName}`}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive"
          >
            {error}
          </motion.div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Cargando formulario...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleFields.map(renderField)}
            </div>

            <DialogFooter className="gap-2">
              <div className="flex justify-between w-full">
                {/* Botón eliminar solo en modo edición */}
                {mode === 'edit' && (
                  <Button 
                    type="button" 
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting || isSubmitting}
                    className="mr-auto"
                  >
                    {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                )}
                
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onClose}
                    disabled={isSubmitting || isDeleting}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || isDeleting}
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    <Save className="h-4 w-4 mr-2" />
                    {mode === 'create' ? 'Crear' : 'Actualizar'}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={isDeleteDialogOpen}
      onOpenChange={setIsDeleteDialogOpen}
      title="Confirmar eliminación"
      description="¿Está seguro de que desea eliminar este registro permanentemente?"
      confirmText="Eliminar definitivamente"
      cancelText="Cancelar"
      variant="destructive"
      onConfirm={confirmDelete}
      loading={isDeleting}
    />
    </>
  )
} 