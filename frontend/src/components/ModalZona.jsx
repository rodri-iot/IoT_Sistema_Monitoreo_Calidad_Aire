import React, { useState, useEffect } from 'react'

export default function ModalZona({ open, onClose, onSave, zona = null }) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [esPublica, setEsPublica] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (zona) {
      setNombre(zona.nombre || '')
      setDescripcion(zona.descripcion || '')
      setEsPublica(zona.esPublica || false)
    } else {
      setNombre('')
      setDescripcion('')
      setEsPublica(false)
    }
    setError('')
  }, [zona, open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!nombre.trim()) {
      setError('El nombre es requerido')
      return
    }
    try {
      await onSave({ nombre: nombre.trim(), descripcion: descripcion.trim(), esPublica })
      onClose()
    } catch (err) {
      setError(err.message || 'Error al guardar')
    }
  }

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <h5 style={{ marginTop: 0, color: 'var(--color-text-primary)' }}>
          {zona ? 'Editar Zona' : 'Nueva Zona'}
        </h5>
        <form onSubmit={handleSubmit}>
          <div className="input-field">
            <input
              type="text"
              id="zona-nombre"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              required
              style={{ color: 'var(--color-text-primary)' }}
            />
            <label htmlFor="zona-nombre">Nombre</label>
          </div>
          <div className="input-field">
            <textarea
              id="zona-descripcion"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              className="materialize-textarea"
              style={{ color: 'var(--color-text-primary)', minHeight: '80px' }}
            />
            <label htmlFor="zona-descripcion">Descripción</label>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
            <input
              type="checkbox"
              checked={esPublica}
              onChange={e => setEsPublica(e.target.checked)}
            />
            <span>Zona pública (visible para visitantes)</span>
          </label>
          {error && (
            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(231,76,60,0.2)', borderRadius: '8px', marginBottom: '1rem', color: '#E74C3C' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn grey" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn blue darken-2 waves-effect waves-light">
              {zona ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
