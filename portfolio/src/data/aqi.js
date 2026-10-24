// Escala y calculador AQI (misma lógica que backend/src/utils/aqiCalculator.js, EPA)
export const BREAKPOINTS = {
  pm25: [
    [0, 50, 0, 9.0], [51, 100, 9.1, 35.4], [101, 150, 35.5, 55.4],
    [151, 200, 55.5, 125.4], [201, 300, 125.5, 225.4], [301, 500, 225.5, 325.4]
  ],
  pm10: [
    [0, 50, 0, 54], [51, 100, 55, 154], [101, 150, 155, 254],
    [151, 200, 255, 354], [201, 300, 355, 424], [301, 500, 425, 604]
  ],
  no2: [
    [0, 50, 0, 53], [51, 100, 54, 100], [101, 150, 101, 360],
    [151, 200, 361, 649], [201, 300, 650, 1249], [301, 500, 1250, 2049]
  ],
  co: [
    [0, 50, 0, 4.4], [51, 100, 4.5, 9.4], [101, 150, 9.5, 12.4],
    [151, 200, 12.5, 15.4], [201, 300, 15.5, 30.4], [301, 500, 30.5, 50.4]
  ]
}

export const AQI_SCALE = [
  { min: 0, max: 50, key: 'good', label: 'Buena', desc: 'Sin riesgo para la salud' },
  { min: 51, max: 100, key: 'moderate', label: 'Moderada', desc: 'Riesgo leve para personas muy sensibles' },
  { min: 101, max: 150, key: 'sensitive', label: 'Dañina para sensibles', desc: 'Afecta a niños, mayores y personas con afecciones' },
  { min: 151, max: 200, key: 'unhealthy', label: 'Dañina', desc: 'Riesgo para la población general' },
  { min: 201, max: 300, key: 'very', label: 'Muy dañina', desc: 'Riesgo grave para la salud' },
  { min: 301, max: 500, key: 'hazardous', label: 'Peligrosa', desc: 'Riesgo severo' }
]

export function aqiTier (aqi) {
  if (aqi == null) return null
  return AQI_SCALE.find(t => aqi >= t.min && aqi <= t.max) || AQI_SCALE[AQI_SCALE.length - 1]
}

export function aqiVar (aqi) {
  const t = aqiTier(aqi)
  return t ? `var(--aqi-${t.key})` : 'var(--muted)'
}

function subIndex (param, c) {
  const table = BREAKPOINTS[param]
  if (!table || c == null || c < 0) return null
  const bp = table.find(b => c <= b[3]) || table[table.length - 1]
  const [Il, Ih, Bl, Bh] = bp
  const Cp = Math.min(c, Bh)
  return Math.round(((Ih - Il) / (Bh - Bl)) * (Cp - Bl) + Il)
}

export function calcAQI (v) {
  let best = { aqi: null, param: null }
  for (const p of ['pm25', 'pm10', 'no2', 'co']) {
    const s = subIndex(p, v[p])
    if (s != null && (best.aqi == null || s > best.aqi)) best = { aqi: s, param: p }
  }
  return best
}

export const PARAM_LABEL = { pm25: 'PM2.5', pm10: 'PM10', no2: 'NO₂', co: 'CO' }
