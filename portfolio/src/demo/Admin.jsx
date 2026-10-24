import React from 'react'
import { PageTop } from './shared.jsx'
import { USERS } from './Login.jsx'
import { EMPRESA, DISPOSITIVOS } from '../data/sites.js'

export function Usuarios ({ user }) {
  return (
    <>
      <PageTop title="Usuarios" subtitle={`Personas con acceso a ${user.empresa}`} right={<button className="btn sm" disabled title="Deshabilitado en la demo">+ Nuevo usuario</button>} />
      <div className="callout">
        Aislamiento por empresa: el JWT lleva el <code>empresaId</code> y el backend filtra con él cada consulta. Un admin de otra empresa recibiría una lista vacía, no un error de permisos.
      </div>
      <div className="panel" style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Correo</th><th>Rol</th><th>Empresa</th><th>Alcance</th></tr></thead>
          <tbody>
            {USERS.filter(u => u.rol !== 'superadmin').map(u => (
              <tr key={u.id}><td>{u.correo}</td><td><span className="pill">{u.rol}</span></td><td>{u.empresa}</td><td className="muted small">{u.desc}</td></tr>
            ))}
            <tr><td>operaciones@colegiales.demo</td><td><span className="pill">supervisor</span></td><td>{EMPRESA.nombre}</td><td className="muted small">Consulta zonas, dispositivos e histórico.</td></tr>
          </tbody>
        </table>
      </div>
    </>
  )
}

export function Empresas () {
  return (
    <>
      <PageTop title="Empresas" subtitle="Administración de la plataforma (solo superadmin)" right={<button className="btn sm" disabled title="Deshabilitado en la demo">+ Nueva empresa</button>} />
      <div className="panel" style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Empresa</th><th>Usuarios</th><th>Dispositivos</th><th>Zonas públicas</th></tr></thead>
          <tbody>
            <tr><td><b>{EMPRESA.nombre}</b></td><td>3</td><td>{DISPOSITIVOS.length}</td><td>1</td></tr>
            <tr><td><b>Observatorio Urbano (ejemplo)</b></td><td>2</td><td>—</td><td>—</td></tr>
          </tbody>
        </table>
      </div>
      <p className="muted small" style={{ marginTop: 12 }}>El superadmin gestiona empresas y su primer admin; no accede a las lecturas de cada empresa.</p>
    </>
  )
}
