import React, { useEffect, useState, useContext } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, BarChart, Bar } from 'recharts'
import { getAQIColor, getAQILabel } from '../utils/aqiScale'
import AQIScaleReference from '../components/AQIScaleReference'

const getValores = (lectura) => {
  const v = lectura?.valores
  if (!v) return {}
  if (v instanceof Map) return Object.fromEntries(v)
  return typeof v === 'object' ? v : {}
}
const getTemp = (v) => v?.temperatura ?? v?.temp ?? v?.temperature
const getHumedad = (v) => v?.humedad ?? v?.humidity ?? v?.hum

const formatAggLabel = (id) => {
  if (!id) return ''
  const d = id.day != null ? String(id.day).padStart(2, '0') : ''
  const m = id.month ? String(id.month).padStart(2, '0') : ''
  const h = id.hour != null ? String(id.hour).padStart(2, '0') : ''
  const min = id.minuteBucket != null ? id.minuteBucket : id.minute
  if (h) return `${d || '01'}/${m || '01'} ${h}:${String(min ?? 0).padStart(2, '0')}`
  if (d) return `${d}/${m || '01'}`
  if (m) return `${id.year || ''}-${m}`
  return String(id.year || '')
}

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

function getTodayDateString() {
  const t = new Date()
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0')
}

