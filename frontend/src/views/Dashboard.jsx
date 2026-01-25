import React, { useEffect, useState, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

// Función helper para obtener el color según el valor del parámetro
const getQualityColor = (param, value) => {
  if (!value) return '#95A5A6' // Gris si no hay valor
  
  // Rangos según el tipo de parámetro
  const ranges = {
    pm25: { good: 12, moderate: 35, dangerous: 55 },
    pm10: { good: 20, moderate: 50, dangerous: 100 },
    co2: { good: 400, moderate: 1000, dangerous: 2000 },
    no2: { good: 50, moderate: 100, dangerous: 200 },
    co: { good: 1, moderate: 9, dangerous: 15 },
    tvoc: { good: 50, moderate: 250, dangerous: 500 }
  }
  
  const range = ranges[param.toLowerCase()]
  if (!range) return '#2ECC71' // Verde por defecto
  
  if (value <= range.good) return '#2ECC71' // Verde (Bueno)
  if (value <= range.moderate) return '#F1C40F' // Amarillo (Moderado)
  if (value <= range.dangerous) return '#E67E22' // Naranja (Peligroso)
  return '#E74C3C' // Rojo (Crítico)
}

const getQualityLabel = (param, value) => {
  const color = getQualityColor(param, value)
  if (color === '#2ECC71') return 'Bueno'
  if (color === '#F1C40F') return 'Moderado'
  if (color === '#E67E22') return 'Peligroso'
  if (color === '#E74C3C') return 'Crítico'
  return 'Sin datos'
}

export default function Dashboard() {
  const { user, token } = useContext(AuthContext)
  const [lecturas, setLecturas] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalLecturas: 0,
    dispositivosActivos: 0,
    promedioPM25: 0,
    alertas: 0
  })

  useEffect(() => {
    fetchLecturas()
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchLecturas, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchLecturas = async () => {
    try {
      if (!token) {
        console.warn('⚠️ No hay token de autenticación')
        setLoading(false)
        return
      }

      const response = await fetch('/api/lecturas/ultimas?limite=20', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.error('❌ Error de autenticación. Por favor, inicia sesión nuevamente.')
          return
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('📊 Lecturas recibidas:', data.length)
      setLecturas(data)
      
      // Calcular estadísticas
      if (data.length > 0) {
        const dispositivosUnicos = new Set(data.map(l => l.sensorId))
        const pm25Values = data
          .map(l => l.valores?.pm25)
          .filter(v => v !== undefined && v !== null)
        
        const promedioPM25 = pm25Values.length > 0
          ? (pm25Values.reduce((a, b) => a + b, 0) / pm25Values.length).toFixed(2)
          : 0
        
        const alertas = data.filter(l => {
          const pm25 = l.valores?.pm25
          return pm25 && pm25 > 55 // Umbral de peligro
        }).length

        setStats({
          totalLecturas: data.length,
          dispositivosActivos: dispositivosUnicos.size,
          promedioPM25: parseFloat(promedioPM25),
          alertas
        })
      }
      
      setLoading(false)
    } catch (err) {
      console.error('Error al obtener lecturas:', err)
      setLoading(false)
    }
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="preloader-wrapper big active">
          <div className="spinner-layer spinner-blue-only">
            <div className="circle-clipper left">
              <div className="circle"></div>
            </div>
            <div className="circle-clipper right">
              <div className="circle"></div>
            </div>
          </div>
        </div>
        <p>Cargando lecturas...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem 1rem', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ 
            fontWeight: 600, 
            marginBottom: '0.5rem',
            color: '#2c3e50'
          }}>
            Dashboard Principal
          </h4>
          <p style={{ color: '#7f8c8d', margin: 0 }}>
            Monitoreo en tiempo real de calidad del aire
          </p>
        </div>

        {/* KPIs Cards */}
        <div className="row" style={{ marginBottom: '2rem' }}>
          <div className="col s12 m6 l3">
            <div className="card" style={{ 
              borderRadius: '12px', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: 'none'
            }}>
              <div className="card-content" style={{ padding: '1.5rem' }}>
                <span className="card-title" style={{ 
                  fontSize: '0.9rem', 
                  color: '#7f8c8d',
                  fontWeight: 500,
                  marginBottom: '0.5rem'
                }}>
                  Promedio PM2.5
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ 
                    fontSize: '2rem', 
                    fontWeight: 700,
                    color: getQualityColor('pm25', stats.promedioPM25)
                  }}>
                    {stats.promedioPM25 || 'N/A'}
                  </span>
                  <span style={{ color: '#7f8c8d', fontSize: '0.9rem' }}>µg/m³</span>
                </div>
                <div style={{ 
                  marginTop: '0.5rem',
                  display: 'inline-block',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  backgroundColor: getQualityColor('pm25', stats.promedioPM25) + '20',
                  color: getQualityColor('pm25', stats.promedioPM25),
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>
                  {getQualityLabel('pm25', stats.promedioPM25)}
                </div>
              </div>
            </div>
          </div>

          <div className="col s12 m6 l3">
            <div className="card" style={{ 
              borderRadius: '12px', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div className="card-content" style={{ padding: '1.5rem' }}>
                <span className="card-title" style={{ 
                  fontSize: '0.9rem', 
                  color: '#7f8c8d',
                  fontWeight: 500,
                  marginBottom: '0.5rem'
                }}>
                  Dispositivos Activos
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ 
                    fontSize: '2rem', 
                    fontWeight: 700,
                    color: '#3498db'
                  }}>
                    {stats.dispositivosActivos}
                  </span>
                  <span style={{ color: '#7f8c8d', fontSize: '0.9rem' }}>unidades</span>
                </div>
                <div style={{ 
                  marginTop: '0.5rem',
                  color: '#27ae60',
                  fontSize: '0.75rem',
                  fontWeight: 500
                }}>
                  ✓ En línea
                </div>
              </div>
            </div>
          </div>

          <div className="col s12 m6 l3">
            <div className="card" style={{ 
              borderRadius: '12px', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div className="card-content" style={{ padding: '1.5rem' }}>
                <span className="card-title" style={{ 
                  fontSize: '0.9rem', 
                  color: '#7f8c8d',
                  fontWeight: 500,
                  marginBottom: '0.5rem'
                }}>
                  Alertas Activas
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ 
                    fontSize: '2rem', 
                    fontWeight: 700,
                    color: stats.alertas > 0 ? '#E74C3C' : '#2ECC71'
                  }}>
                    {stats.alertas}
                  </span>
                  <span style={{ color: '#7f8c8d', fontSize: '0.9rem' }}>alertas</span>
                </div>
                <div style={{ 
                  marginTop: '0.5rem',
                  color: stats.alertas > 0 ? '#E74C3C' : '#7f8c8d',
                  fontSize: '0.75rem',
                  fontWeight: 500
                }}>
                  {stats.alertas > 0 ? '⚠ Requiere atención' : '✓ Todo normal'}
                </div>
              </div>
            </div>
          </div>

          <div className="col s12 m6 l3">
            <div className="card" style={{ 
              borderRadius: '12px', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div className="card-content" style={{ padding: '1.5rem' }}>
                <span className="card-title" style={{ 
                  fontSize: '0.9rem', 
                  color: '#7f8c8d',
                  fontWeight: 500,
                  marginBottom: '0.5rem'
                }}>
                  Total Lecturas
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ 
                    fontSize: '2rem', 
                    fontWeight: 700,
                    color: '#9b59b6'
                  }}>
                    {stats.totalLecturas}
                  </span>
                  <span style={{ color: '#7f8c8d', fontSize: '0.9rem' }}>últimas</span>
                </div>
                <div style={{ 
                  marginTop: '0.5rem',
                  color: '#7f8c8d',
                  fontSize: '0.75rem',
                  fontWeight: 500
                }}>
                  Últimas 20 lecturas
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lecturas Recientes */}
        <div className="card" style={{ 
          borderRadius: '12px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '2rem'
        }}>
          <div className="card-content" style={{ padding: '1.5rem' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h5 style={{ 
                margin: 0, 
                fontWeight: 600,
                color: '#2c3e50'
              }}>
                Lecturas Recientes
              </h5>
              <span style={{ 
                fontSize: '0.75rem', 
                color: '#7f8c8d',
                backgroundColor: '#ecf0f1',
                padding: '0.25rem 0.75rem',
                borderRadius: '20px'
              }}>
                Actualización automática cada 30s
              </span>
            </div>

            {lecturas.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '3rem',
                color: '#7f8c8d'
              }}>
                <p>No hay lecturas disponibles</p>
              </div>
            ) : (
              <div className="row">
                {lecturas.map((lectura) => {
                  const valores = lectura.valores || {}
                  const pm25 = valores.pm25
                  const pm10 = valores.pm10
                  const co2 = valores.co2
                  const temperatura = valores.temperatura
                  const humedad = valores.humedad
                  
                  return (
                    <div key={lectura._id} className="col s12 m6 l4" style={{ marginBottom: '1rem' }}>
                      <div className="card" style={{ 
                        borderRadius: '12px', 
                        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                        border: `2px solid ${getQualityColor('pm25', pm25)}40`,
                        height: '100%'
                      }}>
                        <div className="card-content" style={{ padding: '1.25rem' }}>
                          {/* Header del Card */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '1rem'
                          }}>
                            <div>
                              <div style={{ 
                                fontWeight: 700, 
                                fontSize: '1rem',
                                color: '#2c3e50',
                                marginBottom: '0.25rem'
                              }}>
                                {lectura.sensorId}
                              </div>
                              <div style={{ 
                                fontSize: '0.75rem', 
                                color: '#7f8c8d'
                              }}>
                                {lectura.zona}
                              </div>
                            </div>
                            <div style={{ 
                              padding: '0.25rem 0.75rem',
                              borderRadius: '20px',
                              backgroundColor: getQualityColor('pm25', pm25) + '20',
                              color: getQualityColor('pm25', pm25),
                              fontSize: '0.7rem',
                              fontWeight: 600
                            }}>
                              {getQualityLabel('pm25', pm25)}
                            </div>
                          </div>

                          {/* Métricas */}
                          <div style={{ marginBottom: '0.75rem' }}>
                            {pm25 !== undefined && (
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                marginBottom: '0.5rem',
                                fontSize: '0.85rem'
                              }}>
                                <span style={{ color: '#7f8c8d' }}>PM2.5:</span>
                                <span style={{ 
                                  fontWeight: 600,
                                  color: getQualityColor('pm25', pm25)
                                }}>
                                  {pm25} µg/m³
                                </span>
                              </div>
                            )}
                            {pm10 !== undefined && (
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                marginBottom: '0.5rem',
                                fontSize: '0.85rem'
                              }}>
                                <span style={{ color: '#7f8c8d' }}>PM10:</span>
                                <span style={{ 
                                  fontWeight: 600,
                                  color: getQualityColor('pm10', pm10)
                                }}>
                                  {pm10} µg/m³
                                </span>
                              </div>
                            )}
                            {co2 !== undefined && (
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                marginBottom: '0.5rem',
                                fontSize: '0.85rem'
                              }}>
                                <span style={{ color: '#7f8c8d' }}>CO₂:</span>
                                <span style={{ fontWeight: 600, color: '#2c3e50' }}>
                                  {co2} ppm
                                </span>
                              </div>
                            )}
                            {temperatura !== undefined && (
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                marginBottom: '0.5rem',
                                fontSize: '0.85rem'
                              }}>
                                <span style={{ color: '#7f8c8d' }}>Temp:</span>
                                <span style={{ fontWeight: 600, color: '#2c3e50' }}>
                                  {temperatura} °C
                                </span>
                              </div>
                            )}
                            {humedad !== undefined && (
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                fontSize: '0.85rem'
                              }}>
                                <span style={{ color: '#7f8c8d' }}>Humedad:</span>
                                <span style={{ fontWeight: 600, color: '#2c3e50' }}>
                                  {humedad} %
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Timestamp */}
                          <div style={{ 
                            marginTop: '0.75rem',
                            paddingTop: '0.75rem',
                            borderTop: '1px solid #ecf0f1',
                            fontSize: '0.7rem',
                            color: '#95a5a6',
                            textAlign: 'right'
                          }}>
                            {formatTimestamp(lectura.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
