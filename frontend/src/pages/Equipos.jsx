import { useState, useEffect, useRef } from 'react'
import { getEquipos, crearEquipo, actualizarEquipo, eliminarEquipo, subirFoto, qrUrl, fotoUrl } from '../api'
import { Plus, Pencil, Trash2, QrCode, Upload, X } from 'lucide-react'

const EMPTY = { nombre: '', AMD: '', utilidad: '', fecha_cal: '', codigo: '', tipo_det: '' }

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-semibold text-lg">{title}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function EquipoForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const fields = [
    { key: 'nombre', label: 'Nombre', required: true },
    { key: 'codigo', label: 'Código único', required: true },
    { key: 'AMD', label: 'AMD' },
    { key: 'utilidad', label: 'Utilidad' },
    { key: 'fecha_cal', label: 'Fecha calibración (DD_MM_YYYY)' },
    { key: 'tipo_det', label: 'Tipo detector' },
  ]
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="flex flex-col gap-3">
      {fields.map(f => (
        <div key={f.key}>
          <label className="text-xs text-gray-400 mb-1 block">{f.label}{f.required && ' *'}</label>
          <input
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form[f.key]}
            onChange={set(f.key)}
            required={f.required}
          />
        </div>
      ))}
      <div className="flex gap-2 mt-2">
        <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2 text-sm font-medium">Guardar</button>
        <button type="button" onClick={onCancel} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2 text-sm">Cancelar</button>
      </div>
    </form>
  )
}

export default function Equipos() {
  const [equipos, setEquipos] = useState([])
  const [modal, setModal] = useState(null) // null | 'create' | { edit: equipo } | { qr: equipo }
  const fileRef = useRef()
  const [fotoTarget, setFotoTarget] = useState(null)

  const reload = () => getEquipos().then(r => setEquipos(r.data))
  useEffect(() => { reload() }, [])

  const handleCreate = async (data) => {
    await crearEquipo(data)
    setModal(null)
    reload()
  }

  const handleEdit = async (data) => {
    await actualizarEquipo(modal.edit.id, data)
    setModal(null)
    reload()
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar equipo?')) return
    await eliminarEquipo(id)
    reload()
  }

  const handleFoto = async (e) => {
    const file = e.target.files[0]
    if (!file || !fotoTarget) return
    await subirFoto(fotoTarget, file)
    reload()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <h1 className="text-lg font-semibold text-white">Equipos</h1>
        <button onClick={() => setModal('create')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-2 text-sm font-medium">
          <Plus size={16} /> Nuevo equipo
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="grid gap-3">
          {equipos.map(eq => (
            <div key={eq.id} className="bg-gray-800 rounded-xl p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                {eq.foto_path
                  ? <img src={fotoUrl(eq.id)} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">Sin foto</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{eq.nombre}</p>
                <p className="text-gray-400 text-xs">Código: {eq.codigo} · {eq.tipo_det || 'Sin detector'}</p>
                <p className="text-gray-400 text-xs">{eq.utilidad} · Cal: {eq.fecha_cal?.replaceAll('_', '/') || '—'}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => { setFotoTarget(eq.id); fileRef.current.click() }} className="p-2 text-gray-400 hover:text-white" title="Subir foto"><Upload size={16}/></button>
                <button onClick={() => setModal({ qr: eq })} className="p-2 text-gray-400 hover:text-white" title="Ver QR"><QrCode size={16}/></button>
                <button onClick={() => setModal({ edit: eq })} className="p-2 text-gray-400 hover:text-white" title="Editar"><Pencil size={16}/></button>
                <button onClick={() => handleDelete(eq.id)} className="p-2 text-red-400 hover:text-red-300" title="Eliminar"><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
          {equipos.length === 0 && <p className="text-gray-500 text-sm text-center py-12">No hay equipos. Crea el primero.</p>}
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />

      {modal === 'create' && (
        <Modal title="Nuevo equipo" onClose={() => setModal(null)}>
          <EquipoForm onSave={handleCreate} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.edit && (
        <Modal title="Editar equipo" onClose={() => setModal(null)}>
          <EquipoForm initial={modal.edit} onSave={handleEdit} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.qr && (
        <Modal title={`QR — ${modal.qr.nombre}`} onClose={() => setModal(null)}>
          <img src={qrUrl('equipos', modal.qr.id)} alt="QR" className="w-full rounded-lg" />
        </Modal>
      )}
    </div>
  )
}
