import { useState, useRef, useCallback } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, Download, Loader2 } from 'lucide-react'
import { uploadAPI } from '../../lib/api.js'
import UploadPreview from './UploadPreview.jsx'

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv']
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv'
]

export default function FileUploadZone({ campaignId, onSuccess }) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const fileInputRef = useRef(null)

  const validateFile = (file) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return 'Solo se permiten archivos Excel (.xlsx, .xls) o CSV'
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'El archivo no puede pesar más de 10MB'
    }
    return null
  }

  const handleFile = async (file) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    if (!campaignId) {
      setError('Por favor selecciona una campaña antes de subir el archivo')
      return
    }

    setError(null)
    setIsUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('campaign_id', campaignId)

      const response = await uploadAPI.upload(formData)
      setResult(response.data)

      if (onSuccess) {
        onSuccess(response.data)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al subir el archivo')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [campaignId])

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleInputChange = (e) => {
    const file = e.target.files[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handleDownloadLayout = async () => {
    try {
      const response = await uploadAPI.downloadLayout()
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'colibri_layout.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading layout:', err)
    }
  }

  const reset = () => {
    setResult(null)
    setError(null)
    setIsUploading(false)
  }

  if (result) {
    return (
      <div>
        <UploadPreview result={result} onReset={reset} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Download layout button */}
      <div className="flex justify-end">
        <button
          onClick={handleDownloadLayout}
          className="flex items-center gap-2 text-sm text-colibri hover:text-colibri-dark font-medium transition-colors"
        >
          <Download size={16} />
          Descargar layout de ejemplo
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
          ${isDragging
            ? 'border-colibri bg-colibri-50 scale-[1.01]'
            : 'border-gray-300 hover:border-colibri hover:bg-colibri-50 bg-white'
          }
          ${isUploading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".xlsx,.xls,.csv"
          onChange={handleInputChange}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={48} className="text-colibri animate-spin" />
            <div>
              <p className="text-lg font-semibold text-gray-700">Procesando archivo...</p>
              <p className="text-sm text-gray-500 mt-1">Esto puede tomar unos segundos</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${isDragging ? 'bg-colibri' : 'bg-gray-100'}`}>
              {isDragging ? (
                <FileSpreadsheet size={32} className="text-white" />
              ) : (
                <Upload size={32} className="text-gray-400" />
              )}
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-700">
                {isDragging ? 'Suelta el archivo aquí' : 'Arrastra tu archivo aquí'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                o <span className="text-colibri font-medium">selecciona desde tu computadora</span>
              </p>
              <p className="text-xs text-gray-400 mt-3">
                Formatos permitidos: Excel (.xlsx, .xls) y CSV · Máximo 10MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}
