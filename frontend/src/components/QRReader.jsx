import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function QRReader({ onScan }) {
  const started = useRef(false)
  const scannerRef = useRef(null)
  const [error, setError] = useState(null)
  const lastScan = useRef({ time: 0, text: '' })
  const COOLDOWN_MS = 2000

  useEffect(() => {
    if (started.current) return
    started.current = true

    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner

    const tryStart = async (cameraId) => {
      await scanner.start(
        cameraId,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => {
          const now = Date.now()
          if (now - lastScan.current.time < COOLDOWN_MS) return
          if (text === lastScan.current.text && now - lastScan.current.time < 5000) return
          lastScan.current = { time: now, text }
          onScan(text)
        },
        () => {}
      )
    }

    Html5Qrcode.getCameras()
      .then((cameras) => {
        if (!cameras.length) throw new Error('No se encontró cámara')
        return tryStart(cameras[0].id)
      })
      .catch((err) => setError(String(err)))

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div
        id="qr-reader"
        style={{ width: 380, maxWidth: '100%', borderRadius: 12, overflow: 'hidden', background: '#111827' }}
      />
      {error && (
        <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>
      )}
    </div>
  )
}
