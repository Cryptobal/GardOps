'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, Plus } from 'lucide-react';
import TurnoExtraModal from './TurnoExtraModal';

interface TurnoExtraButtonProps {
  guardia_id: string;
  guardia_nombre: string;
  puesto_id: string;
  puesto_nombre: string;
  pauta_id: string;
  fecha: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export default function TurnoExtraButton({
  guardia_id,
  guardia_nombre,
  puesto_id,
  puesto_nombre,
  pauta_id,
  fecha,
  variant = 'outline',
  size = 'sm',
  className = ''
}: TurnoExtraButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Button
        onClick={handleClick}
        variant={variant}
        size={size}
        className={`${className} gap-2`}
      >
        <Clock className="h-4 w-4" />
        <Plus className="h-3 w-3" />
        Turno Extra
      </Button>

      <TurnoExtraModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        guardia_id={guardia_id}
        guardia_nombre={guardia_nombre}
        puesto_id={puesto_id}
        puesto_nombre={puesto_nombre}
        pauta_id={pauta_id}
        fecha={fecha}
      />
    </>
  );
}

// Exportar también como export nombrado para compatibilidad
export { TurnoExtraButton } 