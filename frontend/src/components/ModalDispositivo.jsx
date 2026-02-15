import React, { useState, useEffect } from 'react'

export default function ModalDispositivo({ open, onClose, onSave, dispositivo = null, zonas = [], empresas = [], user }) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [zona, setZona] = useState('')
  const [esPublico, setEsPublico] = useState(false)
  const [sensorId, setSensorId] = useState('')
  const [ubicacion, setUbicacion] = useState({ lat: '', lng: '' })
  const [empresaId, setEmpresaId] = useState('')
  const [error, setError] = useState('')

  const isEdit = !!dispositivo

  useEffect(() => {
    if (dispositivo) {
      setNombre(dispositivo.nombre || '')
      setDescripcion(dispositivo.descripcion || '')
      setZona(dispositivo.zona || '')
      setEsPublico(dispositivo.esPublico || false)
    } else {
      setNombre('')
      setDescripcion('')
      setZona(zonas[0]?.nombre || '')
      setEsPublico(false)
      setSensorId('')
      setUbicacion({ lat: '', lng: '' })
      setEmpresaId(user?.empresaId || '')
    }
    setError('')
  }, [dispositivo, zonas, open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!nombre.trim()) {
      setError('El nombre es requerido')
      return
    }
    if (!isEdit && (!sensorId.trim() || !ubicacion.lat || !ubicacion.lng)) {
      setError('Sensor ID y ubicación (lat, lng) son requeridos para crear')
      return
    }
    if (!zona) {
      setError('Seleccione una zona')
      return
    }
    try {
      const payload = isEdit
        ? { nombre: nombre.trim(), descripcion: descripcion.trim(), zona, esPublico }
        : {
            sensorId: sensorId.trim(),
            nombre: nombre.trim(),
            descripcion: descripcion.trim(),
            zona,
            esPublico,
            empresa: empresaId || user?.empresaId,
            ubicacion: { lat: parseFloat(ubicacion.lat), lng: parseFloat(ubicacion.lng) }
          }
      await onSave(payload)
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
          {isEdit ? 'Editar Dispositivo' : 'Nuevo Dispositivo'}
        </h5>
        <form onSubmit={handleSubmit}>
          <div className="input-field">
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              required
              style={{ color: 'var(--color-text-primary)' }}
            />
            <label>Nombre</label>
          </div>
          <div className="input-field">
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              className="materialize-textarea"
              style={{ color: 'var(--color-text-primary)', minHeight: '60px' }}
              placeholder="Descripción corta"
            />
            <label>Descripción (opcional)</label>
          </div>
          <div className="input-field">
            <select
              value={zona}
              onChange={e => setZona(e.target.value)}
              required
              style={{ color: 'var(--color-text-primary)' }}
            >
              <option value="">Seleccionar zona</option>
              {zonas.map(z => (
                <option key={z._id} value={z.nombre}>{z.nombre}</option>
              ))}
            </select>
            <label>Zona</label>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
            <input type="checkbox" checked={esPublico} onChange={e => setEsPublico(e.target.checked)} />
            <span>Datos públicos (visible en vista pública)</span>
          </label>

          {!isEdit && (
            <>
              <div className="input-field">
                <input
                  type="text"
                  value={sensorId}
                  onChange={e => setSensorId(e.target.value)}
                  required
                  style={{ color: 'var(--color-text-primary)', fontFamily: 'monospace' }}
                  placeholder="ej: esp32-air-001"
                />
                <label>Sensor ID (único)</label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-field">
                  <input
                    type="number"
                    step="any"
                    value={ubicacion.lat}
                    onChange={e => setUbicacion(prev => ({ ...prev, lat: e.target.value }))}
                    required
                    style={{ color: 'var(--color-text-primary)' }}
                    placeholder="Latitud"
                  />
                  <label>Latitud</label>
                </div>
                <div className="input-field">
                  <input
                    type="number"
                    step="any"
                    value={ubicacion.lng}
                    onChange={e => setUbicacion(prev => ({ ...prev, lng: e.target.value }))}
                    required
                    style={{ color: 'var(--color-text-primary)' }}
                    placeholder="Longitud"
                  />
                  <label>Longitud</label>
                </div>
              </div>
              {user?.rol === 'superadmin' && empresas.length > 0 && (
                <div className="input-field">
                  <select value={empresaId} onChange={e => setEmpresaId(e.target.value)} style={{ color: 'var(--color-text-primary)' }}>
                    <option value="">Seleccionar empresa</option>
                    {empresas.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.nombre}</option>
                    ))}
                  </select>
                  <label>Empresa</label>
                </div>
              )}
            </>
          )}

          {error && (
            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(231,76,60,0.2)', borderRadius: '8px', marginBottom: '1rem', color: '#E74C3C' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn grey" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn blue darken-2 waves-effect waves-light">
              {isEdit ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
