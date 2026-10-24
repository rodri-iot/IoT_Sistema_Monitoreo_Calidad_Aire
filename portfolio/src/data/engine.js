// Motor de datos simulados. Determinista: la misma marca de tiempo da siempre la misma lectura,
// así el sitio no necesita backend ni base de datos y siempre luce "actual".
import { DISPOSITIVOS, ZONAS } from './sites.js'
import { calcAQI } from './aqi.js'

const TZ_OFFSET_MS = -3 * 3600 * 1000 // Argentina, UTC-3 sin horario de verano

function hash (str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function rnd (seed) { // 0..1
  let t = (seed + 0x6D2B79F5) >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
// Ruido de valor suave (interpolación coseno) con periodo en minutos
function noise (key, tMin, periodMin) {
  const x = tMin / periodMin
  const i = Math.floor(x)
  const f = x - i
  const a = rnd(hash(key) + i * 7919)
  const b = rnd(hash(key) + (i + 1) * 7919)
  const u = (1 - Math.cos(f * Math.PI)) / 2
  return (a * (1 - u) + b * u) * 2 - 1 // -1..1
}
const gauss = (h, mu, s) => Math.exp(-((h - mu) ** 2) / (2 * s * s))

function local (ts) {
  const d = new Date(ts + TZ_OFFSET_MS)
  return {
    hour: d.getUTCHours() + d.getUTCMinutes() / 60,
    dow: d.getUTCDay(),
    doy: Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000),
    dayKey: `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
  }
}

// Actividad urbana (tránsito) por hora del día
function activity (hour, dow) {
  const weekend = dow === 0 || dow === 6
  const k = weekend ? 0.7 : 1
  return 0.3 + k * (0.75 * gauss(hour, 8.6, 1.5) + 0.85 * gauss(hour, 18.4, 2.0) + 0.35 * gauss(hour, 13.2, 3.2))
}

export function dispositivo (sensorId) { return DISPOSITIVOS.find(d => d.sensorId === sensorId) }

export function readingAt (sensorId, ts) {
  const dev = dispositivo(sensorId)
  const p = dev.profile
  const L = local(ts)
  const tMin = ts / 60000
  // Condición meteorológica del día (ventilación): algunos días son claramente peores
  const dayF = 0.55 + 1.05 * Math.pow(rnd(hash('day' + L.dayKey)), 1.4)
  const slow = 1 + 0.25 * noise('slow' + sensorId, tMin, 240)
  const act = activity(L.hour, L.dow)
  const tr = p.traffic * act

  const pm25 = Math.max(1.2, p.pm25 * dayF * slow * (0.55 + 0.6 * tr) + 1.2 * noise('pm25' + sensorId, tMin, 18))
  const pm10 = Math.max(2, pm25 * 1.55 + 4 + 2 * noise('pm10' + sensorId, tMin, 22))
  const no2 = Math.max(1, p.no2 * dayF * (0.45 + 0.75 * tr) + 1.5 * noise('no2' + sensorId, tMin, 25))
  const co = Math.max(0.1, p.co * dayF * (0.5 + 0.7 * tr) + 0.05 * noise('co' + sensorId, tMin, 28))
  const nh3 = Math.max(0.01, 0.08 + 0.05 * tr + 0.02 * noise('nh3' + sensorId, tMin, 17))
  const co2 = 415 + 70 * tr * dayF * (1 - 0.4 * p.green) + 10 * noise('co2' + sensorId, tMin, 20)
  const tvoc = Math.max(5, 35 + 170 * tr * dayF * (1 - 0.5 * p.green) + 15 * noise('tvoc' + sensorId, tMin, 24))

  // Temperatura: ciclo anual de Buenos Aires + ciclo diario (máx. ~15 h) + variación sinóptica
  const annual = 17.8 + 6.4 * Math.sin(((L.doy - 105) / 365) * 2 * Math.PI)
  const syn = 3.2 * noise('syn' + L.dayKey, tMin, 1440)
  const diurnal = 4.2 * Math.sin(((L.hour - 9) / 24) * 2 * Math.PI)
  const temp = annual + syn + diurnal + p.temp + 0.15 * noise('t' + sensorId, tMin, 20)
  const hum = Math.min(97, Math.max(28, 66 - 1.9 * (temp - annual) - 4 * syn / 3 + 6 * noise('h' + sensorId, tMin, 30)))
  const presion = 1013.5 + 5 * noise('p', tMin, 1500)

  const values = {
    pm25: +pm25.toFixed(1), pm10: +pm10.toFixed(1), no2: +no2.toFixed(1), co: +co.toFixed(2),
    nh3: +nh3.toFixed(2), co2: Math.round(co2), tvoc: Math.round(tvoc),
    temp: +temp.toFixed(1), hum: Math.round(hum), presion: +presion.toFixed(1)
  }
  const { aqi, param } = calcAQI(values)
  return { sensorId, ts, ...values, aqi, aqiParam: param }
}

// Serie para un sensor entre [from, to] con paso step (ms), agregando promedio por bucket
export function series (sensorId, from, to, stepMs) {
  const out = []
  const start = Math.floor(from / stepMs) * stepMs
  for (let t = start; t <= to; t += stepMs) {
    const r = readingAt(sensorId, t + stepMs / 2)
    out.push(r)
  }
  return out
}

export function latest (sensorId, now = Date.now()) {
  return readingAt(sensorId, now)
}

export function zonaDe (sensorId) {
  const d = dispositivo(sensorId)
  return ZONAS.find(z => z.id === d.zonaId)
}

// Estado del dispositivo: última lectura hace < SEND_INTERVAL; esp32-col-004 simula tener un corte puntual
export function estado (sensorId, now = Date.now()) {
  const sinceMin = (now / 60000) % 1
  const lastSeenS = Math.round(sinceMin * 60)
  const rssi = Math.round(-58 - 14 * Math.abs(noise('rssi' + sensorId, now / 60000, 30)))
  const uptimeH = 24 * (3 + (hash(sensorId) % 20)) + Math.floor(now / 3600000) % 24
  return { online: true, lastSeenS, rssi, uptimeH }
}

export function mean (arr, key) { return arr.reduce((s, r) => s + r[key], 0) / (arr.length || 1) }
