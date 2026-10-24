import React from 'react'
import { Link } from 'react-router-dom'

export default function Brand ({ to = '/' }) {
  return (
    <Link to={to} className="brand">
      <span className="brand-mark">
        <svg width="16" height="16" viewBox="0 0 32 32"><path d="M5 11h14a3.5 3.5 0 1 0-3.5-3.5M5 17h20a3.5 3.5 0 1 1-3.5 3.5M5 23h9" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" /></svg>
      </span>
      SMCA
    </Link>
  )
}
