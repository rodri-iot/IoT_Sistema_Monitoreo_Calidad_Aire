import { DateTime } from 'luxon'

const DEFAULT_TZ = 'America/Argentina/Buenos_Aires'

export function getAppTimeZone() {
  return import.meta.env.VITE_APP_TIMEZONE || DEFAULT_TZ
}

/** yyyy-mm-dd del “hoy” calendario en la zona de la app (no la del navegador). */
export function getTodayDateString() {
  return DateTime.now().setZone(getAppTimeZone()).toISODate()
}

/**
 * Rango UTC para consultar la API: días calendario en VITE_APP_TIMEZONE.
 * @param {string} [fechaDesde] yyyy-mm-dd
 * @param {string} [fechaHasta] yyyy-mm-dd
 */
export function getDesdeHasta(fechaDesde, fechaHasta) {
  const zone = getAppTimeZone()
  const today = DateTime.now().setZone(zone).toISODate()

  let desde
  if (fechaDesde) {
    desde = DateTime.fromISO(fechaDesde, { zone }).startOf('day').toUTC().toJSDate()
  } else {
    desde = DateTime.now().setZone(zone).minus({ hours: 24 }).toUTC().toJSDate()
  }

  let hasta
  if (fechaHasta) {
    if (fechaHasta === today) {
      hasta = DateTime.now().toUTC().toJSDate()
    } else {
      hasta = DateTime.fromISO(fechaHasta, { zone }).endOf('day').toUTC().toJSDate()
    }
  } else {
    hasta = DateTime.now().toUTC().toJSDate()
  }

  return { desde, hasta }
}

function toJsDate(isoOrDate) {
  if (isoOrDate == null) return null
  if (isoOrDate instanceof Date) return isoOrDate
  if (typeof isoOrDate === 'string') return new Date(isoOrDate)
  if (typeof isoOrDate === 'object' && isoOrDate.$date != null) {
    return new Date(isoOrDate.$date)
  }
  return null
}

/** Etiqueta legible para buckets antiguos (objeto year/month/day…) — compatibilidad. */
function legacyFormatAggLabel(id) {
  if (!id || typeof id !== 'object') return ''
  const d = id.day != null ? String(id.day).padStart(2, '0') : ''
  const m = id.month ? String(id.month).padStart(2, '0') : ''
  const h = id.hour != null ? String(id.hour).padStart(2, '0') : ''
  const min = id.minuteBucket != null ? id.minuteBucket : id.minute
  if (h) return `${d || '01'}/${m || '01'} ${h}:${String(min ?? 0).padStart(2, '0')}`
  if (d) return `${d}/${m || '01'}`
  if (m) return `${id.year || ''}-${m}`
  return String(id.year || '')
}

/**
 * Fecha/hora en es-AR, 24 h, zona de la app.
 */
export function formatDateTimeAR(isoOrDate) {
  const d = toJsDate(isoOrDate)
  if (!d || Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: getAppTimeZone(),
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d)
}

/**
 * Texto dd/MM/yyyy para inputs de fecha o etiquetas (estado interno suele ser yyyy-mm-dd).
 */
export function formatDateOnlyDisplay(isoDateString) {
  if (!isoDateString) return ''
  const dt = DateTime.fromISO(isoDateString, { zone: getAppTimeZone() })
  if (!dt.isValid) return ''
  return dt.toFormat('dd/MM/yyyy')
}

/**
 * Parsea texto dd/mm/yyyy (o d/m/yyyy) en zona de la app → yyyy-mm-dd para API/estado.
 * @param {string} text
 * @returns {string|null}
 */
export function parseDateDisplayToIso(text) {
  const raw = String(text || '').trim()
  if (!raw) return null
  const zone = getAppTimeZone()
  const formats = ['dd/MM/yyyy', 'd/M/yyyy', 'dd/M/yyyy', 'd/MM/yyyy']
  for (const fmt of formats) {
    const dt = DateTime.fromFormat(raw, fmt, { zone })
    if (dt.isValid) return dt.toISODate()
  }
  return null
}

/**
 * Eje X / leyendas de agregados: _id del backend es ISO (inicio de bucket en UTC).
 * @param {string|Date|object} isoOrDate
 * @param {string} [agrupacion] minuto, 5min, hora, dia, mes, etc.
 */
export function formatChartBucketLabel(isoOrDate, agrupacion = 'hora') {
  if (!isoOrDate) return ''
  const tz = getAppTimeZone()
  const d = toJsDate(isoOrDate)
  const a = String(agrupacion || '').toLowerCase()

  if (!d || Number.isNaN(d.getTime())) {
    if (typeof isoOrDate === 'object' && isoOrDate !== null && 'year' in isoOrDate) {
      return legacyFormatAggLabel(isoOrDate)
    }
    return ''
  }

  if (a === 'mes') {
    return new Intl.DateTimeFormat('es-AR', {
      timeZone: tz,
      month: '2-digit',
      year: 'numeric',
    }).format(d)
  }
  if (a === 'año' || a === 'anio') {
    return new Intl.DateTimeFormat('es-AR', {
      timeZone: tz,
      year: 'numeric',
    }).format(d)
  }
  if (a === 'dia' || a === 'semana') {
    return new Intl.DateTimeFormat('es-AR', {
      timeZone: tz,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d)
  }

  return new Intl.DateTimeFormat('es-AR', {
    timeZone: tz,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d)
}
