import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CENTRO } from '../data/sites.js'
import { aqiVar } from '../data/aqi.js'

// Teselas de OpenStreetMap (uso liviano, con atribución). El tema oscuro se logra con un filtro CSS.
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

// items: [{ sensorId, nombre, lat, lng, aqi, sub }]
export default function SensorMap ({ items, tall, onSelect, selected }) {
  const el = useRef(null)
  const map = useRef(null)
  const layer = useRef(null)
  const tiles = useRef(null)
  const fitted = useRef(false)

  useEffect(() => {
    map.current = L.map(el.current, { center: CENTRO, zoom: 15, scrollWheelZoom: false, attributionControl: true })
    tiles.current = L.tileLayer(TILES, { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map.current)
    layer.current = L.layerGroup().addTo(map.current)
    return () => { map.current.remove() }
  }, [])

  useEffect(() => {
    layer.current.clearLayers()
    items.forEach(i => {
      const color = getComputedStyle(document.documentElement).getPropertyValue(aqiVar(i.aqi).slice(4, -1)).trim() || '#888'
      const ring = selected === i.sensorId ? 'box-shadow:0 0 0 4px rgba(15,118,110,.45),0 2px 8px rgba(0,0,0,.35);' : ''
      const icon = L.divIcon({
        className: '',
        html: `<div class="pin" style="background:${color};${ring}">${i.aqi ?? '–'}</div>`,
        iconSize: [34, 34], iconAnchor: [17, 17]
      })
      const m = L.marker([i.lat, i.lng], { icon }).addTo(layer.current)
      m.bindTooltip(`<b>${i.nombre}</b><br/>${i.sub || ''}`, { direction: 'top', offset: [0, -14] })
      if (onSelect) m.on('click', () => onSelect(i.sensorId))
    })
    if (!fitted.current && items.length) {
      map.current.fitBounds(L.latLngBounds(items.map(i => [i.lat, i.lng])), { padding: [48, 48], maxZoom: 16 })
      fitted.current = true
    }
  }, [items, selected, onSelect])

  return <div ref={el} className={`map${tall ? ' tall' : ''}`} />
}
