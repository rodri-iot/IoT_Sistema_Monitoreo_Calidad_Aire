import React from 'react'
import { Svg, Group, Box, Edge, Label } from './kit.jsx'

/* 1. Bloques de hardware y conexiones */
export function FwHardware () {
  return (
    <Svg w={1060} h={450} label="Diagrama de bloques del nodo: sensores, ESP32-S3 y red">
      <Box x={30} y={40} w={220} h={70} tone="edge" title="SCD40" lines={['CO₂ · temperatura · humedad', 'I²C · 0x62']} />
      <Box x={30} y={130} w={220} h={70} tone="edge" title="SGP30" lines={['TVOC · eCO₂', 'I²C · 0x58']} />
      <Box x={30} y={230} w={220} h={70} tone="edge" title="CJMCU-4541 (MiCS-4514)" lines={['NO₂ · CO · NH₃', 'salidas analógicas RED / NOX']} />
      <Box x={30} y={330} w={220} h={70} tone="edge" title="PMS7003" lines={['PM1.0 · PM2.5 · PM10', 'UART 9600 8N1']} />

      <Group x={380} y={30} w={290} h={385} label="Heltec WiFi LoRa 32 V3" tone="back" />
      <Box x={400} y={60} w={250} h={52} tone="back" title="ESP32-S3" sub="2× Xtensa LX7 · 240 MHz · 8 MB flash" />
      <Box x={400} y={126} w={250} h={52} tone="back" title="FreeRTOS · ESP-IDF 5.1" sub="tareas de lectura y publicación" />
      <Box x={400} y={192} w={250} h={52} tone="back" title="mbedTLS + esp-mqtt" sub="mTLS · Last Will · QoS 1" />
      <Box x={400} y={258} w={250} h={52} tone="back" title="SPIFFS" sub="ca.crt · client.crt · client.key" />
      <Box x={400} y={324} w={250} h={52} tone="back" title="WiFi STA · SNTP" sub="802.11 b/g/n · hora UTC" />

      <Edge both strong d="M250 75 L380 75" />
      <Edge both strong d="M250 165 L380 165" />
      <Label x={315} y={118} anchor="middle" cls="dg-elabel">I²C · GPIO 45/46</Label>
      <Edge d="M250 265 L380 265" label="ADC1" lx={315} ly={256} />
      <Edge both d="M250 365 L380 365" label="GPIO 4 / 5" lx={315} ly={356} />

      <Box x={790} y={70} w={240} h={70} tone="neutral" title="Red WiFi / Internet" sub="TCP 8883" />
      <Box x={790} y={185} w={240} h={80} tone="broker" title="Broker Mosquitto" lines={['mTLS · ACL por CN', 'iot/aire/lectura']} />
      <Box x={790} y={310} w={240} h={70} tone="neutral" title="LoRa SX1262 (en la placa)" sub="reservado · línea futura" />
      <Edge both strong d="M670 345 L720 345 L720 105 L790 105" />
      <Edge both strong d="M910 140 L910 185" label="MQTTS" lx={918} ly={168} anchor="start" />
      <Edge dashed d="M670 395 L760 395 L760 345 L790 345" />
    </Svg>
  )
}

/* 2. Componentes ESP-IDF */
export function FwComponents () {
  return (
    <Svg w={1060} h={500} label="Componentes del firmware ESP-IDF y sus dependencias">
      <Box x={375} y={14} w={300} h={50} tone="back" title="main/main.c" sub="app_main · orquestación del arranque" />
      <Box x={375} y={110} w={300} h={60} tone="back" title="sensor_sim" lines={['tarea de publicación · prio 5 · stack 8 KB', 'lee sensores → JSON → publish']} />
      <Edge d="M525 64 L525 110" />

      <Box x={730} y={110} w={290} h={60} tone="broker" title="smca_mqtt_client" lines={['esp-mqtt · mTLS · Last Will', 'cliente + reconexión automática']} />
      <Edge strong d="M675 140 L730 140" label="publish" lx={702} ly={130} />
      <Box x={730} y={215} w={170} h={60} tone="broker" title="spiffs_manager" lines={['monta /spiffs', 'PEM → RAM']} />
      <Edge d="M860 170 L860 215" />
      <Box x={730} y={320} w={170} h={50} tone="broker" title="wifi_manager" sub="STA · eventos" />
      <Edge dashed d="M1020 140 L1042 140 L1042 345 L900 345" />
      <Label x={916} y={338} cls="dg-elabel">transporte</Label>

      <Box x={30} y={215} w={180} h={60} tone="edge" title="sensor_scd40" lines={['CO₂ · T · HR', 'periódico + recovery']} />
      <Box x={230} y={215} w={180} h={60} tone="edge" title="sensor_sgp30" lines={['TVOC / eCO₂', 'tarea de polling 1 s']} />
      <Box x={430} y={215} w={180} h={60} tone="edge" title="sensor_cjmcu4541" lines={['NO₂ · CO · NH₃', 'ADC calibrado']} />
      <Box x={630} y={215} w={80} h={60} tone="edge" title="pms7003" sub="UART" />
      <Edge d="M420 170 L120 200 L120 215" />
      <Edge d="M470 170 L320 200 L320 215" />
      <Edge d="M525 170 L525 195 L520 195 L520 215" />
      <Edge d="M580 170 L670 200 L670 215" />

      <Box x={30} y={320} w={380} h={50} tone="edge" title="i2c_bus" sub="maestro I²C compartido · I2C_NUM_0 · 50 kHz · pull-ups internos" />
      <Edge d="M120 275 L120 320" />
      <Edge d="M320 275 L320 320" />

      <Box x={30} y={425} w={990} h={50} tone="neutral" title="ESP-IDF 5.1 · FreeRTOS · lwIP · mbedTLS · esp-mqtt · drivers I²C / UART / ADC · SPIFFS" />
      <Label x={30} y={405} cls="dg-sub">Orden de arranque: SPIFFS → I²C y sensores → WiFi → SNTP → MQTT → tarea de publicación</Label>
    </Svg>
  )
}

