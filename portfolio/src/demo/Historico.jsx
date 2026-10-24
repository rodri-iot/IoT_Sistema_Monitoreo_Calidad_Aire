import React, { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { DISPOSITIVOS } from '../data/sites.js'
import { series } from '../data/engine.js'
import { percentile } from '../data/derive.js'
import { PageTop, PARAMS, chartTip, fmtTime, fmtDay, fmtDateTime, AqiBadge } from './shared.jsx'

const RANGES = {
  '24h': { label: '24 horas', ms: 24 * 3600000, step: 10 * 60000 },
  '7d': { label: '7 días', ms: 7 * 24 * 3600000, step: 3600000 },
  '30d': { label: '30 días', ms: 30 * 24 * 3600000, step: 4 * 3600000 }
}
const COLORS = ['var(--c-edge)', 'var(--aqi-good)', 'var(--c-back)', 'var(--c-data)', 'var(--c-front)']
const PAGE = 12

export default function Historico () {
  const [range, setRange] = useState('24h')
  const [param, setParam] = useState('pm25')
  const [sensor, setSensor] = useState('all')
  const [page, setPage] = useState(0)

  // Se ancla al último cuarto de hora para que la consulta sea estable mientras se navega
  const anchor = Math.floor(Date.now() / 900000) * 900000
  const R = RANGES[range]
  const devs = sensor === 'all' ? DISPOSITIVOS : DISPOSITIVOS.filter(d => d.sensorId === sensor)

  const per = useMemo(() => Object.fromEntries(devs.map(d => [d.sensorId, series(d.sensorId, anchor - R.ms, anchor, R.step)])), [sensor, range, anchor]) // eslint-disable-line
  const chart = useMemo(() => {
    const first = per[devs[0].sensorId]
    return first.map((r, i) => {
      const o = { ts: r.ts, t: range === '24h' ? fmtTime(r.ts) : `${fmtDay(r.ts)} ${range === '7d' ? fmtTime(r.ts) : ''}` }
      devs.forEach(d => { o[d.sensorId] = per[d.sensorId][i][param] })
      return o
    })
  }, [per, param, range, sensor]) // eslint-disable-line

  const flat = devs.flatMap(d => per[d.sensorId].map(r => r[param]))
  const stats = {
    min: Math.min(...flat), max: Math.max(...flat), avg: flat.reduce((s, v) => s + v, 0) / flat.length, p95: percentile(flat, 95)
  }
  const P = PARAMS.find(p => p.key === param)
  const dec = v => (Math.abs(v) >= 100 ? Math.round(v) : +v.toFixed(1))

  const rows = useMemo(() => devs.flatMap(d => per[d.sensorId].map(r => ({ ...r, nombre: d.nombre }))).sort((a, b) => b.ts - a.ts), [per, sensor]) // eslint-disable-line
  const pages = Math.ceil(rows.length / PAGE)
  const view = rows.slice(page * PAGE, page * PAGE + PAGE)

  const csv = () => {
    const head = 'timestamp,sensorId,aqi,pm25,pm10,no2,co,nh3,co2,tvoc,temp,hum'
    const body = rows.map(r => [new Date(r.ts).toISOString(), r.sensorId, r.aqi, r.pm25, r.pm10, r.no2, r.co, r.nh3, r.co2, r.tvoc, r.temp, r.hum].join(','))
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([[head, ...body].join('\n')], { type: 'text/csv' }))
    a.download = `smca-demo-${range}.csv`
    a.click()
  }

  return (
    <>
      <PageTop title="Histórico" subtitle="Series agregadas por intervalo; el intervalo se ajusta al rango elegido" right={<button className="btn sm" onClick={csv}>Exportar CSV</button>} />
      <div className="toolbar">
        <select value={sensor} onChange={e => { setSensor(e.target.value); setPage(0) }}>
          <option value="all">Todos los sensores</option>
          {DISPOSITIVOS.map(d => <option key={d.sensorId} value={d.sensorId}>{d.nombre}</option>)}
        </select>
        <select value={param} onChange={e => setParam(e.target.value)}>
          {PARAMS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <div className="seg">
          {Object.entries(RANGES).map(([k, v]) => <button key={k} className={range === k ? 'on' : ''} onClick={() => { setRange(k); setPage(0) }}>{v.label}</button>)}
        </div>
      </div>

      <div className="grid g4" style={{ marginBottom: 16 }}>
        {[['Mínimo', stats.min], ['Promedio', stats.avg], ['Percentil 95', stats.p95], ['Máximo', stats.max]].map(([l, v]) => (
          <div className="metric" key={l}>
            <div className="lbl"><span>{l}</span></div>
            <div className="val">{dec(v)}<small>{P.unit}</small></div>
            <div className="ref">{P.label}{P.ref ? ` · ${P.ref}` : ''}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <h3>{P.label} · {R.label}</h3>
        <div className="sub">Intervalo de {R.step >= 3600000 ? `${R.step / 3600000} h` : `${R.step / 60000} min`}</div>
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="t" tickLine={false} axisLine={false} minTickGap={36} />
              <YAxis tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip {...chartTip} />
              {devs.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
              {devs.map((d, i) => <Line key={d.sensorId} type="monotone" dataKey={d.sensorId} name={d.nombre} stroke={COLORS[DISPOSITIVOS.indexOf(d) % COLORS.length]} strokeWidth={1.9} dot={false} isAnimationActive={false} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16, overflowX: 'auto' }}>
        <h3>Lecturas</h3>
        <div className="sub">{rows.length} registros en el rango</div>
        <table>
          <thead><tr><th>Fecha</th><th>Sensor</th><th>AQI</th><th>PM2.5</th><th>PM10</th><th>NO₂</th><th>CO</th><th>CO₂</th><th>TVOC</th><th>T °C</th><th>HR %</th></tr></thead>
          <tbody>
            {view.map(r => (
              <tr key={r.sensorId + r.ts}>
                <td>{fmtDateTime(r.ts)}</td><td>{r.nombre}</td><td><AqiBadge aqi={r.aqi} short /></td>
                <td>{r.pm25}</td><td>{r.pm10}</td><td>{r.no2}</td><td>{r.co}</td><td>{r.co2}</td><td>{r.tvoc}</td><td>{r.temp}</td><td>{r.hum}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pager">
          <button className="btn sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹</button>
          <span>{page + 1} / {pages}</span>
          <button className="btn sm" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}>›</button>
        </div>
      </div>
    </>
  )
}
