import React from 'react'
import { Link } from 'react-router-dom'
import Figure from '../components/Figure.jsx'
import { FwHardware, FwComponents, FwBoot, FwFlash } from '../diagrams/FirmwareDiagrams.jsx'
import { LINKS } from '../links.js'

const LEG = [['Sensores', 'var(--c-edge)'], ['Firmware', 'var(--c-back)'], ['Seguridad y MQTT', 'var(--c-broker)']]

export default function Firmware () {
  return (
    <div className="wrap">
      <section className="hero" style={{ paddingBottom: 16 }}>
        <span className="eyebrow">Arquitectura</span>
        <h1>El firmware</h1>
        <p className="lead">Un nodo basado en ESP32-S3 (Heltec WiFi LoRa 32 V3) con ESP-IDF 5.1: lee cuatro sensores, firma su identidad con un certificado propio y publica por MQTT sobre TLS.</p>
        <p><a href={LINKS.repoFirmware} target="_blank" rel="noreferrer">Ver el código en GitHub ↗</a></p>
      </section>

      <section className="section" style={{ paddingTop: 16 }}>
        <div className="section-head"><h2>1 · Hardware y conexiones</h2>
          <p className="muted">Dos sensores comparten el bus I²C, el sensor de partículas usa UART y el de gases entrega señal analógica al ADC1.</p></div>
        <Figure legend={LEG} caption="Los GPIO de I²C (45/46) y UART (4/5) son los del firmware; los del ADC se asignan por nodo en config.h."><FwHardware /></Figure>
        <div className="card flat" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead><tr><th>Sensor</th><th>Magnitudes</th><th>Interfaz</th><th>Notas de integración</th></tr></thead>
            <tbody>
              <tr><td><b>PMS7003</b></td><td>PM1.0 · PM2.5 · PM10</td><td>UART 9600 8N1</td><td>Tramas de 32 bytes con cabecera <code>0x42 0x4D</code></td></tr>
              <tr><td><b>SCD40</b></td><td>CO₂ · T · HR</td><td>I²C 0x62</td><td>Medición periódica ~5 s; reinicio tras 4 fallos de <code>data_ready</code></td></tr>
              <tr><td><b>SGP30</b></td><td>TVOC · eCO₂</td><td>I²C 0x58</td><td>Exige 1 s exacto entre lecturas: tarea propia que cachea el último valor</td></tr>
              <tr><td><b>MiCS-4514</b></td><td>NO₂ · CO · NH₃</td><td>ADC1 (RED/NOX)</td><td>Calibración por curva de ESP-IDF; ~3 min de precalentamiento</td></tr>
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>El bus I²C trabaja a 50 kHz: más lento que el estándar, pero estable con cables largos y el SCD40.</p>
      </section>

      <section className="section">
        <div className="section-head"><h2>2 · Componentes de software</h2>
          <p className="muted">Cada pieza es un componente ESP-IDF independiente, con su <code>CMakeLists.txt</code> y su interfaz pública. Cada sensor se habilita con una bandera (<code>USE_REAL_*</code>); si no está presente, el nodo completa con valores simulados para probar la cadena completa.</p></div>
        <Figure legend={LEG} caption="La tarea de publicación orquesta los drivers y entrega el JSON al cliente MQTT."><FwComponents /></Figure>
      </section>

      <section className="section">
        <div className="section-head"><h2>3 · Arranque y ciclo de publicación</h2>
          <p className="muted">Cada etapa es prerrequisito de la siguiente. La hora se sincroniza antes de abrir TLS, porque la validez de los certificados depende del reloj.</p></div>
        <Figure legend={LEG} caption="Secuencia real de app_main(), seguida del ciclo periódico de lectura y envío."><FwBoot /></Figure>
      </section>

      <section className="section">
        <div className="section-head"><h2>4 · Seguridad en el dispositivo</h2>
          <p className="muted">La identidad del nodo vive en su flash, no en el código: el mismo binario se flashea en todos los equipos y solo cambian <code>config.h</code> y los tres certificados.</p></div>
        <Figure legend={LEG} caption="Mapa de la flash con una partición SPIFFS dedicada a los PEM de mTLS."><FwFlash /></Figure>
        <div className="grid g3">
          <div className="card flat"><h3>El nodo verifica al broker</h3><p className="small muted" style={{ margin: 0 }}>Valida el certificado del servidor contra <code>ca.crt</code>: protege frente a un intermediario.</p></div>
          <div className="card flat"><h3>El broker verifica al nodo</h3><p className="small muted" style={{ margin: 0 }}>Presenta <code>client.crt</code> firmado por la CA del sistema; sin él, la conexión se corta en el handshake.</p></div>
          <div className="card flat"><h3>Secretos fuera del repo</h3><p className="small muted" style={{ margin: 0 }}><code>config.h</code> y los PEM están en <code>.gitignore</code>; se versiona solo <code>config.h.example</code>.</p></div>
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>5 · Mensajería y recuperación de fallos</h2></div>
        <div className="grid g2">
          <div className="card flat" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead><tr><th>Subsistema</th><th>Estrategia</th></tr></thead>
              <tbody>
                <tr><td>WiFi</td><td>Reconexión automática por eventos de ESP-IDF</td></tr>
                <tr><td>MQTT</td><td>Reconexión de <code>esp-mqtt</code>; Last Will publica <code>offline</code> si cae</td></tr>
                <tr><td>SCD40</td><td>Reintento y reinicio del ciclo periódico</td></tr>
                <tr><td>SGP30</td><td>Tarea independiente; sin baseline publica <code>tvoc = 0</code></td></tr>
                <tr><td>SNTP</td><td>Timeout de 30 s; continúa con advertencia</td></tr>
                <tr><td>Certificados</td><td>PEM ausente → aborta MQTT en forma explícita</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <pre><code>{`// Parámetros de config.h por nodo
SENSOR_ID         "esp32-air-001"
MQTT_BROKER_URI   "mqtts://broker:8883"
MQTT_TOPIC        "iot/aire/lectura"
SEND_INTERVAL_MS  60000
USE_REAL_SCD40    1
USE_REAL_SGP30    1
USE_REAL_CJMCU    1
USE_REAL_PMS7003  1`}</code></pre>
            <p className="small muted">Limitación conocida: no hay cola offline; si el broker no está disponible durante el envío, ese mensaje se pierde.</p>
          </div>
        </div>
        <div className="hero-actions">
          <Link className="btn primary" to="/demo">Ver los datos en el panel →</Link>
          <Link className="btn" to="/sistema">Arquitectura del sistema</Link>
        </div>
      </section>
    </div>
  )
}
