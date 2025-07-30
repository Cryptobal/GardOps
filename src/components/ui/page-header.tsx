"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "./card";
import { Button } from "./button";
import { LucideIcon } from "lucide-react";

export interface KPICard {
  label: string;
  value: number;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  actionButton?: {
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary' | 'destructive';
  };
  kpis?: KPICard[];
  className?: string;
}

export function PageHeader({
  title,
  description,
  actionButton,
  kpis,
  className = ""
}: PageHeaderProps) {
  const variantClasses = {
    default: 'bg-slate-800 border-slate-700 text-slate-200',
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    danger: 'bg-red-500/10 border-red-500/20 text-red-400'
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header principal */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">{title}</h1>
          {description && (
            <p className="text-slate-400 mt-1">{description}</p>
          )}
        </div>
        {actionButton && (
          <Button
            onClick={actionButton.onClick}
            variant={actionButton.variant || "default"}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <actionButton.icon className="h-4 w-4 mr-2" />
            {actionButton.label}
          </Button>
        )}
      </div>

      {/* KPIs Cards */}
      {kpis && kpis.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((kpi, index) => {
            const Icon = kpi.icon;
            return (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`rounded-2xl border p-6 ${variantClasses[kpi.variant || 'default']}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-wider opacity-80">
                      {kpi.label}
                    </p>
                    <p className="text-3xl font-bold mt-2">
                      {kpi.value.toLocaleString()}
                    </p>
                    {kpi.trend && (
                      <div className="flex items-center mt-2">
                        <span className={`text-xs ${kpi.trend.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {kpi.trend.isPositive ? '↗' : '↘'} {Math.abs(kpi.trend.value)}%
                        </span>
                        <span className="text-xs text-slate-400 ml-1">vs mes anterior</span>
                      </div>
                    )}
                  </div>
                  <div className="opacity-60">
                    <Icon className="h-8 w-8" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
} 