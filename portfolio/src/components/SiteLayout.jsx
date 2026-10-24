import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import Brand from './Brand.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import { LINKS } from '../links.js'

export default function SiteLayout () {
  return (
    <>
      <header className="sitenav">
        <div className="wrap">
          <Brand />
          <nav className="navlinks">
            <NavLink to="/" end>Proyecto</NavLink>
            <NavLink to="/sistema">Sistema</NavLink>
            <NavLink to="/firmware">Firmware</NavLink>
            <NavLink to="/demo" className="cta">Demo</NavLink>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main><Outlet /></main>
      <footer className="footer">
        <div className="wrap">
          <div>
            <b style={{ color: 'var(--text)' }}>Sistema de Monitoreo de Calidad del Aire (SMCA)</b><br />
            Trabajo final · Carrera de Especialización en IoT · FIUBA · 2026<br />
            Rodrigo J. Pinedo Nava
          </div>
          <div>
            <a href={LINKS.repoSistema} target="_blank" rel="noreferrer">GitHub · Sistema</a><br />
            <a href={LINKS.repoFirmware} target="_blank" rel="noreferrer">GitHub · Firmware</a><br />
            <a href={LINKS.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
          </div>
        </div>
      </footer>
    </>
  )
}