function getDesdeHasta(fechaDesde, fechaHasta) {
  const today = getTodayDateString()
  let desde, hasta
  if (fechaDesde) {
    desde = new Date(fechaDesde + 'T00:00:00')
  } else {
    desde = new Date()
    desde.setHours(desde.getHours() - 24)
  }
  if (fechaHasta) {
    if (fechaHasta === today) {
      hasta = new Date()
    } else {
      hasta = new Date(fechaHasta + 'T00:00:00')
      hasta.setHours(23, 59, 59, 999)
    }
  } else {
    hasta = new Date()
  }
  return { desde, hasta }
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

  const [agrupacion, setAgrupacion] = useState('minuto')
  const [fechaDesde, setFechaDesde] = useState(() => getTodayDateString())
  const [fechaHasta, setFechaHasta] = useState(() => getTodayDateString())
  const [zonaIdSeleccionada, setZonaIdSeleccionada] = useState('')
  const [dispositivoSeleccionado, setDispositivoSeleccionado] = useState(null)
  const [operacionGrafico, setOperacionGrafico] = useState('max')
  const [pagina, setPagina] = useState(1)
  const [filasPorPagina, setFilasPorPagina] = useState(50)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showOperacionInfo, setShowOperacionInfo] = useState(false)
  const [expandedChart, setExpandedChart] = useState(null)

  const zonaSeleccionada = zonas.find(z => z._id === zonaIdSeleccionada) || null

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
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
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
        label: formatAggLabel(r._id),
        AQI: r.avgAqi != null ? Math.round(r.avgAqi) : null,
        PM25: r.avgPm25, PM10: r.avgPm10, NO2: r.avgNo2, CO: r.avgCo, CO2: r.avgCo2, TVOC: r.avgTvoc,
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
            const label = formatAggLabel(r._id)
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
    const headers = ['Fecha', 'Sensor ID', 'Zona', 'AQI', 'PM2.5', 'PM10', 'NO2', 'CO', 'TVOC', 'CO2', 'Temperatura', 'Humedad']
    const rows = lecturas.map(l => {
      const v = getValores(l)
      return [
        new Date(l.timestamp).toLocaleString('es-AR'),
        l.sensorId,
        l.zona || '',
        l.aqi ?? '',
        v.pm25 ?? '',
        v.pm10 ?? '',
        v.no2 ?? '',
        v.co ?? '',
        v.tvoc ?? '',
        v.co2 ?? '',
        getTemp(v) ?? '',
        getHumedad(v) ?? ''
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
    { key: 'VOC', value: ultimosValores.tvoc != null ? ultimosValores.tvoc : null, unit: 'ppb', color: null },
    { key: 'Temp', value: getTemp(ultimosValores) != null ? Number(getTemp(ultimosValores)).toFixed(1) : null, unit: '°C', color: null },
    { key: 'Humedad', value: getHumedad(ultimosValores) != null ? Number(getHumedad(ultimosValores)).toFixed(1) : null, unit: '%', color: null }
  ]

  const chart1 = agregadas.filter(d => d.AQI != null)
  const chart2 = agregadas.filter(d => d.Temp != null || d.Humedad != null)
  const chart3 = agregadas.filter(d => d.PM25 != null || d.PM10 != null)
  const chart4 = agregadas.filter(d => d.CO2 != null || d.TVOC != null)

  return (
    <div style={{ padding: '2rem 1rem', backgroundColor: 'var(--color-bg-light)', minHeight: '100%' }}>
      <div className="container">
        <h4 style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Monitoreo</h4>
        <div style={{ marginBottom: '1.5rem' }}>
          <AQIScaleReference compact />
        </div>

        <div className="card" style={{ borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-card)', padding: '1.5rem', marginBottom: '2rem' }}>
          <div className="row" style={{ marginBottom: '1rem' }}>
            <div className="col s12 m6 l3">
              <label style={{ display: 'block', marginBottom: '0.35rem', minHeight: '1.25rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Temporalidad</label>
              <select
                value={agrupacion}
                onChange={e => setAgrupacion(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.5rem', height: 40, borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)', boxSizing: 'border-box', fontSize: '0.9rem' }}
              >
                {AGRUPACION_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="col s12 m6 l3">
              <label style={{ display: 'block', marginBottom: '0.35rem', minHeight: '1.25rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Fecha desde</label>
              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.5rem', height: 40, borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)', boxSizing: 'border-box', fontSize: '0.9rem' }} />
            </div>
            <div className="col s12 m6 l3">
              <label style={{ display: 'block', marginBottom: '0.35rem', minHeight: '1.25rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Fecha hasta</label>
              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.5rem', height: 40, borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)', boxSizing: 'border-box', fontSize: '0.9rem' }} />
            </div>
            <div className="col s12 m6 l3">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem', minHeight: '1.25rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                Valor por intervalo
                <button
                  type="button"
                  onClick={() => setShowOperacionInfo(s => !s)}
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
                    padding: 0
                  }}
                >
                  i
                </button>
              </label>
              <select value={operacionGrafico} onChange={e => setOperacionGrafico(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.5rem', height: 40, borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)', boxSizing: 'border-box', fontSize: '0.9rem' }}>
                <option value="avg">Promedios</option>
                <option value="max">Máximos</option>
              </select>
            </div>
          </div>
          {showOperacionInfo && (
            <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', fontSize: '0.8rem', backgroundColor: 'rgba(52, 152, 219, 0.15)', borderRadius: 8, border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
              {getOperacionSugerencia(agrupacion)}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn blue darken-2" onClick={() => setRefreshKey(k => k + 1)}>Aplicar</button>
            <button className="btn grey" onClick={() => { setFechaDesde(getTodayDateString()); setFechaHasta(getTodayDateString()); setAgrupacion('minuto'); setZonaIdSeleccionada(''); setDispositivoSeleccionado(null) }}>Limpiar</button>
            {lecturas.length > 0 && <button className="btn green darken-2" onClick={exportarCSV}>Descargar reporte CSV</button>}
          </div>
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
                      <LineChart data={top5LineData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis dataKey="label" stroke="var(--color-text-secondary)" tick={{ fontSize: 10 }} minTickGap={50} />
                        <YAxis stroke="var(--color-text-secondary)" />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }} />
                        <Legend />
                        {[...new Set(top5LineData.flatMap(d => Object.keys(d).filter(k => k !== 'label')))].filter(k => k !== 'promedio').slice(0, 5).map((key, i) => (
                          <Line key={key} type="monotone" dataKey={key} stroke={LINE_COLORS_5[i % LINE_COLORS_5.length]} strokeWidth={2} dot={{ r: 2 }} />
                        ))}
                        <Line key="promedio" type="monotone" dataKey="promedio" stroke="#95A5A6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} name="AQI promedio zona" />
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
                  <div className="col s12 m6"><div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}><h6 style={{ margin: 0 }}>Ambiente: Temp / Humedad</h6>{chart2.length > 0 && <button type="button" onClick={() => setExpandedChart('ambiente')} title="Expandir" style={{ padding: '0.2rem 0.35rem', fontSize: '0.7rem', minWidth: 'auto', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>⛶</button>}</div>{chart2.length > 0 ? <ResponsiveContainer width="100%" height={160}><LineChart data={chart2}><XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={50} /><YAxis /><Tooltip /><Line type="monotone" dataKey="Temp" stroke="#E74C3C" name="Temp" /><Line type="monotone" dataKey="Humedad" stroke="#3498db" name="Humedad" /></LineChart></ResponsiveContainer> : <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '0.5rem', fontSize: '0.85rem' }}>No hay lecturas en el periodo seleccionado. Comprueba las fechas, que el dispositivo haya enviado datos, y pulsa Aplicar.</div>}</div></div>
                  <div className="col s12 m6"><div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}><h6 style={{ margin: 0 }}>Particulado: PM2.5 / PM10</h6>{chart3.length > 0 && <button type="button" onClick={() => setExpandedChart('particulado')} title="Expandir" style={{ padding: '0.2rem 0.35rem', fontSize: '0.7rem', minWidth: 'auto', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>⛶</button>}</div>{chart3.length > 0 ? <ResponsiveContainer width="100%" height={160}><AreaChart data={chart3}><XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={50} /><YAxis /><Tooltip /><Area type="monotone" dataKey="PM25" stroke="#2ECC71" fill="#2ECC71" fillOpacity={0.4} name="PM2.5" /><Area type="monotone" dataKey="PM10" stroke="#F1C40F" fill="#F1C40F" fillOpacity={0.4} name="PM10" /></AreaChart></ResponsiveContainer> : <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '0.5rem', fontSize: '0.85rem' }}>No hay lecturas en el periodo seleccionado. Comprueba las fechas, que el dispositivo haya enviado datos, y pulsa Aplicar.</div>}</div></div>
                  <div className="col s12 m6"><div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}><h6 style={{ margin: 0 }}>Gases: NO2 / CO</h6>{chart3.length > 0 && <button type="button" onClick={() => setExpandedChart('gases')} title="Expandir" style={{ padding: '0.2rem 0.35rem', fontSize: '0.7rem', minWidth: 'auto', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>⛶</button>}</div>{chart3.length > 0 ? <ResponsiveContainer width="100%" height={160}><LineChart data={chart3}><XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={50} /><YAxis /><Tooltip /><Line type="stepAfter" dataKey="NO2" stroke="#E67E22" name="NO2" /><Line type="stepAfter" dataKey="CO" stroke="#E74C3C" name="CO" /></LineChart></ResponsiveContainer> : <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '0.5rem', fontSize: '0.85rem' }}>No hay lecturas en el periodo seleccionado. Comprueba las fechas, que el dispositivo haya enviado datos, y pulsa Aplicar.</div>}</div></div>
                  <div className="col s12 m6"><div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}><h6 style={{ margin: 0 }}>CO2 / TVOC</h6>{chart4.length > 0 && <button type="button" onClick={() => setExpandedChart('co2tvoc')} title="Expandir" style={{ padding: '0.2rem 0.35rem', fontSize: '0.7rem', minWidth: 'auto', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>⛶</button>}</div>{chart4.length > 0 ? <ResponsiveContainer width="100%" height={160}><BarChart data={chart4}><XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={50} /><YAxis /><Tooltip /><Bar dataKey="CO2" fill="#3498db" name="CO2" /><Bar dataKey="TVOC" fill="#9b59b6" name="TVOC" /></BarChart></ResponsiveContainer> : <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '0.5rem', fontSize: '0.85rem' }}>No hay lecturas en el periodo seleccionado. Comprueba las fechas, que el dispositivo haya enviado datos, y pulsa Aplicar.</div>}</div></div>
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
                              <th>PM2.5</th>
                              <th>PM10</th>
                              <th>NO2</th>
                              <th>CO</th>
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
                                  <td>{new Date(l.timestamp).toLocaleString('es-AR')}</td>
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
                                  <td>{v.pm25 > 0 ? Number(v.pm25).toFixed(1) : '—'}</td>
                                  <td>{v.pm10 > 0 ? Number(v.pm10).toFixed(1) : '-'}</td>
                                  <td>{v.no2 > 0 ? Number(v.no2).toFixed(1) : '-'}</td>
                                  <td>{v.co > 0 ? Number(v.co).toFixed(1) : '-'}</td>
                                  <td>{v.tvoc > 0 ? Number(v.tvoc).toFixed(1) : '-'}</td>
                                  <td>{v.co2 > 0 ? Number(v.co2).toFixed(1) : '-'}</td>
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
              <h5 style={{ margin: 0, color: 'var(--color-text-primary)' }}>
                {expandedChart === 'top5' && 'Top 5 dispositivos AQI'}
                {expandedChart === 'ambiente' && 'Ambiente: Temp / Humedad'}
                {expandedChart === 'particulado' && 'Particulado: PM2.5 / PM10'}
                {expandedChart === 'gases' && 'Gases: NO2 / CO'}
                {expandedChart === 'co2tvoc' && 'CO2 / TVOC'}
              </h5>
              <button type="button" onClick={() => setExpandedChart(null)} style={{ background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 8, padding: '0.35rem 0.75rem', cursor: 'pointer', color: 'var(--color-text-primary)', fontSize: '1rem' }}>Cerrar</button>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              {expandedChart === 'top5' && top5LineData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={top5LineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" stroke="var(--color-text-secondary)" tick={{ fontSize: 11 }} minTickGap={50} />
                    <YAxis stroke="var(--color-text-secondary)" />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }} />
                    <Legend />
                    {[...new Set(top5LineData.flatMap(d => Object.keys(d).filter(k => k !== 'label')))].filter(k => k !== 'promedio').slice(0, 5).map((key, i) => (
                      <Line key={key} type="monotone" dataKey={key} stroke={LINE_COLORS_5[i % LINE_COLORS_5.length]} strokeWidth={2} dot={{ r: 3 }} />
                    ))}
                    <Line key="promedio" type="monotone" dataKey="promedio" stroke="#95A5A6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="AQI promedio zona" />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {expandedChart === 'ambiente' && chart2.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={50} />
                    <YAxis />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }} />
                    <Legend />
                    <Line type="monotone" dataKey="Temp" stroke="#E74C3C" name="Temp" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Humedad" stroke="#3498db" name="Humedad" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {expandedChart === 'particulado' && chart3.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart3}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={50} />
                    <YAxis />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }} />
                    <Legend />
                    <Area type="monotone" dataKey="PM25" stroke="#2ECC71" fill="#2ECC71" fillOpacity={0.4} name="PM2.5" strokeWidth={2} />
                    <Area type="monotone" dataKey="PM10" stroke="#F1C40F" fill="#F1C40F" fillOpacity={0.4} name="PM10" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              {expandedChart === 'gases' && chart3.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart3}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={50} />
                    <YAxis />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }} />
                    <Legend />
                    <Line type="stepAfter" dataKey="NO2" stroke="#E67E22" name="NO2" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="stepAfter" dataKey="CO" stroke="#E74C3C" name="CO" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {expandedChart === 'co2tvoc' && chart4.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={50} />
                    <YAxis />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }} />
                    <Legend />
                    <Bar dataKey="CO2" fill="#3498db" name="CO2" />
                    <Bar dataKey="TVOC" fill="#9b59b6" name="TVOC" />
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
