import { useState } from 'react';

export interface EntityModalState<T = any> {
  isCreateOpen: boolean;
  isDetailOpen: boolean;
  selectedEntity: T | null;
  editingEntity: T | null;
  isEditingDetails: boolean;
}

export interface EntityModalActions<T = any> {
  openCreate: () => void;
  openDetail: (entity: T) => void;
  closeAll: () => void;
  setEditingEntity: (entity: T | null) => void;
  setIsEditingDetails: (isEditing: boolean) => void;
  updateSelectedEntity: (entity: T) => void;
}

export const useEntityModal = <T = any>(): EntityModalState<T> & EntityModalActions<T> => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<T | null>(null);
  const [editingEntity, setEditingEntity] = useState<T | null>(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);

  const openCreate = () => {
    setIsCreateOpen(true);
    setIsDetailOpen(false);
    setSelectedEntity(null);
    setEditingEntity(null);
    setIsEditingDetails(false);
  };

  const openDetail = (entity: T) => {
    setSelectedEntity(entity);
    setIsDetailOpen(true);
    setIsCreateOpen(false);
    setEditingEntity(null);
    setIsEditingDetails(false);
  };

  const closeAll = () => {
    setIsCreateOpen(false);
    setIsDetailOpen(false);
    setSelectedEntity(null);
    setEditingEntity(null);
    setIsEditingDetails(false);
  };

  const updateSelectedEntity = (entity: T) => {
    setSelectedEntity(entity);
  };

  return {
    // Estados
    isCreateOpen,
    isDetailOpen,
    selectedEntity,
    editingEntity,
    isEditingDetails,
    
    // Acciones
    openCreate,
    openDetail,
    closeAll,
    setEditingEntity,
    setIsEditingDetails,
    updateSelectedEntity,
  };
}; 