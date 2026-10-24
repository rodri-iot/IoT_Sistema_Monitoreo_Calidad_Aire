import React from 'react'
import { Svg, Group, Box, Edge, Label } from './kit.jsx'

/* 1. Flujo extremo a extremo: ingesta (arriba) y consumo (abajo) */
export function SystemOverview () {
  return (
    <Svg w={1100} h={470} label="Flujo de datos de extremo a extremo del sistema SMCA">
      <Group x={14} y={40} w={1072} h={150} label="Ingesta · de la medición al dato" tone="broker" />
      <Group x={14} y={250} w={1072} h={190} label="Consumo · del dato a la persona" tone="front" />

      <Box x={30} y={80} w={210} h={90} tone="edge" title="Nodo SMCA" lines={['ESP32-S3 · PMS7003 · SCD40', 'SGP30 · MiCS-4514']} />
      <Box x={330} y={80} w={210} h={90} tone="broker" title="Broker Mosquitto" lines={['MQTTS :8883', 'mTLS + ACL por CN']} />
      <Box x={620} y={80} w={200} h={90} tone="back" title="Backend · cliente MQTT" lines={['valida sensorId', 'calcula AQI (EPA)']} />
      <Box x={890} y={80} w={190} h={90} tone="data" title="MongoDB" lines={['Lectura · Dispositivo', 'Zona · Empresa · Usuario']} />

      <Edge strong d="M240 125 L330 125" label="1 · publica" lx={285} ly={112} />
      <Edge strong d="M540 125 L620 125" label="2 · suscribe" lx={580} ly={112} />
      <Edge strong d="M820 125 L890 125" label="3 · guarda" lx={855} ly={112} />

      <Edge d="M985 170 L985 225 L720 225 L720 280" label="4 · consultas agregadas" lx={850} ly={218} />

      <Box x={620} y={280} w={200} h={90} tone="back" title="API REST + SSE" lines={['Express · JWT · roles', 'aislamiento por empresa']} />
      <Box x={330} y={280} w={210} h={90} tone="front" title="Vista pública" lines={['sin login', 'solo zonas públicas']} />
      <Box x={30} y={280} w={210} h={90} tone="front" title="Dashboard privado" lines={['React · Vite · Recharts', 'tiempo real vía SSE']} />

      <Edge d="M620 325 L540 325" label="5 · público" lx={580} ly={312} />
      <Edge d="M720 370 L720 412 L135 412 L135 370" label="6 · /api con JWT + eventos SSE" lx={432} ly={405} />
      <Label x={30} y={460} cls="dg-sub">El nodo solo conoce su sensorId; el backend resuelve la empresa a partir del dispositivo registrado.</Label>
    </Svg>
  )
}

