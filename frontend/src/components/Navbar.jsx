
import React from 'react'

export default function Navbar() {
  return (
    <nav className="blue darken-3">
      <div className="nav-wrapper container">
        <a href="#" className="brand-logo">SMCA</a>
        <ul className="right hide-on-med-and-down">
          <li><a href="#">Dashboard</a></li>
          <li><a href="#">Zonas</a></li>
          <li><a href="#">Histórico</a></li>
        </ul>
      </div>
    </nav>
  )
}
