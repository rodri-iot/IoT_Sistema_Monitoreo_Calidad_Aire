import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const { user, logout } = useContext(AuthContext)
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  return (
    <nav style={{ 
      backgroundColor: '#2c3e50',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      padding: '0 2rem'
    }}>
      <div className="nav-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" className="brand-logo" style={{ 
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#ecf0f1',
          textDecoration: 'none'
        }}>
          SMCA
        </Link>
        
        <ul style={{ 
          display: 'flex', 
          listStyle: 'none', 
          margin: 0, 
          padding: 0,
          alignItems: 'center',
          gap: '1.5rem'
        }}>
          {user && (
            <>
              <li>
                <Link 
                  to="/" 
                  style={{ 
                    color: isActive('/') ? '#2ECC71' : '#ecf0f1',
                    textDecoration: 'none',
                    fontWeight: isActive('/') ? 600 : 400,
                    borderBottom: isActive('/') ? '2px solid #2ECC71' : 'none',
                    paddingBottom: '0.5rem'
                  }}
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link 
                  to="/zonas" 
                  style={{ 
                    color: isActive('/zonas') ? '#2ECC71' : '#ecf0f1',
                    textDecoration: 'none',
                    fontWeight: isActive('/zonas') ? 600 : 400,
                    borderBottom: isActive('/zonas') ? '2px solid #2ECC71' : 'none',
                    paddingBottom: '0.5rem'
                  }}
                >
                  Zonas
                </Link>
              </li>
              <li>
                <Link 
                  to="/dispositivos" 
                  style={{ 
                    color: isActive('/dispositivos') ? '#2ECC71' : '#ecf0f1',
                    textDecoration: 'none',
                    fontWeight: isActive('/dispositivos') ? 600 : 400,
                    borderBottom: isActive('/dispositivos') ? '2px solid #2ECC71' : 'none',
                    paddingBottom: '0.5rem'
                  }}
                >
                  Dispositivos
                </Link>
              </li>
              <li>
                <Link 
                  to="/lecturas" 
                  style={{ 
                    color: isActive('/lecturas') ? '#2ECC71' : '#ecf0f1',
                    textDecoration: 'none',
                    fontWeight: isActive('/lecturas') ? 600 : 400,
                    borderBottom: isActive('/lecturas') ? '2px solid #2ECC71' : 'none',
                    paddingBottom: '0.5rem'
                  }}
                >
                  Históricos
                </Link>
              </li>
              
              {user.rol === 'superadmin' && (
                <li>
                  <Link 
                    to="/admin/empresas" 
                    style={{ 
                      color: isActive('/admin/empresas') ? '#2ECC71' : '#ecf0f1',
                      textDecoration: 'none',
                      fontWeight: isActive('/admin/empresas') ? 600 : 400,
                      borderBottom: isActive('/admin/empresas') ? '2px solid #2ECC71' : 'none',
                      paddingBottom: '0.5rem'
                    }}
                  >
                    Empresas
                  </Link>
                </li>
              )}

              <li style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem',
                marginLeft: '1rem',
                paddingLeft: '1rem',
                borderLeft: '1px solid rgba(255,255,255,0.2)'
              }}>
                <span style={{ 
                  color: '#ecf0f1', 
                  fontSize: '0.9rem'
                }}>
                  {user.correo}
                </span>
                <span style={{ 
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  backgroundColor: user.rol === 'superadmin' ? '#E74C3C' : 
                                   user.rol === 'admin' ? '#3498db' : '#95a5a6',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>
                  {user.rol?.toUpperCase()}
                </span>
                <button 
                  onClick={logout}
                  style={{
                    backgroundColor: '#E74C3C',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '0.9rem'
                  }}
                >
                  Salir
                </button>
              </li>
            </>
          )}
          
          {!user && (
            <li>
              <Link 
                to="/login" 
                style={{ 
                  color: '#ecf0f1',
                  textDecoration: 'none',
                  fontWeight: 500
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