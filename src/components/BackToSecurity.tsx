"use client";
import Link from "next/link";

export default function BackToSecurity({className=""}:{className?:string}) {
  return (
    <div className={`mb-4 ${className}`}>
      <Link
        href="/configuracion/seguridad"
        className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-white/5"
        aria-label="Volver a Seguridad"
      >
        ← Volver a Seguridad
      </Link>
    </div>
  );
}


