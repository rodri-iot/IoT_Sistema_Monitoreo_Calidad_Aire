import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './views/Dashboard'
import Login from './views/Login'
import VistaPublica from './views/VistaPublica'
import Zonas from './views/Zonas'
import Dispositivos from './views/Dispositivos'
import Lecturas from './views/Lecturas'
import Usuarios from './views/Usuarios'
import EmpresasAdmin from './views/EmpresasAdmin'
import Empresas from './views/Empresas'
import { AuthProvider } from './context/AuthContext'
import Unauthorized from './views/Unauthorized'
import RequireAuth from './components/RequireAuth'


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main className="container">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/public" element={<VistaPublica />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protegidas: cualquier usuario logueado */}
            <Route
              path="/"
              element={
                <RequireAuth allowedRoles={['superadmin', 'admin', 'supervisor']}>
                  <Dashboard />
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
                  <Lecturas />
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
      </BrowserRouter>
    </AuthProvider>
  )
}