/* 2. Capas del backend */
export function BackendLayers () {
  return (
    <Svg w={1100} h={470} label="Arquitectura en capas del backend Node.js">
      <Box x={30} y={70} w={200} h={60} tone="front" title="Navegador (React)" sub="Dashboard · Vista pública" />
      <Box x={30} y={330} w={200} h={60} tone="broker" title="Broker MQTT" sub="Mosquitto · mTLS" />

      <Group x={290} y={40} w={520} h={400} label="Backend · Node.js + Express" tone="back" />
      {/* Fila HTTP */}
      <Box x={305} y={80} w={150} h={70} tone="back" title="routes/" lines={['auth · zonas · lecturas', 'dispositivos · publico · sse']} />
      <Box x={495} y={80} w={150} h={70} tone="back" title="middleware/" lines={['authMiddleware (JWT)', 'requireRoles']} />
      <Box x={685} y={80} w={115} h={70} tone="back" title="controllers/" lines={['lógica de', 'negocio']} />
      <Edge d="M230 100 L305 100" label="HTTPS" lx={268} ly={92} />
      <Edge d="M455 115 L495 115" />
      <Edge d="M645 115 L685 115" />

      {/* Modelos */}
      <Box x={495} y={205} w={305} h={70} tone="data" title="db/ · modelos Mongoose" lines={['Usuario · Empresa · Zona', 'Dispositivo · Lectura']} />
      <Edge d="M742 150 L742 205" />
      <Box x={880} y={205} w={190} h={70} tone="data" title="MongoDB" sub="local (Docker) o Atlas" />
      <Edge both d="M800 240 L880 240" />

      {/* Fila MQTT */}
      <Box x={305} y={330} w={150} h={70} tone="broker" title="mqtt/mqttClient" lines={['suscribe iot/aire/*', 'rejectUnauthorized']} />
      <Box x={495} y={330} w={150} h={70} tone="back" title="utils/aqiCalculator" lines={['EPA: PM2.5 · PM10', 'NO₂ · CO']} />
      <Box x={685} y={330} w={115} h={70} tone="back" title="sseEmitter" lines={['push en', 'vivo']} />
      <Edge d="M230 360 L305 360" label="mTLS" lx={268} ly={352} />
      <Edge d="M455 365 L495 365" />
      <Edge d="M645 365 L685 365" />
      <Edge d="M570 330 L570 275" label="guarda Lectura" lx={578} ly={308} anchor="start" />
      <Edge dashed d="M742 400 L742 428 L262 428 L262 122 L230 122" label="eventos SSE" lx={500} ly={421} />

      <Label x={880} y={330} cls="dg-sub">Tarea periódica:</Label>
      <Label x={880} y={346} cls="dg-sub">dispositivo sin lecturas &gt; 5 min</Label>
      <Label x={880} y={362} cls="dg-sub">→ estado «inactivo».</Label>
    </Svg>
  )
}

/* 3. Modelo de datos multiempresa */
export function DataModel () {
  return (
    <Svg w={1100} h={430} label="Modelo de datos multiempresa">
      <Box x={40} y={150} w={200} h={80} tone="data" title="Empresa" lines={['nombre']} />
      <Box x={330} y={20} w={260} h={110} tone="data" title="Usuario" lines={['correo (único) · password (bcrypt)', 'rol: superadmin | admin | supervisor', 'empresa → Empresa']} />
      <Box x={330} y={160} w={260} h={100} tone="data" title="Zona" lines={['nombre · descripción', 'esPublica: Boolean', 'empresaId → Empresa']} />
      <Box x={690} y={140} w={370} h={130} tone="data" title="Dispositivo" lines={['sensorId (único) = CN del certificado', 'nombre · estado · ultimaLectura', 'zonaId → Zona · empresa → Empresa', 'esPublico: Boolean']} />
      <Box x={690} y={300} w={370} h={115} tone="data" title="Lectura" lines={['sensorId · timestamp · zona', 'aqi · aqiParametro', 'valores: Map(pm25, pm10, no2, co, co2, …)', 'empresaId · zonaId (denormalizados)']} />
      <Edge d="M240 175 L285 175 L285 75 L330 75" label="1 : N" lx={300} ly={125} anchor="start" />
      <Edge d="M240 200 L330 200" label="1 : N" lx={285} ly={193} />
      <Edge d="M590 210 L690 210" label="1 : N" lx={640} ly={203} />
      <Edge d="M875 270 L875 300" label="1 : N" lx={885} ly={290} anchor="start" />
      <Label x={40} y={300} cls="dg-sub">Regla de visibilidad pública:</Label>
      <Label x={40} y={318} cls="dg-title">zona.esPublica ∧ dispositivo.esPublico</Label>
      <Label x={40} y={342} cls="dg-sub">Toda consulta privada se filtra por el</Label>
      <Label x={40} y={358} cls="dg-sub">empresaId que viaja firmado en el JWT.</Label>
    </Svg>
  )
}

