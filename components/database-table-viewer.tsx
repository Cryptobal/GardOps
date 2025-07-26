'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { 
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { 
  RefreshCw,
  AlertCircle,
  Database,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
  Search,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  GripVertical,
  ExternalLink,
  Plus,
  Edit,
  UserX,
  Filter
} from 'lucide-react'
import { DynamicForm } from '@/components/dynamic-form'
import { useToast } from '@/components/ui/toast'
import { ToastContainer } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface Column {
  column_name: string
  data_type: string
  is_nullable: string
  column_default?: string
}

interface TableData {
  tableName: string
  columns: Column[]
  data: any[]
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
  showInactive: boolean
  timestamp: string
}

interface DatabaseTableViewerProps {
  tableName: string
  title?: string
  description?: string
  initialLimit?: number
}

export function DatabaseTableViewer({ 
  tableName, 
  title, 
  description,
  initialLimit = 10 
}: DatabaseTableViewerProps) {
  const router = useRouter()
  const { success, error: showError, ToastContainer } = useToast()
  
  const [tableData, setTableData] = useState<TableData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [limit, setLimit] = useState(initialLimit)
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  
  // Estados para el formulario
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  
  // Estados para confirmación de eliminación
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchTableData = async (page: number = 0, pageLimit: number = limit, includeInactive: boolean = showInactive) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const offset = page * pageLimit
      const response = await fetch(`/api/table-data/${tableName}?limit=${pageLimit}&offset=${offset}&showInactive=${includeInactive}`)
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setTableData(data)
      setCurrentPage(page)
    } catch (error) {
      console.error('Error fetching table data:', error)
      setError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTableData()
  }, [tableName, showInactive])

  const handleRefresh = () => {
    fetchTableData(currentPage, limit, showInactive)
  }

  const handlePageChange = (newPage: number) => {
    fetchTableData(newPage, limit, showInactive)
  }

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    fetchTableData(0, newLimit, showInactive)
  }

  const handleShowInactiveChange = (checked: boolean) => {
    setShowInactive(checked)
    fetchTableData(0, limit, checked)
  }

  // Funciones CRUD
  const handleCreateNew = () => {
    setFormMode('create')
    setSelectedRecord(null)
    setIsFormOpen(true)
  }

  const handleEdit = (record: any) => {
    setFormMode('edit')
    setSelectedRecord(record)
    setIsFormOpen(true)
  }

  const handleInactivate = (record: any) => {
    setRecordToDelete(record)
    setIsDeleteDialogOpen(true)
  }

  const confirmInactivate = async () => {
    if (!recordToDelete) return

    try {
      setIsDeleting(true)
      
      const response = await fetch(`/api/table-data/${tableName}?id=${recordToDelete.id}&action=inactivate`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al inactivar')
      }

      success('Registro inactivado exitosamente')
      setIsDeleteDialogOpen(false)
      setRecordToDelete(null)
      handleRefresh()
    } catch (error) {
      console.error('Error inactivating record:', error)
      showError(error instanceof Error ? error.message : 'Error al inactivar')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleFormSuccess = () => {
    success(formMode === 'create' ? 'Registro creado exitosamente' : 'Registro actualizado exitosamente')
    handleRefresh()
  }

  // Función para filtrar columnas que no queremos mostrar
  const shouldHideColumn = (column: Column) => {
    const columnName = column.column_name.toLowerCase()
    const dataType = column.data_type.toLowerCase()
    
    // Lista de relaciones importantes que SÍ queremos mostrar
    const importantRelations = [
      'instalacion_id',
      'cliente_id', 
      'guardia_id',
      'usuario_id',
      'empresa_id',
      'puesto_id',
      'turno_id'
    ]

    // Si es una relación importante, NO la ocultamos
    if (importantRelations.includes(columnName)) {
      return false
    }
    
    // Ocultar IDs técnicos, UUIDs, y coordenadas
    return (
      columnName === 'id' ||
      columnName === 'uuid' ||
      columnName.includes('uuid') ||
      dataType.includes('uuid') ||
      columnName.startsWith('fk_') ||
      columnName.endsWith('_ref') ||
      columnName.endsWith('_reference') ||
      columnName === 'lat' ||
      columnName === 'lng' ||
      columnName === 'latitude' ||
      columnName === 'longitude' ||
      // Ocultar columnas de nombres de relación (se usan internamente)
      columnName.endsWith('_name') ||
      // Ocultar otros IDs técnicos no importantes
      (columnName.endsWith('_id') && !importantRelations.includes(columnName))
    )
  }

  // Filtrar columnas visibles
  const visibleColumns = tableData?.columns?.filter(col => !shouldHideColumn(col)) || []
  
  // Ordenar columnas según el orden personalizado
  const orderedColumns = columnOrder.length > 0 
    ? columnOrder
        .map(colName => visibleColumns.find(col => col.column_name === colName))
        .filter(Boolean) as Column[]
    : visibleColumns

  // Inicializar orden de columnas cuando se cargan los datos
  useEffect(() => {
    if (visibleColumns.length > 0 && columnOrder.length === 0) {
      const savedOrder = localStorage.getItem(`columnOrder_${tableName}`)
      if (savedOrder) {
        try {
          const parsed = JSON.parse(savedOrder)
          setColumnOrder(parsed)
        } catch {
          setColumnOrder(visibleColumns.map(col => col.column_name))
        }
      } else {
        setColumnOrder(visibleColumns.map(col => col.column_name))
      }
    }
  }, [visibleColumns, columnOrder.length, tableName])

  // Función para crear enlaces de relación
  const createRelationLink = (columnName: string, relationName: string, originalId: string) => {
    const relationTableMappings: { [key: string]: string } = {
      'instalacion_id': 'instalaciones',
      'cliente_id': 'clientes',
      'guardia_id': 'guardias',
      'usuario_id': 'usuarios',
      'empresa_id': 'empresas',
      'puesto_id': 'puestos',
      'turno_id': 'turnos'
    }

    const targetPage = relationTableMappings[columnName]
    if (!targetPage) return relationName

    return (
      <button
        onClick={() => router.push(`/${targetPage}`)}
        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 
                   underline decoration-dotted hover:decoration-solid transition-all duration-200 
                   flex items-center gap-1 group"
        title={`Ir a ${targetPage} (ID: ${originalId})`}
      >
        <span>{relationName}</span>
        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    )
  }

  const formatCellValue = (value: any, column?: Column, row?: any) => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'boolean') return value ? 'Verdadero' : 'Falso'
    
    // Formatear relaciones - mostrar nombre en lugar de UUID
    if (column?.column_name.endsWith('_id') && row) {
      const relationNameField = `${column.column_name}_name`
      const relationName = row[relationNameField]
      
      if (relationName) {
        return createRelationLink(column.column_name, relationName, value)
      }
      
      // Fallback para UUIDs largos sin nombre
      if (typeof value === 'string' && value.length > 30) {
        return (
          <span className="font-mono text-xs bg-muted px-2 py-1 rounded" title={value}>
            {value.substring(0, 8)}...
          </span>
        )
      }
    }
    
    // Formatear fechas
    if (column?.data_type.includes('timestamp') || column?.data_type.includes('date')) {
      try {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          return date.toLocaleString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })
        }
      } catch (e) {
        // Si falla el parseo, continuar con el formateo normal
      }
    }
    
    if (typeof value === 'object') return JSON.stringify(value)
    if (typeof value === 'string' && value.length > 50) {
      return (
        <span title={value}>
          {value.substring(0, 50)}...
        </span>
      )
    }
    return String(value)
  }

  // Función para formatear nombres de columnas
  const formatColumnName = (columnName: string) => {
    // Mapeo de nombres especiales para relaciones
    const specialNames: { [key: string]: string } = {
      'instalacion_id': 'Instalación',
      'cliente_id': 'Cliente',
      'guardia_id': 'Guardia',
      'usuario_id': 'Usuario',
      'empresa_id': 'Empresa',
      'puesto_id': 'Puesto',
      'turno_id': 'Turno'
    }

    // Si tiene un nombre especial, usarlo
    if (specialNames[columnName.toLowerCase()]) {
      return specialNames[columnName.toLowerCase()]
    }

    // Formateo estándar
    return columnName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  }

  // Funciones para drag and drop
  const handleDragStart = (e: React.DragEvent, columnName: string) => {
    setDraggedColumn(columnName)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, columnName: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnName)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDragEnd = () => {
    setDraggedColumn(null)
    setDragOverColumn(null)
  }

  const handleDrop = (e: React.DragEvent, targetColumnName: string) => {
    e.preventDefault()
    
    if (!draggedColumn || draggedColumn === targetColumnName) {
      setDraggedColumn(null)
      setDragOverColumn(null)
      return
    }

    const newOrder = [...columnOrder]
    const draggedIndex = newOrder.indexOf(draggedColumn)
    const targetIndex = newOrder.indexOf(targetColumnName)

    // Remover columna de su posición actual
    newOrder.splice(draggedIndex, 1)
    // Insertar en nueva posición
    newOrder.splice(targetIndex, 0, draggedColumn)

    setColumnOrder(newOrder)
    localStorage.setItem(`columnOrder_${tableName}`, JSON.stringify(newOrder))
    
    setDraggedColumn(null)
    setDragOverColumn(null)
  }

  const moveColumn = (columnName: string, direction: 'left' | 'right') => {
    const currentIndex = columnOrder.indexOf(columnName)
    if (currentIndex === -1) return

    const newOrder = [...columnOrder]
    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1

    if (newIndex < 0 || newIndex >= newOrder.length) return

    // Intercambiar posiciones
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]]

    setColumnOrder(newOrder)
    localStorage.setItem(`columnOrder_${tableName}`, JSON.stringify(newOrder))
  }

  const resetColumnOrder = () => {
    const defaultOrder = visibleColumns.map(col => col.column_name)
    setColumnOrder(defaultOrder)
    localStorage.removeItem(`columnOrder_${tableName}`)
  }

  // Función para determinar si un registro está inactivo según la tabla
  const isInactiveRecord = (row: any): boolean => {
    if (!row.estado) return false
    
    // Mapeo específico de valores de estado por tabla
    const stateValues: { [key: string]: { active: string; inactive: string } } = {
      'instalaciones': { active: 'Activa', inactive: 'Inactiva' },
      // Para el resto de tablas usar los valores por defecto
      'default': { active: 'Activo', inactive: 'Inactivo' }
    }

    const tableStates = stateValues[tableName] || stateValues['default']
    return row.estado === tableStates.inactive
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
                <Database className="h-8 w-8 text-primary" />
                {title || tableName}
              </h1>
              <p className="text-muted-foreground mt-2">
                {description || `Gestión de ${tableName}`}
              </p>
              {orderedColumns.length > 1 && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <GripVertical className="h-3 w-3" />
                  Arrastra las columnas para reordenarlas o usa las flechas
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={handleCreateNew}
                variant="default"
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nuevo
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
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Mostrar:</span>
              <select
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="px-2 py-1 text-sm border rounded bg-background"
              >
                <option value={5}>5 filas</option>
                <option value={10}>10 filas</option>
                <option value={25}>25 filas</option>
                <option value={50}>50 filas</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Incluir inactivos:</span>
              <Switch
                checked={showInactive}
                onCheckedChange={handleShowInactiveChange}
              />
            </div>
            
            {tableData && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  {orderedColumns.length} columnas visibles • {tableData?.pagination?.total || 0} registros {showInactive ? 'totales' : 'activos'}
                </span>
                {(tableData?.columns?.length || 0) > orderedColumns.length && (
                  <span className="px-2 py-1 rounded text-xs bg-muted border">
                    {(tableData?.columns?.length || 0) - orderedColumns.length} columnas ocultas (IDs, UUIDs)
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {orderedColumns.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetColumnOrder}
                className="flex items-center gap-1"
                title="Restablecer orden de columnas"
              >
                <RotateCcw className="h-3 w-3" />
                <span className="text-xs">Resetear orden</span>
              </Button>
            )}
            
            {tableData && (tableData?.pagination?.total || 0) > limit && (
              <>
                <div className="h-4 w-px bg-border mx-2" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="text-sm px-2">
                  Página {currentPage + 1} de {Math.ceil((tableData?.pagination?.total || 0) / limit)}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!tableData?.pagination?.hasMore}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
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
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-destructive mb-2">
                {error?.includes('no existe') ? 'Tabla no encontrada' : 'Error al cargar datos'}
              </h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              {error && !error.includes('no existe') && (
                <Button onClick={handleRefresh} variant="outline">
                  Reintentar
                </Button>
              )}
              {error?.includes('no existe') && (
                <p className="text-xs text-muted-foreground">
                  Esta tabla aún no ha sido creada en la base de datos
                </p>
              )}
            </div>
          ) : isLoading ? (
            <div className="p-8 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-muted-foreground">Cargando datos de {tableName}...</p>
            </div>
          ) : tableData?.data.length === 0 ? (
            <div className="p-8 text-center">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin datos</h3>
              <p className="text-muted-foreground mb-4">
                {showInactive ? 'No hay registros en esta tabla' : 'No hay registros activos'}
              </p>
              <Button onClick={handleCreateNew} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Crear primer registro
              </Button>
            </div>
          ) : tableData ? (
            <div className="overflow-auto max-h-[600px] border rounded-lg shadow-sm table-container">
              <Table className="relative table-improved">
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow className="border-b border-border">
                    {orderedColumns.map((column, index) => (
                      <TableHead 
                        key={column.column_name} 
                        className={`whitespace-nowrap cursor-move select-none font-semibold text-sm ${
                          draggedColumn === column.column_name ? 'opacity-50' : ''
                        } ${
                          dragOverColumn === column.column_name ? 'bg-accent' : ''
                        } ${
                          // Alineación del header según tipo de datos
                          column.data_type.includes('integer') || 
                          column.data_type.includes('numeric') || 
                          column.data_type.includes('decimal') ||
                          column.data_type.includes('money')
                            ? 'text-right table-numeric' 
                            : column.data_type.includes('timestamp') || 
                              column.data_type.includes('date')
                            ? 'text-center table-date'
                            : 'text-left'
                        } px-4 py-3 bg-background border-b`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, column.column_name)}
                        onDragOver={(e) => handleDragOver(e, column.column_name)}
                        onDragLeave={handleDragLeave}
                        onDragEnd={handleDragEnd}
                        onDrop={(e) => handleDrop(e, column.column_name)}
                      >
                        <div className="flex items-center gap-2 group">
                          <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex items-center gap-1">
                            <span className="font-medium capitalize-first">
                              {formatColumnName(column.column_name)}
                              {column.is_nullable === 'NO' && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {index > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={() => moveColumn(column.column_name, 'left')}
                                title="Mover a la izquierda"
                              >
                                <ArrowLeft className="h-3 w-3" />
                              </Button>
                            )}
                            {index < orderedColumns.length - 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={() => moveColumn(column.column_name, 'right')}
                                title="Mover a la derecha"
                              >
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="w-32 px-4 py-3 text-center font-semibold text-sm bg-background border-b">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                
                <TableBody>
                  {tableData?.data?.map((row, rowIndex) => (
                    <TableRow 
                      key={rowIndex} 
                      className={`hover:bg-muted/50 transition-colors ${
                        isInactiveRecord(row) ? 'table-row-inactive' : ''
                      }`}
                    >
                      {orderedColumns.map((column) => (
                        <TableCell 
                          key={column.column_name} 
                          className={`whitespace-nowrap text-sm ${
                            // Alineación según tipo de datos usando las nuevas clases
                            column.data_type.includes('integer') || 
                            column.data_type.includes('numeric') || 
                            column.data_type.includes('decimal') ||
                            column.data_type.includes('money')
                              ? 'table-numeric' 
                              : column.data_type.includes('timestamp') || 
                                column.data_type.includes('date')
                              ? 'table-date'
                              : 'text-left'
                          } px-4 py-3`}
                        >
                          {formatCellValue(row[column.column_name], column, row)}
                        </TableCell>
                      ))}
                      <TableCell className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(row)}
                            className="h-8 w-8 p-0"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!isInactiveRecord(row) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleInactivate(row)}
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
          ) : null}
          
          {tableData && (tableData?.data?.length || 0) > 0 && (
            <div className="p-4 border-t bg-muted/20">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div>
                  Mostrando {currentPage * limit + 1} - {Math.min((currentPage + 1) * limit, tableData?.pagination?.total || 0)} de {tableData?.pagination?.total || 0} registros {showInactive ? 'totales' : 'activos'}
                </div>
                <div>
                  Última actualización: {tableData?.timestamp ? new Date(tableData?.timestamp).toLocaleString('es-ES') : 'No disponible'}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Formulario dinámico */}
      <DynamicForm
        tableName={tableName}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
        mode={formMode}
        initialData={selectedRecord}
        title={formMode === 'create' ? `Crear ${title || tableName}` : `Editar ${title || tableName}`}
      />

      {/* Diálogo de confirmación de inactivación */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Confirmar inactivación"
        description="¿Está seguro de que desea inactivar este registro?"
        confirmText="Inactivar"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={confirmInactivate}
        loading={isDeleting}
      />
    </>
  )
} 