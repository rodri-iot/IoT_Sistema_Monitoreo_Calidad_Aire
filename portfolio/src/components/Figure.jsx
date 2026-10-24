import React from 'react'

export default function Figure ({ title, caption, legend, children }) {
  return (
    <figure className="figure">
      {title && <h3 style={{ marginBottom: 10 }}>{title}</h3>}
      <div className="diagram">{children}</div>
      {legend && (
        <div className="legend">
          {legend.map(([label, color]) => <span key={label}><i style={{ background: color }} />{label}</span>)}
        </div>
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}
