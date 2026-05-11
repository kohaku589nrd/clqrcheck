import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const getEstado = () => api.get('/scanner/estado')
export const postScan = (data) => api.post('/scanner/scan', { data })
export const resetSesion = () => api.post('/scanner/reset')

export const getEquipos = () => api.get('/equipos/')
export const crearEquipo = (data) => api.post('/equipos/', data)
export const actualizarEquipo = (id, data) => api.put(`/equipos/${id}`, data)
export const eliminarEquipo = (id) => api.delete(`/equipos/${id}`)
export const subirFoto = (id, file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post(`/equipos/${id}/foto`, form)
}

export const getUsuarios = () => api.get('/usuarios/')
export const crearUsuario = (data) => api.post('/usuarios/', data)
export const actualizarUsuario = (id, data) => api.put(`/usuarios/${id}`, data)
export const eliminarUsuario = (id) => api.delete(`/usuarios/${id}`)

export const getUbicaciones = () => api.get('/ubicaciones/')
export const crearUbicacion = (data) => api.post('/ubicaciones/', data)
export const actualizarUbicacion = (id, data) => api.put(`/ubicaciones/${id}`, data)
export const eliminarUbicacion = (id) => api.delete(`/ubicaciones/${id}`)

export const getHistorial = () => api.get('/historial/')

export const qrUrl = (tipo, id) => `/api/${tipo}/${id}/qr`
export const masterQrUrl = () => `/api/ubicaciones/master/qr`
export const fotoUrl = (id) => `/api/equipos/${id}/foto/imagen`
