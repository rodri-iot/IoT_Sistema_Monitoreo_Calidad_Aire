import React, { useMemo, useState } from 'react'
import { DISPOSITIVOS, ZONAS, SEND_INTERVAL_S } from '../data/sites.js'
import { latest, estado } from '../data/engine.js'
import { PageTop, LiveDot, AqiBadge, useNow } from './shared.jsx'

export default function Dispositivos ({ user }) {
  const now = useNow(5000)
  const [zona, setZona] = useState('todas')
  const list = useMemo(() => DISPOSITIVOS.filter(d => zona === 'todas' || d.zonaId === zona), [zona])
  const canEdit = user.rol === 'admin'

  return (
    <>
      <PageTop
        title="Dispositivos"
        subtitle="Nodos registrados en la empresa y su última lectura"
        right={<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><LiveDot />
          {canEdit && <button className="btn sm" disabled title="Deshabilitado en la demo">+ Registrar dispositivo</button>}</div>}
      />
      <div className="toolbar">
        <div className="seg">
          <button className={zona === 'todas' ? 'on' : ''} onClick={() => setZona('todas')}>Todas</button>
          {ZONAS.map(z => <button key={z.id} className={zona === z.id ? 'on' : ''} onClick={() => setZona(z.id)}>{z.nombre}</button>)}
        </div>
      </div>
      <div className="grid g3">
        {list.map(d => {
          const r = latest(d.sensorId, now)
          const s = estado(d.sensorId, now)
          const z = ZONAS.find(x => x.id === d.zonaId)
          return (
            <div className="panel devcard" key={d.sensorId}>
              <div className="top">
                <div>
                  <h3>{d.nombre}</h3>
                  <div className="muted small">{d.entorno} · {z.nombre}</div>
                </div>
                <AqiBadge aqi={r.aqi} short />
              </div>
              <div className="tag-row">
                <span className="pill">{s.online ? 'activo' : 'inactivo'}</span>
                <span className="pill gray">{d.esPublico && z.esPublica ? 'zona pública' : 'privado'}</span>
              </div>
              <dl className="kv">
                <dt>PM2.5 / PM10</dt><dd>{r.pm25} / {r.pm10} µg/m³</dd>
                <dt>NO₂ · CO</dt><dd>{r.no2} ppb · {r.co} ppm</dd>
                <dt>CO₂ · TVOC</dt><dd>{r.co2} ppm · {r.tvoc} ppb</dd>
                <dt>Temp. · Humedad</dt><dd>{r.temp} °C · {r.hum} %</dd>
              </dl>
              <hr style={{ border: 0, borderTop: '1px solid var(--border)', width: '100%', margin: 0 }} />
              <dl className="kv">
                <dt>sensorId (CN)</dt><dd>{d.sensorId}</dd>
                <dt>Último dato</dt><dd>hace {s.lastSeenS} s (cada {SEND_INTERVAL_S} s)</dd>
                <dt>Señal WiFi</dt><dd>{s.rssi} dBm</dd>
                <dt>Uptime</dt><dd>{Math.floor(s.uptimeH / 24)} d {s.uptimeH % 24} h</dd>
                <dt>Tópico</dt><dd>iot/aire/lectura</dd>
              </dl>
            </div>
          )
        })}
      </div>
    </>
  )
}
