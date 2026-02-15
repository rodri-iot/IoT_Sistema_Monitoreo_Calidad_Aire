import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import { ThemeContext } from '../context/ThemeContext'
import { Link } from 'react-router-dom'

export default function Navbar() {
  const { user, logout } = useContext(AuthContext)
  const { theme, toggleTheme } = useContext(ThemeContext)

  return (
    <nav style={{
      backgroundColor: 'var(--color-nav-bg)',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      padding: '0 1.5rem',
      minHeight: 64,
      display: 'flex',
      alignItems: 'center'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        maxWidth: '100%',
        gap: '1.5rem'
      }}>
        {/* Logo y empresa - izquierda */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <Link
            to={user ? '/' : '/public'}
            style={{
              fontSize: '1.4rem',
              fontWeight: 700,
              color: 'var(--color-nav-text)',
              textDecoration: 'none'
            }}
          >
            SMCA
          </Link>
          {user?.empresa && (
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-nav-text)', opacity: 0.95 }}>
              | {user.empresa}
            </span>
          )}
        </div>

        {/* Espacio central - menú está en Sidenav */}
        <div style={{ flex: 1 }} />

        {/* Derecha: tema (siempre) + Login o usuario + salir */}
        <ul style={{
          display: 'flex',
          listStyle: 'none',
          margin: 0,
          padding: 0,
          alignItems: 'center',
          gap: '0.75rem',
          flexShrink: 0
        }}>
          <li>
            <button
              onClick={toggleTheme}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'var(--color-nav-text)',
                padding: '0.3rem 0.5rem',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
              title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </li>
          {user ? (
            <>
              <li>
                <span style={{ color: 'var(--color-nav-text)', fontSize: '0.85rem' }}>
                  {user.correo}
                </span>
              </li>
              <li>
                <span style={{
                  padding: '0.2rem 0.5rem',
                  borderRadius: 12,
                  backgroundColor: user.rol === 'superadmin' ? '#E74C3C' :
                    user.rol === 'admin' ? '#3498db' : '#95a5a6',
                  color: 'white',
                  fontSize: '0.7rem',
                  fontWeight: 600
                }}>
                  {user.rol?.toUpperCase()}
                </span>
              </li>
              <li>
                <button
                  onClick={logout}
                  style={{
                    backgroundColor: '#E74C3C',
                    color: 'white',
                    border: 'none',
                    padding: '0.4rem 0.8rem',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '0.85rem'
                  }}
                >
                  Salir
                </button>
              </li>
            </>
          ) : (
            <li>
              <Link
                to="/login"
                style={{
                  color: 'var(--color-nav-text)',
                  textDecoration: 'none',
                  fontWeight: 500,
                  padding: '0.4rem 0.8rem',
                  border: '1px solid rgba(255,255,255,0.4)',
                  borderRadius: 6
                }}
              >
                Login
              </Link>
            </li>
          )}
        </ul>
      </div>
    </nav>
  )
}
