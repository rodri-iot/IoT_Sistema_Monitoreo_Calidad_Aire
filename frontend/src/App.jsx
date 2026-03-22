import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Sidenav from './components/Sidenav'
import Inicio from './views/Inicio'
import Login from './views/Login'
import VistaPublica from './views/VistaPublica'
import Zonas from './views/Zonas'
import Dispositivos from './views/Dispositivos'
import Historico from './views/Historico'
import Usuarios from './views/Usuarios'
import EmpresasAdmin from './views/EmpresasAdmin'
import Empresas from './views/Empresas'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Unauthorized from './views/Unauthorized'
import RequireAuth from './components/RequireAuth'


export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
          <div className="app-shell">
            <Sidenav />
            <main style={{ flex: 1, overflow: 'auto' }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/public" element={<VistaPublica />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protegidas: cualquier usuario logueado */}
            <Route
              path="/"
              element={
                <RequireAuth allowedRoles={['superadmin', 'admin', 'supervisor']}>
                  <Inicio />
                </RequireAuth>
              }
            />
            {/* Protegidas: admin o supervisor */}
            <Route
              path="/zonas"
              element={
                <RequireAuth allowedRoles={['admin', 'supervisor']}>
                  <Zonas />
                </RequireAuth>
              }
            />

            <Route
              path="/dispositivos"
              element={
                <RequireAuth allowedRoles={['admin', 'supervisor']}>
                  <Dispositivos />
                </RequireAuth>
              }
            />

            <Route
              path="/lecturas"
              element={
                <RequireAuth allowedRoles={['admin', 'supervisor']}>
                  <Historico />
                </RequireAuth>
              }
            />

            {/* Solo admin */}
            <Route
              path="/usuarios"
              element={
                <RequireAuth allowedRoles={['admin']}>
                  <Usuarios />
                </RequireAuth>
              }
            />

            {/* Solo superadmin */}
            <Route
              path="/empresas"
              element={
                <RequireAuth allowedRoles={['superadmin']}>
                  <Empresas />
                </RequireAuth>
              }
            />

            <Route
              path="/admin/empresas"
              element={
                <RequireAuth allowedRoles={['superadmin']}>
                  <EmpresasAdmin />
                </RequireAuth>
              }
            />

          </Routes>
            </main>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
