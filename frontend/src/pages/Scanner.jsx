import { useState, useEffect, useCallback } from 'react'
import QRReader from '../components/QRReader'
import EstadoSesion from '../components/EstadoSesion'
import { postScan, getEstado, resetSesion } from '../api'

export default function Scanner() {
  const [sesion, setSesion] = useState({ equipo: null, usuario: null, ubicacion: null, inicio: null })
  const [mensaje, setMensaje] = useState('')
  const [accion, setAccion] = useState('')

  useEffect(() => {
    getEstado().then(r => setSesion(r.data)).catch(() => {})
  }, [])

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

  const handleReset = async () => {
    await resetSesion()
    setSesion({ equipo: null, usuario: null, ubicacion: null, inicio: null })
    setMensaje('Sesión reiniciada')
    setAccion('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: '1px solid #1f2937' }}>
        <h1 className="text-lg font-semibold text-white">Scanner</h1>
        {sesion.equipo && (
          <button onClick={handleReset} className="text-xs text-red-400 hover:text-red-300 border border-red-800 rounded-lg px-3 py-1">
            Cancelar sesión
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#030712' }}>
          <QRReader onScan={handleScan} />
        </div>
        <div style={{ width: 320, flexShrink: 0, overflowY: 'auto', padding: 16, borderLeft: '1px solid #1f2937' }}>
          <EstadoSesion sesion={sesion} mensaje={mensaje} accion={accion} />
        </div>
      </div>
    </div>
  )
}
