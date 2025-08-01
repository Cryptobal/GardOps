'use client'

import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Error Boundary capturó un error:', error)
    console.error('🚨 Error Info:', errorInfo)
    this.setState({ error, errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-900/10">
          <div className="max-w-2xl mx-auto p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              🚨 Error en la aplicación
            </h1>
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-2">Error:</h2>
                <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm overflow-auto">
                  {this.state.error?.toString()}
                </pre>
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-2">Stack Trace:</h2>
                <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm overflow-auto">
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Recargar página
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
} 