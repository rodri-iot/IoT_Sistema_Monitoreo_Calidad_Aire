import React, { useEffect, useState, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import ModalUsuario from '../components/ModalUsuario'

export default function EmpresasAdmin() {
  const { token } = useContext(AuthContext)
  const [empresas, setEmpresas] = useState([])
  const [usuarioEdit, setUsuarioEdit] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        const res = await fetch('/api/empresas/admin/empresas', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Error al obtener empresas')
        }
        setEmpresas(data)
      } catch (err) {
        setError(err.message)
      }
    }

    fetchEmpresas()
  }, [token])

  const handleEditarUsuario = (usuario) => {
    console.log('Editar usuario:', usuario)
    setUsuarioEdit(usuario)
  }

  const handleEliminarUsuario = async (usuario) => {
    const confirmado = window.confirm(`¿Seguro que deseas eliminar a ${usuario.correo}?`)
    if (!confirmado) return

    try {
      const res = await fetch(`/api/usuarios/${usuario._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al eliminar usuario')

      setEmpresas(prev =>
        prev.map(emp => ({
          ...emp,
          usuarios: emp.usuarios.filter(u => u._id !== usuario._id)
        }))
      )
    } catch (err) {
      alert('Error al eliminar usuario: ' + err.message)
    }
  }

  const handleGuardarEdicion = (usuarioActualizado) => {
    setEmpresas(prev =>
        prev.map(emp => ({
        ...emp,
        usuarios: emp.usuarios.map(u =>
            u._id === usuarioActualizado._id ? usuarioActualizado : u
        )
        }))
    )
    setUsuarioEdit(null)
  }


  return (
    <>
        <div className="container">
        <h4 className="center">Empresas Registradas</h4>
        {error && (
            <div className="card-panel red lighten-4 red-text text-darken-4">
            {error}
            </div>
        )}

        {empresas.map((empresa, idx) => (
            <div key={idx} className="card-panel">
            <h5>Empresa {idx + 1}: {empresa.nombre}</h5>

            {empresa.usuarios.length > 0 ? (
                <ul className="collection">
                {empresa.usuarios.map((u, i) => (
                    <li key={i} className="collection-item">
                    👤 {u.correo} — <strong>{u.rol}</strong>
                    <span className="secondary-content">
                        <button
                        className="btn-flat orange-text"
                        onClick={() => handleEditarUsuario(u)}
                        title="Editar"
                        >
                        ✏️
                        </button>
                        <button
                        className="btn-flat red-text"
                        onClick={() => handleEliminarUsuario(u)}
                        title="Eliminar"
                        >
                        🗑️
                        </button>
                    </span>
                    </li>
                ))}
                </ul>
            ) : (
                <p className="grey-text">Sin usuarios registrados</p>
            )}
            </div>
        ))}
        </div>

        {usuarioEdit && (
        <ModalUsuario
            usuario={usuarioEdit}
            onClose={() => setUsuarioEdit(null)}
            onSave={handleGuardarEdicion}
            token={token}
            actualizarEmpresas={setEmpresas}
        />
        )}
    </>
  )
}