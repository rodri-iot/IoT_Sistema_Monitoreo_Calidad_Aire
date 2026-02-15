import React, { useContext, useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'

export default function Login() {
  const { user, login } = useContext(AuthContext)
  if (user) return <Navigate to="/" replace />
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      await login(correo, password)
      navigate('/')
    } catch (err) {
      console.error('Error en login:', err)
      setError('No se pudo conectar al servidor')
    }
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        backgroundColor: 'var(--color-bg-card)',
        borderRadius: 'var(--border-radius)',
        padding: '2.5rem',
        maxWidth: '420px',
        width: '100%',
        boxShadow: 'var(--shadow-soft)',
        border: '1px solid var(--color-border)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '2.5rem', opacity: 0.9 }}>🌬️</span>
          <h4 style={{ margin: '0.5rem 0', color: 'var(--color-text-primary)' }}>SMCA</h4>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', margin: 0 }}>
            Sistema de Monitoreo de Calidad de Aire
          </p>
          <p style={{
            color: 'var(--color-text-secondary)',
            fontSize: '0.85rem',
            marginTop: '1rem',
            lineHeight: 1.5
          }}>
            Información en tiempo real para ambientes más limpios. Monitoreo IoT, conozca el aire que respira.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-field">
            <input
              type="email"
              id="email"
              value={correo}
              onChange={e => setCorreo(e.target.value)}
              required
              style={{ color: 'var(--color-text-primary)' }}
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
              style={{ color: 'var(--color-text-primary)' }}
            />
            <label htmlFor="password">Contraseña</label>
          </div>
          <div className="center" style={{ marginTop: '1.5rem' }}>
            <button className="btn blue darken-2 waves-effect waves-light" type="submit">
              <i className="material-icons left">lock</i>
              Iniciar Sesión
            </button>
          </div>
          <div className="center" style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn grey lighten-1 black-text"
              onClick={() => navigate('/public')}
            >
              Ingresar como Visitante
            </button>
          </div>
        </form>

        {error && (
          <div className="card-panel red lighten-2 white-text center" style={{ marginTop: '1rem' }}>
            {error}
          </div>
        )}

        <p style={{
          textAlign: 'center',
          fontSize: '0.75rem',
          color: 'var(--color-text-secondary)',
          marginTop: '1.5rem'
        }}>
          Usuarios de demostración disponibles para prueba
        </p>
      </div>
    </div>
  )
}
