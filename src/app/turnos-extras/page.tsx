// /src/app/turnos-extras/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";

type Row = {
  fecha: string;
  instalacion_id: string | null;
  instalacion_nombre: string | null;
  puesto_id: string | null;
  rol_id: string | null;
  origen: "ppc" | "reemplazo";
  titular_guardia_id: string | null;
  titular_guardia_nombre: string | null;
  cobertura_guardia_id: string | null;
  cobertura_guardia_nombre: string | null;
  extra_uid: string | null;
};

export default function TurnosExtrasPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");
  const [instalacionId, setInstalacionId] = useState("");
  const [origen, setOrigen] = useState<"" | "ppc" | "reemplazo">("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (desde) p.set("desde", desde);
    if (hasta) p.set("hasta", hasta);
    if (instalacionId) p.set("instalacion_id", instalacionId);
    if (origen) p.set("origen", origen);
    if (q) p.set("q", q);
    
    try {
      const res = await fetch(`/api/turnos-extras?${p.toString()}`);
      const json = await res.json();
      setRows(json.rows || []);
    } catch (error) {
      console.error('Error al cargar turnos extras:', error);
      setRows([]);
    }
    setLoading(false);
  };

  useEffect(() => { 
    fetchData(); 
    /* eslint-disable-next-line */ 
  }, []);

  const csvSantander = useMemo(() => {
    // Formato Santander (ejemplo mínimo; ajusta columnas que te pida tu banco)
    // columnas: Fecha;Instalación;Origen;Guardia Titular;Guardia Cobertura;Extra UID
    const head = ["Fecha","Instalación","Origen","Titular","Cobertura","Extra UID"];
    const body = rows.map(r => [
      r.fecha,
      r.instalacion_nombre ?? r.instalacion_id ?? "",
      r.origen.toUpperCase(),
      r.titular_guardia_nombre ?? r.titular_guardia_id ?? "",
      r.cobertura_guardia_nombre ?? r.cobertura_guardia_id ?? "",
      r.extra_uid ?? "",
    ]);
    const csv = [head, ...body].map(a => a.map(x => `"${(x ?? "").toString().replace(/"/g,'""')}"`).join(";")).join("\n");
    return new Blob([csv], { type: "text/csv;charset=utf-8" });
  }, [rows]);

  const downloadCSV = () => {
    const url = URL.createObjectURL(csvSantander);
    const a = document.createElement("a");
    a.href = url;
    a.download = `turnos-extras_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">📋 Turnos Extra</h1>
      <p className="text-gray-600">Reemplazos y PPC cubierto</p>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[120px]">
            <label className="text-sm font-medium block mb-1">Desde</label>
            <input 
              type="date" 
              value={desde} 
              onChange={e=>setDesde(e.target.value)} 
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="text-sm font-medium block mb-1">Hasta</label>
            <input 
              type="date" 
              value={hasta} 
              onChange={e=>setHasta(e.target.value)} 
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium block mb-1">Instalación ID</label>
            <input 
              value={instalacionId} 
              onChange={e=>setInstalacionId(e.target.value)} 
              placeholder="UUID de instalación" 
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="text-sm font-medium block mb-1">Origen</label>
            <select 
              value={origen} 
              onChange={e=>setOrigen(e.target.value as any)} 
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="ppc">PPC</option>
              <option value="reemplazo">Reemplazo</option>
            </select>
          </div>
          <div className="flex-1 min-w-[250px]">
            <label className="text-sm font-medium block mb-1">🔍 Buscar guardia</label>
            <input 
              value={q} 
              onChange={e=>setQ(e.target.value)} 
              placeholder="Nombre o apellido" 
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button 
            onClick={fetchData} 
            disabled={loading}
            className="px-4 py-2 rounded-md bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Cargando..." : "🔄 Aplicar filtros"}
          </button>
          <button 
            onClick={downloadCSV} 
            disabled={!rows.length}
            className="px-4 py-2 rounded-md border border-green-600 text-green-600 font-medium text-sm hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            📥 Exportar CSV
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">📅 Fecha</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">🏢 Instalación</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">📌 Origen</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">👤 Titular</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">🔄 Cobertura</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">📍 Puesto</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">🎭 Rol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500" colSpan={7}>
                    <div className="flex justify-center items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span>Cargando turnos extras...</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500" colSpan={7}>
                    No se encontraron turnos extras con los filtros aplicados
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr 
                    key={r.extra_uid ?? `${r.fecha}-${r.puesto_id}-${i}`} 
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap font-medium">{r.fecha}</td>
                    <td className="px-4 py-3">
                      <div className="max-w-[200px] truncate" title={r.instalacion_nombre ?? r.instalacion_id ?? ''}>
                        {r.instalacion_nombre ?? r.instalacion_id ?? '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        r.origen === 'ppc' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {r.origen.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[150px] truncate" title={r.titular_guardia_nombre ?? r.titular_guardia_id ?? ''}>
                        {r.titular_guardia_nombre ?? r.titular_guardia_id ?? '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[150px] truncate" title={r.cobertura_guardia_nombre ?? r.cobertura_guardia_id ?? ''}>
                        {r.cobertura_guardia_nombre ?? r.cobertura_guardia_id ?? '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                      {r.puesto_id ? r.puesto_id.slice(0, 8) : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                      {r.rol_id ? r.rol_id.slice(0, 8) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer con contador */}
        {rows.length > 0 && (
          <div className="bg-gray-50 px-4 py-2 border-t text-sm text-gray-600">
            Mostrando {rows.length} {rows.length === 1 ? 'turno extra' : 'turnos extras'}
          </div>
        )}
      </div>
    </div>
  );
}
