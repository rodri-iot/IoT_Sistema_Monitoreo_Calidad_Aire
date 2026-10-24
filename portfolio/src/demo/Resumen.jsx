import React, { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts'
import { DISPOSITIVOS, ZONAS, EMPRESA } from '../data/sites.js'
import { hourlySeries, latestAll, avgReadings } from '../data/derive.js'
import { calcAQI, aqiTier, aqiVar, PARAM_LABEL } from '../data/aqi.js'
import { PageTop, LiveDot, AqiBadge, Sparkline, ScaleLegend, useNow, fmtTime, fmtDay, chartTip, PARAMS } from './shared.jsx'
import SensorMap from './SensorMap.jsx'

const H = 3600000
const ZONE_COLOR = { 'z-transito': 'var(--c-edge)', 'z-verde': 'var(--aqi-good)', 'z-ferro': 'var(--c-back)' }

function Metric ({ p, value, series: s }) {
  return (
    <div className="metric">
      <div className="lbl"><span>{p.label}</span></div>
      <div className="val">{value}<small>{p.unit}</small></div>
      <Sparkline data={s} dataKey={p.key} />
      <div className="ref">{p.ref || ' '}</div>
    </div>
  )
}

function Heatmap ({ nowHour }) {
  const rows = useMemo(() => {
    const { area } = hourlySeries(24 * 7, nowHour)
    const days = []
    area.forEach(r => {
      const d = fmtDay(r.ts)
      let row = days.find(x => x.d === d)
      if (!row) { row = { d, cells: Array(24).fill(null) }; days.push(row) }
      const h = parseInt(new Date(r.ts).toLocaleTimeString('es-AR', { hour: '2-digit', hour12: false, timeZone: 'America/Argentina/Buenos_Aires' }), 10) % 24
      row.cells[h] = r.pm25
    })
    return days.slice(-7)
  }, [nowHour])
  return (
    <div className="heat">
      <span />
      {Array.from({ length: 24 }, (_, h) => <span className="hh" key={h}>{h % 3 === 0 ? h : ''}</span>)}
      {rows.map(r => (
        <React.Fragment key={r.d}>
          <span className="hl">{r.d}</span>
          {r.cells.map((v, h) => {
            const a = v == null ? null : calcAQI({ pm25: v }).aqi
            return <span key={h} className="cell" title={v == null ? '' : `${r.d} ${h}:00 · PM2.5 ${v.toFixed(1)} µg/m³`}
              style={{ background: a == null ? 'var(--surface-2)' : aqiVar(a), opacity: a == null ? 1 : 0.35 + Math.min(1, a / 100) * 0.65 }} />
          })}
        </React.Fragment>
      ))}
    </div>
  )
}

export default function Resumen () {
  const now = useNow()
  const nowHour = Math.floor(now / H)
  const [sel, setSel] = useState(null)
  const cur = useMemo(() => latestAll(now), [now])
  const { area, byZona } = useMemo(() => hourlySeries(24, nowHour), [nowHour])
  const areaNow = avgReadings(cur.map(c => c.r), now)
  const tier = aqiTier(areaNow.aqi)

  const chartData = useMemo(() => area.map((r, i) => {
    const o = { t: fmtTime(r.ts) }
    ZONAS.forEach(z => { if (byZona[z.id]) o[z.id] = Math.round(byZona[z.id][i].aqi) })
    return o
  }), [area, byZona])

  const ranking = [...cur].sort((a, b) => b.r.aqi - a.r.aqi)
  const best = ranking[ranking.length - 1]
  const worst = ranking[0]

  const peak = area.reduce((m, r) => (r.pm25 > m.pm25 ? r : m), area[0])
  const mean24 = area.reduce((s, r) => s + r.pm25, 0) / area.length
  const green = byZona['z-verde'], road = byZona['z-transito']
  const gm = green.reduce((s, r) => s + r.pm25, 0) / green.length
  const rm = road.reduce((s, r) => s + r.pm25, 0) / road.length
  const diff = Math.round((1 - gm / rm) * 100)

  const mapItems = cur.map(c => ({ sensorId: c.dev.sensorId, nombre: c.dev.nombre, lat: c.dev.lat, lng: c.dev.lng, aqi: c.r.aqi, sub: `${c.dev.entorno} · PM2.5 ${c.r.pm25} µg/m³` }))
  const metricParams = PARAMS.filter(p => p.key !== 'aqi')
  const fmt = (p, v) => (p.key === 'co' ? v.toFixed(2) : p.key === 'temp' || p.key === 'pm25' || p.key === 'pm10' || p.key === 'no2' ? v.toFixed(1) : Math.round(v))

  return (
    <>
      <PageTop title="Resumen" subtitle={`${EMPRESA.nombre} · Colegiales, CABA · ${DISPOSITIVOS.length} nodos`} right={<LiveDot />} />

      <div className="kpi-hero">
        <div className="panel aqi-big">
          <div>
            <div className="muted small">AQI promedio del barrio</div>
            <div className="aqi-num" style={{ color: aqiVar(areaNow.aqi) }}>{areaNow.aqi}</div>
            <div style={{ fontWeight: 600, marginTop: 6 }}>{tier.label}</div>
            <div className="muted small">{tier.desc}</div>
          </div>
          <div>
            <div className="aqi-meter"><span style={{ left: `${Math.min(100, (areaNow.aqi / 300) * 100)}%` }} /></div>
            <div className="muted small">Define el AQI: <b style={{ color: 'var(--text)' }}>{PARAM_LABEL[areaNow.aqiParam] || '—'}</b> · escala EPA</div>
          </div>
        </div>
        <div className="metric-grid">
          {metricParams.slice(0, 8).map(p => (
            <Metric key={p.key} p={p} value={fmt(p, areaNow[p.key])} series={area} />
          ))}
        </div>
      </div>

      <div className="two">
        <div className="panel">
          <h3>AQI por zona · últimas 24 h</h3>
          <div className="sub">Promedio horario de los sensores de cada zona</div>
          <div style={{ height: 270 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" tickLine={false} axisLine={false} interval={3} />
                <YAxis tickLine={false} axisLine={false} domain={[0, 'auto']} />
                <Tooltip {...chartTip} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={50} stroke="var(--aqi-good)" strokeDasharray="4 4" />
                {ZONAS.map(z => <Line key={z.id} type="monotone" dataKey={z.id} name={z.nombre} stroke={ZONE_COLOR[z.id]} strokeWidth={2.2} dot={false} isAnimationActive={false} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="muted small">La línea punteada marca el límite de «Buena» (AQI 50).</div>
        </div>
        <div className="panel">
          <h3>Sensores ahora</h3>
          <div className="sub">Ordenados de mayor a menor AQI</div>
          <div className="rank">
            {ranking.map(({ dev, r }) => (
              <div key={dev.sensorId}>
                <div className="rank-row"><span>{dev.nombre}</span><AqiBadge aqi={r.aqi} short /></div>
                <div className="rank-bar"><i style={{ width: `${Math.min(100, (r.aqi / 150) * 100)}%`, background: aqiVar(r.aqi) }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="two">
        <div className="panel">
          <h3>Mapa de sensores</h3>
          <div className="sub">Colegiales · ubicaciones ilustrativas. Tocá un sensor para ver el detalle.</div>
          <SensorMap items={mapItems} onSelect={setSel} selected={sel} />
          {sel && (() => { const c = cur.find(x => x.dev.sensorId === sel); return (
            <div className="muted small" style={{ marginTop: 10 }}>
              <b style={{ color: 'var(--text)' }}>{c.dev.nombre}</b> · {c.dev.entorno} · PM2.5 {c.r.pm25} · NO₂ {c.r.no2} ppb · {c.r.temp} °C · AQI {c.r.aqi}
            </div>) })()}
        </div>
        <div className="panel">
          <h3>Lo que muestran los datos</h3>
          <div className="sub">Conclusiones calculadas con las últimas 24 h</div>
          <ul className="insights">
            <li><span><b>{best.dev.nombre}</b> tiene el aire más limpio ahora (AQI {best.r.aqi}); <b>{worst.dev.nombre}</b> el más cargado (AQI {worst.r.aqi}).</span></li>
            <li><span>Los espacios verdes registran <b>{diff}% menos PM2.5</b> que el corredor vial ({gm.toFixed(1)} vs {rm.toFixed(1)} µg/m³).</span></li>
            <li><span>El pico de PM2.5 fue a las <b>{fmtTime(peak.ts)}</b> ({peak.pm25.toFixed(1)} µg/m³), coherente con las horas de mayor tránsito.</span></li>
            <li><span>Promedio de 24 h: <b>{mean24.toFixed(1)} µg/m³</b> de PM2.5 — {mean24 <= 15 ? 'dentro' : 'por encima'} de la guía de la OMS (15 µg/m³).</span></li>
          </ul>
          <div style={{ marginTop: 18 }}><ScaleLegend /></div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h3>PM2.5 por hora del día · últimos 7 días</h3>
        <div className="sub">Cada celda es el promedio horario del barrio; los patrones repetidos revelan el ritmo urbano (horas pico de la mañana y la tarde).</div>
        <Heatmap nowHour={nowHour} />
      </div>
    </>
  )
}
