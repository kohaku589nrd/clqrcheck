import { useState, useEffect } from 'react'
import { getHistorial } from '../api'

function duracion(inicio, fin) {
  const diff = Math.floor((new Date(fin) - new Date(inicio)) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`
}

function fmt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Historial() {
  const [registros, setRegistros] = useState([])

  useEffect(() => {
    getHistorial().then(r => setRegistros(r.data))
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <h1 className="text-lg font-semibold text-white">Historial de uso</h1>
        <button onClick={() => getHistorial().then(r => setRegistros(r.data))} className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg px-3 py-1">
          Actualizar
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-900">
            <tr className="text-gray-400 text-xs uppercase">
              <th className="text-left px-4 py-3">Equipo</th>
              <th className="text-left px-4 py-3">Usuario</th>
              <th className="text-left px-4 py-3">Instalación</th>
              <th className="text-left px-4 py-3">Inicio</th>
              <th className="text-left px-4 py-3">Fin</th>
              <th className="text-left px-4 py-3">Duración</th>
            </tr>
          </thead>
          <tbody>
            {registros.map(r => (
              <tr key={r.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                <td className="px-4 py-3 text-white">{r.equipo?.nombre}</td>
                <td className="px-4 py-3 text-gray-300">{r.usuario?.nombre || '—'}</td>
                <td className="px-4 py-3 text-gray-300">{r.ubicacion?.instalacion || '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{fmt(r.fecha_inicio)}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{fmt(r.fecha_fin)}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{duracion(r.fecha_inicio, r.fecha_fin)}</td>
              </tr>
            ))}
            {registros.length === 0 && (
              <tr><td colSpan={6} className="text-center text-gray-500 py-12">Sin registros aún</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
