import { useState, useEffect } from 'react'
import { fotoUrl } from '../api'
import { CheckCircle, XCircle, User, MapPin, Cpu, Building2 } from 'lucide-react'

function calibracionVigente(fecha_cal) {
  if (!fecha_cal) return null
  const parts = fecha_cal.split('_')
  if (parts.length !== 3) return null
  const [d, m, y] = parts
  return new Date(`${y}-${m}-${d}`) >= new Date()
}

function EstadoBadge({ vigente }) {
  if (vigente === null) return null
  return vigente
    ? <span className="flex items-center gap-1 text-green-400 text-sm font-medium"><CheckCircle size={14}/> Calibración vigente</span>
    : <span className="flex items-center gap-1 text-red-400 text-sm font-medium"><XCircle size={14}/> Calibración vencida</span>
}

function Paso({ numero, label, done, active }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${done ? 'text-green-400' : active ? 'text-blue-400 font-semibold' : 'text-gray-500'}`}>
      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${done ? 'bg-green-500 border-green-500 text-white' : active ? 'border-blue-400 text-blue-400' : 'border-gray-600 text-gray-500'}`}>
        {done ? '✓' : numero}
      </span>
      {label}
    </div>
  )
}

function CountdownBar({ seconds, total = 60 }) {
  const pct = Math.max(0, (seconds / total) * 100)
  const urgent = seconds <= 10
  return (
    <div className="mt-3">
      <div className="flex justify-between items-center mb-1">
        <span className={`text-xs font-medium ${urgent ? 'text-red-400' : 'text-yellow-400'}`}>
          Auto-reset en {seconds}s
        </span>
        <span className="text-xs text-gray-500">Escanea QR maestro</span>
      </div>
      <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${urgent ? 'bg-red-500' : 'bg-yellow-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function CustomLocationInput({ onConfirm, onCancel }) {
  const [texto, setTexto] = useState('')
  const confirmar = () => { if (texto.trim()) onConfirm(texto.trim()) }
  return (
    <div className="mt-2 flex flex-col gap-2">
      <input
        autoFocus
        className="w-full bg-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500"
        placeholder="Nombre de instalación..."
        value={texto}
        onChange={e => setTexto(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') confirmar(); if (e.key === 'Escape') onCancel() }}
      />
      <div className="flex gap-2">
        <button
          onClick={confirmar}
          disabled={!texto.trim()}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs rounded-lg py-1.5 font-medium"
        >
          Confirmar
        </button>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-white px-3 py-1.5">
          Cancelar
        </button>
      </div>
    </div>
  )
}

export default function EstadoSesion({ sesion, mensaje, accion, countdown, onScan }) {
  const { equipo, usuario, ubicacion, ubicacion_custom, es_retoma } = sesion || {}
  const vigente = calibracionVigente(equipo?.fecha_cal)
  const [customMode, setCustomMode] = useState(false)

  const paso1 = !!equipo
  const paso2 = !!usuario
  const paso3 = !!ubicacion || !!ubicacion_custom

  // Resetear el input custom al cambiar de sesión o cuando ya está asignada la ubicación
  useEffect(() => {
    if (!equipo || paso3) setCustomMode(false)
  }, [equipo, paso3])

  const handleCustomConfirm = (texto) => {
    setCustomMode(false)
    onScan(JSON.stringify({ type: 'location_custom', texto }))
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Banner retoma */}
      {es_retoma && (
        <div className="bg-orange-900/40 border border-orange-700/50 rounded-xl px-4 py-3">
          <p className="text-orange-300 text-xs font-semibold uppercase tracking-wide mb-0.5">Sesión en retoma</p>
          <p className="text-orange-400 text-xs">Escanea el QR maestro para cerrar</p>
        </div>
      )}

      {/* Pasos */}
      <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-2">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Estado actual</p>
        <Paso numero={1} label="Escanea equipo" done={paso1} active={!paso1} />
        <Paso numero={2} label="Escanea usuario" done={paso2} active={paso1 && !paso2 && !es_retoma} />
        <Paso numero={3} label="Escanea instalación destino" done={paso3} active={paso1 && paso2 && !paso3 && !es_retoma} />

        {/* Botón instalación personalizada — visible en paso 3 pendiente */}
        {paso1 && paso2 && !paso3 && !es_retoma && (
          customMode
            ? <CustomLocationInput onConfirm={handleCustomConfirm} onCancel={() => setCustomMode(false)} />
            : (
              <button
                onClick={() => setCustomMode(true)}
                className="mt-1 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 pl-8"
              >
                <Building2 size={13} /> Instalación personalizada
              </button>
            )
        )}

        {paso3 && !es_retoma && (
          countdown !== null
            ? <CountdownBar seconds={countdown} total={60} />
            : <p className="text-xs text-yellow-400 mt-1">Escanea QR maestro para finalizar</p>
        )}
      </div>

      {/* Mensaje de última acción */}
      {mensaje && (
        <div className={`rounded-xl px-4 py-2 text-sm font-medium ${accion === 'error' ? 'bg-red-900/50 text-red-300' : 'bg-blue-900/50 text-blue-300'}`}>
          {mensaje}
        </div>
      )}

      {/* Equipo activo */}
      {equipo && (
        <div className="bg-gray-800 rounded-xl p-4 flex gap-4">
          {equipo.foto_path
            ? <img src={fotoUrl(equipo.id)} alt="foto" className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
            : <div className="w-20 h-20 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0"><Cpu size={32} className="text-gray-500" /></div>
          }
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-white font-semibold truncate">{equipo.nombre}</p>
            <EstadoBadge vigente={vigente} />
            <p className="text-gray-400 text-xs">Código: {equipo.codigo}</p>
            {equipo.utilidad && <p className="text-gray-400 text-xs">Utilidad: {equipo.utilidad}</p>}
            {equipo.tipo_det && <p className="text-gray-400 text-xs">Detector: {equipo.tipo_det}</p>}
            {equipo.AMD && <p className="text-gray-400 text-xs">AMD: {equipo.AMD}</p>}
            {equipo.fecha_cal && <p className="text-gray-400 text-xs">Cal: {equipo.fecha_cal.replaceAll('_', '/')}</p>}
          </div>
        </div>
      )}

      {/* Usuario */}
      {usuario && (
        <div className="bg-gray-800 rounded-xl p-4 flex items-center gap-3">
          <User size={20} className="text-blue-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Usuario asignado</p>
            <p className="text-white font-medium">{usuario.nombre}</p>
          </div>
        </div>
      )}

      {/* Ubicación (QR o personalizada) */}
      {(ubicacion || ubicacion_custom) && (
        <div className="bg-gray-800 rounded-xl p-4 flex items-center gap-3">
          <MapPin size={20} className="text-purple-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Instalación destino</p>
            <p className="text-white font-medium">{ubicacion?.instalacion ?? ubicacion_custom}</p>
            {ubicacion_custom && <p className="text-xs text-gray-500 mt-0.5">Personalizada</p>}
          </div>
        </div>
      )}
    </div>
  )
}
