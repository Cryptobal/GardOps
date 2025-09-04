"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { MoreVertical, Power } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

interface ActionDropdownProps {
  isActive: boolean;
  onInactivate: (event?: React.MouseEvent) => void;
  onActivate: (event?: React.MouseEvent) => void;
  entityType?: 'instalacion' | 'guardia' | 'cliente';
}

export function ActionDropdown({ 
  isActive, 
  onInactivate, 
  onActivate,
  entityType = 'instalacion' 
}: ActionDropdownProps) {
  const handleAction = (action: () => void, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    action();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-muted"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        {isActive ? (
          <DropdownMenuItem
            onClick={(e) => handleAction(() => onInactivate(e), e)}
            className="text-orange-600 focus:text-orange-700 focus:bg-orange-50 dark:focus:bg-orange-950"
          >
            <Power className="h-4 w-4 mr-2" />
            Inactivar
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={(e) => handleAction(() => onActivate(e), e)}
            className="text-green-600 focus:text-green-700 focus:bg-green-50 dark:focus:bg-green-950"
          >
            <Power className="h-4 w-4 mr-2" />
            Activar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
};
