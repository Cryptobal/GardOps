"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Moon, Sun } from "lucide-react";
import { navigationItems } from "../../lib/navigation";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const pathname = usePathname();

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("light");
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Mobile toggle button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 lg:hidden rounded-2xl"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-80 bg-card/95 backdrop-blur-xl border-r border-border/50 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-auto",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500" style={{ animationDelay: '200ms' }}>
                <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">G</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">GardOps</h2>
                  <p className="text-sm text-muted-foreground">Sistema de Gestión</p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-2xl lg:flex"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map((item, index) => {
              const isActive = pathname === item.href;
              return (
                <div
                  key={item.href}
                  className="animate-in fade-in slide-in-from-left-4 duration-500"
                  style={{ animationDelay: `${100 * index}ms` }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "sidebar-item",
                      isActive && "active"
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium">{item.name}</span>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </Link>
                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-border/50">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                © 2024 GardOps v1.0.0
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
} 