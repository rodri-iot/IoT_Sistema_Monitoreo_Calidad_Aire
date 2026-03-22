import React, { useEffect, useState, useContext } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import ModalZona from '../components/ModalZona'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

import { getAQIColor, getAQILabel } from '../utils/aqiScale'
import { formatChartBucketLabel } from '../utils/dateTime'

const LINE_COLORS = ['#2ECC71', '#3498db', '#9b59b6', '#E67E22', '#E74C3C']

export default function Zonas() {
  const { token, user } = useContext(AuthContext)
  const [zonas, setZonas] = useState([])
  const [lineData, setLineData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [zonaEdit, setZonaEdit] = useState(null)

  useEffect(() => {
    fetchZonas()
  }, [token])

  const fetchZonas = async () => {
    try {
      setLoading(true)
      setError(null)
      if (!token) {
        setError('No hay token de autenticación')
        setLoading(false)
        return
      }
      const response = await fetch('/api/zonas?horas=4', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setError('Error de autenticación. Por favor, inicia sesión nuevamente.')
          return
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      setZonas(data)

      const hasta = new Date()
      const desde = new Date()
      desde.setHours(desde.getHours() - 4)
      const params = new URLSearchParams({
        desde: desde.toISOString(),
        hasta: hasta.toISOString(),
        agrupacion: '10min',
        operacion: 'max'
      })
      if (data.length > 0) {
        const promises = data.map(z => fetch(`/api/lecturas/agregadas?${params}&zonaId=${z._id}`, { headers: { Authorization: `Bearer ${token}` } }))
        const responses = await Promise.all(promises)
        const arrays = await Promise.all(responses.map(r => r.ok ? r.json() : []))
        const byLabel = {}
        data.forEach((z, idx) => {
          (arrays[idx] || []).forEach(r => {
            const label = formatChartBucketLabel(r._id, '10min')
            if (!byLabel[label]) byLabel[label] = { label }
            byLabel[label][z.nombre] = r.avgAqi != null ? Math.round(r.avgAqi) : null
          })
        })
        setLineData(Object.values(byLabel).sort((a, b) => (a.label || '').localeCompare(b.label || '')))
      } else {
        setLineData([])
      }
    } catch (err) {
      console.error('Error al obtener zonas:', err)
      setError(err.message || 'Error al cargar zonas')
    } finally {
      setLoading(false)
    }
  }

  const handleCrearZona = () => {
    setZonaEdit(null)
    setModalOpen(true)
  }

  const handleEditarZona = (zona) => {
    setZonaEdit(zona)
    setModalOpen(true)
  }

  const handleSaveZona = async (payload) => {
    const url = zonaEdit ? `/api/zonas/${zonaEdit._id}` : '/api/zonas'
    const method = zonaEdit ? 'PUT' : 'POST'
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Error al guardar')
    }
    fetchZonas()
  }

  const handleEliminarZona = async (zona) => {
    if (!window.confirm(`¿Eliminar la zona "${zona.nombre}"?`)) return
    try {
      const response = await fetch(`/api/zonas/${zona._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Error al eliminar')
      fetchZonas()
    } catch (err) {
      setError(err.message || 'Error al eliminar zona')
    }
  }

  const canEdit = user?.rol === 'admin' || user?.rol === 'superadmin'

  if (loading) {
    return (
      <div style={{ padding: '2rem', backgroundColor: 'var(--color-bg-light)', minHeight: '100%' }}>
        <div className="container">
          <h4 style={{ color: 'var(--color-text-primary)' }}>Zonas de Monitoreo</h4>
          <p style={{ color: 'var(--color-text-secondary)' }}>Cargando zonas...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem 1rem', backgroundColor: 'var(--color-bg-light)', minHeight: '100%' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h4 style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Zonas de Monitoreo</h4>
            <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Gestiona las zonas de tu empresa</p>
          </div>
          {canEdit && (
            <button className="btn blue darken-2 waves-effect waves-light" onClick={handleCrearZona}>
              + Nueva Zona
            </button>
          )}
        </div>

        {error && (
          <div style={{ padding: '1rem', backgroundColor: 'rgba(231,76,60,0.2)', borderRadius: '8px', marginBottom: '1rem', color: '#E74C3C' }}>
            {error}
          </div>
        )}

        {zonas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'var(--color-bg-card)', borderRadius: 'var(--border-radius)', border: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: '1.2rem', color: 'var(--color-text-secondary)' }}>No hay zonas registradas</p>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
              {canEdit ? 'Crea una nueva zona con el botón "+ Nueva Zona"' : 'Contacta al administrador para crear zonas.'}
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              {zonas.map((zona) => {
                const paramKeys = zona.lecturaPico?.valores ? Object.keys(zona.lecturaPico.valores).filter(k => zona.lecturaPico.valores[k] != null) : []
                const fromPromedios = []
                if (zona.promedioPM25 != null) fromPromedios.push('PM2.5')
                if (zona.promedioPM10 != null) fromPromedios.push('PM10')
                if (zona.promedioCO2 != null) fromPromedios.push('CO2')
                if (zona.promedioTemp != null) fromPromedios.push('Temp')
                if (zona.promedioHumedad != null) fromPromedios.push('Humedad')
                const paramLabels = { pm25: 'PM2.5', pm10: 'PM10', no2: 'NO2', co: 'CO', co2: 'CO2', tvoc: 'TVOC', temperatura: 'Temp', temp: 'Temp', humedad: 'Humedad', humidity: 'Humedad' }
                const paramsMedidos = [...new Set([...paramKeys.map(k => paramLabels[k] || k), ...fromPromedios])].filter(Boolean).join(', ') || '—'
                const totalDisp = zona.totalDispositivos ?? 0
                return (
                  <div
                    key={zona._id}
                    className="card"
                    style={{ borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-card)', overflow: 'hidden' }}
                  >
                    <div className="card-content" style={{ padding: '1rem 1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                        <h5 style={{ margin: '0 0 0.25rem 0', color: 'var(--color-text-primary)' }}>{zona.nombre}</h5>
                        {zona.descripcion && (
                          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: 0 }}>{zona.descripcion}</p>
                        )}
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0 0' }}>
                          {totalDisp} dispositivo{totalDisp !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span title={getAQILabel(zona.maxAQI)} style={{ padding: '0.35rem 0.5rem', borderRadius: 8, backgroundColor: getAQIColor(zona.maxAQI), color: '#fff', fontWeight: 600, display: 'inline-block', minWidth: 24, minHeight: 24 }} aria-label={getAQILabel(zona.maxAQI)} />
                        <span style={{ fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>
                          AQI máx <strong style={{ color: getAQIColor(zona.maxAQI) }}>{zona.maxAQI ?? '—'}</strong>
                          {' · '}prom <strong style={{ color: getAQIColor(zona.promedioAQI) }}>{zona.promedioAQI ?? '—'}</strong>
                          {' · '}mín <strong style={{ color: getAQIColor(zona.minAQI) }}>{zona.minAQI ?? '—'}</strong>
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                        Parámetros: {paramsMedidos}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
                        <Link to={`/dispositivos?zona=${encodeURIComponent(zona.nombre)}`} className="btn btn-small blue darken-2">
                          Ver Dispositivos
                        </Link>
                        {canEdit && (
                          <>
                            <button type="button" className="btn btn-small btn-outline icon-action-btn" title="Editar" aria-label="Editar" onClick={() => handleEditarZona(zona)}>✎</button>
                            <button type="button" className="btn btn-small red icon-action-btn" style={{ marginLeft: '0.35rem' }} title="Eliminar" aria-label="Eliminar" onClick={() => handleEliminarZona(zona)}>🗑</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {lineData.length > 0 && zonas.length > 0 && (
              <div className="card" style={{ borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-card)', padding: '1.5rem', marginBottom: '2rem' }}>
                <h6 style={{ margin: '0 0 1rem 0', color: 'var(--color-text-primary)' }}>AQI por zona - cada 10 min, últimas 4 h (máximo por ventana)</h6>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" stroke="var(--color-text-secondary)" tick={{ fontSize: 10 }} />
                    <YAxis stroke="var(--color-text-secondary)" />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }} />
                    <Legend />
                    {zonas.map((z, i) => (
                      <Line key={z._id} type="monotone" dataKey={z.nombre} stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2} dot={{ r: 2 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>

      <ModalZona
        open={modalOpen}
        onClose={() => { setModalOpen(false); setZonaEdit(null) }}
        onSave={handleSaveZona}
        zona={zonaEdit}
      />
    </div>
  )
}
