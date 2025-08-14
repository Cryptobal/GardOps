import React from 'react';

export type Action =
  | 'read:list' | 'read:detail' | 'create' | 'update' | 'delete' | 'export'
  | 'manage:roles' | 'admin:*';

export type Resource =
  | 'clientes' | 'instalaciones' | 'guardias' | 'puestos'
  | 'pauta_mensual' | 'pauta_diaria' | 'payroll' | 'configuracion';

export function can(resource: Resource, action: Action, eff: Record<string, string[]>) {
  const actions = eff[resource] || [];
  return actions.includes(action) || actions.includes('admin:*');
}

export function Authorize(
  { resource, action, eff, children }:
  { resource: Resource, action: Action, eff: Record<string, string[]>, children: React.ReactNode }
) {
  if (!can(resource, action, eff)) return null;
  return <>{children}</>;
}

export function GuardButton(
  { resource, action, eff, onClick, children, ...props }:
  { resource: Resource, action: Action, eff: Record<string, string[]>, onClick?: () => void, children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  if (!can(resource, action, eff)) {
    return <button {...props} disabled>{children}</button>;
  }
  return <button {...props} onClick={onClick}>{children}</button>;
}