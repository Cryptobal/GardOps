"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import React from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function TestAuthPage() {
  const { user, isAuthenticated, isLoading, error, logout } = useAuth();
  const [testResult, setTestResult] = React.useState<any>(null);
  const [testLoading, setTestLoading] = React.useState(false);

  const testApiCall = async () => {
    setTestLoading(true);
    try {
      logger.debug('🧪 Probando llamada a API...');
      const result = await api.clientes.getAll();
      setTestResult(result);
      devLogger.success(' Resultado de API:', result);
    } catch (error) {
      console.error('❌ Error en API:', error);
      setTestResult({ error: error.message });
    } finally {
      setTestLoading(false);
    }
  };

  const testPermissions = async () => {
    setTestLoading(true);
    try {
      logger.debug('🔐 Probando permisos...');
      const result = await api.permissions.check('clientes.view');
      setTestResult(result);
      devLogger.success(' Resultado de permisos:', result);
    } catch (error) {
      console.error('❌ Error en permisos:', error);
      setTestResult({ error: error.message });
    } finally {
      setTestLoading(false);
    }
  };

  const testDebugHeaders = async () => {
    setTestLoading(true);
    try {
      logger.debug('🔍 Probando debug headers...');
      // Usar el cliente API personalizado en lugar de fetch directo
      const result = await api.debug.headers();
      setTestResult(result);
      devLogger.success(' Resultado de debug headers:', result);
    } catch (error) {
      console.error('❌ Error en debug headers:', error);
      setTestResult({ error: error.message });
    } finally {
      setTestLoading(false);
    }
  };

  const testDebugClientesAuth = async () => {
    setTestLoading(true);
    try {
      logger.debug('🔍 Probando debug clientes auth...');
      const result = await api.debug.clientesAuth();
      setTestResult(result);
      devLogger.success(' Resultado de debug clientes auth:', result);
    } catch (error) {
      console.error('❌ Error en debug clientes auth:', error);
      setTestResult({ error: error.message });
    } finally {
      setTestLoading(false);
    }
  };

  const restoreRBACSystem = async () => {
    setTestLoading(true);
    try {
      logger.debug('🔧 Restaurando sistema RBAC...');
      const response = await fetch('/api/fix-rbac-system', { method: 'POST' });
      const result = await response.json();
      setTestResult(result);
      devLogger.success(' Resultado de restauración RBAC:', result);
    } catch (error) {
      console.error('❌ Error restaurando RBAC:', error);
      setTestResult({ error: error.message });
    } finally {
      setTestLoading(false);
    }
  };

  const fixAdminPermissionsDirect = async () => {
    setTestLoading(true);
    try {
      logger.debug('🔧 Asignando permisos DIRECTAMENTE al admin...');
      const response = await fetch('/api/fix-admin-permissions-direct', { method: 'POST' });
      const result = await response.json();
      setTestResult(result);
      devLogger.success(' Resultado de asignación directa:', result);
    } catch (error) {
      console.error('❌ Error asignando permisos:', error);
      setTestResult({ error: error.message });
    } finally {
      setTestLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">🧪 Página de Prueba de Autenticación</h1>
      
      {/* Estado de Autenticación */}
      <Card>
        <CardHeader>
          <CardTitle>Estado de Autenticación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <span>Estado:</span>
            <Badge variant={isAuthenticated ? "default" : "destructive"}>
              {isAuthenticated ? "Autenticado" : "No Autenticado"}
            </Badge>
          </div>
          
          {error && (
            <div className="text-red-600">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {user && (
            <div className="space-y-2">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Nombre:</strong> {user.nombre} {user.apellido}</p>
              <p><strong>ID:</strong> {user.id}</p>
              <p><strong>Tenant ID:</strong> {user.tenant_id}</p>
            </div>
          )}
          
          {isAuthenticated && (
            <Button onClick={logout} variant="outline">
              Cerrar Sesión
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Cookies y LocalStorage */}
      <Card>
        <CardHeader>
          <CardTitle>Estado de Cookies y LocalStorage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Cookies:</h4>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
              {typeof document !== 'undefined' ? document.cookie : 'No disponible en servidor'}
            </pre>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">LocalStorage current_user:</h4>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
              {typeof localStorage !== 'undefined' ? localStorage.getItem('current_user') || 'No encontrado' : 'No disponible en servidor'}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Pruebas de API */}
      <Card>
        <CardHeader>
          <CardTitle>Pruebas de API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button 
              onClick={testApiCall} 
              disabled={testLoading || !isAuthenticated}
            >
              {testLoading ? 'Probando...' : 'Probar API Clientes'}
            </Button>
            
            <Button 
              onClick={testPermissions} 
              disabled={testLoading || !isAuthenticated}
              variant="outline"
            >
              {testLoading ? 'Probando...' : 'Probar Permisos'}
            </Button>

            <Button 
              onClick={testDebugHeaders} 
              disabled={testLoading || !isAuthenticated}
              variant="outline"
            >
              {testLoading ? 'Probando...' : 'Debug Headers'}
            </Button>

            <Button 
              onClick={testDebugClientesAuth} 
              disabled={testLoading || !isAuthenticated}
              variant="outline"
            >
              {testLoading ? 'Probando...' : 'Debug Clientes Auth'}
            </Button>

            <Button 
              onClick={restoreRBACSystem} 
              disabled={testLoading || !isAuthenticated}
              variant="destructive"
            >
              {testLoading ? 'Restaurando...' : '🔧 Restaurar RBAC'}
            </Button>

            <Button 
              onClick={fixAdminPermissionsDirect} 
              disabled={testLoading || !isAuthenticated}
              variant="destructive"
              className="bg-red-800 hover:bg-red-900"
            >
              {testLoading ? 'Asignando...' : '🚨 SOLUCIÓN DIRECTA'}
            </Button>
          </div>
          
          {testResult && (
            <div>
              <h4 className="font-semibold mb-2">Resultado:</h4>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información del Entorno */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Entorno</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</p>
            <p><strong>NEXT_PUBLIC_DEV_USER_EMAIL:</strong> {process.env.NEXT_PUBLIC_DEV_USER_EMAIL || 'No definido'}</p>
            <p><strong>Ejecutándose en:</strong> {typeof window !== 'undefined' ? 'Cliente (Navegador)' : 'Servidor'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
