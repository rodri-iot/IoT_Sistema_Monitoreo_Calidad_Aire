import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

import 'materialize-css/dist/css/materialize.min.css'
import 'materialize-css/dist/js/materialize.min.js'
import './App.css'

const storedTheme = localStorage.getItem('smca-theme') || 'dark'
document.documentElement.setAttribute('data-theme', storedTheme)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
