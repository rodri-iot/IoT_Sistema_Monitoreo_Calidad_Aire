import React, { useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'

export default function Login() {
  const { login } = useContext(AuthContext)
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, password }),
        })

        const data = await res.json()

        if (!res.ok) {
            setError(data.error || 'Error al iniciar sesión')
            return
        }

        if (!data.token || !data.usuario) {
            setError('Credenciales inválidas')
            return
        }

        login(data.usuario)
        navigate('/')
    } catch (err) {
        console.error('Error en login:', err)
        setError('No se pudo conectar al servidor')
    }
    }

  return (
    <div className="container" style={{ marginTop: '3rem', maxWidth: '480px' }}>
      <h4 className="center">Iniciar Sesión</h4>
      <form onSubmit={handleSubmit}>
        <div className="input-field">
          <input
            type="email"
            id="email"
            value={correo}
            onChange={e => setCorreo(e.target.value)}
            required
          />
          <label htmlFor="email">Correo electrónico</label>
        </div>
        <div className="input-field">
          <input
            type="password"
            id="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <label htmlFor="password">Contraseña</label>
        </div>
        <div className="center">
          <button className="btn blue darken-2 waves-effect waves-light" type="submit">
            <i className="material-icons left">lock</i>
            Ingresar
          </button>
        </div>
                <div className="center" style={{ marginTop: '2rem' }}>
            <button
                className="btn grey lighten-1 black-text"
                onClick={() => navigate('/public')}
            >
                Acceder como visitante
            </button>
        </div>
      </form>
      {error && (
        <div className="card-panel red lighten-2 white-text center">
          {error}
        </div>
      )}
    </div>
  )
}
