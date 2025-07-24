'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Database, Activity, Table, AlertCircle, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface DatabaseInfo {
  version: string
  tables: Array<{ table_name: string; table_type: string }>
  connections: {
    total_connections: number
    active_connections: number
    idle_connections: number
  }
}

interface DatabaseStatusProps {
  compact?: boolean
}

export function DatabaseStatus({ compact = false }: DatabaseStatusProps) {
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDatabaseInfo = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/database-info')
      
      if (!response.ok) {
        throw new Error('Error al obtener información de la base de datos')
      }
      
      const data = await response.json()
      setDbInfo(data)
    } catch (error) {
      console.error('Error:', error)
      setError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDatabaseInfo()
  }, [])

  const isConnected = dbInfo && dbInfo.version && !dbInfo.version.includes('Error')

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="relative flex items-center gap-2 text-sm"
      >
        <Database className="h-4 w-4" />
        <div className={`h-2 w-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`} />
        {!compact && <span className="hidden md:inline">
          {isConnected ? 'BD Conectada' : 'BD Desconectada'}
        </span>}
      </Button>
    )
  }

  return (
    <div className="space-y-4">
      <div 
        className="flex items-center justify-between cursor-pointer p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-medium text-sm">Estado de la Base de Datos</h3>
            <p className="text-xs text-muted-foreground">
              {isLoading ? 'Cargando...' : isConnected ? 'Conectada' : 'Desconectada'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : isConnected ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            {error ? (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={fetchDatabaseInfo}
                >
                  Reintentar
                </Button>
              </div>
            ) : dbInfo && (
              <div className="space-y-3">
                {/* Información de conexiones */}
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-green-700 dark:text-green-400">Activas</span>
                    </div>
                    <p className="font-medium text-green-800 dark:text-green-300">
                      {dbInfo.connections.active_connections}
                    </p>
                  </div>
                  
                  <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3 text-yellow-600" />
                      <span className="text-xs text-yellow-700 dark:text-yellow-400">Inactivas</span>
                    </div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-300">
                      {dbInfo.connections.idle_connections}
                    </p>
                  </div>
                  
                  <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3 text-blue-600" />
                      <span className="text-xs text-blue-700 dark:text-blue-400">Total</span>
                    </div>
                    <p className="font-medium text-blue-800 dark:text-blue-300">
                      {dbInfo.connections.total_connections}
                    </p>
                  </div>
                </div>

                {/* Información de tablas */}
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-2 mb-2">
                    <Table className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Tablas ({dbInfo.tables.length})</span>
                  </div>
                  
                  {dbInfo.tables.length > 0 ? (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {dbInfo.tables.map((table, index) => (
                        <div key={index} className="flex justify-between text-xs">
                          <span className="text-foreground/80">{table.table_name}</span>
                          <span className="text-muted-foreground">{table.table_type}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No hay tablas públicas</p>
                  )}
                </div>

                {/* Botón de actualizar */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchDatabaseInfo}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Actualizando...' : 'Actualizar Estado'}
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 