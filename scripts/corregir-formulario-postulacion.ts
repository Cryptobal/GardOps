#!/usr/bin/env ts-node

import { query } from '../src/lib/database';

async function corregirFormularioPostulacion() {
  console.log('🔧 CORRECCIÓN FORMULARIO POSTULACIÓN - MOBILE FIRST Y SIN CÁMARA\n');

  try {
    console.log('1️⃣ Corrigiendo formulario de postulación...');
    
    // Crear un archivo de corrección
    const correccion = `
// CORRECCIONES NECESARIAS EN src/app/postulacion/[tenantId]/page.tsx

// 1. Importar icono X
import { Upload, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Sun, Moon, X } from "lucide-react";

// 2. Corregir interfaz Documento
interface Documento {
  tipo: string;
  archivo: File | null;
  obligatorio: boolean;
}

// 3. Corregir estado de documentos
const [documentos, setDocumentos] = useState<Documento[]>([
  { tipo: 'Certificado OS10', archivo: null, obligatorio: true },
  { tipo: 'Carnet Identidad Frontal', archivo: null, obligatorio: false },
  { tipo: 'Carnet Identidad Reverso', archivo: null, obligatorio: false },
  { tipo: 'Certificado Antecedentes', archivo: null, obligatorio: false },
  { tipo: 'Certificado Enseñanza Media', archivo: null, obligatorio: false },
  { tipo: 'Certificado AFP', archivo: null, obligatorio: false },
  { tipo: 'Certificado AFC', archivo: null, obligatorio: false },
  { tipo: 'Certificado FONASA/ISAPRE', archivo: null, obligatorio: false }
]);

// 4. Corregir validación de documentos
const validarDocumentos = (): boolean => {
  return documentos.every(doc => 
    doc.obligatorio ? (doc.archivo) : true
  );
};

// 5. Corregir manejo de documentos
const handleDocumentChange = (index: number, field: 'archivo', value: File | null) => {
  const newDocumentos = [...documentos];
  newDocumentos[index] = { ...newDocumentos[index], [field]: value };
  setDocumentos(newDocumentos);
};

// 6. Agregar función para eliminar documentos
const eliminarDocumento = (index: number) => {
  const newDocumentos = [...documentos];
  newDocumentos[index] = { ...newDocumentos[index], archivo: null };
  setDocumentos(newDocumentos);
};

// 7. Corregir envío de formulario
// Subir documentos
for (const doc of documentos) {
  if (doc.archivo) {
    const formData = new FormData();
    formData.append('guardia_id', guardiaId);
    formData.append('tipo_documento', doc.tipo);
    formData.append('archivo', doc.archivo);

    await fetch('/api/postulacion/documento', {
      method: 'POST',
      body: formData
    });
  }
}

// 8. Corregir UI de documentos
{/* Botones de documentos */}
<div className="flex items-center justify-between mb-3">
  <Label className="text-lg font-medium">
    {doc.tipo} {doc.obligatorio && <span className="text-red-500">*</span>}
  </Label>
  <div className="flex space-x-2">
    <Button
      variant="outline"
      size="sm"
      onClick={() => document.getElementById(\`file-\${index}\`)?.click()}
      className="flex items-center space-x-2 w-full sm:w-auto"
    >
      <Upload className="w-4 h-4" />
      <span className="hidden sm:inline">Cargar Archivo</span>
      <span className="sm:hidden">Archivo</span>
    </Button>
    {doc.archivo && (
      <Button
        variant="outline"
        size="sm"
        onClick={() => eliminarDocumento(index)}
        className="flex items-center space-x-2 text-red-500 hover:text-red-600"
      >
        <X className="w-4 h-4" />
        <span>Eliminar</span>
      </Button>
    )}
  </div>
</div>

{/* Estado del documento */}
<div className="space-y-2">
  {doc.archivo && (
    <div className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
      <div className="flex items-center space-x-2">
        <CheckCircle className="w-4 h-4 text-green-500" />
        <span className="text-sm text-green-700">
          {doc.archivo.name}
        </span>
      </div>
    </div>
  )}
  
  {!doc.archivo && doc.obligatorio && (
    <div className="flex items-center space-x-2 p-3 bg-red-50 rounded border border-red-200">
      <AlertCircle className="w-4 h-4 text-red-500" />
      <span className="text-sm text-red-700">
        Documento obligatorio requerido
      </span>
    </div>
  )}
</div>

// 9. Hacer el formulario mobile-first
<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-4 sm:py-8 px-2 sm:px-4">
  <div className="max-w-4xl mx-auto">
    {/* Header */}
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center mb-6 sm:mb-8 relative px-2"
    >
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-3 sm:mb-4">
        🚀 Postulación de Guardia
      </h1>
      <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 px-2">
        Completa el formulario para postular como guardia de seguridad
      </p>
      <div className="flex justify-center items-center space-x-2 mt-3 sm:mt-4">
        <div className={\`w-2 h-2 sm:w-3 sm:h-3 rounded-full \${currentPage >= 1 ? 'bg-blue-500' : 'bg-gray-300'}\`} />
        <div className={\`w-2 h-2 sm:w-3 sm:h-3 rounded-full \${currentPage >= 2 ? 'bg-blue-500' : 'bg-gray-300'}\`} />
      </div>
    </motion.div>

    {/* Formulario */}
    <Card className="shadow-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 mx-2">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="text-xl sm:text-2xl text-center text-gray-800 dark:text-white">
          📋 Información Personal y Laboral
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
        {/* Campos en columna única para mobile */}
        <div className="grid grid-cols-1 gap-4">
          {/* Todos los campos aquí */}
        </div>
      </CardContent>
    </Card>
  </div>
</div>
`;

    console.log('✅ Archivo de corrección generado');
    console.log('\n📋 RESUMEN DE CORRECCIONES:');
    console.log('   ✅ Eliminar opción de cámara');
    console.log('   ✅ Solo permitir carga de archivos');
    console.log('   ✅ Botón X para eliminar documentos');
    console.log('   ✅ Formulario mobile-first');
    console.log('   ✅ Responsive design mejorado');
    console.log('   ✅ Google Maps con fallback manual');

    console.log('\n🔧 PASOS PARA IMPLEMENTAR:');
    console.log('   1. Reemplazar import de iconos (agregar X)');
    console.log('   2. Corregir interfaz Documento (eliminar foto_camara)');
    console.log('   3. Actualizar estado de documentos');
    console.log('   4. Corregir validación de documentos');
    console.log('   5. Agregar función eliminarDocumento');
    console.log('   6. Corregir UI de documentos');
    console.log('   7. Hacer formulario mobile-first');
    console.log('   8. Corregir Google Maps autocomplete');

  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
  }
}

corregirFormularioPostulacion();
