import React, { useEffect, useState, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

export default function Zonas() {
  const { token, user } = useContext(AuthContext)
  const [zonas, setZonas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

      // Obtener dispositivos para extraer zonas únicas
      const response = await fetch('/api/dispositivos', {
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

      const dispositivos = await response.json()
      
      // Extraer zonas únicas y contar dispositivos por zona
      const zonasMap = new Map()
      
      dispositivos.forEach(dispositivo => {
        const zonaNombre = dispositivo.zona || 'Sin zona'
        if (!zonasMap.has(zonaNombre)) {
          zonasMap.set(zonaNombre, {
            nombre: zonaNombre,
            dispositivos: [],
            totalDispositivos: 0,
            dispositivosActivos: 0
          })
        }
        
        const zona = zonasMap.get(zonaNombre)
        zona.dispositivos.push(dispositivo)
        zona.totalDispositivos++
        if (dispositivo.estado === 'activo') {
          zona.dispositivosActivos++
        }
      })

      // Obtener lecturas recientes para calcular promedios por zona
      const lecturasResponse = await fetch('/api/lecturas/ultimas?limite=100', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (lecturasResponse.ok) {
        const lecturas = await lecturasResponse.json()
        
        // Agrupar lecturas por zona y calcular promedios
        const lecturasPorZona = new Map()
        
        lecturas.forEach(lectura => {
          const zonaNombre = lectura.zona || 'Sin zona'
          if (!lecturasPorZona.has(zonaNombre)) {
            lecturasPorZona.set(zonaNombre, [])
          }
          lecturasPorZona.get(zonaNombre).push(lectura)
        })

        // Calcular promedios para cada zona
        zonasMap.forEach((zona, nombre) => {
          const lecturasZona = lecturasPorZona.get(nombre) || []
          
          if (lecturasZona.length > 0) {
            const valoresPM25 = lecturasZona
              .map(l => l.valores?.pm25)
              .filter(v => v !== undefined && v !== null)
            
            const valoresPM10 = lecturasZona
              .map(l => l.valores?.pm10)
              .filter(v => v !== undefined && v !== null)
            
            const valoresTemp = lecturasZona
              .map(l => l.valores?.temperatura)
              .filter(v => v !== undefined && v !== null)

            zona.promedioPM25 = valoresPM25.length > 0
              ? (valoresPM25.reduce((a, b) => a + b, 0) / valoresPM25.length).toFixed(2)
              : null
            
            zona.promedioPM10 = valoresPM10.length > 0
              ? (valoresPM10.reduce((a, b) => a + b, 0) / valoresPM10.length).toFixed(2)
              : null
            
            zona.promedioTemp = valoresTemp.length > 0
              ? (valoresTemp.reduce((a, b) => a + b, 0) / valoresTemp.length).toFixed(1)
              : null
          }
        })
      }

      setZonas(Array.from(zonasMap.values()))
    } catch (err) {
      console.error('❌ Error al obtener zonas:', err)
      setError(err.message || 'Error al cargar zonas')
    } finally {
      setLoading(false)
    }
  }

  const getQualityColor = (value, type = 'pm25') => {
    if (!value) return '#95A5A6' // Gris
    
    const ranges = {
      pm25: { good: 12, moderate: 35, dangerous: 55 },
      pm10: { good: 20, moderate: 50, dangerous: 100 }
    }
    
    const range = ranges[type] || ranges.pm25
    
    if (value <= range.good) return '#2ECC71' // Verde
    if (value <= range.moderate) return '#F1C40F' // Amarillo
    if (value <= range.dangerous) return '#E67E22' // Naranja
    return '#E74C3C' // Rojo
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: '2rem' }}>
        <h1 className="center-align">Zonas de Monitoreo</h1>
        <p className="flow-text">
          Aquí puedes gestionar las zonas de monitoreo de calidad del aire.
        </p>
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Cargando zonas...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container" style={{ padding: '2rem' }}>
        <h1 className="center-align">Zonas de Monitoreo</h1>
        <p className="flow-text">
          Aquí puedes gestionar las zonas de monitoreo de calidad del aire.
        </p>
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#F8D7DA', 
          color: '#721C24', 
          borderRadius: '8px',
          marginTop: '1rem'
        }}>
          <strong>Error:</strong> {error}
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: '2rem' }}>
      <h1 className="center-align">Zonas de Monitoreo</h1>
      <p className="flow-text" style={{ marginBottom: '2rem' }}>
        Aquí puedes gestionar las zonas de monitoreo de calidad del aire.
      </p>

      {zonas.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          backgroundColor: '#F8F9FA',
          borderRadius: '8px',
          border: '1px solid #DEE2E6'
        }}>
          <p style={{ fontSize: '1.2rem', color: '#666' }}>
            No hay zonas registradas
          </p>
          <p style={{ color: '#999', marginTop: '0.5rem' }}>
            Las zonas se crean automáticamente cuando se registran dispositivos.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {zonas.map((zona, index) => (
            <div
              key={index}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: '1px solid #E0E0E0'
              }}
            >
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', color: '#2C3E50' }}>
                {zona.nombre}
              </h3>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#7F8C8D', fontSize: '0.9rem' }}>Dispositivos:</span>
                  <strong style={{ color: '#2C3E50' }}>
                    {zona.dispositivosActivos}/{zona.totalDispositivos} activos
                  </strong>
                </div>
              </div>

              {zona.promedioPM25 !== null && (
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '1rem', 
                  backgroundColor: '#F8F9FA',
                  borderRadius: '8px',
                  border: `2px solid ${getQualityColor(parseFloat(zona.promedioPM25), 'pm25')}`
                }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <span style={{ color: '#7F8C8D', fontSize: '0.85rem' }}>PM2.5 promedio:</span>
                    <strong style={{ 
                      marginLeft: '0.5rem', 
                      fontSize: '1.2rem',
                      color: getQualityColor(parseFloat(zona.promedioPM25), 'pm25')
                    }}>
                      {zona.promedioPM25} µg/m³
                    </strong>
                  </div>
                  
                  {zona.promedioPM10 !== null && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ color: '#7F8C8D', fontSize: '0.85rem' }}>PM10 promedio:</span>
                      <strong style={{ 
                        marginLeft: '0.5rem',
                        color: getQualityColor(parseFloat(zona.promedioPM10), 'pm10')
                      }}>
                        {zona.promedioPM10} µg/m³
                      </strong>
                    </div>
                  )}
                  
                  {zona.promedioTemp !== null && (
                    <div>
                      <span style={{ color: '#7F8C8D', fontSize: '0.85rem' }}>Temperatura promedio:</span>
                      <strong style={{ marginLeft: '0.5rem', color: '#2C3E50' }}>
                        {zona.promedioTemp} °C
                      </strong>
                    </div>
                  )}
                </div>
              )}

              {zona.promedioPM25 === null && (
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '1rem', 
                  backgroundColor: '#F8F9FA',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: '#95A5A6'
                }}>
                  Sin lecturas disponibles
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
