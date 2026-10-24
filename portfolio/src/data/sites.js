// Ubicaciones ilustrativas (aproximadas) dentro del barrio de Colegiales, CABA.
export const EMPRESA = { id: 'emp-colegiales', nombre: 'Colegiales Verde (demo)' }

export const ZONAS = [
  { id: 'z-transito', nombre: 'Corredor vial', descripcion: 'Avenidas con alto tránsito', esPublica: false },
  { id: 'z-verde', nombre: 'Espacios verdes', descripcion: 'Plaza y parque abiertos al público', esPublica: true },
  { id: 'z-ferro', nombre: 'Eje ferroviario', descripcion: 'Estación y traza del FFCC Mitre', esPublica: false }
]

// profile: factores que modulan el comportamiento simulado del sensor
export const DISPOSITIVOS = [
  {
    sensorId: 'esp32-col-001', nombre: 'Av. Federico Lacroze', zonaId: 'z-transito', esPublico: false,
    lat: -34.5712, lng: -58.4497, entorno: 'Calle con tránsito',
    profile: { pm25: 17, no2: 26, co: 1.1, traffic: 1.0, green: 0, temp: 0.4 }
  },
  {
    sensorId: 'esp32-col-002', nombre: 'Plaza Mafalda', zonaId: 'z-verde', esPublico: true,
    lat: -34.5774, lng: -58.4491, entorno: 'Plaza urbana',
    profile: { pm25: 11, no2: 14, co: 0.6, traffic: 0.45, green: 0.6, temp: -0.5 }
  },
  {
    sensorId: 'esp32-col-003', nombre: 'Parque Ferroviario Colegiales', zonaId: 'z-verde', esPublico: true,
    lat: -34.5815, lng: -58.4506, entorno: 'Campo abierto',
    profile: { pm25: 7.5, no2: 9, co: 0.4, traffic: 0.25, green: 1.0, temp: -0.9 }
  },
  {
    sensorId: 'esp32-col-004', nombre: 'Estación Colegiales (FFCC Mitre)', zonaId: 'z-ferro', esPublico: false,
    lat: -34.5722, lng: -58.4442, entorno: 'Estación de tren',
    profile: { pm25: 14, no2: 20, co: 0.9, traffic: 0.8, green: 0.1, temp: 0.2 }
  },
  {
    sensorId: 'esp32-col-005', nombre: 'Av. Álvarez Thomas y Elcano', zonaId: 'z-transito', esPublico: false,
    lat: -34.5757, lng: -58.4458, entorno: 'Cruce de avenidas',
    profile: { pm25: 16, no2: 24, co: 1.0, traffic: 0.95, green: 0.05, temp: 0.3 }
  }
]

export const CENTRO = [-34.5755, -58.4485]
export const SEND_INTERVAL_S = 60
