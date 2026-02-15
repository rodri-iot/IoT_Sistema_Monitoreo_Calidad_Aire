import React from 'react'
import { Link } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import AQIScaleReference from '../components/AQIScaleReference'
import { AQI_SCALE } from '../utils/aqiScale'

export default function Inicio() {
  const { user } = useContext(AuthContext)

  return (
    <div style={{ padding: '2rem 1rem', backgroundColor: 'var(--color-bg-light)', minHeight: '100%' }}>
      <div className="container">
        <div className="card" style={{ borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-card)', padding: '2rem', marginBottom: '2rem', border: '1px solid var(--color-border)' }}>
          <h4 style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
            Bienvenido al Sistema de Monitoreo de Calidad del Aire
          </h4>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', fontSize: '1rem', lineHeight: 1.6 }}>
            Monitoree en tiempo real la calidad del aire en sus zonas y dispositivos. Visualice tendencias, identifique picos y analice datos históricos para tomar decisiones informadas.
          </p>
          {user?.correo && (
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              Sesión: {user.correo}
            </p>
          )}
        </div>

        <div className="card" style={{ borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-card)', padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--color-border)' }}>
          <h5 style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>¿Qué es el AQI?</h5>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem', lineHeight: 1.6 }}>
            El <strong>Índice de Calidad del Aire (AQI)</strong> es una escala de 0 a 500 que indica el nivel de contaminación. Se calcula a partir de las concentraciones de <strong>PM2.5</strong>, <strong>PM10</strong>, <strong>NO2</strong> y <strong>CO</strong>. Para cada parámetro se obtiene un subíndice; el AQI final es el <strong>máximo</strong> de esos subíndices.
          </p>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 0, fontSize: '0.9rem', fontFamily: 'monospace', backgroundColor: 'var(--color-bg-light)', padding: '0.75rem', borderRadius: 8 }}>
            AQI = max(AQI_PM2.5, AQI_PM10, AQI_NO2, AQI_CO)
          </p>
        </div>

        <div className="card" style={{ borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-card)', padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--color-border)' }}>
          <h5 style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>Escala AQI (6 categorías)</h5>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              {AQI_SCALE.map((t) => (
                <div
                  key={t.label}
                  title={`${t.min}-${t.max}: ${t.label}`}
                  style={{
                    flex: 1,
                    minWidth: 60,
                    height: 24,
                    backgroundColor: t.color
                  }}
                />
              ))}
            </div>
          </div>
          <AQIScaleReference />
        </div>

        <div className="card" style={{ borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-card)', padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--color-border)' }}>
          <h5 style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>¿Dónde se calcula el AQI?</h5>
          <ul style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
            <li><strong>Zonas:</strong> Cada zona tiene un AQI agregado a partir de las lecturas de sus dispositivos.</li>
            <li><strong>Dispositivos:</strong> Cada sensor reporta su propio AQI en cada lectura.</li>
          </ul>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link
              to="/lecturas"
              className="btn green darken-2"
              style={{ textDecoration: 'none' }}
            >
              Ir a Monitoreo
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
