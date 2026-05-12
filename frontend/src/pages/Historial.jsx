import { useState, useEffect, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { getHistorial } from '../api'
import { FileDown, X } from 'lucide-react'

// ── helpers ───────────────────────────────────────────────────────────────────

function toUTC(iso) {
  if (!iso) return null
  return new Date(iso.includes('+') || iso.endsWith('Z') ? iso : iso + 'Z')
}

function duracion(inicio, fin, ahora) {
  const end = fin ? toUTC(fin) : new Date(ahora)
  const diff = Math.floor((end - toUTC(inicio)) / 1000)
  if (diff < 0) return '—'
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`
}

function fmt(iso) {
  if (!iso) return '—'
  return toUTC(iso).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── filtros ───────────────────────────────────────────────────────────────────

const FILTROS_VACIOS = {
  equipo: '',
  usuario: '',
  instalacion: '',
  fechaDesde: '',
  fechaHasta: '',
  estado: 'todos',
}

function filtrar(registros, f) {
  return registros.filter(r => {
    if (f.equipo && !r.equipo?.nombre?.toLowerCase().includes(f.equipo.toLowerCase())) return false
    if (f.usuario && !r.usuario?.nombre?.toLowerCase().includes(f.usuario.toLowerCase())) return false
    if (f.instalacion) {
      const inst = r.ubicacion?.instalacion ?? r.ubicacion_custom ?? ''
      if (!inst.toLowerCase().includes(f.instalacion.toLowerCase())) return false
    }
    if (f.estado === 'activa' && r.fecha_fin !== null) return false
    if (f.estado === 'cerrada' && r.fecha_fin === null) return false
    if (f.fechaDesde) {
      const desde = new Date(f.fechaDesde)
      if (toUTC(r.fecha_inicio) < desde) return false
    }
    if (f.fechaHasta) {
      const hasta = new Date(f.fechaHasta)
      hasta.setDate(hasta.getDate() + 1)
      if (toUTC(r.fecha_inicio) >= hasta) return false
    }
    return true
  })
}

// ── export ────────────────────────────────────────────────────────────────────

function exportarXLSX(registros) {
  const ahora = Date.now()
  const filas = registros.map(r => ({
    Equipo: r.equipo?.nombre ?? '',
    Usuario: r.usuario?.nombre ?? '—',
    Instalación: r.ubicacion?.instalacion ?? r.ubicacion_custom ?? '—',
    Inicio: fmt(r.fecha_inicio),
    Fin: r.fecha_fin ? fmt(r.fecha_fin) : 'Activa',
    Duración: duracion(r.fecha_inicio, r.fecha_fin, ahora),
    Estado: r.fecha_fin ? 'Cerrada' : 'Activa',
  }))
  const ws = XLSX.utils.json_to_sheet(filas)
  ws['!cols'] = [22, 22, 22, 18, 18, 12, 10].map(w => ({ wch: w }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Historial')
  XLSX.writeFile(wb, `historial_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

// ── componentes ───────────────────────────────────────────────────────────────

function FiltroInput({ placeholder, value, onChange }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-gray-800 text-white text-xs rounded-lg px-3 py-1.5 w-36 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500"
    />
  )
}

// ── página ────────────────────────────────────────────────────────────────────

export default function Historial() {
  const [registros, setRegistros] = useState([])
  const [ahora, setAhora] = useState(Date.now())
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)

  const reload = useCallback(() => {
    getHistorial().then(r => setRegistros(r.data))
  }, [])

  useEffect(() => { reload() }, [reload])

  const hasActiva = registros.some(r => r.fecha_fin === null)

  useEffect(() => {
    if (!hasActiva) return
    const id = setInterval(reload, 5_000)
    return () => clearInterval(id)
  }, [hasActiva, reload])

  useEffect(() => {
    if (!hasActiva) return
    const id = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [hasActiva])

  const setF = (key, val) => setFiltros(f => ({ ...f, [key]: val }))
  const limpiar = () => setFiltros(FILTROS_VACIOS)
  const hayFiltros = Object.entries(filtros).some(([k, v]) => v !== FILTROS_VACIOS[k])

  const registrosFiltrados = filtrar(registros, filtros)

  return (
    <div className="flex flex-col h-full">
      {/* Cabecera */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <h1 className="text-lg font-semibold text-white">Historial de uso</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportarXLSX(registrosFiltrados)}
            className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 border border-green-800 hover:border-green-600 rounded-lg px-3 py-1.5 transition-colors"
          >
            <FileDown size={13} /> Exportar XLSX
          </button>
          <button onClick={reload} className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg px-3 py-1.5">
            Actualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center px-4 py-3 border-b border-gray-800 bg-gray-900/40">
        <FiltroInput placeholder="Equipo" value={filtros.equipo} onChange={v => setF('equipo', v)} />
        <FiltroInput placeholder="Usuario" value={filtros.usuario} onChange={v => setF('usuario', v)} />
        <FiltroInput placeholder="Instalación" value={filtros.instalacion} onChange={v => setF('instalacion', v)} />

        <select
          value={filtros.estado}
          onChange={e => setF('estado', e.target.value)}
          className="bg-gray-800 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="todos">Todos</option>
          <option value="activa">Activa</option>
          <option value="cerrada">Cerrada</option>
        </select>

        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">Desde</span>
          <input
            type="date"
            value={filtros.fechaDesde}
            onChange={e => setF('fechaDesde', e.target.value)}
            className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">Hasta</span>
          <input
            type="date"
            value={filtros.fechaHasta}
            onChange={e => setF('fechaHasta', e.target.value)}
            className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {hayFiltros && (
          <button
            onClick={limpiar}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white ml-1"
          >
            <X size={13} /> Limpiar
          </button>
        )}

        <span className="text-xs text-gray-600 ml-auto">
          {registrosFiltrados.length} / {registros.length} registros
        </span>
      </div>

      {/* Tabla */}
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
            {registrosFiltrados.map(r => {
              const activa = r.fecha_fin === null
              return (
                <tr key={r.id} className={`border-t border-gray-800 ${activa ? 'bg-green-950/30' : 'hover:bg-gray-800/50'}`}>
                  <td className="px-4 py-3 text-white">
                    <span className="flex items-center gap-2">
                      {activa && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />}
                      {r.equipo?.nombre}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{r.usuario?.nombre || '—'}</td>
                  <td className="px-4 py-3 text-gray-300">
                    {r.ubicacion?.instalacion || r.ubicacion_custom || '—'}
                    {r.ubicacion_custom && !r.ubicacion && <span className="ml-1 text-xs text-gray-500">(P)</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmt(r.fecha_inicio)}</td>
                  <td className="px-4 py-3 text-xs">
                    {activa
                      ? <span className="text-green-400 font-medium">Activa</span>
                      : <span className="text-gray-400">{fmt(r.fecha_fin)}</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-xs font-mono">
                    {activa
                      ? <span className="text-green-300">{duracion(r.fecha_inicio, null, ahora)}</span>
                      : <span className="text-gray-400">{duracion(r.fecha_inicio, r.fecha_fin, ahora)}</span>
                    }
                  </td>
                </tr>
              )
            })}
            {registrosFiltrados.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-500 py-12">
                  {hayFiltros ? 'Sin resultados para los filtros aplicados' : 'Sin registros aún'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
