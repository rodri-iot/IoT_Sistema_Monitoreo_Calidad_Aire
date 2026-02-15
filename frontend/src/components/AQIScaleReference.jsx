import React from 'react'
import { AQI_SCALE } from '../utils/aqiScale'

export default function AQIScaleReference({ compact = false }) {
  if (compact) {
    const total = 500
    return (
      <div style={{ padding: '0.5rem 1rem', borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
        <h6 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
          Escala de Calidad de Aire (AQI)
        </h6>
        <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: '0.5rem' }}>
          {AQI_SCALE.map((t) => (
            <div
              key={t.label}
              title={`${t.min}-${t.max}: ${t.label}`}
              style={{
                flex: (t.max - t.min + 1) / total,
                backgroundColor: t.color,
                minWidth: 2
              }}
              aria-label={`${t.min}-${t.max}: ${t.label}`}
            />
          ))}
        </div>
        <div style={{ display: 'flex', fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
          {AQI_SCALE.map((t) => (
            <div
              key={t.label}
              title={t.label}
              style={{
                flex: (t.max - t.min + 1) / total,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                minWidth: 0
              }}
            >
              <span>{t.min}-{t.max}</span>
              <span>{t.shortLabel}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div style={{ padding: '1.25rem', borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
      <h6 style={{ margin: '0 0 1rem 0', color: 'var(--color-text-primary)', fontSize: '1rem' }}>Escala AQI</h6>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {AQI_SCALE.map((t) => (
          <div
            key={t.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.35rem 0',
              borderBottom: '1px solid var(--color-border)'
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                backgroundColor: t.color,
                flexShrink: 0
              }}
            />
            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', minWidth: '80px' }}>
              {t.min}-{t.max}
            </span>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{t.label}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{t.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
