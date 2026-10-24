import React, { useState } from 'react'
import { Routes, Route, NavLink, Navigate, Link } from 'react-router-dom'
import Brand from '../components/Brand.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import Login from './Login.jsx'
import Resumen from './Resumen.jsx'
import Dispositivos from './Dispositivos.jsx'
import Historico from './Historico.jsx'
import Publica from './Publica.jsx'
import { Usuarios, Empresas } from './Admin.jsx'

const KEY = 'smca-demo-user'
const load = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) } catch { return null } }

const NAV = [
  { to: '/demo', end: true, label: 'Resumen', roles: ['admin', 'supervisor'] },
  { to: '/demo/dispositivos', label: 'Dispositivos', roles: ['admin', 'supervisor'] },
  { to: '/demo/historico', label: 'Histórico', roles: ['admin', 'supervisor'] },
  { to: '/demo/usuarios', label: 'Usuarios', roles: ['admin'] },
  { to: '/demo/empresas', label: 'Empresas', roles: ['superadmin'] }
]

export default function DemoApp () {
  const [user, setUser] = useState(load)
  const login = u => { sessionStorage.setItem(KEY, JSON.stringify(u)); setUser(u) }
  const logout = () => { sessionStorage.removeItem(KEY); setUser(null) }

  return (
    <Routes>
      <Route path="publica" element={<Publica />} />
      <Route path="*" element={user ? <Shell user={user} logout={logout} /> : <Login onLogin={login} />} />
    </Routes>
  )
}

function Shell ({ user, logout }) {
  const items = NAV.filter(n => n.roles.includes(user.rol))
  const home = user.rol === 'superadmin' ? '/demo/empresas' : '/demo'
  const guard = (roles, el) => (roles.includes(user.rol) ? el : <Navigate to={home} replace />)
  return (
    <div className="demo">
      <aside className="demo-side">
        <Brand to="/" />
        <nav>
          {items.map(n => <NavLink key={n.to} to={n.to} end={n.end} className="item">{n.label}</NavLink>)}
          <NavLink to="/demo/publica" className="item">Vista pública ↗</NavLink>
        </nav>
        <div className="sep">Sitio</div>
        <nav>
          <Link className="item" to="/sistema">Arquitectura del sistema</Link>
          <Link className="item" to="/firmware">Arquitectura del firmware</Link>
        </nav>
        <div className="demo-user">
          <b>{user.nombre}</b>
          <span className="muted">{user.correo}</span>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
            <button className="btn sm" onClick={logout}>Salir</button>
            <ThemeToggle />
          </div>
        </div>
      </aside>
      <div className="demo-main">
        <div className="demo-banner">
          <b>Datos simulados</b>
          <span>Colegiales, CABA · generados en el navegador con la escala AQI del sistema real · escritura deshabilitada.</span>
        </div>
        <Routes>
          <Route index element={guard(['admin', 'supervisor'], <Resumen />)} />
          <Route path="dispositivos" element={guard(['admin', 'supervisor'], <Dispositivos user={user} />)} />
          <Route path="historico" element={guard(['admin', 'supervisor'], <Historico />)} />
          <Route path="usuarios" element={guard(['admin'], <Usuarios user={user} />)} />
          <Route path="empresas" element={guard(['superadmin'], <Empresas />)} />
          <Route path="*" element={<Navigate to={home} replace />} />
        </Routes>
      </div>
    </div>
  )
}
