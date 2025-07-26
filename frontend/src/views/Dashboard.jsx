
import React, { useEffect, useState } from 'react'

export default function Dashboard() {
  const [lecturas, setLecturas] = useState([])

  useEffect(() => {
    fetch('/api/lecturas/ultimas')
      .then(res => res.json())
      .then(data => setLecturas(data))
  }, [])

  return (
    <div className="container">
      <h4 className="center">Últimas Lecturas</h4>
      <ul className="collection">
        {lecturas.map(l => (
          <li key={l._id} className="collection-item">
            <strong>{l.sensorId}</strong> - Zona: {l.zona} - PM2.5: {l.pm25} - CO₂: {l.co2}
          </li>
        ))}
      </ul>
    </div>
  )
}
