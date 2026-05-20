import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Upload, Loader2, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import FileUploadZone from '../components/upload/FileUploadZone.jsx'
import { campaignsAPI } from '../lib/api.js'

export default function UploadPage() {
  const [searchParams] = useSearchParams()
  const preSelectedId = searchParams.get('campaign')

  const [campaigns, setCampaigns] = useState([])
  const [selectedCampaign, setSelectedCampaign] = useState(preSelectedId || '')
  const [isLoading, setIsLoading] = useState(true)
  const [uploadCount, setUploadCount] = useState(0)

  useEffect(() => {
    campaignsAPI.list()
      .then(res => {
        const list = res.data.campaigns || []
        setCampaigns(list)
        if (!preSelectedId && list.length > 0) {
          setSelectedCampaign(list[0].id)
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const selectedCampaignData = campaigns.find(c => c.id === selectedCampaign)

  const handleUploadSuccess = () => {
    setUploadCount(n => n + 1)
  }

  const handleDownloadLayout = () => {
    const rows = [
      ['nombre',      'telefono',   'matricula', 'mensaje',                                    'liga_pago'],
      ['Juan García', '5512345678', 'ALU-001',   'Tu colegiatura de junio está pendiente.',    'https://pago.ejemplo.com/001'],
      ['María López', '5587654321', 'ALU-002',   '',                                           'https://pago.ejemplo.com/002'],
      ['Carlos Mtz',  '5511223344', 'CONT-003',  '',                                           ''],
    ]

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(rows)

    // Anchos de columna
    ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 48 }, { wch: 40 }]

    // Estilo de encabezado (fila 1 en negrita — xlsx básico no soporta estilos sin pro,
    // pero los anchos y datos de ejemplo ya orientan al usuario)
    XLSX.utils.book_append_sheet(wb, ws, 'Contactos')
    XLSX.writeFile(wb, 'colibri_plantilla.xlsx')
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subir contactos</h1>
          <p className="text-gray-500 text-sm mt-1">
            Carga tu archivo Excel o CSV con los contactos de la campaña
          </p>
        </div>
        <button
          onClick={handleDownloadLayout}
          className="btn-secondary flex items-center gap-2 text-sm flex-shrink-0"
        >
          <Download size={15} />
          Descargar plantilla
        </button>
      </div>

      {/* Campaign selector */}
      <div className="card">
        <label className="label">Selecciona la campaña</label>
        {isLoading ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 size={16} className="text-colibri animate-spin" />
            <span className="text-sm text-gray-500">Cargando campañas...</span>
          </div>
        ) : campaigns.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">
            No tienes campañas. <a href="/campaigns" className="text-colibri font-medium">Crea una primero.</a>
          </p>
        ) : (
          <select
            className="input"
            value={selectedCampaign}
            onChange={e => { setSelectedCampaign(e.target.value); setUploadCount(n => n + 1) }}
          >
            <option value="">-- Elige una campaña --</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.status !== 'active' ? `(${c.status})` : ''}
              </option>
            ))}
          </select>
        )}

        {selectedCampaignData && (
          <p className="text-xs text-gray-400 mt-2">
            {selectedCampaignData.concept} · {selectedCampaignData.total_contacts} contactos actuales
          </p>
        )}
      </div>

      {/* Upload zone */}
      {selectedCampaign && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Upload size={16} className="text-colibri" />
            Archivo de contactos
          </h2>

          {/* key forces remount when campaign changes or after success */}
          <FileUploadZone
            key={`${selectedCampaign}-${uploadCount}`}
            campaignId={selectedCampaign}
            onSuccess={handleUploadSuccess}
          />
        </div>
      )}

      {/* Format guide */}
      <div className="card bg-colibri-50 border-colibri-100">
        <h3 className="text-sm font-semibold text-colibri-700 mb-2">Formato requerido del archivo</h3>
        <p className="text-xs text-colibri-600 mb-3">El archivo debe tener exactamente estas columnas (en cualquier orden):</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-colibri-200">
                {['Columna', 'Requerida', 'Descripción', 'Ejemplo'].map(h => (
                  <th key={h} className="py-1.5 px-2 text-left font-semibold text-colibri-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-colibri-600">
              {[
                ['nombre',    '✓', 'Nombre completo del contacto',                   'Juan García'],
                ['telefono',  '✓', 'WhatsApp con 10 dígitos (sin +52)',              '5512345678'],
                ['matricula', '',  'Matrícula, número de contrato o cliente',         'ALU-001'],
                ['mensaje',   '',  'Mensaje personalizado para este contacto',        'Tu colegiatura de junio está pendiente.'],
                ['liga_pago', '',  'Link de pago individual (si no se llena, se usa el general)', 'https://pago.app/xxx'],
              ].map(([col, req, desc, ex]) => (
                <tr key={col} className="border-b border-colibri-100">
                  <td className="py-1.5 px-2 font-mono font-medium">{col}</td>
                  <td className="py-1.5 px-2 text-center">{req}</td>
                  <td className="py-1.5 px-2">{desc}</td>
                  <td className="py-1.5 px-2 text-colibri-400">{ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-colibri-500 mt-3">
          Los teléfonos se normalizan automáticamente a formato +52. Si un contacto ya existe, se actualiza con los nuevos datos.
        </p>
      </div>
    </div>
  )
}
