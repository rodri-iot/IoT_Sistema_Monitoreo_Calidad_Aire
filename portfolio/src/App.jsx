import React, { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import SiteLayout from './components/SiteLayout.jsx'
import Home from './pages/Home.jsx'
import Sistema from './pages/Sistema.jsx'
import Firmware from './pages/Firmware.jsx'
const DemoApp = lazy(() => import('./demo/DemoApp.jsx'))

function ScrollTop () {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App () {
  return (
    <>
      <ScrollTop />
      <Routes>
        <Route path="/demo/*" element={<Suspense fallback={<div className="login muted">Cargando demo…</div>}><DemoApp /></Suspense>} />
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/sistema" element={<Sistema />} />
          <Route path="/firmware" element={<Firmware />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </>
  )
}
