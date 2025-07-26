import React from 'react'
import { Link } from 'react-router-dom'

export default function Unauthorized() {
  return (
    <div className="container center">
      <h4>Acceso denegado</h4>
      <p>No tenés permisos para acceder a esta sección.</p>
      <Link to="/" className="btn blue darken-2">Volver al inicio</Link>
    </div>
  )
}
