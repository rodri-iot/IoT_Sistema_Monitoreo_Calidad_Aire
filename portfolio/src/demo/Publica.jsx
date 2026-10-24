import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { DISPOSITIVOS, ZONAS, EMPRESA } from '../data/sites.js'
import { latest } from '../data/engine.js'
import { hourlySeries } from '../data/derive.js'
import { aqiTier, aqiVar, PARAM_LABEL } from '../data/aqi.js'
import Brand from '../components/Brand.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import { LiveDot, useNow, fmtTime, chartTip, ScaleLegend } from './shared.jsx'
import SensorMap from './SensorMap.jsx'

const ADVICE = {
  good: 'Buen momento para actividades al aire libre.',
  moderate: 'Aceptable. Las personas muy sensibles pueden notar molestias en esfuerzos prolongados.',
  sensitive: 'Grupos sensibles: reducir esfuerzos intensos al aire libre.',
  unhealthy: 'Evitar esfuerzos prolongados al aire libre.',
  very: 'Evitar actividades al aire libre.',
  hazardous: 'Permanecer en interiores.'
}

export default function Publica ({ embedded }) {
  const now = useNow()
  const nowHour = Math.floor(now / 3600000)
  const devs = useMemo(() => DISPOSITIVOS.filter(d => d.esPublico && ZONAS.find(z => z.id === d.zonaId)?.esPublica), [])
  const cur = devs.map(d => ({ d, r: latest(d.sensorId, now) }))
  const { per } = useMemo(() => hourlySeries(24, nowHour, devs), [nowHour, devs])
  const items = cur.map(({ d, r }) => ({ sensorId: d.sensorId, nombre: d.nombre, lat: d.lat, lng: d.lng, aqi: r.aqi, sub: d.entorno }))

  const body = (
    <div className="wrap" style={{ padding: embedded ? 0 : '24px 0 56px' }}>
      {!embedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Brand to="/" />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link className="btn sm" to="/demo">Ingresar a la demo</Link>
            <ThemeToggle />
          </div>
        </div>
      )}
      <span className="eyebrow">Vista pública · sin inicio de sesión</span>
      <h1 style={{ fontSize: '2rem' }}>Calidad del aire en Colegiales</h1>
      <p className="muted" style={{ maxWidth: '62ch' }}>
        Zonas que {EMPRESA.nombre} decidió compartir con el público. Solo se exponen sensores marcados como públicos dentro de zonas públicas.
      </p>
      <div style={{ margin: '4px 0 18px' }}><LiveDot /></div>

      <div className="grid g2">
        {cur.map(({ d, r }) => {
          const t = aqiTier(r.aqi)
          const data = per[d.sensorId].map(x => ({ t: fmtTime(x.ts), aqi: x.aqi }))
          return (
            <div className="panel" key={d.sensorId}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div><h3>{d.nombre}</h3><div className="muted small">{d.entorno}</div></div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '2.6rem', fontWeight: 700, lineHeight: 1, color: aqiVar(r.aqi) }}>{r.aqi}</div>
                  <div className="small" style={{ fontWeight: 600 }}>{t.label}</div>
                </div>
              </div>
              <p className="small" style={{ margin: '10px 0' }}>{ADVICE[t.key]} <span className="muted">(define: {PARAM_LABEL[r.aqiParam]})</span></p>
              <div style={{ height: 130 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="t" tickLine={false} axisLine={false} interval={5} />
                    <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip {...chartTip} />
                    <ReferenceLine y={50} stroke="var(--aqi-good)" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="aqi" name="AQI" stroke={aqiVar(r.aqi)} strokeWidth={2.2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="muted small">PM2.5 {r.pm25} µg/m³ · PM10 {r.pm10} µg/m³ · {r.temp} °C · {r.hum} % HR</div>
            </div>
          )
        })}
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h3>Dónde están los sensores</h3>
        <SensorMap items={items} />
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        <h3>Cómo leer el índice</h3>
        <div style={{ marginTop: 10 }}><ScaleLegend /></div>
        <p className="muted small" style={{ margin: '14px 0 0' }}>Datos de carácter informativo, no sustituyen mediciones oficiales. Datos simulados con fines demostrativos.</p>
      </div>
    </div>
  )
  return embedded ? body : <div style={{ minHeight: '100vh' }}>{body}</div>
}
