import { useState, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import { NavLink, useLocation } from 'react-router-dom'

const menuItems = [
  { path: '/', label: 'Inicio', icon: '🏠' },
  { path: '/zonas', label: 'Zonas', icon: '📍' },
  { path: '/dispositivos', label: 'Dispositivos', icon: '📱' },
  { path: '/lecturas', label: 'Monitoreo', icon: '📈' },
  { path: '/usuarios', label: 'Usuarios', icon: '👥', roles: ['admin', 'superadmin'] },
  { path: '/empresas', label: 'Nueva Empresa', icon: '🏢', roles: ['superadmin'] },
  { path: '/admin/empresas', label: 'Empresas', icon: '🏛️', roles: ['superadmin'] }
]

export default function Sidenav() {
  const { user } = useContext(AuthContext)
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const getIsActive = (itemPath, navLinkIsActive) => {
    if (itemPath === '/') return location.pathname === '/'
    return navLinkIsActive
  }

  if (!user) return null

  const filteredItems = menuItems.filter(item => {
    if (!item.roles) return true
    return item.roles.includes(user.rol)
  })

  const linkStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: collapsed ? 0 : '0.75rem',
    padding: collapsed ? '0.75rem' : '0.75rem 1.25rem',
    color: isActive ? '#ecf0f1' : 'var(--color-text-primary)',
    textDecoration: 'none',
    fontWeight: isActive ? 600 : 400,
    borderLeft: isActive ? '3px solid #3498db' : '3px solid transparent',
    backgroundColor: isActive ? 'rgba(52, 152, 219, 0.15)' : 'transparent',
    justifyContent: collapsed ? 'center' : 'flex-start'
  })

  return (
    <aside
      className="app-sidenav"
      style={{
        width: collapsed ? 64 : 240,
        minWidth: collapsed ? 64 : 240,
        backgroundColor: 'var(--color-bg-card)',
        borderRight: '1px solid var(--color-border)',
        padding: '1rem 0',
        boxShadow: 'var(--shadow-soft)',
        transition: 'width 0.2s ease'
      }}
    >
      <div style={{ display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end', padding: '0 0.5rem', marginBottom: '0.5rem' }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            padding: '0.3rem',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
          title={collapsed ? 'Expandir menú' : 'Contraer menú'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>
      <nav>
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={true}
            isActive={item.path === '/' ? () => location.pathname === '/' : undefined}
            style={({ isActive }) => linkStyle(getIsActive(item.path, isActive))}
            title={collapsed ? item.label : undefined}
          >
            <span style={{ fontSize: '1.2rem', flexShrink: 0, opacity: 0.85 }}>{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
