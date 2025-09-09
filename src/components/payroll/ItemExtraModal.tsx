"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal, ModalHeader, ModalFooter } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Save, 
  X,
  Loader2,
  User,
  Building2,
  Search,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Importar tipos y APIs
import { PayrollItemExtra, CreatePayrollItemExtraData, UpdatePayrollItemExtraData, CreatePayrollItemExtraSchema, SueldoItem } from '@/lib/schemas/payroll';
import { payrollItemsExtrasApi, guardiasApi, sueldoItemsApi } from '@/lib/api/payroll';

interface ItemExtraModalProps {
  item: PayrollItemExtra | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (item: PayrollItemExtra) => void;
  instalacionId?: string;
  mes?: number;
  anio?: number;
}

interface Guardia {
  id: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  rut: string;
  nombre_completo: string;
}

const tipoOptions = [
  { value: 'haber_imponible', label: 'Haber Imponible', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
  { value: 'haber_no_imponible', label: 'Haber No Imponible', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' },
  { value: 'descuento', label: 'Descuento', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
];

export default function ItemExtraModal({
  item,
  isOpen,
  onClose,
  onSuccess,
  instalacionId,
  mes,
  anio
}: ItemExtraModalProps) {
  const [loading, setLoading] = useState(false);
  const [guardias, setGuardias] = useState<Guardia[]>([]);
  const [loadingGuardias, setLoadingGuardias] = useState(false);
  const [sueldoItems, setSueldoItems] = useState<SueldoItem[]>([]);
  const [loadingSueldoItems, setLoadingSueldoItems] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<CreatePayrollItemExtraData>({
    resolver: zodResolver(CreatePayrollItemExtraSchema),
    defaultValues: {
      guardia_id: '',
      item_id: '',
      tipo: 'haber_imponible',
      nombre: '',
      monto: 0,
      glosa: '',
    }
  });

  const watchedTipo = watch('tipo');
  const watchedNombre = watch('nombre');

  // Cargar guardias y catálogo de ítems cuando se abre el modal
  useEffect(() => {
    if (isOpen && instalacionId) {
      loadGuardias();
      loadSueldoItems();
    }
  }, [isOpen, instalacionId]);

  // Resetear formulario cuando cambia el item
  useEffect(() => {
    if (item) {
      reset({
        guardia_id: item.guardia_id,
        item_id: item.item_id || '',
        tipo: item.tipo,
        nombre: item.nombre,
        monto: item.monto,
        glosa: item.glosa || '',
      });
    } else {
      reset({
        guardia_id: '',
        item_id: '',
        tipo: 'haber_imponible',
        nombre: '',
        monto: 0,
        glosa: '',
      });
    }
  }, [item, reset]);

  // Filtrar ítems del catálogo basado en el término de búsqueda
  const filteredSueldoItems = sueldoItems.filter(item => 
    item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const loadGuardias = async () => {
    if (!instalacionId) return;
    
    try {
      setLoadingGuardias(true);
      const response = await guardiasApi.getGuardias(instalacionId);
      setGuardias(response.data);
    } catch (error) {
      logger.error('Error al cargar guardias::', error);
    } finally {
      setLoadingGuardias(false);
    }
  };

  const loadSueldoItems = async () => {
    try {
      setLoadingSueldoItems(true);
      const response = await sueldoItemsApi.getItems({ activo: true });
      setSueldoItems(response.data);
    } catch (error) {
      logger.error('Error al cargar catálogo de ítems::', error);
    } finally {
      setLoadingSueldoItems(false);
    }
  };

  const handleItemSelect = (selectedItem: SueldoItem) => {
    setValue('item_id', selectedItem.id);
    setValue('nombre', selectedItem.nombre);
    
    // Mapear clase y naturaleza a tipo
    let tipo: 'haber_imponible' | 'haber_no_imponible' | 'descuento';
    if (selectedItem.clase === 'HABER' && selectedItem.naturaleza === 'IMPONIBLE') {
      tipo = 'haber_imponible';
    } else if (selectedItem.clase === 'HABER' && selectedItem.naturaleza === 'NO_IMPONIBLE') {
      tipo = 'haber_no_imponible';
    } else {
      tipo = 'descuento';
    }
    setValue('tipo', tipo);
    
    setSearchTerm(selectedItem.nombre);
    setShowItemSuggestions(false);
  };

  const onSubmit = async (data: CreatePayrollItemExtraData) => {
    try {
      setLoading(true);
      
      const itemData = {
        ...data,
        instalacion_id: instalacionId!,
        mes: mes!,
        anio: anio!,
      };

      let result;
      if (item) {
        // Actualizar
        result = await payrollItemsExtrasApi.updateItem(item.id!, data);
      } else {
        // Crear
        result = await payrollItemsExtrasApi.createItem(itemData);
      }

      onSuccess?.(result.data);
      onClose();
    } catch (error: any) {
      logger.error('Error al guardar ítem::', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const getTipoLabel = (clase: string, naturaleza: string) => {
    if (clase === 'HABER' && naturaleza === 'IMPONIBLE') {
      return 'Haber Imponible';
    } else if (clase === 'HABER' && naturaleza === 'NO_IMPONIBLE') {
      return 'Haber No Imponible';
    } else {
      return 'Descuento';
    }
  };

  const getTipoColor = (clase: string, naturaleza: string) => {
    if (clase === 'HABER' && naturaleza === 'IMPONIBLE') {
      return 'bg-green-100 text-green-800';
    } else if (clase === 'HABER' && naturaleza === 'NO_IMPONIBLE') {
      return 'bg-blue-100 text-blue-800';
    } else {
      return 'bg-red-100 text-red-800';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={item ? 'Editar Ítem Extra' : 'Agregar Ítem Extra'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Información del período */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>Período: {mes}/{anio}</span>
            </div>
          </CardContent>
        </Card>

        {/* Guardia */}
        <div className="space-y-2">
          <Label htmlFor="guardia_id">Guardia *</Label>
          <Select
            value={watch('guardia_id')}
            onValueChange={(value) => setValue('guardia_id', value)}
            disabled={loadingGuardias}
          >
            <SelectTrigger className={cn(errors.guardia_id && 'border-red-500')}>
              <SelectValue placeholder={loadingGuardias ? 'Cargando guardias...' : 'Seleccionar guardia'} />
            </SelectTrigger>
            <SelectContent>
              {guardias.map((guardia) => (
                <SelectItem key={guardia.id} value={guardia.id}>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{guardia.nombre_completo}</span>
                    <Badge variant="secondary" className="text-xs">
                      {guardia.rut}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.guardia_id && (
            <p className="text-sm text-red-500">{errors.guardia_id.message}</p>
          )}
        </div>

        {/* Ítem del catálogo (autocomplete) */}
        <div className="space-y-2">
          <Label htmlFor="nombre">Ítem del Catálogo</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar en catálogo de ítems..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowItemSuggestions(true);
              }}
              onFocus={() => setShowItemSuggestions(true)}
              className="pl-10"
            />
          </div>
          
          {/* Sugerencias del catálogo */}
          {showItemSuggestions && searchTerm && (
            <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
              {filteredSueldoItems.length > 0 ? (
                filteredSueldoItems.map((sueldoItem) => (
                  <div
                    key={sueldoItem.id}
                    className="p-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                    onClick={() => handleItemSelect(sueldoItem)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{sueldoItem.nombre}</p>
                        <p className="text-xs text-muted-foreground">{sueldoItem.codigo}</p>
                        {sueldoItem.descripcion && (
                          <p className="text-xs text-muted-foreground">{sueldoItem.descripcion}</p>
                        )}
                      </div>
                      <Badge className={getTipoColor(sueldoItem.clase, sueldoItem.naturaleza)}>
                        {getTipoLabel(sueldoItem.clase, sueldoItem.naturaleza)}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 text-muted-foreground">
                  No se encontraron ítems
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tipo */}
        <div className="space-y-2">
          <Label htmlFor="tipo">Tipo *</Label>
          <Select
            value={watchedTipo}
            onValueChange={(value) => setValue('tipo', value as any)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tipoOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <Badge className={option.color}>
                    {option.label}
                  </Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.tipo && (
            <p className="text-sm text-red-500">{errors.tipo.message}</p>
          )}
        </div>

        {/* Nombre */}
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre del Ítem *</Label>
          <Input
            {...register('nombre')}
            placeholder="Ej: Bono responsabilidad, Descuento tardanza..."
            className={cn(errors.nombre && 'border-red-500')}
          />
          {errors.nombre && (
            <p className="text-sm text-red-500">{errors.nombre.message}</p>
          )}
        </div>

        {/* Monto */}
        <div className="space-y-2">
          <Label htmlFor="monto">Monto *</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              {...register('monto', { valueAsNumber: true })}
              type="number"
              step="0.01"
              min="0"
              max="999999999.99"
              placeholder="0.00"
              className={cn('pl-10', errors.monto && 'border-red-500')}
            />
          </div>
          {errors.monto && (
            <p className="text-sm text-red-500">{errors.monto.message}</p>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {watchedTipo === 'descuento' ? (
              <>
                <AlertTriangle className="h-3 w-3" />
                <span>El monto se aplicará como descuento (negativo)</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-3 w-3" />
                <span>El monto se aplicará como haber (positivo)</span>
              </>
            )}
          </div>
        </div>

        {/* Glosa */}
        <div className="space-y-2">
          <Label htmlFor="glosa">Glosa (Opcional)</Label>
          <Textarea
            {...register('glosa')}
            placeholder="Descripción adicional del ítem..."
            rows={3}
          />
          {errors.glosa && (
            <p className="text-sm text-red-500">{errors.glosa.message}</p>
          )}
        </div>

        {/* Footer */}
        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {item ? 'Actualizar' : 'Crear'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
