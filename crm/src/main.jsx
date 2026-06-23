import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Build marker — lets us confirm in the console which version is actually live.
console.log('NKUVO CRM build: 2026-06-23-crashfix')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
