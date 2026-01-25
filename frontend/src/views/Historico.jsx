import React, { useEffect, useState, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

export default function Historico() {
  const { token, user } = useContext(AuthContext)
  const [lecturas, setLecturas] = useState([])
  const [dispositivos, setDispositivos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtros, setFiltros] = useState({
    sensorId: '',
    fechaDesde: '',
    fechaHasta: ''
  })

  useEffect(() => {
    fetchDispositivos()
    fetchLecturas()
  }, [token])

  const fetchDispositivos = async () => {
    try {
      if (!token) return

      const response = await fetch('/api/dispositivos', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setDispositivos(data)
      }
    } catch (err) {
      console.error('Error al obtener dispositivos:', err)
    }
  }

  const fetchLecturas = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!token) {
        setError('No hay token de autenticación')
        setLoading(false)
        return
      }

      let url = '/api/lecturas/ultimas?limite=100'
      
      if (filtros.sensorId) {
        url = `/api/lecturas/sensor/${filtros.sensorId}?limite=100`
      } else if (filtros.fechaDesde) {
        url = `/api/lecturas/desde?fecha=${filtros.fechaDesde}`
        if (filtros.fechaHasta) {
          // Filtrar en el cliente si hay fecha hasta
        }
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setError('Error de autenticación. Por favor, inicia sesión nuevamente.')
          return
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      let data = await response.json()
      
      // Filtrar por fecha hasta si está especificada
      if (filtros.fechaHasta) {
        const fechaHasta = new Date(filtros.fechaHasta)
        fechaHasta.setHours(23, 59, 59, 999)
        data = data.filter(l => new Date(l.timestamp) <= fechaHasta)
      }

      setLecturas(data)
    } catch (err) {
      console.error('❌ Error al obtener lecturas:', err)
      setError(err.message || 'Error al cargar lecturas históricas')
    } finally {
      setLoading(false)
    }
  }

  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }))
  }

  const handleAplicarFiltros = () => {
    fetchLecturas()
  }

  const handleLimpiarFiltros = () => {
    setFiltros({
      sensorId: '',
      fechaDesde: '',
      fechaHasta: ''
    })
    setTimeout(fetchLecturas, 100)
  }

  const exportarCSV = () => {
    if (lecturas.length === 0) {
      alert('No hay datos para exportar')
      return
    }

    const headers = ['Fecha', 'Sensor ID', 'Zona', 'PM2.5', 'PM10', 'CO2', 'NO2', 'CO', 'TVOC', 'Temperatura', 'Humedad']
    const rows = lecturas.map(lectura => {
      const fecha = new Date(lectura.timestamp).toLocaleString('es-AR')
      const valores = lectura.valores || {}
      return [
        fecha,
        lectura.sensorId,
        lectura.zona || 'N/A',
        valores.pm25 || '',
        valores.pm10 || '',
        valores.co2 || '',
        valores.no2 || '',
        valores.co || '',
        valores.tvoc || '',
        valores.temperatura || '',
        valores.humedad || ''
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `lecturas_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: '2rem' }}>
        <h1>Histórico de Lecturas</h1>
        <p>Visualización y descarga de mediciones por nodo o zona.</p>
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Cargando lecturas históricas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: '2rem' }}>
      <h1>Histórico de Lecturas</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Visualización y descarga de mediciones por nodo o zona.
      </p>

      {/* Filtros */}
      <div style={{
        backgroundColor: '#F8F9FA',
        padding: '1.5rem',
        borderRadius: '8px',
        marginBottom: '2rem',
        border: '1px solid #DEE2E6'
      }}>
        <h3 style={{ marginTop: '0', marginBottom: '1rem', fontSize: '1.2rem' }}>Filtros</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#34495E', fontWeight: '500' }}>
              Dispositivo:
            </label>
            <select
              value={filtros.sensorId}
              onChange={(e) => handleFiltroChange('sensorId', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #DEE2E6',
                fontSize: '0.95rem'
              }}
            >
              <option value="">Todos los dispositivos</option>
              {dispositivos.map(dispositivo => (
                <option key={dispositivo._id} value={dispositivo.sensorId}>
                  {dispositivo.nombre} ({dispositivo.sensorId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#34495E', fontWeight: '500' }}>
              Fecha desde:
            </label>
            <input
              type="date"
              value={filtros.fechaDesde}
              onChange={(e) => handleFiltroChange('fechaDesde', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #DEE2E6',
                fontSize: '0.95rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#34495E', fontWeight: '500' }}>
              Fecha hasta:
            </label>
            <input
              type="date"
              value={filtros.fechaHasta}
              onChange={(e) => handleFiltroChange('fechaHasta', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #DEE2E6',
                fontSize: '0.95rem'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleAplicarFiltros}
            style={{
              padding: '0.6rem 1.2rem',
              backgroundColor: '#3498DB',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: '500'
            }}
          >
            Aplicar Filtros
          </button>
          <button
            onClick={handleLimpiarFiltros}
            style={{
              padding: '0.6rem 1.2rem',
              backgroundColor: '#95A5A6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: '500'
            }}
          >
            Limpiar
          </button>
          {lecturas.length > 0 && (
            <button
              onClick={exportarCSV}
              style={{
                padding: '0.6rem 1.2rem',
                backgroundColor: '#27AE60',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '500',
                marginLeft: 'auto'
              }}
            >
              Exportar CSV
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#F8D7DA', 
          color: '#721C24', 
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {lecturas.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          backgroundColor: '#F8F9FA',
          borderRadius: '8px',
          border: '1px solid #DEE2E6'
        }}>
          <p style={{ fontSize: '1.2rem', color: '#666' }}>
            No hay lecturas disponibles
          </p>
          <p style={{ color: '#999', marginTop: '0.5rem' }}>
            {filtros.sensorId || filtros.fechaDesde 
              ? 'Intenta ajustar los filtros o selecciona otro rango de fechas.'
              : 'Las lecturas aparecerán aquí cuando los dispositivos comiencen a enviar datos.'}
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            backgroundColor: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#34495E', color: 'white' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.9rem', fontWeight: '600' }}>Fecha</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.9rem', fontWeight: '600' }}>Sensor ID</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.9rem', fontWeight: '600' }}>Zona</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.9rem', fontWeight: '600' }}>PM2.5</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.9rem', fontWeight: '600' }}>PM10</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.9rem', fontWeight: '600' }}>CO₂</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.9rem', fontWeight: '600' }}>Temp</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.9rem', fontWeight: '600' }}>Humedad</th>
              </tr>
            </thead>
            <tbody>
              {lecturas.map((lectura, index) => {
                const valores = lectura.valores || {}
                return (
                  <tr 
                    key={lectura._id}
                    style={{ 
                      borderBottom: '1px solid #E0E0E0',
                      backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F8F9FA'
                    }}
                  >
                    <td style={{ padding: '0.8rem', fontSize: '0.9rem', color: '#2C3E50' }}>
                      {formatDate(lectura.timestamp)}
                    </td>
                    <td style={{ padding: '0.8rem', fontSize: '0.9rem', fontFamily: 'monospace', color: '#34495E' }}>
                      {lectura.sensorId}
                    </td>
                    <td style={{ padding: '0.8rem', fontSize: '0.9rem', color: '#7F8C8D' }}>
                      {lectura.zona || 'N/A'}
                    </td>
                    <td style={{ padding: '0.8rem', textAlign: 'right', fontSize: '0.9rem', color: '#2C3E50' }}>
                      {valores.pm25 ? `${valores.pm25.toFixed(2)}` : '-'}
                    </td>
                    <td style={{ padding: '0.8rem', textAlign: 'right', fontSize: '0.9rem', color: '#2C3E50' }}>
                      {valores.pm10 ? `${valores.pm10.toFixed(2)}` : '-'}
                    </td>
                    <td style={{ padding: '0.8rem', textAlign: 'right', fontSize: '0.9rem', color: '#2C3E50' }}>
                      {valores.co2 ? `${valores.co2}` : '-'}
                    </td>
                    <td style={{ padding: '0.8rem', textAlign: 'right', fontSize: '0.9rem', color: '#2C3E50' }}>
                      {valores.temperatura ? `${valores.temperatura.toFixed(1)}°C` : '-'}
                    </td>
                    <td style={{ padding: '0.8rem', textAlign: 'right', fontSize: '0.9rem', color: '#2C3E50' }}>
                      {valores.humedad ? `${valores.humedad.toFixed(1)}%` : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          
          <div style={{ marginTop: '1rem', color: '#7F8C8D', fontSize: '0.9rem' }}>
            Mostrando {lecturas.length} lectura{lecturas.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
