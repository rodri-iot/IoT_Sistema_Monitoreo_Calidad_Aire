import React, { createContext, useState, useEffect, useCallback, useRef } from 'react'

export const AuthContext = createContext()

/** Decodifica `exp` del JWT (segundos Unix) sin verificar firma. */
function getJwtExpMs (token) {
  if (!token || typeof token !== 'string') return null
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return typeof json.exp === 'number' ? json.exp * 1000 : null
  } catch {
    return null
  }
}

export function AuthProvider ({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const expiryCheckRef = useRef(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const storedToken = localStorage.getItem('token')
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser))
      setToken(storedToken)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    setUser(null)
    setToken(null)
  }, [])

  /** Cierra sesión cuando el JWT llega a su expiración (misma ventana que el backend, p. ej. 8h). */
  useEffect(() => {
    if (expiryCheckRef.current) {
      clearInterval(expiryCheckRef.current)
      expiryCheckRef.current = null
    }
    if (!token) return

    const expMs = getJwtExpMs(token)
    if (!expMs) return

    const tick = () => {
      if (Date.now() >= expMs) {
        logout()
        window.location.href = '/login'
      }
    }
    tick()
    expiryCheckRef.current = setInterval(tick, 30_000)
    return () => {
      if (expiryCheckRef.current) clearInterval(expiryCheckRef.current)
    }
  }, [token, logout])

  const login = async (email, password) => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: email, password })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar sesión')
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.usuario))
      setUser(data.usuario)
      setToken(data.token)
    } catch (err) {
      console.error('🔴 Error al iniciar sesión:', err.message)
      throw err
    }
  }

  const fetchWithAuth = useCallback(async (url, options = {}) => {
    const headers = { ...options.headers, Authorization: `Bearer ${token}` }
    const res = await fetch(url, { ...options, headers })
    if (res.status === 401) {
      logout()
      window.location.href = '/login'
      throw new Error('Sesión expirada')
    }
    return res
  }, [token, logout])

  return (
    <AuthContext.Provider value={{ user, token, login, logout, fetchWithAuth }}>
      {children}
    </AuthContext.Provider>
  )
}
