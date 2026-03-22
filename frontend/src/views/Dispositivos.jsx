import React, { useEffect, useState, useContext } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import ModalDispositivo from '../components/ModalDispositivo'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getAQIColor, getAQILabel } from '../utils/aqiScale'
import { formatChartBucketLabel } from '../utils/dateTime'

function isMqttConectado(dispositivo) {
  if (!dispositivo) return false
  if (dispositivo.estado === 'inactivo') return false
  const ultima = dispositivo.ultimaLectura ? new Date(dispositivo.ultimaLectura) : null
  if (!ultima) return false
  const hace5min = new Date()
  hace5min.setMinutes(hace5min.getMinutes() - 5)
  return ultima >= hace5min
}

export default function Dispositivos() {
  const { token, user } = useContext(AuthContext)
  const [searchParams] = useSearchParams()
  const zonaParam = searchParams.get('zona') || ''

  const [dispositivos, setDispositivos] = useState([])
  const [zonas, setZonas] = useState([])
  const [picoDispositivos, setPicoDispositivos] = useState([])
  const [agregadasZona, setAgregadasZona] = useState([])
  const [agregadasDispositivo, setAgregadasDispositivo] = useState([])
  const [zonaSeleccionada, setZonaSeleccionada] = useState(zonaParam)
  const [dispositivoSeleccionado, setDispositivoSeleccionado] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalDispositivo, setModalDispositivo] = useState(null)
  const [modalCrear, setModalCrear] = useState(false)
  const [empresas, setEmpresas] = useState([])

  useEffect(() => {
    if (zonaParam) setZonaSeleccionada(zonaParam)
  }, [zonaParam])

  useEffect(() => {
    fetchZonas()
    fetchDispositivos()
    if (user?.rol === 'superadmin') fetchEmpresas()
  }, [token, user?.rol])

  useEffect(() => {
    if (!token || !zonaSeleccionada) return
    const interval = setInterval(fetchDispositivos, 30000)
    return () => clearInterval(interval)
  }, [token, zonaSeleccionada])

  useEffect(() => {
    if (token) {
      fetch('/api/lecturas/pico-dispositivos?horas=4', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then(data => setPicoDispositivos(data))
        .catch(() => setPicoDispositivos([]))
    }
  }, [token])

  useEffect(() => {
    if (token && zonaSeleccionada) fetchAgregadas()
    else {
      setAgregadasZona([])
      setAgregadasDispositivo([])
    }
  }, [token, zonaSeleccionada, dispositivoSeleccionado, zonas])

  const fetchEmpresas = async () => {
    try {
      if (!token) return
      const response = await fetch('/api/empresas/admin/empresas', { headers: { Authorization: `Bearer ${token}` } })
      if (response.ok) setEmpresas(await response.json())
    } catch (err) {
      console.error('Error al obtener empresas:', err)
    }
  }

  const fetchZonas = async () => {
    try {
      if (!token) return
      const response = await fetch('/api/zonas?horas=4', { headers: { Authorization: `Bearer ${token}` } })
      if (response.ok) {
        const data = await response.json()
        setZonas(data)
      }
    } catch (err) {
      console.error('Error al obtener zonas:', err)
    }
  }

  const fetchDispositivos = async () => {
    try {
      setLoading(true)
      setError(null)
      if (!token) {
        setError('No hay token de autenticación')
        setLoading(false)
        return
      }
      const response = await fetch('/api/dispositivos', { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setError('Error de autenticación. Por favor, inicia sesión nuevamente.')
          return
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      setDispositivos(data)
    } catch (err) {
      console.error('Error al obtener dispositivos:', err)
      setError(err.message || 'Error al cargar dispositivos')
    } finally {
      setLoading(false)
    }
  }

  const fetchAgregadas = async () => {
    try {
      if (!token) return
      const zona = zonas.find(z => z.nombre === zonaSeleccionada)
      if (!zona) return
      const hasta = new Date()
      const desde = new Date()
      desde.setHours(desde.getHours() - 4)
      const params = new URLSearchParams({
        desde: desde.toISOString(),
        hasta: hasta.toISOString(),
        agrupacion: '5min',
        zonaId: zona._id
      })
      const resZona = await fetch(`/api/lecturas/agregadas?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      if (resZona.ok) {
        const data = await resZona.json()
        setAgregadasZona(data.map(r => ({
          label: formatChartBucketLabel(r._id, '5min'),
          AQI: r.avgAqi != null ? Math.round(r.avgAqi) : null
        })))
      }
      if (dispositivoSeleccionado?.sensorId) {
        params.set('sensorId', dispositivoSeleccionado.sensorId)
        const resDisp = await fetch(`/api/lecturas/agregadas?${params}`, { headers: { Authorization: `Bearer ${token}` } })
        if (resDisp.ok) {
          const data = await resDisp.json()
          setAgregadasDispositivo(data.map(r => ({
            label: formatChartBucketLabel(r._id, '5min'),
            AQI: r.avgAqi != null ? Math.round(r.avgAqi) : null
          })))
        }
      } else {
        setAgregadasDispositivo([])
      }
    } catch (err) {
      console.error('Error al obtener agregadas:', err)
    }
  }

  const picoBySensor = Object.fromEntries((picoDispositivos || []).map(p => [p.sensorId, p]))
  const dispositivosDeZona = zonaSeleccionada
    ? dispositivos.filter(d => d.zona === zonaSeleccionada)
    : []

  const labelToDisp = Object.fromEntries((agregadasDispositivo || []).map(r => [r.label, r.AQI]))
  const chartData = (agregadasZona || []).map(r => ({
    label: r.label,
    Zona: r.AQI,
    Dispositivo: dispositivoSeleccionado ? (labelToDisp[r.label] ?? null) : null
  }))

  const canEdit = user?.rol === 'admin' || user?.rol === 'superadmin'

  if (loading) {
    return (
      <div style={{ padding: '2rem', backgroundColor: 'var(--color-bg-light)', minHeight: '100%' }}>
        <div className="container">
          <h4 style={{ color: 'var(--color-text-primary)' }}>Dispositivos</h4>
          <p style={{ color: 'var(--color-text-secondary)' }}>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem 1rem', backgroundColor: 'var(--color-bg-light)', minHeight: '100%' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h4 style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Dispositivos</h4>
            <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Selecciona una zona para ver sus dispositivos</p>
          </div>
          {canEdit && (
            <button className="btn blue darken-2 waves-effect waves-light" onClick={() => setModalCrear(true)}>
              + Nuevo Dispositivo
            </button>
          )}
        </div>

        {error && (
          <div style={{ padding: '1rem', backgroundColor: 'rgba(231,76,60,0.2)', borderRadius: '8px', marginBottom: '1rem', color: '#E74C3C' }}>
            {error}
          </div>
        )}

        <h6 style={{ margin: '0 0 0.75rem 0', color: 'var(--color-text-primary)' }}>Selector de zona</h6>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem' }}>
          {zonas.map((z) => {
            const aqi = z.maxAQI ?? z.lecturaPico?.aqi
            const isSelected = zonaSeleccionada === z.nombre
            return (
              <button
                key={z._id}
                type="button"
                onClick={() => setZonaSeleccionada(z.nombre)}
                style={{
                  padding: '0.75rem 1.25rem',
                  borderRadius: 'var(--border-radius)',
                  border: isSelected ? '2px solid #3498db' : '1px solid var(--color-border)',
                  backgroundColor: isSelected ? 'var(--color-bg-light)' : 'var(--color-bg-card)',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  minWidth: '140px'
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{z.nombre}</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: getAQIColor(aqi) }}>AQI {aqi ?? '—'}</div>
                <span title={getAQILabel(aqi)} style={{ padding: '0.35rem 0.5rem', borderRadius: 6, backgroundColor: getAQIColor(aqi), color: '#fff', display: 'inline-block', minWidth: 20, minHeight: 20 }} aria-label={getAQILabel(aqi)} />
              </button>
            )
          })}
        </div>

        {zonaSeleccionada && (
          <>
            <h6 style={{ margin: '0 0 0.75rem 0', color: 'var(--color-text-primary)' }}>Dispositivos en {zonaSeleccionada}</h6>
            {dispositivosDeZona.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: 'var(--color-bg-card)', borderRadius: 'var(--border-radius)', border: '1px solid var(--color-border)', marginBottom: '2rem' }}>
                <p style={{ color: 'var(--color-text-secondary)' }}>No hay dispositivos en esta zona</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                {dispositivosDeZona.map((dispositivo) => {
                  const pico = picoBySensor[dispositivo.sensorId]
                  const mqttConectado = isMqttConectado(dispositivo)
                  const isSelected = dispositivoSeleccionado?._id === dispositivo._id
                  return (
                    <div
                      key={dispositivo._id}
                      style={{
                        position: 'relative',
                        backgroundColor: 'var(--color-bg-card)',
                        borderRadius: 'var(--border-radius)',
                        padding: '1rem 1.5rem',
                        paddingRight: '1.75rem',
                        border: isSelected ? '2px solid #9b59b6' : '1px solid var(--color-border)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '1rem',
                        overflow: 'hidden'
                      }}
                      onClick={() => setDispositivoSeleccionado(dispositivo)}
                    >
                      <div
                        title={mqttConectado ? 'ONLINE' : 'OFFLINE'}
                        style={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          width: 6,
                          height: '100%',
                          backgroundColor: mqttConectado ? '#2ECC71' : '#95A5A6',
                          borderTopRightRadius: 'var(--border-radius)',
                          borderBottomRightRadius: 'var(--border-radius)'
                        }}
                        aria-label={mqttConectado ? 'Conectado MQTT' : 'Desconectado MQTT'}
                      />
                      <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                        <h5 style={{ margin: '0 0 0.25rem 0', color: 'var(--color-text-primary)' }}>{dispositivo.nombre}</h5>
                        {dispositivo.descripcion && (
                          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>{dispositivo.descripcion}</p>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span title={getAQILabel(pico?.maxAQI ?? pico?.aqi)} style={{ padding: '0.35rem 0.5rem', borderRadius: 8, backgroundColor: getAQIColor(pico?.maxAQI ?? pico?.aqi), color: '#fff', display: 'inline-block', minWidth: 24, minHeight: 24 }} aria-label={getAQILabel(pico?.maxAQI ?? pico?.aqi)} />
                        <span style={{ fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>
                          AQI máx <strong style={{ color: getAQIColor(pico?.maxAQI ?? pico?.aqi) }}>{pico?.maxAQI ?? pico?.aqi ?? '—'}</strong>
                          {' · '}prom <strong style={{ color: getAQIColor(pico?.promedioAQI) }}>{pico?.promedioAQI ?? '—'}</strong>
                          {' · '}mín <strong style={{ color: getAQIColor(pico?.minAQI) }}>{pico?.minAQI ?? '—'}</strong>
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginLeft: 'auto' }} onClick={e => e.stopPropagation()}>
                        <Link to={`/lecturas?zona=${encodeURIComponent(zonaSeleccionada)}&sensorId=${encodeURIComponent(dispositivo.sensorId)}`} className="btn btn-small blue darken-2">
                          Ver histórico
                        </Link>
                        {canEdit && (
                          <button type="button" className="btn btn-small btn-outline icon-action-btn" title="Editar" aria-label="Editar" onClick={e => { e.stopPropagation(); setModalDispositivo(dispositivo) }}>✎</button>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            className="btn btn-small red icon-action-btn"
                            style={{ marginLeft: '0.35rem' }}
                            title="Eliminar"
                            aria-label="Eliminar"
                            onClick={async (e) => {
                              e.stopPropagation()
                              if (!window.confirm(`¿Eliminar "${dispositivo.nombre}"?`)) return
                              try {
                                const res = await fetch(`/api/dispositivos/${dispositivo._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
                                if (!res.ok) throw new Error('Error al eliminar')
                                fetchDispositivos()
                              } catch (err) {
                                setError(err.message || 'Error al eliminar')
                              }
                            }}
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {chartData.length > 0 && (
              <div className="card" style={{ borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-card)', padding: '1.5rem', marginBottom: '2rem' }}>
                <h6 style={{ margin: '0 0 1rem 0', color: 'var(--color-text-primary)' }}>
                  AQI promedio 5 min - Últimas 4h - Zona {zonaSeleccionada} {dispositivoSeleccionado ? `vs ${dispositivoSeleccionado.nombre}` : ''}
                </h6>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" stroke="var(--color-text-secondary)" tick={{ fontSize: 10 }} />
                    <YAxis stroke="var(--color-text-secondary)" />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }} />
                    <Legend />
                    <Line type="monotone" dataKey="Zona" stroke="#9b59b6" strokeWidth={2} dot={{ r: 2 }} name="AQI Zona" />
                    {dispositivoSeleccionado && (
                      <Line type="monotone" dataKey="Dispositivo" stroke="#3498db" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} name="AQI Dispositivo" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        <ModalDispositivo
          open={!!modalDispositivo || modalCrear}
          onClose={() => { setModalDispositivo(null); setModalCrear(false) }}
          onSave={async (payload) => {
            if (modalDispositivo) {
              const res = await fetch(`/api/dispositivos/${modalDispositivo._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
              })
              if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
            } else {
              const res = await fetch('/api/dispositivos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
              })
              if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
            }
            fetchDispositivos()
            fetchZonas()
          }}
          dispositivo={modalDispositivo}
          zonas={zonas}
          empresas={empresas}
          user={user}
        />
      </div>
    </div>
  )
}
