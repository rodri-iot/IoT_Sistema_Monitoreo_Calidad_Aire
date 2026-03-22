import React from 'react'
import { AQI_POLLUTANT_GOOD_MAX } from '../utils/aqiEpaReferenceText'

const noteStyle = {
  marginTop: '0.65rem',
  fontSize: '0.75rem',
  lineHeight: 1.45,
  color: 'var(--color-text-secondary)',
}

const strongStyle = { color: 'var(--color-text-primary)', fontWeight: 600 }

/**
 * Texto de referencia EPA alineado con el cálculo de AQI del backend.
 * @param {{ variant: 'particulado' | 'gases', compact?: boolean }} props
 */
export default function AqiPollutantLimitsNote({ variant, compact = false }) {
  const { pm25, pm10, no2, co } = AQI_POLLUTANT_GOOD_MAX

  const intro = (
    <p style={{ margin: compact ? '0 0 0.35rem 0' : '0 0 0.4rem 0' }}>
      Referencias <strong style={strongStyle}>EPA</strong> usadas para el AQI de esta aplicación (categoría{' '}
      <strong style={strongStyle}>Buena, AQI 0–50</strong>): por encima de estos valores el índice sube por tramos (moderada, etc.), igual que en el cálculo del servidor.
    </p>
  )

  if (variant === 'particulado') {
    return (
      <div style={noteStyle} role="note" aria-label="Límites de referencia EPA para particulado">
        {intro}
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          <li>
            <strong style={strongStyle}>{pm25.label}</strong>: hasta {pm25.value} {pm25.unit}
          </li>
          <li>
            <strong style={strongStyle}>{pm10.label}</strong>: hasta {pm10.value} {pm10.unit}
          </li>
        </ul>
      </div>
    )
  }

  return (
    <div style={noteStyle} role="note" aria-label="Límites de referencia EPA para gases del AQI">
      {intro}
      <ul style={{ margin: '0 0 0.35rem 0', paddingLeft: '1.1rem' }}>
        <li>
          <strong style={strongStyle}>{no2.label}</strong>: hasta {no2.value} {no2.unit} (tabla EPA; el sensor debe reportar en unidades coherentes con el modelo)
        </li>
        <li>
          <strong style={strongStyle}>{co.label}</strong>: hasta {co.value} {co.unit}
        </li>
      </ul>
      <p style={{ margin: 0, fontStyle: 'italic' }}>
        <strong style={strongStyle}>NH₃</strong> se muestra solo como dato ambiental; <strong style={strongStyle}>no participa</strong> en el cálculo del AQI de esta aplicación.
      </p>
    </div>
  )
}
