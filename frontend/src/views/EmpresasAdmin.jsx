import React, { useEffect, useState, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import ModalUsuario from '../components/ModalUsuario'
import ModalEmpresa from '../components/ModalEmpresa'

export default function EmpresasAdmin() {
  const { token } = useContext(AuthContext)
  const [empresas, setEmpresas] = useState([])
  const [usuarioEdit, setUsuarioEdit] = useState(null)
  const [modalNuevoUsuario, setModalNuevoUsuario] = useState(false)
  const [modalNuevaEmpresa, setModalNuevaEmpresa] = useState(false)
  const [error, setError] = useState('')

  const fetchEmpresas = async () => {
    try {
      const res = await fetch('/api/empresas/admin/empresas', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al obtener empresas')
      setEmpresas(data)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    fetchEmpresas()
  }, [token])

  const handleEditarUsuario = (usuario) => setUsuarioEdit(usuario)

  const handleEliminarUsuario = async (usuario) => {
    if (!window.confirm(`¿Seguro que deseas eliminar a ${usuario.correo}?`)) return
    try {
      const res = await fetch(`/api/usuarios/${usuario._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al eliminar usuario')
      setEmpresas(prev =>
        prev.map(emp => ({
          ...emp,
          usuarios: emp.usuarios.filter(u => u._id !== usuario._id)
        }))
      )
    } catch (err) {
      alert('Error al eliminar usuario: ' + err.message)
    }
  }

  const handleGuardarEdicion = (usuarioActualizado) => {
    setEmpresas(prev =>
      prev.map(emp => ({
        ...emp,
        usuarios: emp.usuarios.map(u =>
          u._id === usuarioActualizado._id ? usuarioActualizado : u
        )
      }))
    )
    setUsuarioEdit(null)
  }

  const handleCrearUsuario = async (payload) => {
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear usuario')
      fetchEmpresas()
      setModalNuevoUsuario(false)
    } catch (err) {
      throw err
    }
  }

  const handleCrearEmpresa = async (payload) => {
    try {
      const res = await fetch('/api/empresas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al registrar empresa')
      fetchEmpresas()
      setModalNuevaEmpresa(false)
    } catch (err) {
      throw err
    }
  }

  return (
    <div style={{ padding: '2rem 1rem', backgroundColor: 'var(--color-bg-light)', minHeight: '100%' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h4 style={{ margin: 0, color: 'var(--color-text-primary)' }}>Empresas Registradas</h4>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn blue darken-2 waves-effect waves-light" onClick={() => setModalNuevoUsuario(true)}>
              + Nuevo Usuario
            </button>
            <button className="btn green darken-2 waves-effect waves-light" onClick={() => setModalNuevaEmpresa(true)}>
              + Nueva Empresa
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '1rem', backgroundColor: 'rgba(231,76,60,0.2)', borderRadius: '8px', marginBottom: '1rem', color: '#E74C3C' }}>
            {error}
          </div>
        )}

        {empresas.map((empresa, idx) => (
          <div
            key={empresa._id || idx}
            className="card"
            style={{
              borderRadius: 'var(--border-radius)',
              backgroundColor: 'var(--color-bg-card)',
              marginBottom: '1.5rem',
              border: '1px solid var(--color-border)'
            }}
          >
            <div className="card-content" style={{ padding: '1.5rem' }}>
              <h5 style={{ margin: '0 0 1rem 0', color: 'var(--color-text-primary)' }}>
                Empresa {idx + 1}: {empresa.nombre}
              </h5>
              {empresa.usuarios?.length > 0 ? (
                <ul className="collection" style={{ border: 'none' }}>
                  {empresa.usuarios.map((u, i) => (
                    <li
                      key={u._id || i}
                      className="collection-item"
                      style={{
                        backgroundColor: 'transparent',
                        borderBottom: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span>👤 {u.correo} — <strong>{u.rol}</strong></span>
                      <span>
                        <button
                          className="btn-flat"
                          onClick={() => handleEditarUsuario(u)}
                          title="Editar"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-flat red-text"
                          onClick={() => handleEliminarUsuario(u)}
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Sin usuarios registrados</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {usuarioEdit && (
        <ModalUsuario
          usuario={usuarioEdit}
          onClose={() => setUsuarioEdit(null)}
          onSave={handleGuardarEdicion}
          token={token}
          actualizarEmpresas={setEmpresas}
        />
      )}

      {modalNuevoUsuario && (
        <ModalUsuarioCrear
          empresas={empresas}
          empresaIdDefault=""
          onClose={() => setModalNuevoUsuario(false)}
          onSave={handleCrearUsuario}
          token={token}
        />
      )}

      {modalNuevaEmpresa && (
        <ModalEmpresa
          onClose={() => setModalNuevaEmpresa(false)}
          onSave={handleCrearEmpresa}
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
    if (empresas.length > 0 && !empresaSel) {
      setError('Seleccione una empresa')
      return
    }
    try {
      const payload = { correo, password, rol }
      if (empresaSel) payload.empresaId = empresaSel
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
            </select>
            <label>Rol</label>
          </div>
          <div className="input-field">
            <select value={empresaSel} onChange={e => setEmpresaSel(e.target.value)} required style={{ color: 'var(--color-text-primary)' }}>
              <option value="">Seleccionar empresa</option>
              {empresas.map(emp => (
                <option key={emp._id} value={emp._id}>{emp.nombre}</option>
              ))}
            </select>
            <label>Empresa</label>
          </div>
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