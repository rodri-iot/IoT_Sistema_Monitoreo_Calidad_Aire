import { useState, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import { NavLink } from 'react-router-dom'
import packageJson from '../../package.json'

const Icon = ({ children, title }) => (
  <span className="sidenav-icon" aria-hidden title={title}>{children}</span>
)

function IconHome () {
  return (
    <Icon title="">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    </Icon>
  )
}
function IconPin () {
  return (
    <Icon title="">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="10" r="3" />
        <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z" />
      </svg>
    </Icon>
  )
}
function IconDevice () {
  return (
    <Icon title="">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    </Icon>
  )
}
function IconChart () {
  return (
    <Icon title="">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    </Icon>
  )
}
function IconUsers () {
  return (
    <Icon title="">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    </Icon>
  )
}
function IconBuilding () {
  return (
    <Icon title="">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" />
        <path d="M5 21V7l8-4v18" />
        <path d="M19 21V11l-6-4" />
        <path d="M9 9v.01" />
        <path d="M9 12v.01" />
        <path d="M9 15v.01" />
        <path d="M9 18v.01" />
      </svg>
    </Icon>
  )
}
function IconOrg () {
  return (
    <Icon title="">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="1" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        <path d="M6 11h.01M10 11h.01M14 11h.01M18 11h.01M6 15h.01M10 15h.01M14 15h.01M18 15h.01" />
      </svg>
    </Icon>
  )
}

const ICONS = {
  home: IconHome,
  pin: IconPin,
  device: IconDevice,
  chart: IconChart,
  users: IconUsers,
  building: IconBuilding,
  org: IconOrg
}

const menuItems = [
  { path: '/', label: 'Inicio', icon: 'home', section: 'ops' },
  { path: '/zonas', label: 'Zonas', icon: 'pin', section: 'ops' },
  { path: '/dispositivos', label: 'Dispositivos', icon: 'device', section: 'ops' },
  { path: '/lecturas', label: 'Monitoreo', icon: 'chart', section: 'ops' },
  { path: '/usuarios', label: 'Usuarios', icon: 'users', roles: ['admin', 'superadmin'], section: 'admin' },
  { path: '/empresas', label: 'Nueva Empresa', icon: 'building', roles: ['superadmin'], section: 'admin' },
  { path: '/admin/empresas', label: 'Empresas', icon: 'org', roles: ['superadmin'], section: 'admin' }
]

export default function Sidenav () {
  const { user } = useContext(AuthContext)
  const [collapsed, setCollapsed] = useState(false)

  if (!user) return null

  const filteredItems = menuItems.filter(item => {
    if (!item.roles) return true
    return item.roles.includes(user.rol)
  })

  const opsItems = filteredItems.filter(i => i.section === 'ops')
  const adminItems = filteredItems.filter(i => i.section === 'admin')
  const showAdminSep = adminItems.length > 0

  return (
    <aside
      className="app-sidenav"
      style={{
        width: collapsed ? 64 : 240,
        minWidth: collapsed ? 64 : 240,
        transition: 'width 0.2s ease'
      }}
    >
      <div className="sidenav-toolbar" style={{ display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end', padding: '0 0.5rem', marginBottom: '0.5rem' }}>
        <button
          type="button"
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

      <nav className="sidenav-nav">
        {opsItems.map((item) => {
          const IconCmp = ICONS[item.icon] || IconHome
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                (isActive ? 'sidenav-link sidenav-link--active' : 'sidenav-link') + (collapsed ? ' sidenav-link--collapsed' : '')
              }
            >
              <IconCmp />
              {!collapsed && <span className="sidenav-label">{item.label}</span>}
            </NavLink>
          )
        })}

        {showAdminSep && (
          <div
            className="sidenav-separator"
            style={{
              margin: '0.75rem 1rem',
              borderTop: '1px solid var(--color-sidenav-border)',
              opacity: 0.85
            }}
            role="separator"
            aria-hidden
          />
        )}

        {adminItems.map((item) => {
          const IconCmp = ICONS[item.icon] || IconHome
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                (isActive ? 'sidenav-link sidenav-link--active' : 'sidenav-link') + (collapsed ? ' sidenav-link--collapsed' : '')
              }
            >
              <IconCmp />
              {!collapsed && <span className="sidenav-label">{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      <footer
        className="sidenav-footer"
        style={{
          padding: '1rem 1rem 1.25rem',
          fontSize: '0.7rem',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.4,
          textAlign: collapsed ? 'center' : 'left'
        }}
      >
        {!collapsed && (
          <>
            <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.75rem' }}>SMCA | Air IoT</div>
            <div>v{packageJson.version}</div>
            <div style={{ marginTop: '0.35rem' }}>© {new Date().getFullYear()}</div>
          </>
        )}
        {collapsed && <span title={`SMCA v${packageJson.version}`}>v{packageJson.version}</span>}
      </footer>
    </aside>
  )
}
