import React, { useEffect, useState, useContext } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, BarChart, Bar } from 'recharts'
import { getAQIColor, getAQILabel, getAqiParametroLabel, formatSensorValue } from '../utils/aqiScale'
import AQIScaleReference from '../components/AQIScaleReference'
import AqiPollutantLimitsNote from '../components/AqiPollutantLimitsNote'
import { getTodayDateString, getDesdeHasta, formatChartBucketLabel, formatDateTimeAR, formatDateOnlyDisplay, parseDateDisplayToIso } from '../utils/dateTime'

const getValores = (lectura) => {
  const v = lectura?.valores
  if (!v) return {}
  if (v instanceof Map) return Object.fromEntries(v)
  return typeof v === 'object' ? v : {}
}
const getTemp = (v) => v?.temperatura ?? v?.temp ?? v?.temperature
const getHumedad = (v) => v?.humedad ?? v?.humidity ?? v?.hum

const AGRUPACION_OPCIONES = [
  { value: 'minuto', label: 'Minuto' },
  { value: '5min', label: '5 min' },
  { value: '10min', label: '10 min' },
  { value: '30min', label: '30 min' },
  { value: 'hora', label: 'Hora' },
  { value: '4h', label: '4 horas' },
  { value: '8h', label: '8 horas' },
  { value: 'dia', label: 'Día' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' }
]

function getOperacionSugerencia(agrupacion) {
  const cortas = ['minuto', '5min', '10min', '30min']
  const largas = ['dia', 'semana', 'mes']
  if (cortas.includes(agrupacion)) {
    return 'Para temporalidades cortas (minuto a 30 min) conviene usar promedios para ver tendencias suaves y reducir ruido.'
  }
  if (largas.includes(agrupacion)) {
    return 'Para día, semana o mes, use máximos para identificar picos críticos. Los promedios pueden ocultar episodios puntuales.'
  }
  return 'Para hora, 4h u 8h puede usar promedios (tendencia) o máximos (picos).'
}

function isMqttConectado(dispositivo) {
  if (!dispositivo) return false
  if (dispositivo.estado === 'inactivo') return false
  const ultima = dispositivo.ultimaLectura ? new Date(dispositivo.ultimaLectura) : null
  if (!ultima) return false
  const hace5min = new Date()
  hace5min.setMinutes(hace5min.getMinutes() - 5)
  return ultima >= hace5min
}

export default function Historico() {
  const { token, fetchWithAuth } = useContext(AuthContext)
  const [searchParams] = useSearchParams()
  const zonaParam = searchParams.get('zona') || ''
  const sensorParam = searchParams.get('sensorId') || ''

  const [zonas, setZonas] = useState([])
  const [dispositivos, setDispositivos] = useState([])
  const [zonaStats, setZonaStats] = useState({})
  const [top5LineData, setTop5LineData] = useState([])
  const [picoDispositivos, setPicoDispositivos] = useState([])
  const [agregadas, setAgregadas] = useState([])
  const [lecturas, setLecturas] = useState([])
  const [totalLecturas, setTotalLecturas] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [agrupacion, setAgrupacion] = useState('10min')
  const [fechaDesde, setFechaDesde] = useState(() => getTodayDateString())
  const [fechaHasta, setFechaHasta] = useState(() => getTodayDateString())
  const [fechaDesdeText, setFechaDesdeText] = useState(() => formatDateOnlyDisplay(getTodayDateString()))
  const [fechaHastaText, setFechaHastaText] = useState(() => formatDateOnlyDisplay(getTodayDateString()))
  const [zonaIdSeleccionada, setZonaIdSeleccionada] = useState('')
  const [dispositivoSeleccionado, setDispositivoSeleccionado] = useState(null)
  const [operacionGrafico, setOperacionGrafico] = useState('max')
  const [pagina, setPagina] = useState(1)
  const [filasPorPagina, setFilasPorPagina] = useState(50)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showOperacionInfo, setShowOperacionInfo] = useState(false)
  const [showUltimaLecturaInfo, setShowUltimaLecturaInfo] = useState(false)
  const [expandedChart, setExpandedChart] = useState(null)
  const [showPmInfo, setShowPmInfo] = useState(false)
  const [showGasesInfo, setShowGasesInfo] = useState(false)

  const zonaSeleccionada = zonas.find(z => z._id === zonaIdSeleccionada) || null

  useEffect(() => {
    setFechaDesdeText(formatDateOnlyDisplay(fechaDesde))
  }, [fechaDesde])
  useEffect(() => {
    setFechaHastaText(formatDateOnlyDisplay(fechaHasta))
  }, [fechaHasta])

  useEffect(() => {
    if (zonaParam && zonas.length > 0) {
      const z = zonas.find(zo => zo.nombre === zonaParam)
      if (z) setZonaIdSeleccionada(z._id)
    }
  }, [zonaParam, zonas])
  useEffect(() => {
    if (!token) return
    const fetchData = () => {
      fetchWithAuth('/api/zonas').then(r => r.ok ? r.json() : []).then(setZonas).catch(() => setZonas([]))
      fetchWithAuth('/api/dispositivos').then(r => r.ok ? r.json() : []).then(setDispositivos).catch(() => setDispositivos([]))
    }
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [token])

  useEffect(() => {
    if (!token) return
    const url = `/api/sse/lecturas?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)

    es.addEventListener('lectura', (e) => {
      try {
        const data = JSON.parse(e.data)
        setDispositivos(prev => prev.map(d =>
          d.sensorId === data.sensorId ? { ...d, ultimaLectura: data.timestamp, estado: 'activo' } : d
        ))
        setPicoDispositivos(prev => {
          const idx = prev.findIndex(p => p.sensorId === data.sensorId)
          if (idx === -1) return [...prev, { sensorId: data.sensorId, aqi: data.aqi }]
          if (data.aqi != null && (prev[idx].aqi == null || data.aqi > prev[idx].aqi)) {
            const next = [...prev]
            next[idx] = { ...next[idx], aqi: data.aqi, maxAQI: data.aqi }
            return next
          }
          return prev
        })
        setRefreshKey(k => k + 1)
      } catch { /* ignore parse errors */ }
    })

    es.addEventListener('status', (e) => {
      try {
        const data = JSON.parse(e.data)
        setDispositivos(prev => prev.map(d =>
          d.sensorId === data.sensorId ? { ...d, estado: data.estado } : d
        ))
      } catch { /* ignore */ }
    })

    return () => es.close()
  }, [token])

  useEffect(() => {
    if (sensorParam && dispositivos.length > 0) {
      const d = dispositivos.find(disp => disp.sensorId === sensorParam)
      if (d) setDispositivoSeleccionado(d)
    }
  }, [sensorParam, dispositivos])

  useEffect(() => {
    if (!token) return
    const { desde, hasta } = getDesdeHasta(fechaDesde, fechaHasta)
    const params = new URLSearchParams({ desde: desde.toISOString(), hasta: hasta.toISOString(), agrupacion, operacion: operacionGrafico })
    Promise.all(zonas.map(z => fetchWithAuth(`/api/lecturas/agregadas?${params}&zonaId=${z._id}`)))
      .then(ress => Promise.all(ress.map(r => r.ok ? r.json() : [])))
      .then(arrays => {
        const stats = {}
        zonas.forEach((z, i) => {
          const arr = arrays[i] || []
          const maxVals = arr.map(r => r.maxAqi).filter(v => v != null)
          const minVals = arr.map(r => r.minAqi).filter(v => v != null)
          const avgVals = arr.map(r => r.avgAqi).filter(v => v != null)
          stats[z._id] = {
            maxAQI: maxVals.length ? Math.round(Math.max(...maxVals)) : null,
            minAQI: minVals.length ? Math.round(Math.min(...minVals)) : null,
            promedioAQI: avgVals.length ? Math.round(avgVals.reduce((a, b) => a + b, 0) / avgVals.length) : null
          }
        })
        setZonaStats(stats)
      })
      .catch(() => setZonaStats({}))
  }, [token, zonas, agrupacion, operacionGrafico, fechaDesde, fechaHasta])

  useEffect(() => {
    if (token) {
      fetchWithAuth('/api/lecturas/pico-dispositivos?horas=4')
        .then(r => r.ok ? r.json() : [])
        .then(setPicoDispositivos)
        .catch(() => setPicoDispositivos([]))
    }
  }, [token])

  useEffect(() => {
    if (!token || !zonaIdSeleccionada) return
    const { desde, hasta } = getDesdeHasta(fechaDesde, fechaHasta)
    const params = new URLSearchParams({ desde: desde.toISOString(), hasta: hasta.toISOString(), agrupacion, operacion: operacionGrafico, zonaId: zonaIdSeleccionada })
    if (dispositivoSeleccionado?.sensorId) params.set('sensorId', dispositivoSeleccionado.sensorId)
    if (dispositivoSeleccionado?._id) params.set('dispositivoId', dispositivoSeleccionado._id)
    fetchWithAuth(`/api/lecturas/agregadas?${params}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setAgregadas(data.map(r => ({
        label: formatChartBucketLabel(r._id, agrupacion),
        AQI: r.avgAqi != null ? Math.round(r.avgAqi) : null,
        PM25: r.avgPm25, PM10: r.avgPm10, NO2: r.avgNo2, CO: r.avgCo, NH3: r.avgNh3, CO2: r.avgCo2, TVOC: r.avgTvoc,
        Temp: r.avgTemp, Humedad: r.avgHumedad
      }))))
      .catch(() => setAgregadas([]))
    if (dispositivoSeleccionado?.sensorId) {
      const skip = (pagina - 1) * filasPorPagina
      const url = fechaDesde
        ? `/api/lecturas/desde?fecha=${encodeURIComponent(desde.toISOString())}&hasta=${encodeURIComponent(hasta.toISOString())}&limite=${filasPorPagina}&skip=${skip}&sensorId=${dispositivoSeleccionado.sensorId}`
        : `/api/lecturas/sensor/${dispositivoSeleccionado.sensorId}?limite=${filasPorPagina}&skip=${skip}`
      fetchWithAuth(url)
        .then(r => r.ok ? r.json() : { lecturas: [], total: 0 })
        .then(data => {
          const res = Array.isArray(data) ? { lecturas: data, total: data.length } : data
          setLecturas(res.lecturas || [])
          setTotalLecturas(res.total ?? 0)
        })
        .catch(() => { setLecturas([]); setTotalLecturas(0) })
    } else { setLecturas([]); setTotalLecturas(0) }
  }, [token, zonaIdSeleccionada, dispositivoSeleccionado, agrupacion, operacionGrafico, fechaDesde, fechaHasta, zonas, refreshKey, pagina, filasPorPagina])

  useEffect(() => {
    if (!token || !zonaIdSeleccionada || dispositivoSeleccionado || zonas.length === 0) {
      setTop5LineData([])
      return
    }
    const zona = zonas.find(z => z._id === zonaIdSeleccionada)
    if (!zona) { setTop5LineData([]); return }
    const dispositivosDeZona = dispositivos.filter(d => (d.zonaId && d.zonaId === zonaIdSeleccionada) || d.zona === zona.nombre)
    if (dispositivosDeZona.length === 0) { setTop5LineData([]); return }
    const { desde, hasta } = getDesdeHasta(fechaDesde, fechaHasta)
    const params = new URLSearchParams({ desde: desde.toISOString(), hasta: hasta.toISOString(), agrupacion, operacion: operacionGrafico, zonaId: zonaIdSeleccionada })
    Promise.all(dispositivosDeZona.map(d => {
      const p = new URLSearchParams(params)
      p.set('sensorId', d.sensorId)
      if (d._id) p.set('dispositivoId', d._id)
      return fetchWithAuth(`/api/lecturas/agregadas?${p}`)
    }))
      .then(ress => Promise.all(ress.map(r => r.ok ? r.json() : [])))
      .then(arrays => {
        const byDevice = dispositivosDeZona.map((d, i) => {
          const arr = arrays[i] || []
          const aqis = arr.map(r => r.avgAqi).filter(v => v != null)
          const meanAqi = aqis.length ? aqis.reduce((a, b) => a + b, 0) / aqis.length : 0
          return { dispositivo: d, data: arr, meanAqi }
        })
        byDevice.sort((a, b) => b.meanAqi - a.meanAqi)
        const top5 = byDevice.slice(0, 5)
        const byLabel = {}
        top5.forEach(({ dispositivo, data }) => {
          data.forEach(r => {
            const label = formatChartBucketLabel(r._id, agrupacion)
            if (!byLabel[label]) byLabel[label] = { label }
            byLabel[label][dispositivo.nombre] = r.avgAqi != null ? Math.round(r.avgAqi) : null
          })
        })
        Object.keys(byLabel).forEach(label => {
          const point = byLabel[label]
          const vals = Object.keys(point).filter(k => k !== 'label').map(k => point[k]).filter(v => v != null)
          point.promedio = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
        })
        setTop5LineData(Object.values(byLabel).sort((a, b) => (a.label || '').localeCompare(b.label || '')))
      })
      .catch(() => setTop5LineData([]))
  }, [token, zonaIdSeleccionada, dispositivoSeleccionado, dispositivos, zonas, agrupacion, operacionGrafico, fechaDesde, fechaHasta])

  const dispositivosDeZona = zonaSeleccionada ? dispositivos.filter(d => (d.zonaId && d.zonaId === zonaIdSeleccionada) || d.zona === zonaSeleccionada.nombre) : []
  const picoBySensor = Object.fromEntries((picoDispositivos || []).map(p => [p.sensorId, p]))
  const LINE_COLORS_5 = ['#2ECC71', '#3498db', '#9b59b6', '#E67E22', '#E74C3C']
  const stat = zonaIdSeleccionada ? zonaStats[zonaIdSeleccionada] : null

  const totalPaginas = Math.max(1, Math.ceil(totalLecturas / filasPorPagina))
  const lecturasPaginadas = lecturas

  const exportarCSV = () => {
    if (lecturas.length === 0) { alert('No hay datos para exportar'); return }
    const headers = ['Fecha', 'Sensor ID', 'Zona', 'AQI', 'Parámetro AQI', 'PM2.5', 'PM10', 'NO2', 'CO', 'NH3', 'TVOC', 'CO2', 'Temperatura', 'Humedad']
    const csvNum = (raw, decimals = 1) => {
      const s = formatSensorValue(raw, decimals)
      return s === '—' ? '' : s
    }
    const rows = lecturas.map(l => {
      const v = getValores(l)
      const paramLabel = l.aqi != null && l.aqiParametro ? getAqiParametroLabel(l.aqiParametro) : ''
      return [
        formatDateTimeAR(l.timestamp),
        l.sensorId,
        l.zona || '',
        l.aqi ?? '',
        paramLabel,
        csvNum(v.pm25, 1),
        csvNum(v.pm10, 1),
        csvNum(v.no2, 1),
        csvNum(v.co, 1),
        csvNum(v.nh3, 3),
        csvNum(v.tvoc, 1),
        csvNum(v.co2, 1),
        csvNum(getTemp(v), 1),
        csvNum(getHumedad(v), 1)
      ]
    })
    const csv = [headers.join(','), ...rows.map(row => row.map(c => `"${c}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `reporte_lecturas_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const ultimaLectura = dispositivoSeleccionado && lecturas.length > 0 ? lecturas[0] : null
  const ultimosValores = ultimaLectura ? getValores(ultimaLectura) : {}
  const kpiParams = [
    { key: 'AQI', value: ultimaLectura?.aqi, unit: null, color: getAQIColor(ultimaLectura?.aqi) },
    { key: 'PM2.5', value: ultimosValores.pm25 != null ? Number(ultimosValores.pm25).toFixed(1) : null, unit: 'µg/m³', color: null },
    { key: 'PM10', value: ultimosValores.pm10 != null ? Number(ultimosValores.pm10).toFixed(1) : null, unit: 'µg/m³', color: null },
    { key: 'CO2', value: ultimosValores.co2 != null ? ultimosValores.co2 : null, unit: 'ppm', color: null },
    { key: 'CO', value: ultimosValores.co != null ? ultimosValores.co : null, unit: 'ppm', color: null },
    { key: 'NO2', value: ultimosValores.no2 != null ? ultimosValores.no2 : null, unit: 'ppm', color: null },
    { key: 'NH3', value: ultimosValores.nh3 != null ? Number(ultimosValores.nh3).toFixed(2) : null, unit: 'ppm', color: null },
    { key: 'VOC', value: ultimosValores.tvoc != null ? ultimosValores.tvoc : null, unit: 'ppb', color: null },
    { key: 'Temp', value: getTemp(ultimosValores) != null ? Number(getTemp(ultimosValores)).toFixed(1) : null, unit: '°C', color: null },
    { key: 'Humedad', value: getHumedad(ultimosValores) != null ? Number(getHumedad(ultimosValores)).toFixed(1) : null, unit: '%', color: null }
  ]

  const chart1 = agregadas.filter(d => d.AQI != null)
  const chart2 = agregadas.filter(d => d.Temp != null || d.Humedad != null)
  const chart3 = agregadas.filter(d => d.PM25 != null || d.PM10 != null)
  const chartGases = agregadas.filter(d => d.NO2 != null || d.CO != null || d.NH3 != null)
  const chart4 = agregadas.filter(d => d.CO2 != null || d.TVOC != null)

  /** Misma altura de fila de etiqueta en los 4 campos para que los inputs queden alineados. */
  const filterLabelRowStyle = {
    minHeight: '1.75rem',
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.35rem',
    fontSize: '0.85rem',
    color: 'var(--color-text-secondary)',
    lineHeight: 1.25,
    margin: 0
  }
  /** Misma caja para select e input (altura fija + padding simétrico) para evitar desfase entre motores. */
  const filterControlStyle = {
    width: '100%',
    margin: 0,
    padding: '0.4rem 0.5rem',
    height: 40,
    minHeight: 40,
    maxHeight: 40,
    borderRadius: 8,
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-card)',
    color: 'var(--color-text-primary)',
    boxSizing: 'border-box',
    fontSize: '0.9rem',
    lineHeight: 1.25
  }

  const commitFechaDesde = () => {
    const iso = parseDateDisplayToIso(fechaDesdeText)
    if (iso) setFechaDesde(iso)
    else setFechaDesdeText(formatDateOnlyDisplay(fechaDesde))
  }
  const commitFechaHasta = () => {
    const iso = parseDateDisplayToIso(fechaHastaText)
    if (iso) setFechaHasta(iso)
    else setFechaHastaText(formatDateOnlyDisplay(fechaHasta))
  }

  return (
    <div style={{ padding: '2rem 1rem', backgroundColor: 'var(--color-bg-light)', minHeight: '100%' }}>
      <div className="container">
        <h4 style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Monitoreo</h4>
        <div style={{ marginBottom: '1.5rem' }}>
          <AQIScaleReference compact />
        </div>

        <div className="card" style={{ borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-card)', padding: '1.5rem', marginBottom: '2rem' }}>
          {/*
            Fila 1: fechas al mismo nivel. Fila 2: temporalidad y operación.
            Sin alignItems:end en un único grid de 4 celdas (evita mezclar alturas de fila con auto-fit).
          */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 0 }}>
                <label htmlFor="hist-desde" style={filterLabelRowStyle}>Fecha desde</label>
                <input
                  id="hist-desde"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="dd/mm/aaaa"
                  value={fechaDesdeText}
                  onChange={e => setFechaDesdeText(e.target.value)}
                  onBlur={commitFechaDesde}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitFechaDesde() } }}
                  style={filterControlStyle}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 0 }}>
                <label htmlFor="hist-hasta" style={filterLabelRowStyle}>Fecha hasta</label>
                <input
                  id="hist-hasta"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="dd/mm/aaaa"
                  value={fechaHastaText}
                  onChange={e => setFechaHastaText(e.target.value)}
                  onBlur={commitFechaHasta}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitFechaHasta() } }}
                  style={filterControlStyle}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 0 }}>
                <label htmlFor="hist-agrupacion" style={filterLabelRowStyle}>Temporalidad</label>
                <select
                  id="hist-agrupacion"
                  value={agrupacion}
                  onChange={e => setAgrupacion(e.target.value)}
                  style={filterControlStyle}
                >
                  {AGRUPACION_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 0 }}>
                <label htmlFor="hist-operacion" style={filterLabelRowStyle}>
                  <span>Valor por intervalo</span>
                  <button
                    type="button"
                    onClick={e => { e.preventDefault(); setShowOperacionInfo(s => !s) }}
                    title="Sugerencia"
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-bg-card)',
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      flexShrink: 0
                    }}
                  >
                    i
                  </button>
                </label>
                <select id="hist-operacion" value={operacionGrafico} onChange={e => setOperacionGrafico(e.target.value)} style={filterControlStyle}>
                  <option value="avg">Promedios</option>
                  <option value="max">Máximos</option>
                </select>
              </div>
            </div>
          </div>
          {showOperacionInfo && (
            <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', fontSize: '0.8rem', backgroundColor: 'rgba(52, 152, 219, 0.15)', borderRadius: 8, border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
              {getOperacionSugerencia(agrupacion)}
            </div>
          )}
        </div>

        {error && (
          <div style={{ padding: '1rem', backgroundColor: 'rgba(231,76,60,0.2)', borderRadius: 8, marginBottom: '1rem', color: '#E74C3C' }}>{error}</div>
        )}

        <h6 style={{ margin: '0 0 0.75rem 0', color: 'var(--color-text-primary)' }}>Zonas</h6>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem' }}>
          {zonas.map(z => {
            const s = zonaStats[z._id] || {}
            const sel = zonaIdSeleccionada === z._id
            const aqiColor = getAQIColor(s.maxAQI) || '#95A5A6'
            return (
              <button
                key={z._id}
                type="button"
                onClick={() => { setZonaIdSeleccionada(z._id); setDispositivoSeleccionado(null); setPagina(1) }}
                style={{
                  position: 'relative',
                  padding: '0.75rem 1rem',
                  paddingLeft: '1.25rem',
                  borderRadius: 'var(--border-radius)',
                  border: sel ? '2px solid #3498db' : '1px solid var(--color-border)',
                  backgroundColor: sel ? 'var(--color-bg-light)' : 'var(--color-bg-card)',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  minWidth: 180,
                  overflow: 'hidden'
                }}
              >
                <div
                  title={getAQILabel(s.maxAQI)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 5,
                    height: '100%',
                    backgroundColor: aqiColor,
                    borderTopLeftRadius: 'var(--border-radius)',
                    borderBottomLeftRadius: 'var(--border-radius)'
                  }}
                  aria-label={getAQILabel(s.maxAQI)}
                />
                <div style={{ fontWeight: 600 }}>{z.nombre}</div>
                <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Máx: <span style={{ color: getAQIColor(s.maxAQI), fontWeight: 600 }}>{s.maxAQI ?? '—'}</span>
                  {' | '}Mín: <span style={{ color: getAQIColor(s.minAQI) }}>{s.minAQI ?? '—'}</span>
                  {' | '}Prom: <span style={{ color: getAQIColor(s.promedioAQI) }}>{s.promedioAQI ?? '—'}</span>
                </div>
              </button>
            )
          })}
        </div>

        {zonaIdSeleccionada && zonaSeleccionada && (
          <>
            <h6 style={{ margin: '0 0 0.75rem 0', color: 'var(--color-text-primary)' }}>Dispositivos en {zonaSeleccionada.nombre}</h6>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
              {dispositivosDeZona.map(d => {
                const pico = picoBySensor[d.sensorId]
                const aqi = pico?.aqi ?? pico?.maxAQI
                const mqttConectado = isMqttConectado(d)
                const aqiColor = getAQIColor(aqi) || '#95A5A6'
                return (
                  <button
                    key={d._id}
                    type="button"
                    onClick={() => { setDispositivoSeleccionado(d); setPagina(1); setRefreshKey(k => k + 1) }}
                    style={{
                      position: 'relative',
                      padding: '0.5rem 0.75rem',
                      paddingLeft: '1rem',
                      paddingRight: '1rem',
                      borderRadius: 8,
                      border: dispositivoSeleccionado?._id === d._id ? '2px solid #9b59b6' : '1px solid var(--color-border)',
                      backgroundColor: dispositivoSeleccionado?._id === d._id ? 'var(--color-bg-light)' : 'var(--color-bg-card)',
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      minWidth: 180,
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      title={getAQILabel(aqi)}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 5,
                        height: '100%',
                        backgroundColor: aqiColor,
                        borderTopLeftRadius: 8,
                        borderBottomLeftRadius: 8
                      }}
                      aria-label={getAQILabel(aqi)}
                    />
                    <div
                      title={mqttConectado ? 'ONLINE' : 'OFFLINE'}
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: 5,
                        height: '100%',
                        backgroundColor: mqttConectado ? '#2ECC71' : '#95A5A6',
                        borderTopRightRadius: 8,
                        borderBottomRightRadius: 8
                      }}
                      aria-label={mqttConectado ? 'Conectado MQTT' : 'Desconectado MQTT'}
                    />
                    <span>{d.nombre}</span>
                    {aqi != null ? (
                      <span style={{ fontWeight: 600, color: getAQIColor(aqi) }}>AQI {aqi}</span>
                    ) : (
                      <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>AQI —</span>
                    )}
                  </button>
                )
              })}
            </div>

            {!dispositivoSeleccionado ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                  <div className="card" style={{ padding: '1rem', borderRadius: 'var(--border-radius)', backgroundColor: getAQIColor(stat?.maxAQI) ? `${getAQIColor(stat.maxAQI)}22` : 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>AQI crítico (máx)</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: getAQIColor(stat?.maxAQI) }}>{stat?.maxAQI ?? '—'}</div>
                  </div>
                  <div className="card" style={{ padding: '1rem', borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>AQI más bajo</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: getAQIColor(stat?.minAQI) }}>{stat?.minAQI ?? '—'}</div>
                  </div>
                  <div className="card" style={{ padding: '1rem', borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Promedio AQI zona</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: getAQIColor(stat?.promedioAQI) }}>{stat?.promedioAQI ?? '—'}</div>
                  </div>
                </div>
                <div className="card" style={{ borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-card)', padding: '1rem', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h6 style={{ margin: 0, color: 'var(--color-text-primary)' }}>Top 5 dispositivos AQI (agrupación seleccionada)</h6>
                    {top5LineData.length > 0 && (
                      <button type="button" onClick={() => setExpandedChart('top5')} title="Expandir" style={{ padding: '0.2rem 0.35rem', fontSize: '0.7rem', minWidth: 'auto', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>⛶</button>
                    )}
                  </div>
                  {top5LineData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={top5LineData} accessibilityLayer={false}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis dataKey="label" stroke="var(--color-text-secondary)" tick={{ fontSize: 10 }} minTickGap={50} />
                        <YAxis stroke="var(--color-text-secondary)" />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }} cursor={{ stroke: 'var(--color-border)' }} />
                        <Legend />
                        {[...new Set(top5LineData.flatMap(d => Object.keys(d).filter(k => k !== 'label')))].filter(k => k !== 'promedio').slice(0, 5).map((key, i) => (
                          <Line key={key} type="monotone" dataKey={key} stroke={LINE_COLORS_5[i % LINE_COLORS_5.length]} strokeWidth={2} dot={{ r: 2 }} animationDuration={200} />
                        ))}
                        <Line key="promedio" type="monotone" dataKey="promedio" stroke="#95A5A6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} name="AQI promedio zona" animationDuration={200} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
                      Sin datos para el periodo. Ajusta fechas y aplica.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {agregadas.length === 0 && (
                  <div style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', borderRadius: 8, backgroundColor: 'rgba(149, 165, 166, 0.2)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                    No hay lecturas en el periodo seleccionado. Comprueba las fechas, que el dispositivo haya enviado datos, y pulsa Aplicar.
                  </div>
                )}
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Última lectura del dispositivo
                    <button
                      type="button"
                      onClick={() => setShowUltimaLecturaInfo(s => !s)}
                      title="Más información"
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-bg-card)',
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0
                      }}
                    >
                      i
                    </button>
                  </label>
                  {showUltimaLecturaInfo && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                      Última lectura en el período seleccionado
                    </div>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {kpiParams.map(({ key, value, unit, color }) => (
                    <div key={key} style={{ padding: '0.75rem', borderRadius: 8, backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>{key}</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: color || 'var(--color-text-primary)' }}>{value ?? '—'}</div>
                      {value != null && unit && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{unit}</div>}
                    </div>
                  ))}
                </div>
                <div className="row">
                  <div className="col s12 m6"><div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}><h6 style={{ margin: 0 }}>Ambiente: Temp / Humedad</h6>{chart2.length > 0 && <button type="button" onClick={() => setExpandedChart('ambiente')} title="Expandir" style={{ padding: '0.2rem 0.35rem', fontSize: '0.7rem', minWidth: 'auto', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>⛶</button>}</div>{chart2.length > 0 ? <ResponsiveContainer width="100%" height={160}><LineChart data={chart2} accessibilityLayer={false}><XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={50} /><YAxis /><Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }} cursor={{ stroke: 'var(--color-border)' }} /><Legend wrapperStyle={{ fontSize: 11 }} /><Line type="monotone" dataKey="Temp" stroke="#E74C3C" name="Temp (°C)" animationDuration={200} /><Line type="monotone" dataKey="Humedad" stroke="#3498db" name="Humedad (%)" animationDuration={200} /></LineChart></ResponsiveContainer> : <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '0.5rem', fontSize: '0.85rem' }}>No hay lecturas en el periodo seleccionado. Comprueba las fechas, que el dispositivo haya enviado datos, y pulsa Aplicar.</div>}</div></div>
                  <div className="col s12 m6"><div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}><h6 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>Particulado: PM2.5 / PM10 <button type="button" onClick={() => setShowPmInfo(s => !s)} title="Límites de referencia EPA" style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>i</button></h6>{chart3.length > 0 && <button type="button" onClick={() => setExpandedChart('particulado')} title="Expandir" style={{ padding: '0.2rem 0.35rem', fontSize: '0.7rem', minWidth: 'auto', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>⛶</button>}</div>{showPmInfo && <AqiPollutantLimitsNote variant="particulado" compact />}{chart3.length > 0 ? <ResponsiveContainer width="100%" height={160}><AreaChart data={chart3} accessibilityLayer={false}><XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={50} /><YAxis /><Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }} cursor={{ stroke: 'var(--color-border)' }} /><Legend wrapperStyle={{ fontSize: 11 }} /><Area type="monotone" dataKey="PM25" stroke="#2ECC71" fill="#2ECC71" fillOpacity={0.4} name="PM2.5 (µg/m³)" animationDuration={200} /><Area type="monotone" dataKey="PM10" stroke="#F1C40F" fill="#F1C40F" fillOpacity={0.4} name="PM10 (µg/m³)" animationDuration={200} /></AreaChart></ResponsiveContainer> : <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '0.5rem', fontSize: '0.85rem' }}>No hay lecturas en el periodo seleccionado. Comprueba las fechas, que el dispositivo haya enviado datos, y pulsa Aplicar.</div>}</div></div>
                  <div className="col s12 m6"><div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}><h6 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>Gases: NO2 / CO / NH3 <button type="button" onClick={() => setShowGasesInfo(s => !s)} title="Límites de referencia EPA" style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>i</button></h6>{chartGases.length > 0 && <button type="button" onClick={() => setExpandedChart('gases')} title="Expandir" style={{ padding: '0.2rem 0.35rem', fontSize: '0.7rem', minWidth: 'auto', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>⛶</button>}</div>{showGasesInfo && <AqiPollutantLimitsNote variant="gases" compact />}{chartGases.length > 0 ? <ResponsiveContainer width="100%" height={160}><LineChart data={chartGases} accessibilityLayer={false}><XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={50} /><YAxis /><Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }} cursor={{ stroke: 'var(--color-border)' }} /><Legend wrapperStyle={{ fontSize: 11 }} /><Line type="stepAfter" dataKey="NO2" stroke="#E67E22" name="NO2" animationDuration={200} /><Line type="stepAfter" dataKey="CO" stroke="#E74C3C" name="CO" animationDuration={200} /><Line type="stepAfter" dataKey="NH3" stroke="#9b59b6" name="NH3" animationDuration={200} /></LineChart></ResponsiveContainer> : <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '0.5rem', fontSize: '0.85rem' }}>No hay lecturas en el periodo seleccionado. Comprueba las fechas, que el dispositivo haya enviado datos, y pulsa Aplicar.</div>}</div></div>
                  <div className="col s12 m6"><div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}><h6 style={{ margin: 0 }}>CO2 / TVOC</h6>{chart4.length > 0 && <button type="button" onClick={() => setExpandedChart('co2tvoc')} title="Expandir" style={{ padding: '0.2rem 0.35rem', fontSize: '0.7rem', minWidth: 'auto', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>⛶</button>}</div>{chart4.length > 0 ? <ResponsiveContainer width="100%" height={160}><BarChart data={chart4} accessibilityLayer={false}><XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={50} /><YAxis /><Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }} cursor={{ stroke: 'var(--color-border)' }} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="CO2" fill="#3498db" name="CO2 (ppm)" animationDuration={200} /><Bar dataKey="TVOC" fill="#9b59b6" name="TVOC (ppb)" animationDuration={200} /></BarChart></ResponsiveContainer> : <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '0.5rem', fontSize: '0.85rem' }}>No hay lecturas en el periodo seleccionado. Comprueba las fechas, que el dispositivo haya enviado datos, y pulsa Aplicar.</div>}</div></div>
                </div>
                <div className="card" style={{ borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-card)', padding: '1.5rem', marginBottom: '2rem' }}>
                  <h6 style={{ margin: '0 0 0.25rem 0' }}>Tabla de lecturas</h6>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Valores reales (sin promediar)</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Filas:</label>
                      <select value={filasPorPagina} onChange={e => { setFilasPorPagina(Number(e.target.value)); setPagina(1) }} style={{ padding: '0.35rem', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                        <option value={15}>15</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={500}>500</option>
                      </select>
                    </div>
                    <button className="btn btn-small green darken-2" onClick={exportarCSV}>Descargar reporte CSV</button>
                  </div>
                  {lecturas.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>No hay lecturas. Ajusta fechas y aplica.</p>
                  ) : (
                    <>
                      <div style={{ overflowX: 'auto' }}>
                        <table className="striped" style={{ color: 'var(--color-text-primary)' }}>
                          <thead>
                            <tr>
                              <th>Fecha</th>
                              <th>Nombre sensor</th>
                              <th>Sensor</th>
                              <th>Zona</th>
                              <th>AQI</th>
                              <th>Parámetro AQI</th>
                              <th>PM2.5</th>
                              <th>PM10</th>
                              <th>NO2</th>
                              <th>CO</th>
                              <th>NH3</th>
                              <th>TVOC</th>
                              <th>CO2</th>
                              <th>Temp</th>
                              <th>Humedad</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lecturasPaginadas.map(l => {
                              const v = getValores(l)
                              const nombreSensor = dispositivos.find(d => d.sensorId === l.sensorId)?.nombre ?? l.sensorId
                              return (
                                <tr key={l._id}>
                                  <td>{formatDateTimeAR(l.timestamp)}</td>
                                  <td>{nombreSensor}</td>
                                  <td style={{ fontFamily: 'monospace' }}>{l.sensorId}</td>
                                  <td>{l.zona || '—'}</td>
                                  <td>
                                    <span style={{
                                      backgroundColor: getAQIColor(l.aqi),
                                      color: '#fff',
                                      fontWeight: 600,
                                      padding: '0.2rem 0.5rem',
                                      borderRadius: 8,
                                      display: 'inline-block'
                                    }}>
                                      {l.aqi ?? '—'}
                                    </span>
                                  </td>
                                  <td>{l.aqi != null && l.aqiParametro ? getAqiParametroLabel(l.aqiParametro) : '—'}</td>
                                  <td>{formatSensorValue(v.pm25, 1)}</td>
                                  <td>{formatSensorValue(v.pm10, 1)}</td>
                                  <td>{formatSensorValue(v.no2, 1)}</td>
                                  <td>{formatSensorValue(v.co, 1)}</td>
                                  <td>{formatSensorValue(v.nh3, 3)}</td>
                                  <td>{formatSensorValue(v.tvoc, 1)}</td>
                                  <td>{formatSensorValue(v.co2, 1)}</td>
                                  <td>{getTemp(v) != null ? `${Number(getTemp(v)).toFixed(1)}°C` : '—'}</td>
                                  <td>{getHumedad(v) != null ? `${Number(getHumedad(v)).toFixed(1)}%` : '—'}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      {totalPaginas > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                          <button className="btn btn-small grey" disabled={pagina <= 1} onClick={() => setPagina(p => Math.max(1, p - 1))}>Anterior</button>
                          <span style={{ alignSelf: 'center', fontSize: '0.9rem' }}>Pág. {pagina} de {totalPaginas}</span>
                          <button className="btn btn-small grey" disabled={pagina >= totalPaginas} onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}>Siguiente</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {expandedChart && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Gráfico expandido"
          onClick={() => setExpandedChart(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--color-bg-card)',
              borderRadius: 'var(--border-radius)',
              padding: '1.5rem',
              width: '90vw',
              maxWidth: 1200,
              height: '70vh',
              maxHeight: 600,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h5 style={{ margin: 0, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {expandedChart === 'top5' && 'Top 5 dispositivos AQI'}
                {expandedChart === 'ambiente' && 'Ambiente: Temp / Humedad'}
                {expandedChart === 'particulado' && <>Particulado: PM2.5 / PM10 <button type="button" onClick={() => setShowPmInfo(s => !s)} title="Límites de referencia EPA" style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>i</button></>}
                {expandedChart === 'gases' && <>Gases: NO2 / CO / NH3 <button type="button" onClick={() => setShowGasesInfo(s => !s)} title="Límites de referencia EPA" style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>i</button></>}
                {expandedChart === 'co2tvoc' && 'CO2 / TVOC'}
              </h5>
              <button type="button" onClick={() => setExpandedChart(null)} style={{ background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 8, padding: '0.35rem 0.75rem', cursor: 'pointer', color: 'var(--color-text-primary)', fontSize: '1rem' }}>Cerrar</button>
            </div>
            <div style={{ flex: 1, minHeight: 300, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
              {expandedChart === 'top5' && top5LineData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={top5LineData} accessibilityLayer={false}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" stroke="var(--color-text-secondary)" tick={{ fontSize: 11 }} minTickGap={50} />
                    <YAxis stroke="var(--color-text-secondary)" />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }} cursor={{ stroke: 'var(--color-border)' }} />
                    <Legend />
                    {[...new Set(top5LineData.flatMap(d => Object.keys(d).filter(k => k !== 'label')))].filter(k => k !== 'promedio').slice(0, 5).map((key, i) => (
                      <Line key={key} type="monotone" dataKey={key} stroke={LINE_COLORS_5[i % LINE_COLORS_5.length]} strokeWidth={2} dot={{ r: 3 }} animationDuration={200} />
                    ))}
                    <Line key="promedio" type="monotone" dataKey="promedio" stroke="#95A5A6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="AQI promedio zona" animationDuration={200} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {expandedChart === 'ambiente' && chart2.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart2} accessibilityLayer={false}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={50} />
                    <YAxis />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }} cursor={{ stroke: 'var(--color-border)' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="Temp" stroke="#E74C3C" name="Temp (°C)" strokeWidth={2} dot={{ r: 3 }} animationDuration={200} />
                    <Line type="monotone" dataKey="Humedad" stroke="#3498db" name="Humedad (%)" strokeWidth={2} dot={{ r: 3 }} animationDuration={200} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {expandedChart === 'particulado' && chart3.length > 0 && (
                <>
                  {showPmInfo && <AqiPollutantLimitsNote variant="particulado" />}
                  <ResponsiveContainer width="100%" minHeight={280} height="100%">
                    <AreaChart data={chart3} accessibilityLayer={false}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={50} />
                      <YAxis />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }} cursor={{ stroke: 'var(--color-border)' }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="PM25" stroke="#2ECC71" fill="#2ECC71" fillOpacity={0.4} name="PM2.5 (µg/m³)" strokeWidth={2} animationDuration={200} />
                      <Area type="monotone" dataKey="PM10" stroke="#F1C40F" fill="#F1C40F" fillOpacity={0.4} name="PM10 (µg/m³)" strokeWidth={2} animationDuration={200} />
                    </AreaChart>
                  </ResponsiveContainer>
                </>
              )}
              {expandedChart === 'gases' && chartGases.length > 0 && (
                <>
                  {showGasesInfo && <AqiPollutantLimitsNote variant="gases" />}
                  <ResponsiveContainer width="100%" minHeight={280} height="100%">
                    <LineChart data={chartGases} accessibilityLayer={false}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={50} />
                      <YAxis />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }} cursor={{ stroke: 'var(--color-border)' }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="stepAfter" dataKey="NO2" stroke="#E67E22" name="NO2" strokeWidth={2} dot={{ r: 3 }} animationDuration={200} />
                      <Line type="stepAfter" dataKey="CO" stroke="#E74C3C" name="CO" strokeWidth={2} dot={{ r: 3 }} animationDuration={200} />
                      <Line type="stepAfter" dataKey="NH3" stroke="#9b59b6" name="NH3" strokeWidth={2} dot={{ r: 3 }} animationDuration={200} />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              )}
              {expandedChart === 'co2tvoc' && chart4.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart4} accessibilityLayer={false}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={50} />
                    <YAxis />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }} cursor={{ stroke: 'var(--color-border)' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="CO2" fill="#3498db" name="CO2 (ppm)" animationDuration={200} />
                    <Bar dataKey="TVOC" fill="#9b59b6" name="TVOC (ppb)" animationDuration={200} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
