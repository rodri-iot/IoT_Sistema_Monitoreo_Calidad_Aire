/**
 * Topes de concentración para categoría AQI "Buena" (0–50), tabla EPA.
 * Debe coincidir con el primer tramo de BREAKPOINTS en
 * backend/src/utils/aqiCalculator.js (BPhigh de cada parámetro).
 */
export const AQI_POLLUTANT_GOOD_MAX = {
  pm25: { value: 9.0, unit: 'µg/m³', label: 'PM2.5' },
  pm10: { value: 54, unit: 'µg/m³', label: 'PM10' },
  no2: { value: 53, unit: 'ppb', label: 'NO₂' },
  co: { value: 4.4, unit: 'ppm', label: 'CO' },
}
