import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Upload, Loader2, Download, Table2, FileSpreadsheet,
  CheckCircle2, AlertCircle, Link2, Users, ChevronRight,
  RefreshCw, Info
} from 'lucide-react'
import FileUploadZone from '../components/upload/FileUploadZone.jsx'
import { campaignsAPI, sheetsAPI } from '../lib/api.js'
import useAuthStore from '../store/authStore.js'

// ── Google Sheets tab ─────────────────────────────────────────────
function SheetsImporter({ campaignId, campaignName, onSuccess }) {
  const { tenant } = useAuthStore()
  const [url, setUrl]                 = useState(tenant?.sheets_url || '')
  const [preview, setPreview]         = useState(null)
  const [previewErr, setPreviewErr]   = useState(null)
  const [previewing, setPreviewing]   = useState(false)
  const [importing, setImporting]     = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [importErr, setImportErr]     = useState(null)

  const handlePreview = async () => {
    if (!url.trim()) return
    setPreviewing(true)
    setPreview(null)
    setPreviewErr(null)
    setImportResult(null)
    try {
      const res = await sheetsAPI.preview(url.trim())
      setPreview(res.data)
    } catch (err) {
      setPreviewErr(err.response?.data?.error || err.message)
    } finally {
      setPreviewing(false)
    }
  }

  const handleImport = async () => {
    if (!preview || !campaignId) return
    setImporting(true)
    setImportErr(null)
    setImportResult(null)
    try {
      const res = await sheetsAPI.import({ url: url.trim(), campaign_id: campaignId })
      setImportResult(res.data)
      onSuccess()
    } catch (err) {
      setImportErr(err.response?.data?.error || err.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Instructions */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
        <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700 leading-relaxed space-y-1">
          <p className="font-semibold text-blue-800">¿Cómo conectar tu Google Sheet?</p>
          <p>1. Abre tu hoja en Google Sheets</p>
          <p>2. Haz clic en <strong>Compartir</strong> → <strong>Cambiar a "Cualquier persona con el enlace"</strong> → Lector</p>
          <p>3. Copia el enlace y pégalo aquí abajo</p>
          <p className="text-blue-600 pt-1">
            Tu hoja debe tener las mismas columnas que la plantilla (NOMBRE FAMILIA, TELÉFONO, SECCIÓN, etc.)
          </p>
        </div>
      </div>

      {/* URL input */}
      <div>
        <label className="label">Enlace de Google Sheets</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9"
              type="url"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={url}
              onChange={e => { setUrl(e.target.value); setPreview(null); setPreviewErr(null) }}
              onKeyDown={e => e.key === 'Enter' && handlePreview()}
            />
          </div>
          <button
            onClick={handlePreview}
            disabled={!url.trim() || previewing}
            className="btn-primary flex items-center gap-2 text-sm flex-shrink-0"
          >
            {previewing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {previewing ? 'Leyendo...' : 'Previsualizar'}
          </button>
        </div>
        {tenant?.sheets_url && url === tenant.sheets_url && (
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
            <CheckCircle2 size={11} /> URL guardada en tu configuración
          </p>
        )}
      </div>

      {/* Preview error */}
      {previewErr && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{previewErr}</p>
        </div>
      )}

      {/* Preview result */}
      {preview && !importing && !importResult && (
        <div className="space-y-4">
          {/* Warnings */}
          {preview.warnings?.length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-2xl">
              <AlertCircle size={15} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                {preview.warnings.map(w => (
                  <p key={w} className="text-xs text-yellow-700">{w}</p>
                ))}
              </div>
            </div>
          )}

          {/* Summary card */}
          <div className="rounded-2xl border-2 border-md-primary bg-md-primary-container/10 p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={18} className="text-md-primary" />
              <p className="font-semibold text-md-on-surface">
                Se encontraron <span className="text-md-primary">{preview.total} contactos</span>
              </p>
            </div>

            {/* Group breakdown */}
            {preview.groups?.length > 0 && (
              <div className="space-y-1.5 mb-3">
                <p className="text-xs font-medium text-md-on-surface-variant uppercase tracking-wide">Por grupo</p>
                <div className="flex flex-wrap gap-2">
                  {preview.groups.map(g => (
                    <span
                      key={g.name}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-md-secondary-container text-md-on-secondary-container text-xs font-medium"
                    >
                      <Users size={11} />
                      {g.name} ({g.count})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Detected columns */}
            <div>
              <p className="text-xs font-medium text-md-on-surface-variant uppercase tracking-wide mb-1">Columnas detectadas</p>
              <p className="text-xs text-md-on-surface-variant">
                {preview.columns.join(' · ')}
              </p>
            </div>
          </div>

          {/* Sample rows */}
          {preview.sample?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-md-on-surface-variant uppercase tracking-wide mb-2">Vista previa (primeras filas)</p>
              <div className="overflow-x-auto rounded-2xl border border-md-outline-variant">
                <table className="text-xs w-full">
                  <thead className="bg-md-surface-container">
                    <tr>
                      {preview.columns.map(col => (
                        <th key={col} className="px-3 py-2 text-left font-semibold text-md-on-surface-variant whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sample.map((row, i) => (
                      <tr key={i} className="border-t border-md-outline-variant/40">
                        {preview.columns.map(col => (
                          <td key={col} className="px-3 py-2 text-md-on-surface whitespace-nowrap max-w-[200px] truncate">
                            {row[col] || <span className="text-md-on-surface-variant/40">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import button */}
          <div className="flex gap-3">
            <button
              onClick={() => { setPreview(null); setUrl(tenant?.sheets_url || '') }}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={importing || preview.warnings?.some(w => w.includes('teléfono') || w.includes('nombre'))}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={15} />
              Importar {preview.total} contactos a "{campaignName}"
            </button>
          </div>
        </div>
      )}

      {/* Import loading */}
      {importing && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 size={28} className="text-md-primary animate-spin" />
          <p className="text-sm text-md-on-surface-variant">Importando contactos desde Google Sheets…</p>
        </div>
      )}

      {/* Import result */}
      {importResult && (
        <div className={`rounded-2xl p-5 border-2 ${
          importResult.errors === 0
            ? 'border-green-300 bg-green-50'
            : 'border-yellow-300 bg-yellow-50'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={20} className={importResult.errors === 0 ? 'text-green-600' : 'text-yellow-600'} />
            <p className="font-semibold text-md-on-surface">¡Importación completada!</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center mb-3">
            <div className="bg-white rounded-xl p-3">
              <p className="text-2xl font-bold text-md-on-surface">{importResult.total}</p>
              <p className="text-xs text-md-on-surface-variant">Filas leídas</p>
            </div>
            <div className="bg-white rounded-xl p-3">
              <p className="text-2xl font-bold text-green-600">{importResult.valid}</p>
              <p className="text-xs text-md-on-surface-variant">Importados</p>
            </div>
            <div className="bg-white rounded-xl p-3">
              <p className="text-2xl font-bold text-orange-500">{importResult.errors}</p>
              <p className="text-xs text-md-on-surface-variant">Con errores</p>
            </div>
          </div>
          {importResult.errorDetails?.length > 0 && (
            <details className="text-xs text-yellow-700">
              <summary className="cursor-pointer font-medium">Ver errores ({importResult.errorDetails.length})</summary>
              <ul className="mt-2 space-y-1 pl-3">
                {importResult.errorDetails.slice(0, 10).map((e, i) => (
                  <li key={i}>Fila {e.row}: {e.error}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main UploadPage ───────────────────────────────────────────────
export default function UploadPage() {
  const [searchParams] = useSearchParams()
  const { tenant } = useAuthStore()
  const preSelectedId = searchParams.get('campaign')

  const [campaigns, setCampaigns]     = useState([])
  const [selectedCampaign, setSelectedCampaign] = useState(preSelectedId || '')
  const [isLoading, setIsLoading]     = useState(true)
  const [uploadCount, setUploadCount] = useState(0)
  const [activeTab, setActiveTab]     = useState('file')  // 'file' | 'sheets'

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

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Importar contactos</h1>
        <p className="text-gray-500 text-sm mt-1">
          Sube un archivo o conecta directamente tu Google Sheet
        </p>
      </div>

      {/* Campaign selector */}
      <div className="card">
        <label className="label">Campaña destino</label>
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
            {selectedCampaignData.concept} · {selectedCampaignData.total_contacts || 0} contactos actuales
          </p>
        )}
      </div>

      {selectedCampaign && (
        <>
          {/* Source tabs */}
          <div className="flex gap-1 p-1 bg-md-surface-container rounded-2xl">
            <button
              onClick={() => setActiveTab('file')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'file'
                  ? 'bg-white text-md-on-surface shadow-sm'
                  : 'text-md-on-surface-variant hover:text-md-on-surface'
              }`}
            >
              <FileSpreadsheet size={15} />
              Archivo (Excel / CSV)
            </button>
            <button
              onClick={() => setActiveTab('sheets')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'sheets'
                  ? 'bg-white text-md-on-surface shadow-sm'
                  : 'text-md-on-surface-variant hover:text-md-on-surface'
              }`}
            >
              <Table2 size={15} />
              Google Sheets
              {tenant?.sheets_url && (
                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="URL configurada" />
              )}
            </button>
          </div>

          {/* File upload tab */}
          {activeTab === 'file' && (
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Upload size={16} className="text-colibri" />
                  Archivo de contactos
                </h2>
                <a
                  href={`/api/upload/layout?org_type=${tenant?.org_type || 'general'}`}
                  download
                  className="btn-secondary flex items-center gap-1.5 text-xs"
                >
                  <Download size={13} />
                  Plantilla
                </a>
              </div>

              <FileUploadZone
                key={`${selectedCampaign}-${uploadCount}`}
                campaignId={selectedCampaign}
                onSuccess={handleUploadSuccess}
              />

              {/* Column guide */}
              <div className="bg-md-surface-container rounded-2xl p-4 text-xs">
                <p className="font-semibold text-md-on-surface mb-2">Columnas del archivo</p>
                <div className="flex flex-wrap gap-1.5">
                  {['NOMBRE FAMILIA', 'NOMBRE ALUMNO', 'TELÉFONO', 'SECCIÓN', 'GRADO', 'SALÓN', 'CORREO', 'MENSAJE O RECORDATORIO', 'Liga_Pago', 'Matrícula'].map(col => (
                    <span key={col} className="px-2 py-0.5 bg-white rounded-lg border border-md-outline-variant text-md-on-surface-variant">
                      {col}
                    </span>
                  ))}
                </div>
                <p className="text-md-on-surface-variant mt-2">
                  Los teléfonos se normalizan automáticamente a formato +521. Si un contacto ya existe, se actualiza.
                </p>
              </div>
            </div>
          )}

          {/* Google Sheets tab */}
          {activeTab === 'sheets' && (
            <div className="card">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Table2 size={16} className="text-green-600" />
                Importar desde Google Sheets
              </h2>
              <SheetsImporter
                campaignId={selectedCampaign}
                campaignName={selectedCampaignData?.name || ''}
                onSuccess={handleUploadSuccess}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
