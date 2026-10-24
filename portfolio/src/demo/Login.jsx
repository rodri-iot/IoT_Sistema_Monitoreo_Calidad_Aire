import React from 'react'
import { Link } from 'react-router-dom'
import Brand from '../components/Brand.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import { EMPRESA } from '../data/sites.js'

export const USERS = [
  { id: 'u-admin', correo: 'admin@colegiales.demo', rol: 'admin', nombre: 'Administrador', empresa: EMPRESA.nombre, desc: 'Gestiona usuarios, zonas y dispositivos de su empresa.' },
  { id: 'u-sup', correo: 'supervisor@colegiales.demo', rol: 'supervisor', nombre: 'Supervisor', empresa: EMPRESA.nombre, desc: 'Consulta zonas, dispositivos e histórico.' },
  { id: 'u-root', correo: 'root@smca.demo', rol: 'superadmin', nombre: 'Superadmin', empresa: 'Plataforma', desc: 'Administra las empresas de la plataforma.' }
]

export default function Login ({ onLogin }) {
  return (
    <div className="login">
      <div className="login-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Brand to="/" />
          <ThemeToggle />
        </div>
        <div className="card">
          <span className="eyebrow">Demo · acceso simulado</span>
          <h2>Elegí un rol para ingresar</h2>
          <p className="muted small">
            En el sistema real el login valida correo y contraseña (bcrypt) y entrega un JWT de 8 horas con el rol y la empresa.
            Acá no hay servidor: cada rol muestra lo que vería esa persona.
          </p>
          {USERS.map(u => (
            <button key={u.id} className="role" onClick={() => onLogin(u)}>
              <span className="ic">{u.rol[0].toUpperCase()}</span>
              <span><b>{u.nombre} <span className="pill gray">{u.rol}</span></b><small>{u.correo} · {u.desc}</small></span>
              <span className="muted">→</span>
            </button>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 8, flexWrap: 'wrap' }}>
            <Link className="btn" to="/demo/publica">Ver vista pública (sin login)</Link>
            <Link className="small" to="/">← Volver al sitio</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
