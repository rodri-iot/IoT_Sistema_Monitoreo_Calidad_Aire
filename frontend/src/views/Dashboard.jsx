import React, { useEffect, useState, useContext } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { getAQIColor, getAQILabel, AQI_SCALE } from '../utils/aqiScale'
import AQIScaleReference from '../components/AQIScaleReference'

function formatAggLabel(d) {
  if (!d) return ''
  const day = d.day != null ? String(d.day).padStart(2, '0') : '01'
  const month = String(d.month || 1).padStart(2, '0')
  const hour = d.hour != null ? String(d.hour).padStart(2, '0') : '00'
  const min = d.minuteBucket != null ? d.minuteBucket : d.minute
  return `${day}/${month} ${hour}:${String(min ?? 0).padStart(2, '0')}`
}

export default function Dashboard() {
  const { user, token } = useContext(AuthContext)
  const [zonas, setZonas] = useState([])
  const [top3LineData, setTop3LineData] = useState([])
  const [pieData, setPieData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [token])

  const fetchData = async () => {
    try {
      if (!token) {
        setLoading(false)
        return
      }
      const hasta = new Date()
      const desde = new Date()
      desde.setHours(desde.getHours() - 4)

      const zonasRes = await fetch('/api/zonas?horas=1', { headers: { Authorization: `Bearer ${token}` } })
      if (!zonasRes.ok) {
        setLoading(false)
        return
      }
      const zonasList = await zonasRes.json()
      setZonas(zonasList)

      const sorted = [...zonasList].filter(z => z.maxAQI != null).sort((a, b) => (b.maxAQI || 0) - (a.maxAQI || 0))
      const top3 = sorted.slice(0, 3)

      const byCategory = {}
      AQI_SCALE.forEach(t => { byCategory[t.label] = { name: t.label, value: 0, color: t.color } })
      zonasList.forEach(z => {
        const aqi = z.maxAQI ?? z.lecturaPico?.aqi
        if (aqi == null) return
        const tier = AQI_SCALE.find(t => aqi >= t.min && aqi <= t.max)
        if (tier) byCategory[tier.label].value += 1
      })
      setPieData(Object.values(byCategory).filter(d => d.value > 0))

      if (top3.length > 0) {
        const agrupacion = '5min'
        const params = new URLSearchParams({ desde: desde.toISOString(), hasta: hasta.toISOString(), agrupacion })
        const aggPromises = top3.map(z => fetch(`/api/lecturas/agregadas?${params}&zonaId=${z._id}`, { headers: { Authorization: `Bearer ${token}` } }))
        const aggResponses = await Promise.all(aggPromises)
        const aggArrays = await Promise.all(aggResponses.map(r => r.ok ? r.json() : []))
        const labelToPoint = {}
        top3.forEach((z, idx) => {
          const arr = aggArrays[idx] || []
          arr.forEach(r => {
            const label = formatAggLabel(r._id)
            if (!labelToPoint[label]) labelToPoint[label] = { label }
            labelToPoint[label][z.nombre] = r.avgAqi != null ? Math.round(r.avgAqi) : null
          })
        })
        setTop3LineData(Object.values(labelToPoint).sort((a, b) => (a.label || '').localeCompare(b.label || '')))
      } else {
        setTop3LineData([])
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const sortedZonas = [...zonas].filter(z => z.maxAQI != null).sort((a, b) => (b.maxAQI || 0) - (a.maxAQI || 0))
  const top3 = sortedZonas.slice(0, 3)
  const lineColors = ['#2ECC71', '#3498db', '#9b59b6']

  if (loading) {
    return (
      <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Cargando...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem 1rem', backgroundColor: 'var(--color-bg-light)', minHeight: '100%' }}>
      <div className="container">
        <div style={{ marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <h4 style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Dashboard</h4>
            <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
              Bienvenido, {user?.empresa ? `${user.correo?.split('@')[0] || user.correo} (${user.empresa})` : (user?.correo?.split('@')[0] || user?.correo || 'Usuario')}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <AQIScaleReference compact />
          </div>
        </div>

        {/* KPIs: AQI última hora */}
        {(() => {
          const aqiVals = zonas.map(z => z.maxAQI ?? z.lecturaPico?.aqi).filter(v => v != null)
          const aqiCritico = aqiVals.length ? Math.max(...aqiVals) : null
          const aqiPromedio = aqiVals.length ? (aqiVals.reduce((a, b) => a + b, 0) / aqiVals.length).toFixed(0) : null
          const aqiBajo = aqiVals.length ? Math.min(...aqiVals) : null
          return (
            <div className="row" style={{ marginBottom: '2rem' }}>
              <div className="col s6 m4">
                <div className="card" style={{ borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-card)', padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>AQI crítico (más alto última hora)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: getAQIColor(aqiCritico) }}>
                    {aqiCritico ?? '—'}
                  </div>
                </div>
              </div>
              <div className="col s6 m4">
                <div className="card" style={{ borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-card)', padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>AQI promedio (última hora)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: getAQIColor(Number(aqiPromedio)) }}>
                    {aqiPromedio ?? '—'}
                  </div>
                </div>
              </div>
              <div className="col s6 m4">
                <div className="card" style={{ borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-card)', padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>AQI más bajo (última hora)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: getAQIColor(aqiBajo) }}>
                    {aqiBajo ?? '—'}
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        <div style={{ marginBottom: '1.5rem' }}>
          <h6 style={{ margin: '0 0 0.75rem 0', color: 'var(--color-text-primary)' }}>Top 3 zonas por AQI (última hora)</h6>
          <div className="row">
            {top3.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)', padding: '1rem' }}>Sin datos de zonas con AQI</p>
            ) : (
              top3.map((zona, i) => (
                <div key={zona._id} className="col s12 m6 l4" style={{ marginBottom: '1rem' }}>
                  <div className="card" style={{ borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-card)', overflow: 'hidden' }}>
                    <div className="card-content" style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <span className="card-title" style={{ fontSize: '1rem', color: 'var(--color-text-primary)', margin: 0 }}>{zona.nombre}</span>
                        <span title={getAQILabel(zona.maxAQI)} style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem', borderRadius: 8, backgroundColor: getAQIColor(zona.maxAQI), color: '#fff', fontWeight: 600, display: 'inline-block', minWidth: 24, minHeight: 24 }} aria-label={getAQILabel(zona.maxAQI)} />
                      </div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 700, color: getAQIColor(zona.maxAQI), marginBottom: '0.75rem' }}>
                        AQI {zona.maxAQI ?? '—'}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                        <span>PM2.5: {zona.promedioPM25 != null ? `${zona.promedioPM25} µg/m³` : '—'}</span>
                        <span>PM10: {zona.promedioPM10 != null ? `${zona.promedioPM10} µg/m³` : '—'}</span>
                        <span>CO2: {zona.promedioCO2 != null ? `${zona.promedioCO2} ppm` : '—'}</span>
                        <span>Temp: {zona.promedioTemp != null ? `${zona.promedioTemp}°C` : '—'}</span>
                        <span>Humedad: {zona.promedioHumedad != null ? `${zona.promedioHumedad}%` : '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="row" style={{ marginBottom: '2rem' }}>
          <div className="col s12 m6">
            <div className="card" style={{ borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-card)', padding: '1rem' }}>
              <h6 style={{ margin: '0 0 1rem 0', color: 'var(--color-text-primary)' }}>AQI Top 3 zonas - Últimas 4h (cada 5 min)</h6>
              {top3LineData.length > 0 && top3.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={top3LineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" stroke="var(--color-text-secondary)" tick={{ fontSize: 10 }} />
                    <YAxis stroke="var(--color-text-secondary)" />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }} />
                    <Legend />
                    {top3.map((z, i) => (
                      <Line key={z._id} type="monotone" dataKey={z.nombre} stroke={lineColors[i % lineColors.length]} strokeWidth={2} dot={{ r: 2 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '1rem' }}>Sin datos en las últimas 4 h. Las gráficas se actualizarán cuando haya lecturas en ese periodo.</div>
              )}
            </div>
          </div>
          <div className="col s12 m6">
            <div className="card" style={{ borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-card)', padding: '1rem' }}>
              <h6 style={{ margin: '0 0 1rem 0', color: 'var(--color-text-primary)' }}>Estado de todas las zonas por categoría AQI</h6>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend layout="vertical" align="center" verticalAlign="bottom" wrapperStyle={{ paddingTop: '0.5rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>Sin datos por zona</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
