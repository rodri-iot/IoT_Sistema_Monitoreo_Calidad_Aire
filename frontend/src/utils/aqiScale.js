/**
 * Escala AQI unificada (6 categorías) - Fuente única para toda la app
 */
export const AQI_SCALE = [
  { min: 0, max: 50, label: 'Buena', shortLabel: 'Buena', color: '#2ECC71', desc: 'Sin riesgo para la salud' },
  { min: 51, max: 100, label: 'Moderada', shortLabel: 'Moderada', color: '#F1C40F', desc: 'Riesgo leve para grupos sensibles' },
  { min: 101, max: 150, label: 'Dañina para grupos sensibles', shortLabel: 'Dañina (sensibles)', color: '#E67E22', desc: 'Afecta a niños, ancianos, personas con afecciones' },
  { min: 151, max: 200, label: 'Dañina', shortLabel: 'Dañina', color: '#E74C3C', desc: 'Riesgo para la población general' },
  { min: 201, max: 300, label: 'Muy dañina', shortLabel: 'Muy dañina', color: '#9B59B6', desc: 'Riesgo grave para la salud' },
  { min: 301, max: 500, label: 'Peligrosa', shortLabel: 'Peligrosa', color: '#6C3483', desc: 'Riesgo severo' }
]

export function getAQIColor(aqi) {
  if (aqi == null || aqi === '') return '#95A5A6'
  const n = Number(aqi)
  const tier = AQI_SCALE.find(t => n >= t.min && n <= t.max)
  return tier ? tier.color : '#95A5A6'
}

export function getAQILabel(aqi) {
  if (aqi == null || aqi === '') return 'Sin datos'
  const n = Number(aqi)
  const tier = AQI_SCALE.find(t => n >= t.min && n <= t.max)
  return tier ? tier.label : 'Sin datos'
}

export function getAQIShortLabel(aqi) {
  if (aqi == null || aqi === '') return 'Sin datos'
  const n = Number(aqi)
  const tier = AQI_SCALE.find(t => n >= t.min && n <= t.max)
  return tier ? tier.shortLabel : 'Sin datos'
}

export function getAQITier(aqi) {
  if (aqi == null || aqi === '') return null
  const n = Number(aqi)
  return AQI_SCALE.find(t => n >= t.min && n <= t.max) || null
}

/** Parámetro cuyo subíndice EPA define el AQI (coincide con backend aqiParametro). */
const AQI_PARAM_LABELS = {
  pm25: 'PM2.5',
  pm10: 'PM10',
  no2: 'NO₂',
  co: 'CO',
}

/**
 * Etiqueta legible para el campo aqiParametro de una lectura.
 * @param {string|null|undefined} key
 * @returns {string} etiqueta o cadena vacía si no aplica
 */
export function getAqiParametroLabel(key) {
  if (key == null || key === '') return ''
  const k = String(key).toLowerCase()
  return AQI_PARAM_LABELS[k] || key
}

const EMPTY_CELL = '—'

/**
 * Formatea un valor de sensor para tabla/CSV: incluye 0 como dato válido.
 * @param {unknown} raw
 * @param {number} decimals
 * @returns {string}
 */
export function formatSensorValue(raw, decimals = 1) {
  if (raw == null || raw === '') return EMPTY_CELL
  const n = Number(raw)
  if (!Number.isFinite(n)) return EMPTY_CELL
  return n.toFixed(decimals)
}
