"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  Database,
  Table,
  RefreshCw,
  AlertCircle,
  Settings,
  ChevronRight,
  Users,
  Building,
  Shield
} from 'lucide-react'

interface TableInfo {
  table_name: string
  table_type: string
  record_count?: number
  exists?: boolean
  error?: string
}

interface DatabaseInfo {
  version: string
  tables: TableInfo[]
  connections: {
    total_connections: number
    active_connections: number
    idle_connections: number
  }
}

interface AvailableTablesResponse {
  tables: TableInfo[]
  total_tables: number
  accessible_tables: number
  timestamp: string
}

const pageMapping: Record<string, { title: string; description: string; icon: any; href: string }> = {
  'clientes': {
    title: 'Clientes',
    description: 'Gestión de clientes y contactos',
    icon: Users,
    href: '/clientes'
  },
  'instalaciones': {
    title: 'Instalaciones',
    description: 'Gestión de instalaciones y ubicaciones',
    icon: Building,
    href: '/instalaciones'
  },
  'guardias': {
    title: 'Guardias',
    description: 'Gestión de guardias de seguridad',
    icon: Shield,
    href: '/guardias'
  },
  'asignaciones': {
    title: 'Asignaciones',
    description: 'Configuración de asignaciones de personal',
    icon: Settings,
    href: '/configuracion/asignaciones'
  },
  'puestos_operativos': {
    title: 'Puestos Operativos',
    description: 'Configuración de puestos operativos',
    icon: Settings,
    href: '/configuracion/puestos-operativos'
  },
  'pautas_servicio': {
    title: 'Pautas de Servicio',
    description: 'Configuración de pautas y protocolos',
    icon: Settings,
    href: '/configuracion/pautas-servicio'
  }
}

export default function ConfiguracionPage() {
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null)
  const [availableTables, setAvailableTables] = useState<AvailableTablesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDatabaseInfo = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Obtener información básica de la BD
      const [dbResponse, tablesResponse] = await Promise.all([
        fetch('/api/database-info'),
        fetch('/api/available-tables')
      ])
      
      if (!dbResponse.ok || !tablesResponse.ok) {
        throw new Error('Error al obtener información de la base de datos')
      }
      
      const [dbData, tablesData] = await Promise.all([
        dbResponse.json(),
        tablesResponse.json()
      ])
      
      setDbInfo(dbData)
      setAvailableTables(tablesData)
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

  return (
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
              <Settings className="h-8 w-8 text-primary" />
              Configuración del Sistema
            </h1>
            <p className="text-muted-foreground mt-2">
              Gestión de configuración y base de datos
            </p>
          </div>
          
          <Button
            onClick={fetchDatabaseInfo}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </motion.div>

      {/* Database Status */}
      <motion.div
        className="p-6 rounded-2xl border bg-card shadow-xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Database className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold capitalize-first">Estado de la Base de Datos</h2>
        </div>
        
        {error ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive">{error}</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">Cargando información...</p>
          </div>
        ) : dbInfo ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="text-sm text-green-700 dark:text-green-400">Conexiones Activas</div>
                <div className="text-2xl font-bold text-green-800 dark:text-green-300">
                  {dbInfo.connections.active_connections}
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="text-sm text-blue-700 dark:text-blue-400">Total Conexiones</div>
                <div className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                  {dbInfo.connections.total_connections}
                </div>
              </div>
              
                             <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                 <div className="text-sm text-purple-700 dark:text-purple-400">Tablas Disponibles</div>
                 <div className="text-2xl font-bold text-purple-800 dark:text-purple-300">
                   {availableTables?.accessible_tables || dbInfo.tables.length}
                   {availableTables && (
                     <span className="text-sm font-normal">
                       /{availableTables.total_tables}
                     </span>
                   )}
                 </div>
               </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Versión: {dbInfo.version.split(' ')[0]} {dbInfo.version.split(' ')[1]}
            </div>
          </div>
        ) : null}
      </motion.div>

      {/* Available Tables */}
      {dbInfo && (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
                     <h2 className="text-xl font-semibold capitalize-first flex items-center gap-2">
             <Table className="h-5 w-5 text-primary" />
             Tablas Disponibles ({availableTables?.accessible_tables || dbInfo.tables.length})
           </h2>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {(availableTables?.tables || dbInfo.tables).map((table, index) => {
               const mappedPage = pageMapping[table.table_name]
               const Icon = mappedPage?.icon || Table
               const isAccessible = table.exists !== false
               
               return (
                 <motion.div
                   key={table.table_name}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ duration: 0.3, delay: index * 0.05 }}
                 >
                   {mappedPage && isAccessible ? (
                     <Link href={mappedPage.href}>
                       <div className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group">
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                             <Icon className="h-5 w-5 text-primary" />
                             <div>
                               <h3 className="font-medium capitalize-first">
                                 {mappedPage.title}
                               </h3>
                               <p className="text-xs text-muted-foreground">
                                 {mappedPage.description}
                                 {table.record_count !== undefined && (
                                   <span className="ml-2 font-medium">
                                     • {table.record_count} registros
                                   </span>
                                 )}
                               </p>
                             </div>
                           </div>
                           <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                         </div>
                       </div>
                     </Link>
                   ) : (
                     <div className={`p-4 rounded-lg border bg-card ${!isAccessible ? 'opacity-60' : ''}`}>
                       <div className="flex items-center gap-3">
                         <Icon className={`h-5 w-5 ${isAccessible ? 'text-muted-foreground' : 'text-red-500'}`} />
                         <div>
                           <h3 className="font-medium capitalize-first">
                             {table.table_name.replace(/_/g, ' ')}
                           </h3>
                           <p className="text-xs text-muted-foreground">
                             {!isAccessible ? (
                               <span className="text-red-500">No disponible</span>
                             ) : mappedPage ? (
                               `${table.table_type} • ${table.record_count || 0} registros`
                             ) : (
                               `${table.table_type} • No configurada • ${table.record_count || 0} registros`
                             )}
                           </p>
                         </div>
                       </div>
                     </div>
                   )}
                 </motion.div>
               )
             })}
          </div>
        </motion.div>
      )}
    </div>
  )
} 