import React, { useEffect, useRef, useState } from 'react'

export default function ModalUsuario({ usuario, onClose, onSave, token, actualizarEmpresas }) {
  const [correo, setCorreo] = useState('')
  const [rol, setRol] = useState('admin')
  const [password, setPassword] = useState('')
  const modalRef = useRef(null)

  useEffect(() => {
    if (usuario) {
      setCorreo(usuario.correo)
      setRol(usuario.rol)
      setPassword('')
    }

    // Inicializa el modal
    const modal = window.M.Modal.init(modalRef.current, {
      onCloseEnd: onClose
    })
    modal.open()

    return () => {
      modal.destroy()
    }
  }, [usuario])

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const res = await fetch(`/api/usuarios/${usuario._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          correo, 
          rol,
          ...(password && { password })
         })
      })

      console.log('Datos enviados al backend:', { correo, rol, password })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al actualizar')

      actualizarEmpresas(prev =>
        prev.map(emp => ({
          ...emp,
          usuarios: emp.usuarios.map(u =>
            u._id === usuario._id ? { ...u, correo, rol } : u
          )
        }))
      )

      onSave?.({
        _id: usuario._id,
        correo,
        rol
      })
    } catch (err) {
      alert('Error al guardar: ' + err.message)
    }
  }

  return (
    <div ref={modalRef} id="modalUsuario" className="modal">
      <div className="modal-content">
        <h5>Editar Usuario</h5>
        <form onSubmit={handleSubmit}>
          <div className="input-field">
            <input
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
            />
            <label className="active">Correo</label>
          </div>
          <div className="input-field">
            <select
              className="browser-default"
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              required
            >
              <option value="admin">Admin</option>
              <option value="supervisor">Supervisor</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </div>
          <div className="input-field">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label className="active">Nueva Contraseña (opcional)</label>
          </div>
          <div className="modal-footer" style={{ marginTop: '20px' }}>
            <button type="submit" className="btn green">Guardar</button>
            <button type="button" className="btn-flat red-text" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}
