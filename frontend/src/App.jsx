import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { ScanLine, Package, History, Settings } from 'lucide-react'
import Scanner from './pages/Scanner'
import Equipos from './pages/Equipos'
import Historial from './pages/Historial'
import Configuracion from './pages/Configuracion'

const navItems = [
  { to: '/', icon: ScanLine, label: 'Scanner' },
  { to: '/equipos', icon: Package, label: 'Equipos' },
  { to: '/historial', icon: History, label: 'Historial' },
  { to: '/config', icon: Settings, label: 'Config' },
]

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#030712' }}>
        <nav className="w-16 flex flex-col items-center py-4 gap-2 bg-gray-900 border-r border-gray-800 flex-shrink-0">
          <div className="mb-4 p-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <ScanLine size={16} className="text-white" />
            </div>
          </div>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`
              }
              title={label}
            >
              <Icon size={20} />
            </NavLink>
          ))}
        </nav>
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/" element={<Scanner />} />
            <Route path="/equipos" element={<Equipos />} />
            <Route path="/historial" element={<Historial />} />
            <Route path="/config" element={<Configuracion />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
