"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function BackToPayroll({className=""}:{className?:string}) {
  return (
    <div className={`mb-4 ${className}`}>
      <Link
        href="/payroll"
        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        aria-label="Volver a Payroll"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Volver a Payroll</span>
        <span className="sm:hidden">Payroll</span>
      </Link>
    </div>
  );
}