/* 3. Secuencia de arranque */
export function FwBoot () {
  const steps = [
    ['1', 'SPIFFS', 'monta /spiffs · lee ca, cert, key'],
    ['2', 'Bus I²C + sensores', 'SCD40 periódico · SGP30 polling'],
    ['3', 'ADC + UART', 'MiCS-4514 · PMS7003'],
    ['4', 'WiFi (STA)', 'wifi_init_sta · espera 5 s'],
    ['5', 'SNTP', 'pool.ntp.org · hasta 30 s'],
    ['6', 'MQTT mTLS', 'mqtt_start · Last Will'],
    ['7', 'Tarea de publicación', 'cada SEND_INTERVAL_MS']
  ]
  const pos = [[30, 40], [290, 40], [550, 40], [810, 40], [810, 170], [550, 170], [290, 170]]
  return (
    <Svg w={1060} h={380} label="Secuencia de arranque del firmware">
      {steps.map(([n, t, s], i) => (
        <g key={n}>
          <Box x={pos[i][0]} y={pos[i][1]} w={220} h={76} tone={i === 6 ? 'back' : i === 5 ? 'broker' : 'edge'} title={`${n} · ${t}`} sub={s} />
        </g>
      ))}
      <Edge strong d="M250 78 L290 78" />
      <Edge strong d="M510 78 L550 78" />
      <Edge strong d="M770 78 L810 78" />
      <Edge strong d="M920 116 L920 170" />
      <Edge strong d="M810 208 L770 208" />
      <Edge strong d="M550 208 L510 208" />
      <rect x={30} y={290} width={1000} height={70} rx="12" className="dg-box" stroke="var(--border)" />
      <text x={46} y={314} className="dg-title">Ciclo de publicación</text>
      <text x={46} y={336} className="dg-sub">leer sensores (reales o simulados según USE_REAL_*) → armar JSON con timestamp UTC → publish QoS 1 → dormir SEND_INTERVAL_MS (60 s por defecto)</text>
      <text x={46} y={352} className="dg-sub">Si falta algún PEM, mqtt_start devuelve NULL y se aborta el arranque de MQTT (falla explícita, no silenciosa).</text>
      <Label x={30} y={22} cls="dg-glabel">app_main()</Label>
    </Svg>
  )
}

/* 4. Mapa de flash */
export function FwFlash () {
  const parts = [
    ['nvs', '0x9000', '24 KB', 70, 'neutral'],
    ['phy_init', '0xF000', '4 KB', 70, 'neutral'],
    ['factory (app)', '0x10000', '1 MB', 320, 'back'],
    ['spiffs', '0x110000', '960 KB', 330, 'broker']
  ]
  let x = 40
  return (
    <Svg w={1060} h={170} label="Tabla de particiones de la flash">
      {parts.map(([n, off, size, w, tone]) => {
        const el = <Box key={n} x={x} y={40} w={w} h={74} tone={tone} title={n} lines={[off, size]} />
        x += w + 8
        return el
      })}
      <Label x={40} y={26} cls="dg-glabel">Flash 8 MB · tabla de particiones propia (partitions.csv)</Label>
      <Label x={40} y={146} cls="dg-sub">La partición spiffs aloja los PEM de mTLS: se genera con generar_spiffs.sh y se flashea en 0x110000; cada nodo lleva su propio client.crt / client.key.</Label>
    </Svg>
  )
}
