"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "./card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { Badge } from "./badge";
import { Button } from "./button";
import { Switch } from "./switch";
import { LucideIcon } from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
  onRowClick?: (item: T) => void;
  mobileCard?: (item: T) => React.ReactNode;
  className?: string;
  rowClassName?: string;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  loading = false,
  emptyMessage = "No hay datos disponibles",
  emptyIcon: EmptyIcon,
  onRowClick,
  mobileCard,
  className = "",
  rowClassName = ""
}: DataTableProps<T>) {
  const [isMobile, setIsMobile] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <Card className={`bg-card/50 backdrop-blur-sm border-border/50 shadow-xl h-full ${className}`}>
        <CardContent className="p-0 h-full flex flex-col">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={`bg-card/50 backdrop-blur-sm border-border/50 shadow-xl h-full ${className}`}>
        <CardContent className="p-0 h-full flex flex-col">
          <div className="text-center py-12">
            {EmptyIcon && <EmptyIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />}
            <h3 className="text-lg font-medium text-foreground mb-2">
              {emptyMessage}
            </h3>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleRowClick = (item: T) => {
    onRowClick?.(item);
  };

  return (
    <Card className={`bg-card/50 backdrop-blur-sm border-border/50 shadow-xl h-full ${className}`}>
      <CardContent className="p-0 h-full flex flex-col">
        {/* Vista desktop - Tabla */}
        <div className="hidden lg:block flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card/95 backdrop-blur-sm z-10">
              <TableRow>
                {columns.map((column) => (
                  <TableHead 
                    key={column.key} 
                    className="font-semibold"
                    style={{ width: column.width }}
                  >
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow
                  key={item.id}
                  className={`cursor-pointer hover:bg-muted/50 transition-colors ${rowClassName}`}
                  onClick={() => handleRowClick(item)}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      {column.render ? column.render(item) : (item as any)[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Vista móvil - Cards */}
        {mobileCard && (
          // Mobile-first: 1 col en xs para evitar solapamientos; 2 col en sm+
          <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 sm:p-4 overflow-auto flex-1">
            {data.map((item) => (
              <motion.div
                key={item.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {mobileCard(item)}
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 