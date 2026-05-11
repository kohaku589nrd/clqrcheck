import { fotoUrl } from '../api'
import { CheckCircle, XCircle, User, MapPin, Cpu, Clock } from 'lucide-react'

function calibracionVigente(fecha_cal) {
  if (!fecha_cal) return null
  // formato DD_MM_YYYY
  const parts = fecha_cal.split('_')
  if (parts.length !== 3) return null
  const [d, m, y] = parts
  const fecha = new Date(`${y}-${m}-${d}`)
  return fecha >= new Date()
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

export default function EstadoSesion({ sesion, mensaje, accion }) {
  const { equipo, usuario, ubicacion } = sesion || {}
  const vigente = calibracionVigente(equipo?.fecha_cal)

  const paso1 = !!equipo
  const paso2 = !!usuario
  const paso3 = !!ubicacion

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Pasos */}
      <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-2">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Estado actual</p>
        <Paso numero={1} label="Escanea equipo" done={paso1} active={!paso1} />
        <Paso numero={2} label="Escanea usuario" done={paso2} active={paso1 && !paso2} />
        <Paso numero={3} label="Escanea instalación destino" done={paso3} active={paso1 && paso2 && !paso3} />
        {paso3 && <p className="text-xs text-yellow-400 mt-1">Escanea QR maestro para finalizar</p>}
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
          {equipo.foto_path && (
            <img src={fotoUrl(equipo.id)} alt="foto" className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
          )}
          {!equipo.foto_path && (
            <div className="w-20 h-20 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <Cpu size={32} className="text-gray-500" />
            </div>
          )}
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

      {/* Ubicación */}
      {ubicacion && (
        <div className="bg-gray-800 rounded-xl p-4 flex items-center gap-3">
          <MapPin size={20} className="text-purple-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Instalación destino</p>
            <p className="text-white font-medium">{ubicacion.instalacion}</p>
          </div>
        </div>
      )}
    </div>
  )
}
