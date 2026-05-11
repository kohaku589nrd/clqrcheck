import { useState, useEffect } from 'react'
import {
  getUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario, qrUrl,
  getUbicaciones, crearUbicacion, actualizarUbicacion, eliminarUbicacion, masterQrUrl
} from '../api'
import { Plus, Pencil, Trash2, QrCode, X } from 'lucide-react'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-semibold">{title}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function SimpleForm({ fields, initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || fields.reduce((a, f) => ({ ...a, [f.key]: '' }), {}))
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="flex flex-col gap-3">
      {fields.map(f => (
        <div key={f.key}>
          <label className="text-xs text-gray-400 mb-1 block">{f.label} *</label>
          <input
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form[f.key]}
            onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
            required
          />
        </div>
      ))}
      <div className="flex gap-2 mt-1">
        <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2 text-sm font-medium">Guardar</button>
        <button type="button" onClick={onCancel} className="flex-1 bg-gray-700 text-white rounded-lg py-2 text-sm">Cancelar</button>
      </div>
    </form>
  )
}

function Section({ title, items, fields, onSave, onUpdate, onDelete, qrPath, extra }) {
  const [modal, setModal] = useState(null)
  return (
    <div className="bg-gray-800 rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-white font-semibold">{title}</h2>
        {extra}
        <button onClick={() => setModal('create')} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-1.5 text-xs font-medium">
          <Plus size={14}/> Nuevo
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-2">
            <span className="flex-1 text-sm text-white">{item.nombre || item.instalacion}</span>
            <span className="text-xs text-gray-400">{item.codigo}</span>
            <button onClick={() => setModal({ qr: item })} className="p-1 text-gray-400 hover:text-white"><QrCode size={14}/></button>
            <button onClick={() => setModal({ edit: item })} className="p-1 text-gray-400 hover:text-white"><Pencil size={14}/></button>
            <button onClick={() => onDelete(item.id)} className="p-1 text-red-400 hover:text-red-300"><Trash2 size={14}/></button>
          </div>
        ))}
        {items.length === 0 && <p className="text-gray-500 text-xs text-center py-4">Sin registros</p>}
      </div>

      {modal === 'create' && (
        <Modal title={`Nuevo — ${title}`} onClose={() => setModal(null)}>
          <SimpleForm fields={fields} onSave={async (d) => { await onSave(d); setModal(null) }} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.edit && (
        <Modal title="Editar" onClose={() => setModal(null)}>
          <SimpleForm fields={fields} initial={modal.edit} onSave={async (d) => { await onUpdate(modal.edit.id, d); setModal(null) }} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.qr && (
        <Modal title={`QR — ${modal.qr.nombre || modal.qr.instalacion}`} onClose={() => setModal(null)}>
          <img src={qrUrl(qrPath, modal.qr.id)} alt="QR" className="w-full rounded-lg" />
        </Modal>
      )}
    </div>
  )
}

export default function Configuracion() {
  const [usuarios, setUsuarios] = useState([])
  const [ubicaciones, setUbicaciones] = useState([])
  const [showMaster, setShowMaster] = useState(false)

  const reloadU = () => getUsuarios().then(r => setUsuarios(r.data))
  const reloadUb = () => getUbicaciones().then(r => setUbicaciones(r.data))
  useEffect(() => { reloadU(); reloadUb() }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-800">
        <h1 className="text-lg font-semibold text-white">Configuración</h1>
      </div>
      <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
        <Section
          title="Usuarios"
          items={usuarios}
          fields={[{ key: 'nombre', label: 'Nombre' }, { key: 'codigo', label: 'Código único' }]}
          onSave={async (d) => { await crearUsuario(d); reloadU() }}
          onUpdate={async (id, d) => { await actualizarUsuario(id, d); reloadU() }}
          onDelete={async (id) => { if (confirm('¿Eliminar?')) { await eliminarUsuario(id); reloadU() } }}
          qrPath="usuarios"
        />
        <Section
          title="Instalaciones"
          items={ubicaciones}
          fields={[{ key: 'instalacion', label: 'Nombre instalación' }, { key: 'codigo', label: 'Código único' }]}
          onSave={async (d) => { await crearUbicacion(d); reloadUb() }}
          onUpdate={async (id, d) => { await actualizarUbicacion(id, d); reloadUb() }}
          onDelete={async (id) => { if (confirm('¿Eliminar?')) { await eliminarUbicacion(id); reloadUb() } }}
          qrPath="ubicaciones"
          extra={
            <button onClick={() => setShowMaster(true)} className="text-xs text-yellow-400 border border-yellow-800 rounded-lg px-2 py-1 hover:bg-yellow-900/30">
              QR Maestro
            </button>
          }
        />

        {showMaster && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-white font-semibold">QR Maestro</h2>
                <button onClick={() => setShowMaster(false)}><X size={20} className="text-gray-400" /></button>
              </div>
              <p className="text-gray-400 text-xs mb-3">Escanear este código cierra la sesión activa y guarda el historial.</p>
              <img src={masterQrUrl()} alt="QR Maestro" className="w-full rounded-lg" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
