import React, { useState } from 'react'

export default function ModalEmpresa({ onClose, onSave, token }) {
  const [empresa, setEmpresa] = useState('')
  const [correo, setCorreo] = useState('')
  const [rol, setRol] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!empresa.trim() || !correo || !password) {
      setError('Nombre de empresa, correo y contraseña son requeridos')
      return
    }
    try {
      await onSave({
        empresa: empresa.trim(),
        usuario: { correo, rol, password }
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Error al registrar empresa')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <h5 style={{ marginTop: 0, color: 'var(--color-text-primary)' }}>Registrar Nueva Empresa</h5>
        <form onSubmit={handleSubmit}>
          <div className="input-field">
            <input
              type="text"
              value={empresa}
              onChange={e => setEmpresa(e.target.value)}
              required
              style={{ color: 'var(--color-text-primary)' }}
            />
            <label>Nombre de la Empresa</label>
          </div>
          <h6 style={{ margin: '1rem 0 0.5rem 0', color: 'var(--color-text-secondary)' }}>Usuario Inicial</h6>
          <div className="input-field">
            <input
              type="email"
              value={correo}
              onChange={e => setCorreo(e.target.value)}
              required
              style={{ color: 'var(--color-text-primary)' }}
            />
            <label>Correo del Usuario</label>
          </div>
          <div className="input-field">
            <select value={rol} onChange={e => setRol(e.target.value)} style={{ color: 'var(--color-text-primary)' }}>
              <option value="admin">Admin</option>
              <option value="supervisor">Supervisor</option>
            </select>
            <label>Rol</label>
          </div>
          <div className="input-field">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ color: 'var(--color-text-primary)' }}
            />
            <label>Contraseña</label>
          </div>
          {error && <div style={{ color: '#E74C3C', marginBottom: '1rem' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn grey" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn blue darken-2">Registrar Empresa</button>
          </div>
        </form>
      </div>
    </div>
  )
}
