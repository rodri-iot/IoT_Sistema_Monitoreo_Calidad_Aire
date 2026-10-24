import { DISPOSITIVOS, ZONAS } from './sites.js'
import { series, latest } from './engine.js'
import { calcAQI } from './aqi.js'

const H = 3600000
const KEYS = ['pm25', 'pm10', 'no2', 'co', 'nh3', 'co2', 'tvoc', 'temp', 'hum']

export function avgReadings (rows, ts) {
  const out = { ts }
  KEYS.forEach(k => { out[k] = rows.reduce((s, r) => s + r[k], 0) / rows.length })
  const { aqi, param } = calcAQI(out)
  out.aqi = aqi
  out.aqiParam = param
  return out
}

// Serie horaria de las últimas `hours` horas, por dispositivo (cacheada por hora)
const cache = new Map()
export function hourlySeries (hours, nowHour, devices = DISPOSITIVOS) {
  const key = `${hours}-${nowHour}-${devices.map(d => d.sensorId).join()}`
  if (cache.has(key)) return cache.get(key)
  const to = nowHour * H
  const from = to - hours * H
  const per = Object.fromEntries(devices.map(d => [d.sensorId, series(d.sensorId, from, to, H)]))
  const n = per[devices[0].sensorId].length
  const area = Array.from({ length: n }, (_, i) => avgReadings(devices.map(d => per[d.sensorId][i]), per[devices[0].sensorId][i].ts))
  const byZona = {}
  ZONAS.forEach(z => {
    const ds = devices.filter(d => d.zonaId === z.id)
    if (!ds.length) return
    byZona[z.id] = Array.from({ length: n }, (_, i) => avgReadings(ds.map(d => per[d.sensorId][i]), per[ds[0].sensorId][i].ts))
  })
  const res = { per, area, byZona }
  cache.clear()
  cache.set(key, res)
  return res
}

export function latestAll (now, devices = DISPOSITIVOS) {
  return devices.map(d => ({ dev: d, r: latest(d.sensorId, now) }))
}

export function percentile (arr, p) {
  const s = [...arr].sort((a, b) => a - b)
  if (!s.length) return null
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]
}
