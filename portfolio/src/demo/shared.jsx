import React, { useEffect, useState } from 'react'
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'
import { aqiTier, aqiVar, AQI_SCALE } from '../data/aqi.js'

export const TZ = 'America/Argentina/Buenos_Aires'
export const fmtTime = ts => new Date(ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ })
export const fmtDay = ts => new Date(ts).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', timeZone: TZ })
export const fmtDateTime = ts => `${fmtDay(ts)} ${fmtTime(ts)}`

export const PARAMS = [
  { key: 'aqi', label: 'AQI', unit: '' },
  { key: 'pm25', label: 'PM2.5', unit: 'µg/m³', ref: 'Guía OMS 24 h: 15' },
  { key: 'pm10', label: 'PM10', unit: 'µg/m³', ref: 'Guía OMS 24 h: 45' },
  { key: 'no2', label: 'NO₂', unit: 'ppb' },
  { key: 'co', label: 'CO', unit: 'ppm' },
  { key: 'co2', label: 'CO₂', unit: 'ppm', ref: 'Aire exterior ≈ 420' },
  { key: 'tvoc', label: 'TVOC', unit: 'ppb' },
  { key: 'temp', label: 'Temperatura', unit: '°C' },
  { key: 'hum', label: 'Humedad', unit: '%' }
]

export function useNow (everyMs = 10000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(id)
  }, [everyMs])
  return now
}

export function AqiBadge ({ aqi, short }) {
  const t = aqiTier(aqi)
  return <span className="badge" style={{ background: aqiVar(aqi) }}>{aqi ?? '—'}{t && !short ? ` · ${t.label}` : ''}</span>
}

export function Sparkline ({ data, dataKey, color = 'var(--accent)' }) {
  return (
    <div style={{ height: 38 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 2, bottom: 2, left: 2 }}>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.8} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ScaleLegend () {
  const ranges = ['0–50', '51–100', '101–150', '151–200', '201–300', '301+']
  return (
    <div className="scale">
      {AQI_SCALE.map((t, i) => (
        <div key={t.key} style={{ '--c': `var(--aqi-${t.key})` }}>
          <b>{ranges[i]}</b>{t.label}
        </div>
      ))}
    </div>
  )
}

export function PageTop ({ title, subtitle, right }) {
  return (
    <div className="demo-top">
      <div>
        <h1>{title}</h1>
        {subtitle && <div className="muted small">{subtitle}</div>}
      </div>
      {right}
    </div>
  )
}

export function LiveDot () {
  return <span className="live"><i />En vivo · se actualiza cada 10 s</span>
}

export const chartTip = {
  contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--text)' },
  labelStyle: { color: 'var(--muted)' }
}
