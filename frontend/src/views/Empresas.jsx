import React, { useContext, useState } from 'react'
import { AuthContext } from '../context/AuthContext'

export default function Empresas() {
  const { token } = useContext(AuthContext)
  const [empresa, setEmpresa] = useState('')
  const [correo, setCorreo] = useState('')
  const [rol, setRol] = useState('admin')
  const [password, setPassword] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMensaje('')
    setError('')
    const nuevaEmpresa = { empresa, usuario: { correo, rol, password } }

    try {
      const res = await fetch('/api/empresas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(nuevaEmpresa)
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al registrar empresa')
        return
      }

      setMensaje(data.mensaje || 'Empresa registrada con éxito')
      setEmpresa('')
      setCorreo('')
      setRol('admin')
      setPassword('')
    } catch (err) {
      console.error('Error de red:', err)
      setError('Error de conexión con el servidor')
    }
  }

  return (
    <div className="container">
      <h4 className="center">Registrar Nueva Empresa</h4>

      {mensaje && <div className="card-panel green lighten-4 green-text text-darken-4">{mensaje}</div>}
      {error && <div className="card-panel red lighten-4 red-text text-darken-4">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="input-field">
          <input type="text" id="empresa" value={empresa} onChange={e => setEmpresa(e.target.value)} required />
          <label htmlFor="empresa" className={empresa ? 'active' : ''}>Nombre de la Empresa</label>
        </div>
        <h6>Usuario Inicial</h6>
        <div className="input-field">
          <input type="email" id="correo" value={correo} onChange={e => setCorreo(e.target.value)} required />
          <label htmlFor="correo" className={correo ? 'active' : ''}>Correo del Usuario</label>
        </div>
        <div className="input-field">
          <select className="browser-default" value={rol} onChange={e => setRol(e.target.value)}>
            <option value="admin">Admin</option>
            <option value="supervisor">Supervisor</option>
          </select>
        </div>
        <div className="input-field">
          <input type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <label htmlFor="password" className={password ? 'active' : ''}>Contraseña</label>
        </div>
        <div className="center">
          <button type="submit" className="btn blue darken-2">Registrar Empresa</button>
        </div>
      </form>
    </div>
  )
}