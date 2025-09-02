"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { GoogleMapsAutocomplete } from "@/components/ui/google-maps-autocomplete";
import { Camera, Upload, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Sun, Moon, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { RutValidationModal } from "@/components/ui/rut-validation-modal";

// Tipos de datos
interface FormData {
  // Página 1 - Información Personal
  rut: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  sexo: string;
  fecha_nacimiento: string;
  nacionalidad: string;
  email: string;
  celular: string;
  direccion: string;
  comuna: string;
  ciudad: string;
  
  // Información Previsional
  afp: string;
  descuento_afp: string;
  prevision_salud: string;
  cotiza_sobre_7: string;
  monto_pactado_uf: string;
  es_pensionado: string;
  asignacion_familiar: string;
  tramo_asignacion: string;
  
  // Información Bancaria
  banco_id: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  
  // Información Física
  talla_camisa: string;
  talla_pantalon: string;
  talla_zapato: number;
  altura_cm: number;
  peso_kg: number;
}

interface Documento {
  tipo: string;
  archivo: File | null;
  obligatorio: boolean;
}

// Datos estáticos
const NACIONALIDADES = [
  'Chilena', 'Argentina', 'Boliviana', 'Brasileña', 'Colombiana', 
  'Ecuatoriana', 'Guyanesa', 'Paraguaya', 'Peruana', 'Surinamesa', 
  'Uruguaya', 'Venezolana'
];

const AFPS = [
  'Capital', 'Cuprum', 'Habitat', 'Modelo', 'Planvital', 'ProVida', 'Uno'
];

const ISAPRES = [
  'FONASA', 'Banmédica', 'Colmena Golden Cross', 'Consalud', 'Cruz Blanca', 
  'Nueva Masvida', 'Río Blanco', 'San Lorenzo', 'Vida Tres'
];

const TALLAS_CAMISA = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const TALLAS_PANTALON = ['38', '40', '42', '44', '46', '48', '50', '52', '54'];

export default function PostulacionPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    rut: '', nombre: '', apellido_paterno: '', apellido_materno: '',
    sexo: '', fecha_nacimiento: '', nacionalidad: 'Chilena',
    email: '', celular: '', direccion: '', comuna: '', ciudad: '',
    afp: '', descuento_afp: '0%', prevision_salud: '', cotiza_sobre_7: 'No',
    monto_pactado_uf: '', es_pensionado: 'No', asignacion_familiar: 'No', tramo_asignacion: '',
    banco_id: '', tipo_cuenta: '', numero_cuenta: '',
    talla_camisa: '', talla_pantalon: '', talla_zapato: 40, altura_cm: 170, peso_kg: 70
  });

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

  const [bancos, setBancos] = useState<Array<{id: string, nombre: string}>>([]);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [success, setSuccess] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Estado para el modal de validación de RUT
  const [modalRut, setModalRut] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'duplicate' | 'info';
    title: string;
    message: string;
    rut?: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  // Cargar bancos al montar el componente
  useEffect(() => {
    cargarBancos();
  }, []);

  // NOTA: Se eliminó la persistencia en localStorage por seguridad
  // Cada usuario debe ver un formulario limpio sin datos de sesiones anteriores

  const cargarBancos = async () => {
    try {
      const response = await fetch('/api/bancos');
      if (response.ok) {
        const data = await response.json();
        setBancos(data.bancos || []);
      }
    } catch (error) {
      console.error('Error cargando bancos:', error);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const mostrarModalRut = (
    type: 'success' | 'error' | 'duplicate' | 'info',
    title: string,
    message: string,
    rut?: string,
    onConfirm?: () => void
  ) => {
    setModalRut({
      isOpen: true,
      type,
      title,
      message,
      rut,
      onConfirm
    });
  };

  const cerrarModalRut = () => {
    setModalRut(prev => ({ ...prev, isOpen: false }));
  };

  const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
    if (place.address_components) {
      let comuna = '';
      let ciudad = '';

      // Extraer comuna y ciudad de los componentes de la dirección
      for (const component of place.address_components) {
        const types = component.types;
        
        // Buscar comuna en diferentes tipos
        if (types.includes('sublocality_level_1') || types.includes('sublocality')) {
          comuna = component.long_name;
        }
        // Buscar ciudad en diferentes tipos
        if (types.includes('locality') || types.includes('administrative_area_level_1')) {
          ciudad = component.long_name;
        }
      }

      console.log('Google Maps - Place:', place);
      console.log('Google Maps - Comuna:', comuna, 'Ciudad:', ciudad);

      // Actualizar los campos de comuna y ciudad
      setFormData(prev => ({
        ...prev,
        comuna: comuna || 'No encontrada',
        ciudad: ciudad || 'No encontrada'
      }));
    }
  };

  // Validaciones
  const validarRut = (rut: string): boolean => {
    const rutLimpio = rut.replace(/\./g, '').replace(/\s+/g, '');
    const rutRegex = /^\d{7,8}-[\dkK]$/;
    if (!rutRegex.test(rutLimpio)) return false;
    
    const [numeroStr, dvStr] = rutLimpio.split('-');
    const dv = dvStr.toLowerCase();
    let suma = 0;
    let multiplicador = 2;
    
    for (let i = numeroStr.length - 1; i >= 0; i--) {
      suma += parseInt(numeroStr[i]) * multiplicador;
      multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }
    
    const dvEsperado = 11 - (suma % 11);
    const dvCalculado = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'k' : dvEsperado.toString();
    
    return dv === dvCalculado;
  };

  const validarFormulario = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    // Validaciones básicas
    if (!formData.rut || !validarRut(formData.rut)) {
      newErrors.rut = 'RUT inválido';
    }
    if (!formData.nombre.trim()) newErrors.nombre = 'Nombre es requerido';
    if (!formData.apellido_paterno.trim()) newErrors.apellido_paterno = 'Apellido paterno es requerido';
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    if (!formData.celular || formData.celular.length !== 9) {
      newErrors.celular = 'Celular debe tener 9 dígitos';
    }
    if (!formData.direccion.trim()) newErrors.direccion = 'Dirección es requerida';
    if (!formData.afp) newErrors.afp = 'AFP es requerida';
    if (!formData.prevision_salud) newErrors.prevision_salud = 'Previsión de salud es requerida';
    if (!formData.banco_id) newErrors.banco_id = 'Banco es requerido';
    if (!formData.tipo_cuenta) newErrors.tipo_cuenta = 'Tipo de cuenta es requerido';
    if (!formData.numero_cuenta.trim()) newErrors.numero_cuenta = 'Número de cuenta es requerido';
    
    // Validar monto pactado en UF solo si cotiza sobre el 7%
    if (formData.cotiza_sobre_7 === 'Sí' && (!formData.monto_pactado_uf || parseFloat(formData.monto_pactado_uf) <= 0)) {
      newErrors.monto_pactado_uf = 'Monto pactado en UF es requerido cuando cotiza sobre el 7%';
    }
    
    // Validar tramo de asignación familiar solo si tiene asignación familiar
    if (formData.asignacion_familiar === 'Sí' && !formData.tramo_asignacion) {
      newErrors.tramo_asignacion = 'Tramo de asignación familiar es requerido cuando tiene asignación familiar';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const verificarRutDuplicado = async (rut: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/guardias/verificar-rut?rut=${encodeURIComponent(rut)}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.existe;
      } else {
        console.error('Error en respuesta de verificación RUT:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('Error verificando RUT:', error);
      return false;
    }
  };

  const validarDocumentos = (): boolean => {
    return documentos.every(doc => 
      doc.obligatorio ? (doc.archivo) : true
    );
  };

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    console.log(`Campo ${field} cambiado a:`, value);
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Si es el campo RUT, limpiar también el error de duplicado
    if (field === 'rut') {
      setErrors(prev => ({ ...prev, rut: '' }));
      // También limpiar cualquier mensaje de éxito o estado anterior
      setSuccess(false);
    }
  };

  const handleDocumentChange = (index: number, field: 'archivo', value: File | null) => {
    const newDocumentos = [...documentos];
    newDocumentos[index] = { ...newDocumentos[index], [field]: value };
    setDocumentos(newDocumentos);
  };

  const eliminarDocumento = (index: number) => {
    const newDocumentos = [...documentos];
    newDocumentos[index] = { ...newDocumentos[index], archivo: null };
    setDocumentos(newDocumentos);
  };

  const completarFormularioPrueba = () => {
    setFormData({
      rut: '12345678-9',
      nombre: 'Juan',
      apellido_paterno: 'Pérez',
      apellido_materno: 'González',
              sexo: 'Hombre',
      fecha_nacimiento: '1990-01-01',
      nacionalidad: 'Chilena',
      email: 'juan.perez@example.com',
      celular: '987654321',
      direccion: 'Av. Siempre Viva 123',
      comuna: 'Santiago',
      ciudad: 'Santiago',
      afp: 'Capital',
      descuento_afp: '1%',
      prevision_salud: 'FONASA',
      cotiza_sobre_7: 'No',
      monto_pactado_uf: '100',
      es_pensionado: 'No',
      asignacion_familiar: 'No',
      tramo_asignacion: '',
      banco_id: '1', // Ejemplo de banco
      tipo_cuenta: 'CCT',
      numero_cuenta: '000123456789',
      talla_camisa: 'M',
      talla_pantalon: '40',
      talla_zapato: 42,
      altura_cm: 175,
      peso_kg: 75
    });
    
    // Limpiar documentos (sin archivos)
    setDocumentos([
      { tipo: 'Certificado OS10', archivo: null, obligatorio: true },
      { tipo: 'Carnet Identidad Frontal', archivo: null, obligatorio: false },
      { tipo: 'Carnet Identidad Reverso', archivo: null, obligatorio: false },
      { tipo: 'Certificado Antecedentes', archivo: null, obligatorio: false },
      { tipo: 'Certificado Enseñanza Media', archivo: null, obligatorio: false },
      { tipo: 'Certificado AFP', archivo: null, obligatorio: false },
      { tipo: 'Certificado AFC', archivo: null, obligatorio: false },
      { tipo: 'Certificado FONASA/ISAPRE', archivo: null, obligatorio: false }
    ]);
    
    setErrors({});
    mostrarModalRut('info', 'Formulario Completado', 'El formulario ha sido completado con datos de prueba. Recuerda que aún necesitas subir los documentos obligatorios.');
  };

  const siguientePagina = async () => {
    if (validarFormulario()) {
      // Verificar si el RUT ya existe
      if (formData.rut) {
        const rutExiste = await verificarRutDuplicado(formData.rut);
        if (rutExiste) {
          setErrors(prev => ({ ...prev, rut: 'RUT ya existe en el sistema' }));
          mostrarModalRut(
            'duplicate',
            'RUT Ya Existe',
            'Este RUT ya está registrado en el sistema. Por favor, verifique su RUT o contacte al administrador.',
            formData.rut
          );
          return;
        }
      }
      setCurrentPage(2);
    }
  };

  const paginaAnterior = () => {
    setCurrentPage(1);
  };

  const enviarFormulario = async () => {
    if (!validarDocumentos()) {
      mostrarModalRut(
        'error',
        'Documentos Faltantes',
        'Debe completar todos los documentos obligatorios antes de enviar el formulario.',
        undefined,
        undefined
      );
      return;
    }

    // Verificar RUT duplicado antes de enviar
    if (formData.rut) {
      console.log('🔍 Verificando RUT antes de enviar:', formData.rut);
      const rutExiste = await verificarRutDuplicado(formData.rut);
      console.log('🔍 Resultado verificación RUT:', rutExiste);
      if (rutExiste) {
        setErrors(prev => ({ ...prev, rut: 'RUT ya existe en el sistema' }));
        mostrarModalRut(
          'duplicate',
          'RUT Ya Existe',
          'Este RUT ya está registrado en el sistema. Por favor, verifique su RUT o contacte al administrador.',
          formData.rut
        );
        return;
      }
    }

    // Limpiar errores anteriores antes de enviar
    setErrors({});
    setSuccess(false);
    
    setLoading(true);
    try {
      console.log('🚀 Enviando formulario a:', '/api/postulacion/crear');
      console.log('📋 Datos del formulario:', { ...formData, tenant_id: tenantId });
      
      // Crear guardia
      const guardiaResponse = await fetch('/api/postulacion/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tenant_id: tenantId,
          ip_postulacion: '127.0.0.1', // En producción obtener IP real
          user_agent_postulacion: navigator.userAgent
        })
      });

      console.log('📡 Respuesta del servidor:', {
        status: guardiaResponse.status,
        statusText: guardiaResponse.statusText,
        url: guardiaResponse.url
      });
      
      if (!guardiaResponse.ok) {
        const errorData = await guardiaResponse.json().catch(() => ({}));
        console.log('❌ Error del servidor:', errorData);
        if (guardiaResponse.status === 409) {
          // Limpiar errores anteriores y establecer el error de RUT duplicado
          setErrors(prev => ({ ...prev, rut: 'RUT ya existe en el sistema' }));
          throw new Error('RUT ya existe en el sistema');
        } else {
          throw new Error(errorData.message || `Error del servidor: ${guardiaResponse.status}`);
        }
      }

      const guardiaData = await guardiaResponse.json();
      const guardiaId = guardiaData.guardia_id;

      // Subir documentos
      for (const doc of documentos) {
        if (doc.archivo) {
          const formData = new FormData();
          formData.append('guardia_id', guardiaId);
          formData.append('tipo_documento', doc.tipo);
          
          if (doc.archivo) {
            formData.append('archivo', doc.archivo);
          }

          await fetch('/api/postulacion/documento', {
            method: 'POST',
            body: formData
          });
        }
      }

      setSuccess(true);
      
              // localStorage.removeItem(`formData_${tenantId}`); // Eliminado por seguridad
      
      // Enviar webhook (automático)
      // Enviar email de confirmación (automático)
      // Crear notificación interna (automático)

    } catch (error) {
      console.error('Error enviando formulario:', error);
      let mensajeError = 'Error enviando formulario. Intente nuevamente.';
      
      if (error instanceof Error) {
        if (error.message.includes('RUT ya existe')) {
          mensajeError = 'Error: RUT ya existe en el sistema. Por favor, verifique su RUT o contacte al administrador.';
          setErrors(prev => ({ ...prev, rut: 'RUT ya existe en el sistema' }));
          mostrarModalRut(
            'duplicate',
            'RUT Ya Existe',
            'Este RUT ya está registrado en el sistema. Por favor, verifique su RUT o contacte al administrador.',
            formData.rut
          );
        } else {
          mensajeError = error.message;
          mostrarModalRut(
            'error',
            'Error del Sistema',
            mensajeError,
            undefined,
            undefined
          );
        }
      } else {
        mostrarModalRut(
          'error',
          'Error del Sistema',
          mensajeError,
          undefined,
          undefined
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            ¡Postulación Enviada!
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Hemos recibido tu información correctamente. 
            Te enviaremos un email de confirmación y nos pondremos en contacto contigo pronto.
          </p>
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <h3 className="font-semibold text-gray-800 mb-2">Resumen de tu postulación:</h3>
            <p className="text-gray-600">
              <strong>Nombre:</strong> {formData.nombre} {formData.apellido_paterno}<br/>
              <strong>RUT:</strong> {formData.rut}<br/>
              <strong>Email:</strong> {formData.email}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 relative"
        >
          {/* Botón de cambio de tema */}
          <div className="absolute top-0 right-0">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
            🚀 Postulación de Guardia
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Completa el formulario para postular como guardia de seguridad
          </p>
          
          {/* Botón para completar formulario de prueba */}
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={completarFormularioPrueba}
              className="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
            >
              🧪 Completar Formulario de Prueba
            </Button>
          </div>
          
          <div className="flex justify-center items-center space-x-2 mt-4">
            <div className={`w-3 h-3 rounded-full ${currentPage >= 1 ? 'bg-blue-500' : 'bg-gray-300'}`} />
            <div className={`w-3 h-3 rounded-full ${currentPage >= 2 ? 'bg-blue-500' : 'bg-gray-300'}`} />
          </div>
        </motion.div>

        {/* Formulario */}
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, x: currentPage === 2 ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {currentPage === 1 ? (
            <Card className="shadow-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-2xl text-center text-gray-800 dark:text-white">
                  📋 Información Personal y Laboral
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Datos Personales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="rut">RUT *</Label>
                    <Input
                      id="rut"
                      placeholder="55555555-5"
                      value={formData.rut}
                      onChange={(e) => handleInputChange('rut', e.target.value)}
                      className={errors.rut ? 'border-red-500' : ''}
                    />
                    {errors.rut && <p className="text-red-500 text-sm mt-1">{errors.rut}</p>}
                    <p className="text-xs text-gray-500 mt-1">Sin puntos y con guión</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="nombre">Primer Nombre *</Label>
                    <Input
                      id="nombre"
                      placeholder="Ingresa"
                      value={formData.nombre}
                      onChange={(e) => handleInputChange('nombre', e.target.value)}
                      className={errors.nombre ? 'border-red-500' : ''}
                    />
                    {errors.nombre && <p className="text-red-500 text-sm mt-1">{errors.nombre}</p>}
                  </div>
                  
                  <div>
                    <Label htmlFor="apellido_paterno">Apellido Paterno *</Label>
                    <Input
                      id="apellido_paterno"
                      placeholder="Ingresa"
                      value={formData.apellido_paterno}
                      onChange={(e) => handleInputChange('apellido_paterno', e.target.value)}
                      className={errors.apellido_paterno ? 'border-red-500' : ''}
                    />
                    {errors.apellido_paterno && <p className="text-red-500 text-sm mt-1">{errors.apellido_paterno}</p>}
                  </div>
                  
                  <div>
                    <Label htmlFor="apellido_materno">Apellido Materno</Label>
                    <Input
                      id="apellido_materno"
                      placeholder="Ingresa"
                      value={formData.apellido_materno}
                      onChange={(e) => handleInputChange('apellido_materno', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="sexo">Sexo *</Label>
                    <Select value={formData.sexo} onValueChange={(value) => handleInputChange('sexo', value)}>
                      <SelectTrigger className={errors.sexo ? 'border-red-500' : ''}>
                        <SelectValue placeholder="-Seleccionar-" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Hombre">Hombre</SelectItem>
                        <SelectItem value="Mujer">Mujer</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.sexo && <p className="text-red-500 text-sm mt-1">{errors.sexo}</p>}
                  </div>
                  
                  <div>
                    <Label htmlFor="fecha_nacimiento">Fecha Nacimiento *</Label>
                    <Input
                      id="fecha_nacimiento"
                      type="date"
                      value={formData.fecha_nacimiento}
                      onChange={(e) => handleInputChange('fecha_nacimiento', e.target.value)}
                      className={errors.fecha_nacimiento ? 'border-red-500' : ''}
                    />
                    {errors.fecha_nacimiento && <p className="text-red-500 text-sm mt-1">{errors.fecha_nacimiento}</p>}
                  </div>
                  
                  <div>
                    <Label htmlFor="nacionalidad">Nacionalidad *</Label>
                    <Select value={formData.nacionalidad} onValueChange={(value) => handleInputChange('nacionalidad', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NACIONALIDADES.map(nac => (
                          <SelectItem key={nac} value={nac}>{nac}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Contacto */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Correo electrónico *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>
                  
                  <div>
                    <Label htmlFor="celular">Celular *</Label>
                    <Input
                      id="celular"
                      placeholder="223334444"
                      value={formData.celular}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                        handleInputChange('celular', value);
                      }}
                      maxLength={9}
                      className={errors.celular ? 'border-red-500' : ''}
                    />
                    {errors.celular && <p className="text-red-500 text-sm mt-1">{errors.celular}</p>}
                    <p className="text-xs text-gray-500 mt-1">Solo 9 dígitos</p>
                  </div>
                  
                  <div className="md:col-span-2">
                    <GoogleMapsAutocomplete
                      label="Dirección *"
                      value={formData.direccion}
                      onChange={(value) => handleInputChange('direccion', value)}
                      onPlaceSelect={handlePlaceSelect}
                      placeholder="Buscar dirección..."
                      error={errors.direccion}
                    />
                    {errors.direccion && <p className="text-red-500 text-sm mt-1">{errors.direccion}</p>}
                    <p className="text-xs text-gray-500 mt-1">Busca y selecciona tu dirección</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="comuna">Comuna</Label>
                    <Input
                      id="comuna"
                      placeholder="Se extrae automáticamente"
                      value={formData.comuna}
                      onChange={(e) => handleInputChange('comuna', e.target.value)}
                      disabled
                      className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    />
                    <p className="text-xs text-gray-500 mt-1">Extraída de Google Maps</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="ciudad">Ciudad</Label>
                    <Input
                      id="ciudad"
                      placeholder="Se extrae automáticamente"
                      value={formData.ciudad}
                      onChange={(e) => handleInputChange('ciudad', e.target.value)}
                      disabled
                      className="bg-gray-50 dark:bg-gray-500 text-gray-600 dark:text-gray-300"
                    />
                    <p className="text-xs text-gray-500 mt-1">Extraída de Google Maps</p>
                  </div>
                </div>

                {/* Información Previsional */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="afp">AFP *</Label>
                    <Select value={formData.afp} onValueChange={(value) => handleInputChange('afp', value)}>
                      <SelectTrigger className={errors.afp ? 'border-red-500' : ''}>
                        <SelectValue placeholder="-Seleccionar-" />
                      </SelectTrigger>
                      <SelectContent>
                        {AFPS.map(afp => (
                          <SelectItem key={afp} value={afp}>{afp}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.afp && <p className="text-red-500 text-sm mt-1">{errors.afp}</p>}
                  </div>
                  
                  <div>
                    <Label htmlFor="descuento_afp">¿Tiene descuento en la AFP? *</Label>
                    <Select value={formData.descuento_afp} onValueChange={(value) => handleInputChange('descuento_afp', value)}>
                      <SelectTrigger className={errors.descuento_afp ? 'border-red-500' : ''}>
                        <SelectValue placeholder="-Seleccionar-" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1%">1%</SelectItem>
                        <SelectItem value="0%">0%</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.descuento_afp && <p className="text-red-500 text-sm mt-1">{errors.descuento_afp}</p>}
                  </div>
                  
                  <div>
                    <Label htmlFor="prevision_salud">Previsión de Salud *</Label>
                    <Select value={formData.prevision_salud} onValueChange={(value) => handleInputChange('prevision_salud', value)}>
                      <SelectTrigger className={errors.prevision_salud ? 'border-red-500' : ''}>
                        <SelectValue placeholder="-Seleccionar-" />
                      </SelectTrigger>
                      <SelectContent>
                        {ISAPRES.map(isapre => (
                          <SelectItem key={isapre} value={isapre}>{isapre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.prevision_salud && <p className="text-red-500 text-sm mt-1">{errors.prevision_salud}</p>}
                  </div>
                  
                  <div>
                    <Label htmlFor="cotiza_sobre_7">¿Cotiza sobre el 7%? *</Label>
                    <Select value={formData.cotiza_sobre_7} onValueChange={(value) => handleInputChange('cotiza_sobre_7', value)}>
                      <SelectTrigger className={errors.cotiza_sobre_7 ? 'border-red-500' : ''}>
                        <SelectValue placeholder="-Seleccionar-" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sí">Sí</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      Solo si cotiza en Isapre sobre el 7% debe responder que NO
                    </p>
                    {errors.cotiza_sobre_7 && <p className="text-red-500 text-sm mt-1">{errors.cotiza_sobre_7}</p>}
                  </div>
                  
                  {formData.cotiza_sobre_7 === 'Sí' && (
                    <div>
                      <Label htmlFor="monto_pactado_uf">Monto Pactado en UF *</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="monto_pactado_uf"
                          type="number"
                          step="0.01"
                          placeholder="123"
                          value={formData.monto_pactado_uf}
                          onChange={(e) => handleInputChange('monto_pactado_uf', e.target.value)}
                          className={errors.monto_pactado_uf ? 'border-red-500' : ''}
                        />
                        <span className="text-sm font-medium">UF</span>
                      </div>
                      {errors.monto_pactado_uf && <p className="text-red-500 text-sm mt-1">{errors.monto_pactado_uf}</p>}
                    </div>
                  )}
                  

                  
                  <div>
                    <Label htmlFor="es_pensionado">¿Es pensionado? *</Label>
                    <Select value={formData.es_pensionado} onValueChange={(value) => handleInputChange('es_pensionado', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="-Seleccionar-" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sí">Sí</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="asignacion_familiar">¿Tiene Asignación Familiar? *</Label>
                    <Select value={formData.asignacion_familiar} onValueChange={(value) => handleInputChange('asignacion_familiar', value)}>
                      <SelectTrigger className={errors.asignacion_familiar ? 'border-red-500' : ''}>
                        <SelectValue placeholder="-Seleccionar-" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sí">Sí</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.asignacion_familiar && <p className="text-red-500 text-sm mt-1">{errors.asignacion_familiar}</p>}
                  </div>
                  
                  {formData.asignacion_familiar === 'Sí' && (
                    <div>
                      <Label htmlFor="tramo_asignacion">Tramo Asignación Familiar *</Label>
                      <Select value={formData.tramo_asignacion} onValueChange={(value) => handleInputChange('tramo_asignacion', value)}>
                        <SelectTrigger className={errors.tramo_asignacion ? 'border-red-500' : ''}>
                          <SelectValue placeholder="-Seleccionar-" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="C">C</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.tramo_asignacion && <p className="text-red-500 text-sm mt-1">{errors.tramo_asignacion}</p>}
                    </div>
                  )}
                </div>

                {/* Información Bancaria */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="banco_id">Banco *</Label>
                    <Select value={formData.banco_id} onValueChange={(value) => handleInputChange('banco_id', value)}>
                      <SelectTrigger className={errors.banco_id ? 'border-red-500' : ''}>
                        <SelectValue placeholder="-Seleccionar-" />
                      </SelectTrigger>
                      <SelectContent>
                        {bancos.map(banco => (
                          <SelectItem key={banco.id} value={banco.id}>{banco.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.banco_id && <p className="text-red-500 text-sm mt-1">{errors.banco_id}</p>}
                  </div>
                  
                  <div>
                    <Label htmlFor="tipo_cuenta">Tipo de Cuenta *</Label>
                    <Select value={formData.tipo_cuenta} onValueChange={(value) => handleInputChange('tipo_cuenta', value)}>
                      <SelectTrigger className={errors.tipo_cuenta ? 'border-red-500' : ''}>
                        <SelectValue placeholder="-Seleccionar-" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CCT">Cuenta Corriente</SelectItem>
                        <SelectItem value="CTE">Cuenta de Ahorro</SelectItem>
                        <SelectItem value="CTA">Cuenta Vista</SelectItem>
                        <SelectItem value="RUT">Cuenta RUT</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.tipo_cuenta && <p className="text-red-500 text-sm mt-1">{errors.tipo_cuenta}</p>}
                  </div>
                  
                  <div>
                    <Label htmlFor="numero_cuenta">Número de cuenta *</Label>
                    <Input
                      id="numero_cuenta"
                      placeholder="00012345678"
                      value={formData.numero_cuenta}
                      onChange={(e) => handleInputChange('numero_cuenta', e.target.value)}
                      className={errors.numero_cuenta ? 'border-red-500' : ''}
                    />
                    {errors.numero_cuenta && <p className="text-red-500 text-sm mt-1">{errors.numero_cuenta}</p>}
                  </div>
                </div>

                {/* Información Física */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="talla_camisa">Talla Camisa *</Label>
                    <Select value={formData.talla_camisa} onValueChange={(value) => handleInputChange('talla_camisa', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="-Seleccionar-" />
                      </SelectTrigger>
                      <SelectContent>
                        {TALLAS_CAMISA.map(talla => (
                          <SelectItem key={talla} value={talla}>{talla}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="talla_pantalon">Talla Pantalón *</Label>
                    <Select value={formData.talla_pantalon} onValueChange={(value) => handleInputChange('talla_pantalon', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="-Seleccionar-" />
                      </SelectTrigger>
                      <SelectContent>
                        {TALLAS_PANTALON.map(talla => (
                          <SelectItem key={talla} value={talla}>{talla}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="talla_zapato">Talla Zapato *</Label>
                    <Input
                      id="talla_zapato"
                      type="number"
                      min={35}
                      max={46}
                      value={formData.talla_zapato}
                      onChange={(e) => handleInputChange('talla_zapato', parseInt(e.target.value) || 40)}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">Entre 35 y 46</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="altura_cm">Altura *</Label>
                    <Input
                      id="altura_cm"
                      type="number"
                      min={140}
                      max={210}
                      value={formData.altura_cm}
                      onChange={(e) => handleInputChange('altura_cm', parseInt(e.target.value) || 170)}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">Entre 140 y 210 cm</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="peso_kg">Peso *</Label>
                    <Input
                      id="peso_kg"
                      type="number"
                      min={40}
                      max={120}
                      value={formData.peso_kg}
                      onChange={(e) => handleInputChange('peso_kg', parseInt(e.target.value) || 70)}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">Entre 40 y 120 kg</p>
                  </div>
                  

                </div>

                {/* Botones de navegación */}
                <div className="flex justify-end pt-6">
                  <Button
                    onClick={siguientePagina}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    Siguiente <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-2xl text-center text-gray-800 dark:text-white">
                  📄 Ingreso de Documentos
                </CardTitle>
                <p className="text-center text-gray-600 dark:text-gray-300">
                  En esta sección debe cargar documentos necesarios para su ficha
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {documentos.map((doc, index) => (
                                     <div key={doc.tipo} className="border rounded-lg p-4 space-y-4">
                     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                       <Label className="text-base font-medium">
                         {doc.tipo} {doc.obligatorio && <span className="text-red-500">*</span>}
                       </Label>
                       <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                         <label
                           htmlFor={`file-${index}`}
                           className="cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto"
                         >
                           <Upload className="w-4 h-4 mr-2" />
                           Cargar Archivo
                         </label>
                        {doc.archivo && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => eliminarDocumento(index)}
                            className="flex items-center justify-center text-red-500 w-full sm:w-auto"
                          >
                            <X className="w-4 h-4 mr-2" />
                            <span>Eliminar</span>
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <input
                      id={`file-${index}`}
                      type="file"
                      accept={doc.tipo.includes('Carnet') ? 'image/*' : 'application/pdf,image/*'}
                      onChange={(e) => handleDocumentChange(index, 'archivo', e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    
                    <div className="space-y-2">
                      {doc.archivo && (
                        <div className="flex items-center space-x-2 p-2 bg-green-50 rounded">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-700">
                            Archivo: {doc.archivo.name}
                          </span>
                        </div>
                      )}
                      
                      {!doc.archivo && doc.obligatorio && (
                        <div className="flex items-center space-x-2 p-2 bg-red-50 rounded">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <span className="text-sm text-red-700">
                            Documento obligatorio requerido
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-2">
                      {doc.tipo.includes('Carnet') 
                        ? 'Solo se permite en formato IMAGEN' 
                        : 'Solo se permite en formato PDF o IMAGEN'
                      }
                    </p>
                  </div>
                ))}

                {/* Botones de navegación */}
                <div className="flex justify-between pt-6">
                  <Button
                    variant="outline"
                    onClick={paginaAnterior}
                    size="lg"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Atrás
                  </Button>
                  
                  <Button
                    onClick={enviarFormulario}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    {loading ? 'Enviando...' : 'Enviar Postulación'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
      
      {/* Modal de validación de RUT */}
      <RutValidationModal
        isOpen={modalRut.isOpen}
        onClose={cerrarModalRut}
        type={modalRut.type}
        title={modalRut.title}
        message={modalRut.message}
        rut={modalRut.rut}
        onConfirm={modalRut.onConfirm}
      />
    </div>
  );
}
