import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getAQIColor, AQI_SCALE } from '../utils/aqiScale'

export default function VistaPublica() {
  const [zonas, setZonas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/zonas/publicas')
      .then(res => {
        if (!res.ok) throw new Error('Error al cargar datos')
        return res.json()
      })
      .then(data => setZonas(data))
      .catch(err => {
        console.error('Error:', err)
        setError(err.message || 'Error al cargar zonas públicas')
      })
      .finally(() => setLoading(false))
  }, [])

  const chartData = zonas
    .filter(z => z.estadisticas?.maxAQI != null || z.estadisticas?.promedioPM25 != null)
    .map(z => ({
      nombre: z.nombre,
      AQI: z.estadisticas?.maxAQI ?? 0,
      PM25: parseFloat(z.estadisticas?.promedioPM25) || 0
    }))

  if (loading) {
    return (
      <div style={{ padding: '2rem', backgroundColor: 'var(--color-bg-light)', minHeight: '100%' }}>
        <div className="container">
          <h4 style={{ color: 'var(--color-text-primary)' }}>Monitoreo Público</h4>
          <p style={{ color: 'var(--color-text-secondary)' }}>Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem 1rem', backgroundColor: 'var(--color-bg-light)', minHeight: '100%' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h4 style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Monitoreo Público</h4>
            <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
              Información de calidad del aire en zonas públicas
            </p>
          </div>
          <Link to="/login" className="btn blue darken-2 waves-effect waves-light">
            Iniciar Sesión
          </Link>
        </div>

        <div style={{
          padding: '1rem 1.5rem',
          backgroundColor: 'rgba(149, 165, 166, 0.2)',
          borderRadius: 'var(--border-radius)',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--color-text-secondary)',
          fontSize: '0.9rem'
        }}>
          <span style={{ opacity: 0.9 }}>ℹ️</span>
          <span>Datos públicos solo lectura. Valores referenciales o promedios de las últimas 24 horas.</span>
        </div>

        {error && (
          <div style={{ padding: '1rem', backgroundColor: 'rgba(231,76,60,0.2)', borderRadius: '8px', marginBottom: '1rem', color: '#E74C3C' }}>
            {error}
          </div>
        )}

        {zonas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'var(--color-bg-card)', borderRadius: 'var(--border-radius)', border: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: '1.2rem', color: 'var(--color-text-secondary)' }}>No hay zonas públicas disponibles</p>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
              Las zonas marcadas como públicas por los administradores aparecerán aquí.
            </p>
          </div>
        ) : (
          <>
            {chartData.length > 0 && (
              <div className="card" style={{ borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-card)', padding: '1.5rem', marginBottom: '2rem' }}>
                <h6 style={{ margin: '0 0 1rem 0', color: 'var(--color-text-primary)' }}>Parámetros por zona (AQI / PM2.5)</h6>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="nombre" stroke="var(--color-text-secondary)" />
                    <YAxis stroke="var(--color-text-secondary)" />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }} />
                    <Legend />
                    <Bar dataKey="AQI" fill="#9b59b6" name="AQI Máx" />
                    <Bar dataKey="PM25" fill="#3498db" name="PM2.5 Prom µg/m³" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="card" style={{ borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-card)', padding: '1.5rem', marginBottom: '2rem' }}>
              <h6 style={{ margin: '0 0 1rem 0', color: 'var(--color-text-primary)' }}>Leyenda escala AQI</h6>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {AQI_SCALE.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.4rem 0.8rem',
                      backgroundColor: 'var(--color-bg-light)',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)'
                    }}
                  >
                    <span style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: item.color }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                      {item.min}-{item.max}: {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {zonas.map((zona) => (
                <div
                  key={zona._id}
                  className="card"
                  style={{ borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-card)', overflow: 'hidden' }}
                >
                  <div className="card-content" style={{ padding: '1.5rem' }}>
                    <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)' }}>{zona.nombre}</h5>
                    {zona.empresaId?.nombre && (
                      <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                        {zona.empresaId.nombre}
                      </p>
                    )}
                    {zona.descripcion && (
                      <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>{zona.descripcion}</p>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>AQI</span>
                        <br />
                        <strong style={{ color: getAQIColor(zona.estadisticas?.maxAQI), fontSize: '1.2rem' }}>
                          {zona.estadisticas?.maxAQI ?? '-'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>PM2.5</span>
                        <br />
                        <strong>{zona.estadisticas?.promedioPM25 ? `${zona.estadisticas.promedioPM25} µg/m³` : '-'}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>CO2</span>
                        <br />
                        <strong>{zona.estadisticas?.promedioCO2 ? `${zona.estadisticas.promedioCO2} ppm` : '-'}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Temp</span>
                        <br />
                        <strong>{zona.estadisticas?.promedioTemp ? `${zona.estadisticas.promedioTemp} °C` : '-'}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
