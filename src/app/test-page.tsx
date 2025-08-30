'use client';

export default function TestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          🎉 ¡Página de Prueba Funcionando!
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Si puedes ver esto, el servidor está funcionando correctamente.
        </p>
        <div className="mt-8">
          <a 
            href="/" 
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Volver al Inicio
          </a>
        </div>
      </div>
    </div>
  );
}
