/**
 * Calculador AQI según fórmula EPA
 * Ip = (Ihigh - Ilow) / (BPhigh - BPlow) * (Cp - BPlow) + Ilow
 * AQI_Total = max(I_PM2.5, I_PM10, I_NO2, I_CO)
 * 
 * NO2: sensores pueden reportar en ppb o µg/m³ (1 ppb NO2 ≈ 1.88 µg/m³ a 25°C)
 */

const BREAKPOINTS = {
  pm25: [
    { Ilow: 0, Ihigh: 50, BPlow: 0, BPhigh: 9.0 },
    { Ilow: 51, Ihigh: 100, BPlow: 9.1, BPhigh: 35.4 },
    { Ilow: 101, Ihigh: 150, BPlow: 35.5, BPhigh: 55.4 },
    { Ilow: 151, Ihigh: 200, BPlow: 55.5, BPhigh: 125.4 },
    { Ilow: 201, Ihigh: 300, BPlow: 125.5, BPhigh: 225.4 },
    { Ilow: 301, Ihigh: 500, BPlow: 225.5, BPhigh: 325.4 }
  ],
  pm10: [
    { Ilow: 0, Ihigh: 50, BPlow: 0, BPhigh: 54 },
    { Ilow: 51, Ihigh: 100, BPlow: 55, BPhigh: 154 },
    { Ilow: 101, Ihigh: 150, BPlow: 155, BPhigh: 254 },
    { Ilow: 151, Ihigh: 200, BPlow: 255, BPhigh: 354 },
    { Ilow: 201, Ihigh: 300, BPlow: 355, BPhigh: 424 },
    { Ilow: 301, Ihigh: 500, BPlow: 425, BPhigh: 604 }
  ],
  no2: [
    { Ilow: 0, Ihigh: 50, BPlow: 0, BPhigh: 53 },
    { Ilow: 51, Ihigh: 100, BPlow: 54, BPhigh: 100 },
    { Ilow: 101, Ihigh: 150, BPlow: 101, BPhigh: 360 },
    { Ilow: 151, Ihigh: 200, BPlow: 361, BPhigh: 649 },
    { Ilow: 201, Ihigh: 300, BPlow: 650, BPhigh: 1249 },
    { Ilow: 301, Ihigh: 500, BPlow: 1250, BPhigh: 2049 }
  ],
  co: [
    { Ilow: 0, Ihigh: 50, BPlow: 0, BPhigh: 4.4 },
    { Ilow: 51, Ihigh: 100, BPlow: 4.5, BPhigh: 9.4 },
    { Ilow: 101, Ihigh: 150, BPlow: 9.5, BPhigh: 12.4 },
    { Ilow: 151, Ihigh: 200, BPlow: 12.5, BPhigh: 15.4 },
    { Ilow: 201, Ihigh: 300, BPlow: 15.5, BPhigh: 30.4 },
    { Ilow: 301, Ihigh: 500, BPlow: 30.5, BPhigh: 50.4 }
  ]
};

const PARAM_ALIASES = {
  pm25: 'pm25',
  pm2_5: 'pm25',
  pm10: 'pm10',
  no2: 'no2',
  co: 'co'
};

function getParamKey(key) {
  const k = (key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return PARAM_ALIASES[k] || null;
}

function encontrarBreakpoint(parametro, concentracion) {
  const bp = BREAKPOINTS[parametro];
  if (!bp || concentracion == null || concentracion < 0) return null;

  for (let i = 0; i < bp.length; i++) {
    if (concentracion <= bp[i].BPhigh) {
      return bp[i];
    }
  }
  return bp[bp.length - 1];
}

function calcularSubIndice(parametro, concentracion) {
  const paramKey = getParamKey(parametro);
  if (!paramKey || !BREAKPOINTS[paramKey]) return null;

  const bp = encontrarBreakpoint(paramKey, concentracion);
  if (!bp) return null;

  const { Ilow, Ihigh, BPlow, BPhigh } = bp;
  const Cp = Math.min(concentracion, BPhigh);
  const Ip = ((Ihigh - Ilow) / (BPhigh - BPlow)) * (Cp - BPlow) + Ilow;
  return Math.round(Ip);
}

function calcularAQI(valores) {
  if (!valores || typeof valores !== 'object') return { aqi: null, parametro: null };

  const obj = valores instanceof Map ? Object.fromEntries(valores) : valores;
  const params = ['pm25', 'pm10', 'no2', 'co'];
  let maxAqi = 0;
  let maxParam = null;

  for (const p of params) {
    let val = obj[p] ?? obj[p.replace('25', '2_5')];
    if (val == null && p === 'pm25') val = obj.pm2_5;
    if (val == null) continue;

    const numVal = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(numVal)) continue;

    const subIdx = calcularSubIndice(p, numVal);
    if (subIdx != null && subIdx > maxAqi) {
      maxAqi = subIdx;
      maxParam = p;
    }
  }

  if (maxAqi === 0 && maxParam === null) return { aqi: null, parametro: null };
  return { aqi: maxAqi, parametro: maxParam };
}

module.exports = {
  calcularSubIndice,
  calcularAQI,
  BREAKPOINTS
};
