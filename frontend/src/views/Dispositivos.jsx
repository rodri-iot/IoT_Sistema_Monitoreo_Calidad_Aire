import React, { useEffect, useState, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

export default function Dispositivos() {
  const { token, user } = useContext(AuthContext)
  const [dispositivos, setDispositivos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDispositivos()
  }, [token])

  const fetchDispositivos = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!token) {
        setError('No hay token de autenticación')
        setLoading(false)
        return
      }

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

      const data = await response.json()
      console.log('📱 Dispositivos recibidos:', data.length)
      setDispositivos(data)
    } catch (err) {
      console.error('❌ Error al obtener dispositivos:', err)
      setError(err.message || 'Error al cargar dispositivos')
    } finally {
      setLoading(false)
    }
  }

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'activo':
        return '#2ECC71' // Verde
      case 'inactivo':
        return '#95A5A6' // Gris
      case 'desconocido':
        return '#F1C40F' // Amarillo
      default:
        return '#95A5A6'
    }
  }

  const getEstadoLabel = (estado) => {
    switch (estado) {
      case 'activo':
        return 'En línea'
      case 'inactivo':
        return 'Desconectado'
      case 'desconocido':
        return 'Desconocido'
      default:
        return estado
    }
  }

  const formatDate = (date) => {
    if (!date) return 'Nunca'
    return new Date(date).toLocaleString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: '2rem' }}>
        <h1>Dispositivos</h1>
        <p>Vista de gestión y monitoreo de dispositivos.</p>
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Cargando dispositivos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container" style={{ padding: '2rem' }}>
        <h1>Dispositivos</h1>
        <p>Vista de gestión y monitoreo de dispositivos.</p>
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
      <h1>Dispositivos</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Vista de gestión y monitoreo de dispositivos.
      </p>

      {dispositivos.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          backgroundColor: '#F8F9FA',
          borderRadius: '8px',
          border: '1px solid #DEE2E6'
        }}>
          <p style={{ fontSize: '1.2rem', color: '#666' }}>
            No hay dispositivos registrados
          </p>
          <p style={{ color: '#999', marginTop: '0.5rem' }}>
            {user?.rol === 'superadmin' 
              ? 'Los dispositivos aparecerán aquí cuando se registren en el sistema.'
              : 'Contacta a tu administrador para registrar dispositivos.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {dispositivos.map((dispositivo) => (
            <div
              key={dispositivo._id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: '1px solid #E0E0E0',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', color: '#2C3E50' }}>
                    {dispositivo.nombre}
                  </h3>
                  <p style={{ margin: '0', color: '#7F8C8D', fontSize: '0.9rem', fontFamily: 'monospace' }}>
                    ID: {dispositivo.sensorId}
                  </p>
                </div>
                <div style={{
                  backgroundColor: getEstadoColor(dispositivo.estado),
                  color: 'white',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold'
                }}>
                  {getEstadoLabel(dispositivo.estado)}
                </div>
              </div>

              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E0E0E0' }}>
                <div style={{ marginBottom: '0.8rem' }}>
                  <strong style={{ color: '#34495E', fontSize: '0.9rem' }}>Zona:</strong>
                  <span style={{ marginLeft: '0.5rem', color: '#7F8C8D' }}>{dispositivo.zona}</span>
                </div>

                {dispositivo.ubicacion && (
                  <div style={{ marginBottom: '0.8rem' }}>
                    <strong style={{ color: '#34495E', fontSize: '0.9rem' }}>Ubicación:</strong>
                    <span style={{ marginLeft: '0.5rem', color: '#7F8C8D', fontFamily: 'monospace' }}>
                      {dispositivo.ubicacion.lat?.toFixed(6)}, {dispositivo.ubicacion.lng?.toFixed(6)}
                    </span>
                  </div>
                )}

                {dispositivo.ultimaLectura && (
                  <div style={{ marginBottom: '0.8rem' }}>
                    <strong style={{ color: '#34495E', fontSize: '0.9rem' }}>Última lectura:</strong>
                    <span style={{ marginLeft: '0.5rem', color: '#7F8C8D', fontSize: '0.9rem' }}>
                      {formatDate(dispositivo.ultimaLectura)}
                    </span>
                  </div>
                )}

                {dispositivo.parametrosSoportados && dispositivo.parametrosSoportados.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <strong style={{ color: '#34495E', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                      Parámetros soportados:
                    </strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {dispositivo.parametrosSoportados.map((param) => (
                        <span
                          key={param}
                          style={{
                            backgroundColor: '#ECF0F1',
                            color: '#2C3E50',
                            padding: '0.3rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            textTransform: 'uppercase',
                            fontWeight: '500'
                          }}
                        >
                          {param}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {dispositivo.descripcion && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E0E0E0' }}>
                    <p style={{ margin: '0', color: '#7F8C8D', fontSize: '0.9rem' }}>
                      {dispositivo.descripcion}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
