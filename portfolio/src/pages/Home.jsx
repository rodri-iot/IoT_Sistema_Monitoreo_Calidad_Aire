import React from 'react'
import { Link } from 'react-router-dom'
import { LINKS } from '../links.js'
import Figure from '../components/Figure.jsx'
import { SystemOverview } from '../diagrams/SystemDiagrams.jsx'

const STACK = [
  ['Nodo', ['ESP32-S3 · Heltec V3', 'ESP-IDF 5.1 (C)', 'FreeRTOS', 'PMS7003', 'SCD40', 'SGP30', 'MiCS-4514']],
  ['Mensajería', ['MQTT 3.1.1', 'Mosquitto', 'TLS con autenticación mutua', 'ACL por certificado']],
  ['Backend', ['Node.js', 'Express', 'MQTT.js', 'Mongoose', 'JWT + bcrypt', 'Server-Sent Events']],
  ['Datos', ['MongoDB', 'Agregaciones por bucket temporal', 'AQI según EPA']],
  ['Cliente', ['React 18', 'Vite', 'Recharts', 'Docker Compose']]
]

export default function Home () {
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <span className="eyebrow">Trabajo final · Carrera de Especialización en IoT · FIUBA</span>
          <h1>Calidad del aire, medida en la esquina<br />y entendida en el navegador.</h1>
          <p className="lead">
            SMCA es un sistema IoT de extremo a extremo: nodos ESP32 con sensores de partículas y gases publican por MQTT con
            autenticación mutua TLS; un backend los valida, calcula el AQI y los guarda; cada empresa ve solo sus datos y puede
            publicar zonas para el público.
          </p>
          <div className="hero-actions">
            <Link className="btn primary" to="/demo">Explorar la demo →</Link>
            <a className="btn" href={LINKS.memoria} target="_blank" rel="noreferrer">Leer la memoria (PDF)</a>
            <a className="btn" href={LINKS.slides} target="_blank" rel="noreferrer">Diapositivas</a>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 8 }}>
        <div className="wrap grid g4">
          {[
            ['4', 'sensores por nodo', 'material particulado, CO₂, TVOC y gases (NO₂, CO, NH₃)'],
            ['mTLS', 'identidad por certificado', 'cada nodo se autentica; el CN define sus permisos'],
            ['3', 'roles de usuario', 'superadmin, admin y supervisor, con aislamiento por empresa'],
            ['EPA', 'índice AQI', 'subíndices de PM2.5, PM10, NO₂ y CO; gana el peor']
          ].map(([n, t, d]) => (
            <div className="card" key={t}>
              <div className="stat" style={{ color: 'var(--accent)' }}>{n}</div>
              <h3>{t}</h3>
              <p className="muted small" style={{ margin: 0 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Ver para entender</span>
            <h2>El proyecto en video</h2>
            <p className="muted">Una explicación corta del sistema funcionando, y la defensa completa ante el jurado.</p>
          </div>
          <div className="videos">
            <div>
              <iframe className="embed" src={LINKS.videoProyectoEmbed} title="SMCA · video del proyecto" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
              <p className="small muted" style={{ marginTop: 8 }}>Video del proyecto · <a href={LINKS.videoProyecto} target="_blank" rel="noreferrer">abrir en YouTube</a></p>
            </div>
            <ul className="linklist">
              <li><a href={LINKS.videoDefensa} target="_blank" rel="noreferrer"><span>Defensa del trabajo final<br /><small>Video completo · Google Drive</small></span><span>↗</span></a></li>
              <li><a href={LINKS.memoria} target="_blank" rel="noreferrer"><span>Memoria del trabajo final<br /><small>PDF · repositorio de posgrados FIUBA</small></span><span>↗</span></a></li>
              <li><a href={LINKS.slides} target="_blank" rel="noreferrer"><span>Presentación<br /><small>Diapositivas en PDF</small></span><span>↗</span></a></li>
              <li><a href={LINKS.repoSistema} target="_blank" rel="noreferrer"><span>Repositorio del sistema<br /><small>Backend · frontend · broker MQTT</small></span><span>↗</span></a></li>
              <li><a href={LINKS.repoFirmware} target="_blank" rel="noreferrer"><span>Repositorio del firmware<br /><small>ESP-IDF · drivers · mTLS</small></span><span>↗</span></a></li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Arquitectura</span>
            <h2>De la medición al dato, y del dato a la persona</h2>
            <p className="muted">Dos recorridos: la ingesta, que nunca expone el broker sin certificado, y el consumo, que filtra siempre por empresa.</p>
          </div>
          <Figure
            legend={[['Nodo', 'var(--c-edge)'], ['Mensajería', 'var(--c-broker)'], ['Backend', 'var(--c-back)'], ['Datos', 'var(--c-data)'], ['Cliente', 'var(--c-front)']]}
            caption="Flujo de extremo a extremo. El detalle de cada capa está en las páginas Sistema y Firmware."
          >
            <SystemOverview />
          </Figure>
          <div className="hero-actions" style={{ marginTop: 0 }}>
            <Link className="btn" to="/sistema">Arquitectura del sistema</Link>
            <Link className="btn" to="/firmware">Arquitectura del firmware</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Tecnologías</span>
            <h2>Qué se usó en cada capa</h2>
          </div>
          <div className="grid g3">
            {STACK.map(([title, items]) => (
              <div className="card flat" key={title}>
                <h3>{title}</h3>
                <div className="tag-row">{items.map(i => <span className="pill gray" key={i}>{i}</span>)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap narrow">
          <div className="card">
            <h3>Sobre esta demo</h3>
            <p className="muted">
              Esta página es estática: los nodos físicos no transmiten de forma continua, así que el panel de la demo se alimenta
              con datos <b>simulados</b> de Colegiales (CABA) generados en el navegador, con la misma escala AQI que el sistema real.
              El sistema completo —broker, backend y base de datos— sigue disponible para levantarse con Docker:
            </p>
            <pre><code>{`git clone ${LINKS.repoSistema}.git
cd IoT_Sistema_Monitoreo_Calidad_Aire
# ver README → "Levantar el stack completo"`}</code></pre>
            <p className="small muted" style={{ margin: 0 }}>La versión presentada en la defensa está etiquetada como <code>v1.0-defensa</code> en ambos repositorios.</p>
          </div>
        </div>
      </section>
    </>
  )
}
