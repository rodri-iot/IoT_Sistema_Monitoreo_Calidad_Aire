import React from 'react'
import { Link } from 'react-router-dom'
import Figure from '../components/Figure.jsx'
import { SystemOverview, BackendLayers, DataModel, PkiDiagram, MqttSequence } from '../diagrams/SystemDiagrams.jsx'

const LEG = [['Nodo', 'var(--c-edge)'], ['Mensajería', 'var(--c-broker)'], ['Backend', 'var(--c-back)'], ['Datos', 'var(--c-data)'], ['Cliente', 'var(--c-front)']]

export default function Sistema () {
  return (
    <div className="wrap">
      <section className="hero" style={{ paddingBottom: 16 }}>
        <span className="eyebrow">Arquitectura</span>
        <h1>El sistema</h1>
        <p className="lead">Cómo viaja una medición desde el sensor hasta el panel, qué garantiza cada capa y por qué se diseñó así.</p>
      </section>

      <section className="section" style={{ paddingTop: 16 }}>
        <div className="section-head"><h2>1 · Vista general</h2>
          <p className="muted">El nodo solo conoce su <code>sensorId</code>. El backend busca ese dispositivo, obtiene su empresa y zona, y recién entonces guarda la lectura. Si el dispositivo no está registrado, el dato se descarta.</p></div>
        <Figure legend={LEG} caption="Ingesta (arriba) y consumo (abajo). Los números indican el orden del recorrido."><SystemOverview /></Figure>
      </section>

      <section className="section">
        <div className="section-head"><h2>2 · Backend en capas</h2>
          <p className="muted">Node.js y Express con una separación simple: rutas → middleware → controladores → modelos. El camino MQTT corre en paralelo y comparte los modelos y el calculador de AQI.</p></div>
        <Figure legend={LEG} caption="Dos entradas: HTTP desde el navegador y MQTT desde el broker. Las nuevas lecturas se difunden por SSE a los dashboards conectados."><BackendLayers /></Figure>
        <div className="grid g3">
          <div className="card flat"><h3>Autenticación</h3><p className="small muted" style={{ margin: 0 }}>Login con bcrypt y JWT de 8 horas. El token lleva <code>id</code>, <code>rol</code> y <code>empresaId</code>; el middleware lo valida y filtra cada consulta por empresa.</p></div>
          <div className="card flat"><h3>Roles</h3><p className="small muted" style={{ margin: 0 }}><b>superadmin</b> gestiona empresas; <b>admin</b> gestiona usuarios, zonas y dispositivos de su empresa; <b>supervisor</b> consulta zonas, dispositivos e histórico.</p></div>
          <div className="card flat"><h3>AQI</h3><p className="small muted" style={{ margin: 0 }}>Fórmula lineal por tramos de la EPA sobre PM2.5, PM10, NO₂ y CO. El AQI de la lectura es el mayor subíndice y se guarda junto con el parámetro que lo causó.</p></div>
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>3 · Modelo de datos</h2>
          <p className="muted">Multiempresa por diseño. La lectura guarda sus valores como un mapa dinámico: sumar un sensor nuevo no obliga a migrar el esquema.</p></div>
        <Figure legend={[['Colecciones MongoDB', 'var(--c-data)']]} caption="Empresa → Zona → Dispositivo → Lectura. Los accesos públicos exigen que zona y dispositivo estén marcados como públicos."><DataModel /></Figure>
      </section>

      <section className="section">
        <div className="section-head"><h2>4 · Mensajería MQTT segura</h2>
          <p className="muted">El broker no acepta conexiones anónimas ni sin certificado. El CN del certificado del cliente se usa como nombre de usuario para las reglas de acceso.</p></div>
        <Figure title="Confianza y permisos" legend={LEG} caption="Una CA propia firma al broker, al backend y a cada nodo. Los permisos se derivan del CN."><PkiDiagram /></Figure>
        <Figure title="Conexión y primera publicación" legend={LEG} caption="El handshake TLS valida a ambas partes antes de que exista una sesión MQTT. El Last Will deja constancia si el nodo cae sin avisar."><MqttSequence /></Figure>

        <div className="grid g2">
          <div className="card flat">
            <h3>Tópicos</h3>
            <table>
              <tbody>
                <tr><td><code>iot/aire/lectura</code></td><td>Lecturas del nodo (QoS 1)</td></tr>
                <tr><td><code>iot/aire/status</code></td><td>Last Will · estado offline (retain)</td></tr>
                <tr><td><code>smca/&#123;cn&#125;/private/…</code></td><td>Jerarquía por identidad (ACL)</td></tr>
                <tr><td><code>smca/&#123;cn&#125;/public/…</code></td><td>Legible por cualquier cliente autenticado</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <p className="small muted" style={{ marginTop: 0 }}>Payload publicado por el firmware:</p>
            <pre><code>{`{
  "sensorId": "esp32-air-001",
  "timestamp": "2026-04-02T20:09:29Z",
  "pm25": 14.0, "pm10": 16.0,
  "co": 0.0, "no2": 0.0, "nh3": 0.0,
  "co2": 450.0, "tvoc": 120,
  "temp": 23.5, "hum": 74.0
}`}</code></pre>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>5 · Despliegue</h2>
          <p className="muted">Docker Compose levanta MongoDB, Mosquitto y el backend; el frontend se sirve con Vite. La versión de la defensa se desplegó en AWS: frontend estático en S3 + CloudFront, backend y broker en una instancia EC2 con HTTPS (Caddy) y MongoDB Atlas.</p></div>
        <div className="grid g3">
          <div className="card flat"><h3>Local</h3><p className="small muted" style={{ margin: 0 }}><code>docker compose up --build</code> y certificados de desarrollo con <code>mqtt/generate_certs_v2.sh</code>.</p></div>
          <div className="card flat"><h3>Raspberry Pi</h3><p className="small muted" style={{ margin: 0 }}>Despliegue de prueba en red local para validar los nodos reales fuera de la nube, con la misma pila de contenedores.</p></div>
          <div className="card flat"><h3>AWS (defensa)</h3><p className="small muted" style={{ margin: 0 }}>S3 + CloudFront, EC2 con Caddy y MongoDB Atlas. Ya no está activo: este sitio lo reemplaza como vitrina.</p></div>
        </div>
        <div className="hero-actions">
          <Link className="btn primary" to="/demo">Ver el panel en acción →</Link>
          <Link className="btn" to="/firmware">Arquitectura del firmware</Link>
        </div>
      </section>
    </div>
  )
}
