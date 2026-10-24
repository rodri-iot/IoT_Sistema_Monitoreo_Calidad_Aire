import React from 'react'

// Primitivas SVG para diagramas. Colores vía variables CSS => funcionan en claro y oscuro.
export const TONE = {
  edge: 'var(--c-edge)', broker: 'var(--c-broker)', back: 'var(--c-back)',
  data: 'var(--c-data)', front: 'var(--c-front)', neutral: 'var(--muted)'
}

export function Svg ({ w, h, children, label }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
      <defs>
        <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" className="dg-arrow" />
        </marker>
        <marker id="ahs" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" className="dg-arrow strong" />
        </marker>
      </defs>
      {children}
    </svg>
  )
}

export function Group ({ x, y, w, h, label, tone = 'neutral' }) {
  return (
    <g style={{ '--tone': TONE[tone] }}>
      <rect x={x} y={y} width={w} height={h} rx="14" className="dg-group" />
      {label && <text x={x + 14} y={y + 20} className="dg-glabel">{label}</text>}
    </g>
  )
}

export function Box ({ x, y, w, h, title, sub, tone = 'neutral', lines }) {
  const subs = lines || (sub ? [sub] : [])
  const ty = subs.length ? y + h / 2 - 4 - (subs.length - 1) * 6 : y + h / 2 + 4.5
  return (
    <g style={{ '--tone': TONE[tone] }}>
      <rect x={x} y={y} width={w} height={h} rx="10" className="dg-box tint" />
      <text x={x + w / 2} y={ty} textAnchor="middle" className="dg-title">{title}</text>
      {subs.map((s, i) => (
        <text key={i} x={x + w / 2} y={ty + 16 + i * 13} textAnchor="middle" className="dg-sub">{s}</text>
      ))}
    </g>
  )
}

// d: path; label opcional en (lx, ly)
export function Edge ({ d, label, lx, ly, dashed, strong, both, anchor = 'middle' }) {
  const cls = `dg-edge${dashed ? ' dashed' : ''}${strong ? ' strong' : ''}`
  return (
    <g>
      <path d={d} className={cls} markerEnd={`url(#${strong ? 'ahs' : 'ah'})`} markerStart={both ? `url(#${strong ? 'ahs' : 'ah'})` : undefined} />
      {label && <text x={lx} y={ly} textAnchor={anchor} className="dg-elabel bg">{label}</text>}
    </g>
  )
}

export function Step ({ x, y, n }) {
  return (
    <g>
      <circle cx={x} cy={y} r="9" className="dg-num" />
      <text x={x} y={y + 3.5} textAnchor="middle" className="dg-numtext">{n}</text>
    </g>
  )
}

export function Label ({ x, y, children, anchor = 'start', cls = 'dg-sub' }) {
  return <text x={x} y={y} textAnchor={anchor} className={cls}>{children}</text>
}
