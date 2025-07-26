import React from 'react'

export default function Zonas() {
  return (
    <div className="container">
      <h1 className="center-align">Zonas de Monitoreo</h1>
      <p className="flow-text">
        Aquí puedes gestionar las zonas de monitoreo de calidad del aire.
      </p>
      <div className="row">
        <div className="col s12 m6">
          <div className="card blue-grey darken-1">
            <div className="card-content white-text">
              <span className="card-title">Zona 1</span>
              <p>Descripción de la zona 1.</p>
            </div>
          </div>
        </div>
        <div className="col s12 m6">
          <div className="card blue-grey darken-1">
            <div className="card-content white-text">
              <span className="card-title">Zona 2</span>
              <p>Descripción de la zona 2.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}