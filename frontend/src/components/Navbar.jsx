import { useContext } from 'react'
import { link } from 'react-dom'
import { AuthContext } from '../context/AuthContext'
import { Link } from 'react-router-dom'

export default function Navbar() {
  const { user, logout } = useContext(AuthContext)
  return (
    <nav className="blue darken-3">
      <div className="nav-wrapper container">
        <Link to="/" className="brand-logo">SMCA</Link>
        <ul className="right hide-on-med-and-down">
          {user?.rol === 'superadmin' && (
            <>
              <li><Link to="/admin/empresas">Ver Empresas</Link></li>
              <li><Link to="/empresas">Empresas</Link></li>
            </>
          )}
          {user ? (
            <>
              <li><span className="white-text" style={{ marginRight: '1rem' }}>{user.correo}</span></li>
              <li><button className="btn red darken-2" onClick={logout}>Salir</button></li>
            </>
          ) : (
            <li><Link to="/login">Login</Link></li>
          )}
        </ul>
      </div>
    </nav>
  )
}