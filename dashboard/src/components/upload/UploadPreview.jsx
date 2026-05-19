import { CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import UploadErrors from './UploadErrors.jsx'

export default function UploadPreview({ result, onReset }) {
  const hasErrors = result.errors > 0

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <div className={`rounded-xl border p-6 ${hasErrors ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${hasErrors ? 'bg-yellow-100' : 'bg-green-100'}`}>
            {hasErrors
              ? <AlertTriangle size={24} className="text-yellow-600" />
              : <CheckCircle size={24} className="text-green-600" />
            }
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${hasErrors ? 'text-yellow-800' : 'text-green-800'}`}>
              {hasErrors ? 'Archivo procesado con errores' : 'Archivo procesado exitosamente'}
            </h3>
            <p className={`text-sm mt-1 ${hasErrors ? 'text-yellow-700' : 'text-green-700'}`}>
              {result.message}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-3 text-center border border-white border-opacity-80">
            <p className="text-2xl font-bold text-gray-900">{result.total}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total de filas</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-white border-opacity-80">
            <p className="text-2xl font-bold text-green-600">{result.valid}</p>
            <p className="text-xs text-gray-500 mt-0.5">Válidos</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-white border-opacity-80">
            <p className="text-2xl font-bold text-red-500">{result.errors}</p>
            <p className="text-xs text-gray-500 mt-0.5">Con errores</p>
          </div>
        </div>
      </div>

      {/* Error details */}
      {result.error_details && result.error_details.length > 0 && (
        <UploadErrors errors={result.error_details} />
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onReset}
          className="flex items-center gap-2 btn-secondary"
        >
          <RefreshCw size={16} />
          Subir otro archivo
        </button>
      </div>
    </div>
  )
}