/* 4. Jerarquía de confianza (PKI) y permisos */
export function PkiDiagram () {
  return (
    <Svg w={1100} h={330} label="Infraestructura de certificados y permisos MQTT">
      <Box x={420} y={14} w={260} h={64} tone="broker" title="CA del sistema SMCA" lines={['ca.crt (pública) · ca.key (privada)']} />
      <Edge strong d="M520 78 L520 110 L165 110 L165 136" label="firma" lx={340} ly={104} />
      <Edge strong d="M550 78 L550 136" />
      <Edge strong d="M580 78 L580 110 L935 110 L935 136" label="firma" lx={760} ly={104} />

      <Box x={30} y={136} w={270} h={96} tone="broker" title="Mosquitto" lines={['server.crt / server.key', 'require_certificate true', 'use_identity_as_username true']} />
      <Box x={415} y={136} w={270} h={96} tone="back" title="Backend" lines={['client.crt · CN = backend_smca', 'topic read iot/aire/#', 'topic read smca/#  (solo lectura)']} />
      <Box x={800} y={136} w={270} h={96} tone="edge" title="Nodos ESP32 (uno por equipo)" lines={['client.crt · CN = sensorId', 'topic write iot/aire/lectura', 'pattern readwrite smca/%u/#']} />

      <Label x={30} y={266} cls="dg-sub">Un certificado por identidad: revocar un nodo no afecta al resto.</Label>
      <Label x={30} y={284} cls="dg-sub">%u se reemplaza por el CN del certificado → cada cliente solo escribe en su propia rama de tópicos.</Label>
      <Label x={30} y={302} cls="dg-sub">Conexión sin certificado válido: rechazada en el handshake TLS, antes de cualquier mensaje MQTT.</Label>
    </Svg>
  )
}

/* 5. Secuencia mTLS + publicación */
export function MqttSequence () {
  const X = { n: 150, m: 550, b: 950 }
  const msgs = [
    { y: 143, from: 'm', to: 'n', t: 'ServerHello + server.crt' },
    { y: 175, note: 'n', t: 'verifica server.crt contra ca.crt' },
    { y: 208, from: 'n', to: 'm', t: 'client.crt + prueba de clave privada' },
    { y: 240, note: 'm', t: 'valida contra su CA · CN → username' },
    { y: 285, from: 'n', to: 'm', t: 'CONNECT (Last Will: estado offline, retain)', strong: true },
    { y: 325, from: 'm', to: 'n', t: 'CONNACK', dashed: true },
    { y: 370, from: 'n', to: 'm', t: 'PUBLISH iot/aire/lectura · QoS 1', strong: true },
    { y: 405, note: 'm', t: 'comprueba ACL del CN' },
    { y: 445, from: 'm', to: 'b', t: 'PUBLISH (suscripción del backend)', strong: true },
    { y: 485, from: 'm', to: 'n', t: 'PUBACK', dashed: true }
  ]
  return (
    <Svg w={1100} h={560} label="Secuencia de conexión mTLS y publicación MQTT">
      {[['n', 'Nodo ESP32', 'edge'], ['m', 'Mosquitto', 'broker'], ['b', 'Backend', 'back']].map(([k, name, tone]) => (
        <g key={k}>
          <Box x={X[k] - 85} y={14} w={170} h={44} tone={tone} title={name} />
          <line x1={X[k]} y1={58} x2={X[k]} y2={535} stroke="var(--border)" strokeWidth="1.5" strokeDasharray="4 4" />
        </g>
      ))}
      <rect x={20} y={96} width={700} height={166} rx="12" fill="color-mix(in srgb, var(--c-broker) 6%, transparent)" stroke="var(--c-broker)" strokeDasharray="5 4" />
      <text x={34} y={113} className="dg-glabel" style={{ '--tone': 'var(--c-broker)' }}>Handshake TLS 1.2 · autenticación mutua</text>
      {msgs.map((m, i) => m.note
        ? (
          <g key={i}>
            <rect x={X[m.note] - 135} y={m.y - 15} width="270" height="26" rx="8" className="dg-box" stroke="var(--border)" />
            <text x={X[m.note]} y={m.y + 2} textAnchor="middle" className="dg-sub">{m.t}</text>
          </g>
          )
        : (
          <Edge key={i} strong={m.strong} dashed={m.dashed} d={`M${X[m.from]} ${m.y} L${X[m.to]} ${m.y}`} label={m.t} lx={(X[m.from] + X[m.to]) / 2} ly={m.y - 8} />
          ))}
    </Svg>
  )
}
