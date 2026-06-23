import { Component } from 'react'

// App-wide safety net: if any screen throws during render, show a recoverable
// fallback instead of unmounting the whole tree (which looked like "no pasa del
// login" / blank white page). A bad API response must never brick the app.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Error inesperado' }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  handleReload = () => {
    this.setState({ hasError: false, message: '' })
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen bg-crm-surface flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-3xl shadow-md3-2 border border-crm-outline-variant/40 p-8 text-center">
          <h1 className="text-lg font-bold text-crm-on-surface mb-2">Algo salió mal</h1>
          <p className="text-sm text-crm-on-surface-variant mb-1">
            La aplicación tuvo un problema al cargar esta pantalla.
          </p>
          <p className="text-xs text-crm-on-surface-variant/70 mb-6 break-words">
            {this.state.message}
          </p>
          <button
            onClick={this.handleReload}
            className="w-full bg-crm-primary text-crm-on-primary py-3 rounded-full font-medium text-sm shadow-md3-1 hover:shadow-md3-2 transition-all"
          >
            Recargar
          </button>
        </div>
      </div>
    )
  }
}
