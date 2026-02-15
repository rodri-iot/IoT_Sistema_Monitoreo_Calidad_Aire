import React, { useEffect, useState, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import ModalUsuario from '../components/ModalUsuario'

export default function Usuarios() {
  const { token, user } = useContext(AuthContext)
  const [usuarios, setUsuarios] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalUsuario, setModalUsuario] = useState(null)
  const [modalCrear, setModalCrear] = useState(false)

  useEffect(() => {
    fetchUsuarios()
    if (user?.rol === 'superadmin') fetchEmpresas()
  }, [token, user?.rol])

  const fetchUsuarios = async () => {
    try {
      setLoading(true)
      setError(null)
      if (!token) return
      const url = user?.rol === 'superadmin' ? '/api/usuarios' : '/api/usuarios'
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setError('Error de autenticación.')
          return
        }
        throw new Error('Error al cargar usuarios')
      }
      const data = await response.json()
      setUsuarios(data)
    } catch (err) {
      setError(err.message || 'Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  const fetchEmpresas = async () => {
    try {
      const response = await fetch('/api/empresas/admin/empresas', { headers: { 'Authorization': `Bearer ${token}` } })
      if (response.ok) {
        const data = await response.json()
        setEmpresas(data)
      }
    } catch (err) {
      console.error('Error al cargar empresas:', err)
    }
  }

  const handleEditar = (u) => setModalUsuario(u)
  const handleCloseModal = () => { setModalUsuario(null); setModalCrear(false) }
  const handleSaveModal = () => { fetchUsuarios(); handleCloseModal() }

  const handleCrearUsuario = async (payload) => {
    try {
      const response = await fetch('/api/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Error al crear')
      }
      fetchUsuarios()
      setModalCrear(false)
    } catch (err) {
      throw err
    }
  }

  const handleEliminar = async (u) => {
    if (!window.confirm(`¿Eliminar usuario ${u.correo}?`)) return
    try {
      const response = await fetch(`/api/usuarios/${u._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Error al eliminar')
      fetchUsuarios()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', backgroundColor: 'var(--color-bg-light)', minHeight: '100%' }}>
        <div className="container">
          <h4 style={{ color: 'var(--color-text-primary)' }}>Gestión de Usuarios</h4>
          <p style={{ color: 'var(--color-text-secondary)' }}>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem 1rem', backgroundColor: 'var(--color-bg-light)', minHeight: '100%' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h4 style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Gestión de Usuarios</h4>
            <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Alta, edición y permisos de usuarios internos de la empresa</p>
          </div>
          <button className="btn blue darken-2 waves-effect waves-light" onClick={() => setModalCrear(true)}>
            + Nuevo Usuario
          </button>
        </div>

        {error && (
          <div style={{ padding: '1rem', backgroundColor: 'rgba(231,76,60,0.2)', borderRadius: '8px', marginBottom: '1rem', color: '#E74C3C' }}>
            {error}
          </div>
        )}

        {usuarios.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'var(--color-bg-card)', borderRadius: 'var(--border-radius)', border: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: '1.2rem', color: 'var(--color-text-secondary)' }}>No hay usuarios registrados</p>
            <button className="btn blue darken-2" onClick={() => setModalCrear(true)}>Crear primer usuario</button>
          </div>
        ) : (
          <div className="card" style={{ borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-card)' }}>
            <div className="card-content" style={{ padding: '1.5rem' }}>
              <table className="striped" style={{ color: 'var(--color-text-primary)' }}>
                <thead>
                  <tr>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Empresa</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u._id}>
                      <td>{u.correo}</td>
                      <td><span style={{ textTransform: 'uppercase', fontSize: '0.85rem' }}>{u.rol}</span></td>
                      <td>{u.empresa?.nombre || '-'}</td>
                      <td>
                        <button className="btn btn-small grey" onClick={() => handleEditar(u)}>Editar</button>
                        {u._id?.toString() !== user?.id?.toString() && (
                          <button className="btn btn-small red" style={{ marginLeft: '0.5rem' }} onClick={() => handleEliminar(u)}>Eliminar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modalUsuario && (
        <ModalUsuario
          usuario={modalUsuario}
          onClose={handleCloseModal}
          onSave={handleSaveModal}
          token={token}
          actualizarEmpresas={() => {}}
        />
      )}

      {modalCrear && (
        <ModalUsuarioCrear
          empresas={empresas}
          empresaIdDefault={user?.empresaId}
          onClose={() => setModalCrear(false)}
          onSave={handleCrearUsuario}
          token={token}
        />
      )}
    </div>
  )
}

function ModalUsuarioCrear({ empresas, empresaIdDefault, onClose, onSave, token }) {
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState('admin')
  const [empresaSel, setEmpresaSel] = useState(empresaIdDefault || '')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!correo || !password) {
      setError('Correo y contraseña son requeridos')
      return
    }
    try {
      const payload = { correo, password, rol }
      if (empresas.length > 0 && empresaSel) payload.empresaId = empresaSel
      else if (empresaIdDefault) payload.empresaId = empresaIdDefault
      await onSave(payload)
      onClose()
    } catch (err) {
      setError(err.message || 'Error al crear')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <h5 style={{ marginTop: 0, color: 'var(--color-text-primary)' }}>Nuevo Usuario</h5>
        <form onSubmit={handleSubmit}>
          <div className="input-field">
            <input type="email" value={correo} onChange={e => setCorreo(e.target.value)} required style={{ color: 'var(--color-text-primary)' }} />
            <label>Correo</label>
          </div>
          <div className="input-field">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ color: 'var(--color-text-primary)' }} />
            <label>Contraseña</label>
          </div>
          <div className="input-field">
            <select value={rol} onChange={e => setRol(e.target.value)} style={{ color: 'var(--color-text-primary)' }}>
              <option value="admin">Admin</option>
              <option value="supervisor">Supervisor</option>
              {empresas.length > 0 && <option value="superadmin">Superadmin</option>}
            </select>
            <label>Rol</label>
          </div>
          {empresas.length > 0 && (
            <div className="input-field">
              <select value={empresaSel} onChange={e => setEmpresaSel(e.target.value)} style={{ color: 'var(--color-text-primary)' }}>
                <option value="">Seleccionar empresa</option>
                {empresas.map(emp => (
                  <option key={emp._id} value={emp._id}>{emp.nombre}</option>
                ))}
              </select>
              <label>Empresa</label>
            </div>
          )}
          {error && <div style={{ color: '#E74C3C', marginBottom: '1rem' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn grey" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn blue darken-2">Crear</button>
          </div>
        </form>
      </div>
    </div>
  )
}
