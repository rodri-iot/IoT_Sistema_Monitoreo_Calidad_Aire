import React, { useEffect, useState, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area, BarChart, Bar
} from 'recharts'
import { getAQIColor, getAQILabel, getAqiParametroLabel, formatSensorValue } from '../utils/aqiScale'
import AQIScaleReference from '../components/AQIScaleReference'
import AqiPollutantLimitsNote from '../components/AqiPollutantLimitsNote'
import { getDesdeHasta, formatChartBucketLabel } from '../utils/dateTime'

const API = '/api/publico'
const FOOTER_MSG = 'Los datos mostrados son de carácter público e informativo. No sustituyen mediciones oficiales. Ante valores elevados de AQI, considere reducir actividades al aire libre y consulte fuentes locales de calidad del aire.'

export default function VistaPublica() {
  const [empresas, setEmpresas] = useState([])
  const [empresaSeleccionadaId, setEmpresaSeleccionadaId] = useState(null)
  const [sensoresPorEmpresa, setSensoresPorEmpresa] = useState({})
  const [sensorSeleccionado, setSensorSeleccionado] = useState(null)
  const [agregadas, setAgregadas] = useState([])
  const [loadingEmpresas, setLoadingEmpresas] = useState(true)
  const [loadingAgregadas, setLoadingAgregadas] = useState(false)
  const [error, setError] = useState(null)
  const [pagina, setPagina] = useState(1)
  const [filasPorPagina, setFilasPorPagina] = useState(20)
  const [showPmInfo, setShowPmInfo] = useState(false)
  const [showGasesInfo, setShowGasesInfo] = useState(false)
  const agregadasReqId = useRef(0)

  const empresaActiva = empresas.find(e => String(e._id) === String(empresaSeleccionadaId)) || null

  useEffect(() => {
    setLoadingEmpresas(true)
    setError(null)
    fetch(`${API}/empresas`)
      .then(r => { if (!r.ok) throw new Error('Error al cargar empresas'); return r.json() })
      .then(setEmpresas)
      .catch(e => setError(e.message))
      .finally(() => setLoadingEmpresas(false))
  }, [])

  useEffect(() => {
    if (!empresaSeleccionadaId) return
    if (sensoresPorEmpresa[empresaSeleccionadaId]?.data) return
    setSensoresPorEmpresa(prev => ({ ...prev, [empresaSeleccionadaId]: { loading: true, data: null } }))
    fetch(`${API}/dispositivos?empresaId=${empresaSeleccionadaId}`)
      .then(r => { if (!r.ok) throw new Error('Error al cargar sensores'); return r.json() })
      .then(data => setSensoresPorEmpresa(prev => ({ ...prev, [empresaSeleccionadaId]: { loading: false, data } })))
      .catch(e => {
        setError(e.message)
        setSensoresPorEmpresa(prev => ({ ...prev, [empresaSeleccionadaId]: { loading: false, data: [] } }))
      })
  }, [empresaSeleccionadaId])

  useEffect(() => {
    if (!sensorSeleccionado) {
      setAgregadas([])
      return
    }
    const id = ++agregadasReqId.current
    setLoadingAgregadas(true)
    setAgregadas([])
    const { desde, hasta } = getDesdeHasta()
    const qs = new URLSearchParams({
      sensorId: sensorSeleccionado.sensorId,
      desde: desde.toISOString(),
      hasta: hasta.toISOString(),
      agrupacion: '5min'
    })
    fetch(`${API}/agregadas?${qs}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (id === agregadasReqId.current) setAgregadas(data)
      })
      .catch(() => {
        if (id === agregadasReqId.current) setAgregadas([])
      })
      .finally(() => {
        if (id === agregadasReqId.current) setLoadingAgregadas(false)
      })
  }, [sensorSeleccionado])

  function selectEmpresa(empId) {
    if (String(empresaSeleccionadaId) === String(empId)) {
      setEmpresaSeleccionadaId(null)
      setSensorSeleccionado(null)
      setAgregadas([])
      setPagina(1)
    } else {
      setEmpresaSeleccionadaId(empId)
      setSensorSeleccionado(null)
      setAgregadas([])
      setPagina(1)
      setShowPmInfo(false)
      setShowGasesInfo(false)
    }
  }

  function selectSensor(sensor) {
    if (sensorSeleccionado?._id === sensor._id) {
      setSensorSeleccionado(null)
      setAgregadas([])
      setPagina(1)
    } else {
      setSensorSeleccionado(sensor)
      setAgregadas([])
      setPagina(1)
      setShowPmInfo(false)
      setShowGasesInfo(false)
    }
  }

  const sensCache = empresaSeleccionadaId ? sensoresPorEmpresa[empresaSeleccionadaId] : null

  const chartAQI = agregadas.map(a => ({
    label: formatChartBucketLabel(a._id, '5min'),
    AQI: a.avgAqi != null ? Math.round(a.avgAqi) : null
  }))
  const chartAmbiente = agregadas.map(a => ({
    label: formatChartBucketLabel(a._id, '5min'),
    Temp: a.avgTemp != null ? +a.avgTemp.toFixed(1) : null,
    Humedad: a.avgHumedad != null ? +a.avgHumedad.toFixed(1) : null
  }))
  const chartPM = agregadas.map(a => ({
    label: formatChartBucketLabel(a._id, '5min'),
    PM25: a.avgPm25 != null ? +a.avgPm25.toFixed(1) : null,
    PM10: a.avgPm10 != null ? +a.avgPm10.toFixed(1) : null
  }))
  const chartGases = agregadas.map(a => ({
    label: formatChartBucketLabel(a._id, '5min'),
    NO2: a.avgNo2 != null ? +a.avgNo2.toFixed(1) : null,
    CO: a.avgCo != null ? +a.avgCo.toFixed(4) : null,
    NH3: a.avgNh3 != null ? +a.avgNh3.toFixed(3) : null
  }))
  const chartCO2 = agregadas.map(a => ({
    label: formatChartBucketLabel(a._id, '5min'),
    CO2: a.avgCo2 != null ? +a.avgCo2.toFixed(1) : null,
    TVOC: a.avgTvoc != null ? +a.avgTvoc.toFixed(1) : null
  }))

  /** Misma serie que los gráficos: buckets 5 min, más reciente primero (paginación local). */
  const agregadasTablaDesc = useMemo(() => [...agregadas].reverse(), [agregadas])
  const totalFilasTabla = agregadasTablaDesc.length
  const totalPaginas = Math.ceil(totalFilasTabla / filasPorPagina) || 1
  const filasTablaPagina = useMemo(() => {
    const start = (pagina - 1) * filasPorPagina
    return agregadasTablaDesc.slice(start, start + filasPorPagina)
  }, [agregadasTablaDesc, pagina, filasPorPagina])

  const infoBtn = (onClick, title = 'Límites de referencia EPA') => (
    <button type="button" onClick={(e) => { e.stopPropagation(); onClick() }} title={title} style={{
      width: 20, height: 20, borderRadius: '50%', border: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)',
      cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0
    }}>i</button>
  )

  const noDataMsg = (
    <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '0.5rem', fontSize: '0.85rem' }}>
      Sin datos en las últimas 24 horas.
    </div>
  )

  const tooltipStyle = { backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }
  const cursorStyle = { stroke: 'var(--color-border)' }

  const renderDetalleSensor = () => {
    if (!sensorSeleccionado) return null
    return (
      <div style={{
        marginTop: '1.25rem',
        padding: '1rem',
        borderRadius: 'var(--border-radius)',
        backgroundColor: 'var(--color-bg-light)',
        border: '1px solid var(--color-border)'
      }}>
        <div style={{
          padding: '0.6rem 0.85rem', marginBottom: '1rem', borderRadius: 8,
          backgroundColor: 'rgba(52, 152, 219, 0.1)', border: '1px solid var(--color-border)',
          fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.45
        }}>
          <strong style={{ color: 'var(--color-text-primary)' }}>{sensorSeleccionado.nombre}</strong>
          {sensorSeleccionado.zona ? ` · ${sensorSeleccionado.zona}` : ''}
          <br />
          <strong style={{ color: 'var(--color-text-primary)' }}>Últimas 24 horas</strong> &mdash; mismo rango y misma agregación para <strong>gráficos y tabla</strong>: un fila cada <strong>5 minutos</strong> con <strong>promedios</strong> (no lecturas minuto a minuto). Si no hubo datos en 24 h, gráficos y tabla quedan vacíos.
        </div>

        {loadingAgregadas ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Cargando gráficos y tabla...</div>
        ) : (
          <>
            <div style={{ backgroundColor: 'var(--color-bg-card)', borderRadius: 'var(--border-radius)', border: '1px solid var(--color-border)', padding: '1rem', marginBottom: '1rem' }}>
              <h6 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)', fontSize: '0.9rem' }}>AQI (promedio 5 min)</h6>
              {chartAQI.length > 0 ? (
                <ResponsiveContainer width="100%" height={170}>
                  <LineChart data={chartAQI} accessibilityLayer={false}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" stroke="var(--color-text-secondary)" tick={{ fontSize: 10 }} minTickGap={50} />
                    <YAxis stroke="var(--color-text-secondary)" />
                    <Tooltip contentStyle={tooltipStyle} cursor={cursorStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="AQI" stroke="#9b59b6" name="AQI (prom. 5 min)" strokeWidth={2} dot={{ r: 2 }} animationDuration={200} />
                  </LineChart>
                </ResponsiveContainer>
              ) : noDataMsg}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ backgroundColor: 'var(--color-bg-card)', borderRadius: 'var(--border-radius)', border: '1px solid var(--color-border)', padding: '1rem', minHeight: 228, display: 'flex', flexDirection: 'column' }}>
                <h6 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)', fontSize: '0.9rem' }}>Temp / Humedad</h6>
                <div style={{ flex: 1, minHeight: 160 }}>
                  {chartAmbiente.length > 0 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={chartAmbiente} accessibilityLayer={false}>
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={50} />
                        <YAxis />
                        <Tooltip contentStyle={tooltipStyle} cursor={cursorStyle} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="Temp" stroke="#E74C3C" name="Temp (°C)" animationDuration={200} />
                        <Line type="monotone" dataKey="Humedad" stroke="#3498db" name="Humedad (%)" animationDuration={200} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : noDataMsg}
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--color-bg-card)', borderRadius: 'var(--border-radius)', border: '1px solid var(--color-border)', padding: '1rem', minHeight: 228, display: 'flex', flexDirection: 'column' }}>
                <h6 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  PM2.5 / PM10 {infoBtn(() => setShowPmInfo(p => !p))}
                </h6>
                {showPmInfo && <AqiPollutantLimitsNote variant="particulado" compact />}
                <div style={{ flex: 1, minHeight: 160 }}>
                  {chartPM.length > 0 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <AreaChart data={chartPM} accessibilityLayer={false}>
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={50} />
                        <YAxis />
                        <Tooltip contentStyle={tooltipStyle} cursor={cursorStyle} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Area type="monotone" dataKey="PM25" stroke="#2ECC71" fill="#2ECC71" fillOpacity={0.4} name="PM2.5 (µg/m³)" animationDuration={200} />
                        <Area type="monotone" dataKey="PM10" stroke="#F1C40F" fill="#F1C40F" fillOpacity={0.4} name="PM10 (µg/m³)" animationDuration={200} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : noDataMsg}
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--color-bg-card)', borderRadius: 'var(--border-radius)', border: '1px solid var(--color-border)', padding: '1rem', minHeight: 228, display: 'flex', flexDirection: 'column' }}>
                <h6 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  NO₂ / CO / NH₃ {infoBtn(() => setShowGasesInfo(g => !g))}
                </h6>
                {showGasesInfo && <AqiPollutantLimitsNote variant="gases" compact />}
                <div style={{ flex: 1, minHeight: 160 }}>
                  {chartGases.length > 0 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={chartGases} accessibilityLayer={false}>
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={50} />
                        <YAxis />
                        <Tooltip contentStyle={tooltipStyle} cursor={cursorStyle} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="stepAfter" dataKey="NO2" stroke="#E67E22" name="NO₂" animationDuration={200} />
                        <Line type="stepAfter" dataKey="CO" stroke="#E74C3C" name="CO" animationDuration={200} />
                        <Line type="stepAfter" dataKey="NH3" stroke="#9b59b6" name="NH₃" animationDuration={200} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : noDataMsg}
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--color-bg-card)', borderRadius: 'var(--border-radius)', border: '1px solid var(--color-border)', padding: '1rem', minHeight: 228, display: 'flex', flexDirection: 'column' }}>
                <h6 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)', fontSize: '0.9rem' }}>CO₂ / TVOC</h6>
                <div style={{ flex: 1, minHeight: 160 }}>
                  {chartCO2.length > 0 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={chartCO2} accessibilityLayer={false}>
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={50} />
                        <YAxis />
                        <Tooltip contentStyle={tooltipStyle} cursor={cursorStyle} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="CO2" fill="#3498db" name="CO₂ (ppm)" animationDuration={200} />
                        <Bar dataKey="TVOC" fill="#9b59b6" name="TVOC (ppb)" animationDuration={200} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : noDataMsg}
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--color-bg-card)', borderRadius: 'var(--border-radius)', border: '1px solid var(--color-border)', padding: '1.25rem', marginTop: '0.5rem' }}>
              <h6 style={{ margin: '0 0 0.25rem 0', color: 'var(--color-text-primary)', fontSize: '0.9rem' }}>Tabla (promedios cada 5 min)</h6>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                Mismos buckets que los gráficos; solo <strong>últimas 24 h</strong>. Columna <strong>N</strong>: cantidad de lecturas reales usadas en ese promedio.
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Filas:</label>
                  <select value={filasPorPagina} onChange={e => { setFilasPorPagina(Number(e.target.value)); setPagina(1) }} style={{ padding: '0.3rem', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                  {totalFilasTabla} intervalos de 5 min en 24 h
                </span>
              </div>

              {totalFilasTabla === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: '1rem 0' }}>
                  No hay datos agregados en las últimas 24 horas para este sensor.
                </p>
              ) : (
                <>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="striped" style={{ color: 'var(--color-text-primary)', fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>Inicio intervalo</th>
                          <th>N</th>
                          <th>Sensor</th>
                          <th>Zona</th>
                          <th>AQI</th>
                          <th>PM2.5</th>
                          <th>PM10</th>
                          <th>NO₂</th>
                          <th>CO</th>
                          <th>NH₃</th>
                          <th>TVOC</th>
                          <th>CO₂</th>
                          <th>Temp</th>
                          <th>Hum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filasTablaPagina.map((a, idx) => {
                          const aqiR = a.avgAqi != null ? Math.round(a.avgAqi) : null
                          const rowKey = `${formatChartBucketLabel(a._id, '5min')}-${idx}`
                          return (
                            <tr key={rowKey}>
                              <td style={{ whiteSpace: 'nowrap' }}>{formatChartBucketLabel(a._id, '5min')}</td>
                              <td>{a.count ?? '—'}</td>
                              <td>{sensorSeleccionado.nombre || '—'}</td>
                              <td>{sensorSeleccionado.zona || '—'}</td>
                              <td>
                                {aqiR != null ? (
                                  <span style={{
                                    backgroundColor: getAQIColor(aqiR), color: '#fff', fontWeight: 600,
                                    padding: '0.15rem 0.4rem', borderRadius: 6, display: 'inline-block', fontSize: '0.8rem'
                                  }}>
                                    {aqiR}
                                  </span>
                                ) : '—'}
                              </td>
                              <td>{formatSensorValue(a.avgPm25, 1)}</td>
                              <td>{formatSensorValue(a.avgPm10, 1)}</td>
                              <td>{formatSensorValue(a.avgNo2, 1)}</td>
                              <td>{a.avgCo != null && Number.isFinite(Number(a.avgCo)) ? Number(a.avgCo).toFixed(4) : formatSensorValue(a.avgCo, 1)}</td>
                              <td>{formatSensorValue(a.avgNh3, 3)}</td>
                              <td>{formatSensorValue(a.avgTvoc, 1)}</td>
                              <td>{formatSensorValue(a.avgCo2, 1)}</td>
                              <td>{formatSensorValue(a.avgTemp, 1)}{a.avgTemp != null && Number.isFinite(Number(a.avgTemp)) ? '°C' : ''}</td>
                              <td>{formatSensorValue(a.avgHumedad, 1)}{a.avgHumedad != null && Number.isFinite(Number(a.avgHumedad)) ? '%' : ''}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {totalPaginas > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                      <button type="button" className="btn btn-small grey" disabled={pagina <= 1} onClick={() => setPagina(p => Math.max(1, p - 1))}>Anterior</button>
                      <span style={{ alignSelf: 'center', fontSize: '0.85rem' }}>Pág. {pagina} de {totalPaginas}</span>
                      <button type="button" className="btn btn-small grey" disabled={pagina >= totalPaginas} onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}>Siguiente</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem 1rem', backgroundColor: 'var(--color-bg-light)', minHeight: '100%' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h4 style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
              Monitoreo Público de Calidad del Aire
            </h4>
            <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
              Elegí una empresa para ver sus sensores públicos; elegí un sensor para ver gráficos y tabla (últimas 24 h).
            </p>
          </div>
          <Link to="/login" className="btn blue darken-2 waves-effect waves-light">
            Iniciar Sesión
          </Link>
        </div>

        {error && (
          <div style={{ padding: '1rem', backgroundColor: 'rgba(231,76,60,0.2)', borderRadius: 8, marginBottom: '1rem', color: '#E74C3C' }}>
            {error}
          </div>
        )}

        <AQIScaleReference compact />

        <div style={{ marginTop: '1.5rem' }}>
          {loadingEmpresas ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>Cargando empresas...</div>
          ) : empresas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'var(--color-bg-card)', borderRadius: 'var(--border-radius)', border: '1px solid var(--color-border)' }}>
              <p style={{ fontSize: '1.2rem', color: 'var(--color-text-secondary)' }}>No hay empresas con sensores públicos</p>
            </div>
          ) : (
            <>
              <h6 style={{ margin: '0 0 0.75rem 0', color: 'var(--color-text-primary)', fontSize: '0.95rem' }}>Empresas</h6>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {empresas.map(emp => {
                  const selected = String(empresaSeleccionadaId) === String(emp._id)
                  const aqiColor = getAQIColor(emp.maxAQI)
                  return (
                    <div
                      key={emp._id}
                      onClick={() => selectEmpresa(emp._id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter') selectEmpresa(emp._id) }}
                      style={{
                        borderRadius: 'var(--border-radius)',
                        backgroundColor: 'var(--color-bg-card)',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: selected ? '2px solid #3498db' : '1px solid var(--color-border)',
                        boxShadow: selected ? '0 2px 8px rgba(52,152,219,0.12)' : 'none'
                      }}
                    >
                      <div style={{ height: 4, backgroundColor: aqiColor }} />
                      <div style={{ padding: '1rem 1.15rem' }}>
                        <h5 style={{ margin: '0 0 0.35rem 0', color: 'var(--color-text-primary)', fontSize: '1.05rem' }}>{emp.nombre}</h5>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                          {emp.totalDispositivos} sensor{emp.totalDispositivos !== 1 ? 'es' : ''} público{emp.totalDispositivos !== 1 ? 's' : ''}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{
                            display: 'inline-block',
                            backgroundColor: aqiColor, color: '#fff', fontWeight: 700,
                            padding: '0.25rem 0.65rem', borderRadius: 8, fontSize: '0.95rem'
                          }}>
                            AQI {emp.maxAQI ?? '—'}
                          </span>
                          {emp.maxAQI != null && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{getAQILabel(emp.maxAQI)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {empresaSeleccionadaId && (
                <div style={{ marginTop: '1.75rem' }}>
                  <h6 style={{ margin: '0 0 0.75rem 0', color: 'var(--color-text-primary)', fontSize: '0.95rem' }}>
                    Sensores públicos — {empresaActiva?.nombre || '…'}
                  </h6>
                  {sensCache?.loading ? (
                    <div style={{ padding: '1rem', color: 'var(--color-text-secondary)' }}>Cargando sensores...</div>
                  ) : !sensCache?.data?.length ? (
                    <div style={{ padding: '1rem', color: 'var(--color-text-secondary)' }}>No hay sensores públicos para esta empresa.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                      {sensCache.data.map(s => {
                        const selected = sensorSeleccionado?._id === s._id
                        const sAqiColor = getAQIColor(s.aqi)
                        const isActivo = s.estado === 'activo'
                        return (
                          <div
                            key={s._id}
                            onClick={() => selectSensor(s)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={e => { if (e.key === 'Enter') selectSensor(s) }}
                            style={{
                              borderRadius: 'var(--border-radius)',
                              backgroundColor: 'var(--color-bg-card)',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              border: selected ? '2px solid #9b59b6' : '1px solid var(--color-border)',
                              boxShadow: selected ? '0 2px 8px rgba(155,89,182,0.12)' : 'none'
                            }}
                          >
                            <div style={{ height: 3, backgroundColor: sAqiColor }} />
                            <div style={{ padding: '0.75rem 1rem' }}>
                              <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.95rem' }}>{s.nombre}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>Zona: {s.zona}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{
                                  fontSize: '0.65rem', fontWeight: 600,
                                  padding: '0.12rem 0.45rem', borderRadius: 10,
                                  backgroundColor: isActivo ? 'rgba(46,204,113,0.2)' : 'rgba(149,165,166,0.2)',
                                  color: isActivo ? '#2ECC71' : '#95A5A6'
                                }}>
                                  {isActivo ? 'ACTIVO' : 'INACTIVO'}
                                </span>
                                <span style={{
                                  display: 'inline-block',
                                  backgroundColor: sAqiColor, color: '#fff', fontWeight: 700,
                                  padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.85rem'
                                }}>
                                  AQI {s.aqi ?? '—'}
                                </span>
                                {s.aqiParametro && (
                                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>{getAqiParametroLabel(s.aqiParametro)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {sensorSeleccionado && renderDetalleSensor()}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{
          marginTop: '2rem', padding: '1rem 1.25rem', borderRadius: 'var(--border-radius)',
          backgroundColor: 'rgba(149, 165, 166, 0.15)', border: '1px solid var(--color-border)',
          fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5
        }}>
          {FOOTER_MSG}
        </div>
      </div>
    </div>
  )
}
