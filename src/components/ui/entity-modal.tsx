"use client";

import React from "react";
import { Modal } from "./modal";

export interface EntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

export function EntityModal({
  isOpen,
  onClose,
  title,
  children,
  size = "xl",
  className = ""
}: EntityModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      className={`bg-card/95 backdrop-blur-md ${className}`}
    >
      <div className="space-y-6 max-h-[80vh] overflow-y-auto">
        {children}
      </div>
    </Modal>
  );
} 