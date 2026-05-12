import { useState, useEffect, useCallback, useRef } from 'react'
import QRReader from '../components/QRReader'
import EstadoSesion from '../components/EstadoSesion'
import { postScan, getEstado, resetSesion } from '../api'

const TIMEOUT_SESION_MS = 60_000

export default function Scanner() {
  const [sesion, setSesion] = useState({ equipo: null, usuario: null, ubicacion: null, ubicacion_custom: null, inicio: null, completado_at: null, es_retoma: false })
  const [mensaje, setMensaje] = useState('')
  const [accion, setAccion] = useState('')
  const [countdown, setCountdown] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    getEstado().then(r => setSesion(r.data)).catch(() => {})
  }, [])

  const handleReset = useCallback(async (msg = 'Sesión reiniciada') => {
    await resetSesion()
    setSesion({ equipo: null, usuario: null, ubicacion: null, ubicacion_custom: null, inicio: null, completado_at: null, es_retoma: false })
    setMensaje(msg)
    setAccion('')
  }, [])

  // Countdown cuando la sesión está completa (equipo + usuario + ubicacion)
  useEffect(() => {
    clearInterval(timerRef.current)

    if (!sesion.completado_at) {
      setCountdown(null)
      return
    }

    // completado_at viene como datetime naive UTC de FastAPI — forzar interpretación UTC
    const deadline = new Date(sesion.completado_at + 'Z').getTime() + TIMEOUT_SESION_MS
    let fired = false

    const tick = () => {
      const rem = Math.ceil((deadline - Date.now()) / 1000)
      if (rem <= 0) {
        if (!fired) {
          fired = true
          setCountdown(0)
          handleReset('Sesión cancelada por inactividad')
        }
        return
      }
      setCountdown(rem)
    }

    tick()
    timerRef.current = setInterval(tick, 1000)
    return () => {
      clearInterval(timerRef.current)
      fired = true
    }
  }, [sesion.completado_at, handleReset])

  const handleScan = useCallback(async (raw) => {
    try {
      const res = await postScan(raw)
      setSesion(res.data.sesion)
      setMensaje(res.data.mensaje)
      setAccion(res.data.accion)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al procesar QR'
      setMensaje(msg)
      setAccion('error')
    }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: '1px solid #1f2937' }}>
        <h1 className="text-lg font-semibold text-white">Scanner</h1>
        {sesion.equipo && (
          <button
            onClick={() => handleReset('Scanner en standby')}
            className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-3 py-1 transition-colors"
          >
            Standby
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#030712' }}>
          <QRReader onScan={handleScan} />
        </div>
        <div style={{ width: 320, flexShrink: 0, overflowY: 'auto', padding: 16, borderLeft: '1px solid #1f2937' }}>
          <EstadoSesion sesion={sesion} mensaje={mensaje} accion={accion} countdown={countdown} onScan={handleScan} />
        </div>
      </div>
    </div>
  )
}
